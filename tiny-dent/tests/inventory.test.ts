import assert from 'node:assert/strict'
import test from 'node:test'
import { tuning } from '../src/config/tuning'
import { materialIds } from '../src/content/materials'
import { surfaceKinds, surfaces, type SurfaceKind } from '../src/content/surfaces'
import { createRunStore } from '../src/state/runState'
import { deposit, emptyInventory, nativeMaterial, nativeStock, settle, unitsFor, withdraw } from '../src/systems/inventory'
import { setWorkArea, startRobot, stepMiners } from '../src/systems/miner'
import { sellMinerals } from '../src/systems/economy'
import { describePlanet, systemPlanets } from '../src/systems/system'
import { travelTo } from '../src/systems/signal'
import { unit } from '../src/systems/geometry'
import { VOXEL_WORLD_SIZE as VOXEL } from '../src/world/voxels/voxelMath.js'
import { PlanetWorld, planetConfig } from '../src/world/planet'
import { collectExposedResources } from '../src/tools/collector'
import { groundPoint } from '../src/systems/structures'

// The first planet in a fixed scan whose material is `kind`.
function seedOf(kind: SurfaceKind) {
  if (kind === 'rock') return '1380'
  for (let parent = 0; parent < 500; parent += 1) {
    for (let index = 1; index <= 5; index += 1) {
      const seed = `s${parent}/signal-${index}`
      if (planetConfig(seed).surface === kind && planetConfig(seed).water === 0) return seed
    }
  }
  throw new Error(`no planet of ${kind}`)
}

test('MAT-01: every surface names one distinct native material', () => {
  const names = surfaceKinds.map(kind => surfaces[kind].material)
  assert.equal(new Set(names).size, surfaceKinds.length)
  for (const name of names) assert.ok(materialIds.includes(name))
  assert.equal(nativeMaterial('1380'), 'soil')
})

test('MAT-02: a new planet starts with an empty whole-number inventory of every material', () => {
  const { inventory } = createRunStore('1380').getState()
  assert.deepEqual(Object.keys(inventory).sort(), [...materialIds].sort())
  for (const id of materialIds) assert.equal(inventory[id], 0)
})

test('MAT-T1: a Miner on each surface deposits exactly the samples it removed, in that surface\'s material only', () => {
  for (const kind of surfaceKinds) {
    const seed = seedOf(kind)
    const world = new PlanetWorld(seed)
    const store = createRunStore(seed)
    let removed = 0
    const edit = world.edit.bind(world)
    world.edit = ((...args: Parameters<typeof edit>) => { const result = edit(...args); removed += result.removedSamples; return result }) as typeof world.edit
    const mineral = store.getState().resourceClusters.find(({ category }) => category === 'mineral')!
    setWorkArea(store, 'miner-0', { center: groundPoint(world, unit(mineral.position)), radius: 1.6 })
    startRobot(store, 'miner-0')
    for (let i = 0; i < 3000 && store.getState().robots[0].phase !== 'stopped'; i += 1) stepMiners(world, store)
    assert.ok(removed > 0, `${kind}: the Miner dug`)
    const { inventory } = store.getState()
    assert.equal(inventory[surfaces[kind].material], unitsFor(removed), `${kind}: native stock equals samples removed`)
    for (const id of materialIds) if (id !== surfaces[kind].material) assert.equal(inventory[id], 0, `${kind}: no ${id}`)
  }
})

test('MAT-T2: deposits add up, a withdrawal is all or nothing, and settling never goes below zero', () => {
  const store = createRunStore('1380')
  assert.equal(deposit(store, 'soil', 10), 10)
  assert.equal(deposit(store, 'soil', 5.9), 5)
  assert.equal(deposit(store, 'soil', -3), 0)
  assert.equal(store.getState().inventory.soil, 15)
  assert.equal(withdraw(store, 'soil', 16), false)
  assert.equal(store.getState().inventory.soil, 15)
  assert.equal(withdraw(store, 'soil', 15), true)
  assert.equal(store.getState().inventory.soil, 0)
  deposit(store, 'soil', 4)
  // An edit already made: 3 units come back, 10 were used, only 7 could be paid for.
  assert.equal(settle(store, 'soil', 3, 10), 3)
  assert.equal(store.getState().inventory.soil, 0)
  assert.equal(settle(store, 'soil', 6, 2), 0)
  assert.equal(store.getState().inventory.soil, 4)
  assert.equal(nativeStock(store.getState()), 4)
})

test('MAT-T3: each planet keeps its own inventory across leaving and returning', () => {
  const store = createRunStore('home')
  const other = 'home/signal-1'
  deposit(store, nativeMaterial('home'), 12)
  travelTo(store, other)
  assert.equal(store.getState().seed, other)
  for (const id of materialIds) assert.equal(store.getState().inventory[id], 0)
  deposit(store, nativeMaterial(other), 7)
  travelTo(store, 'home')
  assert.equal(store.getState().inventory[nativeMaterial('home')], 12)
  const total = (inventory: Record<string, number>) => Object.values(inventory).reduce((a, b) => a + b, 0)
  assert.equal(total(store.getState().inventory), 12)
  const planets = systemPlanets(store)
  assert.equal(planets.find(p => p.seed === 'home')!.stock, 12)
  assert.equal(planets.find(p => p.seed === other)!.stock, 7)
  assert.match(describePlanet(planets.find(p => p.seed === other)!), new RegExp(`7 ${planets.find(p => p.seed === other)!.material} in stock`))
  travelTo(store, other)
  assert.equal(store.getState().inventory[nativeMaterial(other)], 7)
})

test('MAT-T4: ore is sold on delivery as before, and kept as ore while autoSellOre is off', () => {
  const run = (autoSell: boolean) => {
    const flags = tuning.materials as { autoSellOre: boolean }
    const before = flags.autoSellOre
    flags.autoSellOre = autoSell
    try {
      const store = createRunStore('auto-sell')
      const world = new PlanetWorld('auto-sell')
      const mineral = store.getState().resourceClusters.find(c => c.category === 'mineral')!
      const [x, y, z] = mineral.position
      world.edit('dig', { x, y: y + VOXEL / 2, z }, mineral.radius + 1.2, 'radial')
      const found = collectExposedResources(world, store).length
      return { found, state: store.getState(), store }
    } finally { flags.autoSellOre = before }
  }
  const sold = run(true)
  assert.ok(sold.found >= 1)
  assert.equal(sold.state.economy.mineralStock, 0)
  assert.equal(sold.state.economy.mineralsSold, sold.found)
  const held = run(false)
  assert.equal(held.found, sold.found)
  assert.equal(held.state.economy.mineralStock, held.found)
  assert.equal(held.state.economy.mineralsSold, 0)
  assert.equal(held.state.metrics.capital, tuning.economy.startingCapital)
  // Ore never turns into construction material.
  for (const id of materialIds) assert.equal(held.state.inventory[id], 0)
  assert.ok(sellMinerals(held.store) > 0)
  assert.equal(held.store.getState().economy.mineralStock, 0)
})

test('MAT-06: an empty inventory object equals the one a new rock planet starts with', () => {
  assert.deepEqual(createRunStore('1380').getState().inventory, emptyInventory())
})
