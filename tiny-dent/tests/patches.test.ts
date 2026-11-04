import assert from 'node:assert/strict'
import test from 'node:test'
import { tuning } from '../src/config/tuning'
import type { SurfaceKind } from '../src/content/surfaces'
import { createRunStore, type Resident } from '../src/state/runState'
import { registryFor } from '../src/state/planets'
import { buildRoute, buildSpaceport, planetState, routeQuote, ship, stepLogistics } from '../src/systems/logistics'
import { patchDemand, placeBuilder, startBuilder } from '../src/systems/builder'
import { siteScore, surfaceUnder } from '../src/systems/migration'
import { addPatch, patchAt, prunePatches, surfaceOfMaterial } from '../src/systems/patches'
import { planetSpecies } from '../src/systems/residents'
import { stepSimulation } from '../src/systems/simulation'
import { travelTo } from '../src/systems/signal'
import { groundPoint } from '../src/systems/structures'
import { notifyGroundChanged } from '../src/systems/workSites'
import { unit, HALF, type Vec3 } from '../src/systems/geometry'
import { planetConfig } from '../src/world/planet'

type Store = ReturnType<typeof createRunStore>

function seedOf(kind: SurfaceKind, species: string) {
  for (let parent = 0; parent < 800; parent += 1) {
    for (let index = 1; index <= 5; index += 1) {
      const seed = `m${parent}/signal-${index}`
      if (planetConfig(seed).surface === kind && planetConfig(seed).shape === 'sphere' && planetConfig(seed).water === 0 && planetSpecies(seed) === species) return seed
    }
  }
  throw new Error(`no ${kind} planet`)
}
const P = seedOf('plastic', 'cairn')
const M = seedOf('metal', 'sentinel')

// A Cairn and 40 plastic chips ride one train from the plastic planet to the metal one; the player ends on the metal planet.
function arrival() {
  const store = createRunStore(P)
  store.setState(s => ({ metrics: { ...s.metrics, capital: 100000 }, inventory: { ...s.inventory, plastic: 60 } }))
  buildSpaceport(store)
  travelTo(store, M)
  buildSpaceport(store)
  assert.ok(buildRoute(store, P).ok)
  travelTo(store, P)
  const cairn = [...store.getState().residents].sort((a, b) => a.creatureId < b.creatureId ? -1 : 1)[0]
  const sent = ship(store, M, [{ material: 'plastic', amount: 40 }], [cairn.creatureId])
  assert.ok(sent.ok)
  for (let i = 0; i < routeQuote(P, M).travelTicks; i += 1) stepLogistics(store)
  travelTo(store, M)
  return { store, cairn, world: registryFor(store).world(M) }
}
const run = (store: Store, ticks: number) => { const world = registryFor(store).world(store.getState().seed); for (let i = 0; i < ticks; i += 1) stepSimulation(world, store) }
const find = (store: Store, id: string) => store.getState().residents.find(r => r.creatureId === id)!
const stock = (store: Store) => store.getState().inventory.plastic
const sample = (world: ReturnType<typeof registryFor>['world'] extends (s: string) => infer W ? W : never, at: Vec3) => {
  const out: number[] = []
  for (let dx = -2; dx <= 2; dx += 1) for (let dy = -2; dy <= 2; dy += 1) for (let dz = -2; dz <= 2; dz += 1) out.push(world.densityAt(at[0] + dx * 0.1, at[1] + HALF + dy * 0.1, at[2] + dz * 0.1))
  return out
}

test('PAT-01/08: a new planet has no patches, and ground is its own surface until a patch covers it', () => {
  const state = createRunStore(M).getState()
  assert.deepEqual(state.patches, [])
  const point: Vec3 = [1, 0, 0]
  assert.equal(surfaceUnder(state, point), 'metal')
  const store = createRunStore(M)
  addPatch(store, [1, 0, 0], 'plastic')
  assert.equal(surfaceUnder(store.getState(), [1.2, 0.1, 0]), 'plastic')
  assert.equal(surfaceUnder(store.getState(), [0, 1, 0]), 'metal')
  assert.equal(surfaceUnder(store.getState(), [0.4, 0, 0]), 'plastic', 'a point under the patch counts as on it')
  assert.equal(surfaceOfMaterial('scrap'), 'metal')
  assert.equal(patchAt(store.getState().patches, [0, 1, 0]), undefined)
})

test('PAT-03/06: a plastic patch raises a Cairn\'s comfort on metal; the same patch does nothing for a Sentinel', () => {
  const store = createRunStore(M)
  const state = store.getState()
  const at = (species: Resident['species']): Resident => ({ ...state.residents[0], creatureId: 'x', species, origin: P, bias: 0, home: [1, 0, 0], homeValid: true })
  const bare = siteScore(state, at('cairn'), [])
  addPatch(store, [1, 0, 0], 'plastic')
  const patched = siteScore(store.getState(), at('cairn'), [])
  assert.ok(patched > bare + 0.4, `${bare} -> ${patched}`)
  assert.ok(patched > 0.8)
  assert.ok(siteScore(store.getState(), at('sentinel'), []) < siteScore(state, at('sentinel'), []) , 'a Sentinel prefers bare metal')
})

test('PAT-02: a patch costs exactly its price, only when built, and a job that cannot be paid for costs nothing', () => {
  const { store, world, cairn } = arrival()
  const total = (id: 'plastic') => planetState(store, M)!.inventory[id]
  assert.equal(stock(store), 40)
  // Wait for the visitor to find a home and become unhappy enough to ask.
  for (let i = 0; i < 4000 && !find(store, cairn.creatureId).request; i += 1) run(store, 1)
  const creature = find(store, cairn.creatureId)
  assert.equal(creature.request, 'plastic')
  const area = { center: groundPoint(world, unit(creature.home!)), radius: 2.4 }
  const demand = patchDemand(world, store, area)
  assert.ok(demand && demand.enough)
  assert.equal(demand!.material, 'plastic')

  // Not enough stock: no job, the Builder says so, nothing is spent and no patch exists.
  store.setState(s => ({ inventory: { ...s.inventory, plastic: tuning.patches.cost - 1 } }))
  placeBuilder(store, world, 'builder-0', area.center, area.radius)
  startBuilder(store, 'builder-0')
  run(store, 400)
  assert.equal(store.getState().builders[0].stopReason, 'no-material')
  assert.equal(store.getState().patches.length, 0)
  assert.equal(stock(store), tuning.patches.cost - 1)

  // Enough stock: one patch, exactly `cost` spent, and the terrain is unchanged.
  const before = sample(world, area.center)
  store.setState(s => ({ inventory: { ...s.inventory, plastic: 40 }, builders: s.builders.map(b => ({ ...b, phase: 'scanning', stopReason: null, misses: 0, phaseTicks: 0 })) }))
  run(store, 400)
  assert.equal(store.getState().patches.length, 1)
  assert.equal(stock(store), 40 - tuning.patches.cost)
  assert.equal(total('plastic'), 40 - tuning.patches.cost)
  assert.equal(store.getState().patches[0].material, 'plastic')
  assert.deepEqual(sample(world, area.center), before, 'the density field is untouched')
})

test('PAT-02: a job whose stock is gone or whose ground has moved by the time it finishes spends nothing', () => {
  const { store, world, cairn } = arrival()
  for (let i = 0; i < 4000 && !find(store, cairn.creatureId).request; i += 1) run(store, 1)
  const home = find(store, cairn.creatureId).home!
  const ground = groundPoint(world, unit(home))
  const job = (material: 'plastic') => ({ kind: 'patch' as const, ground, material })
  placeBuilder(store, world, 'builder-0', ground, 2.4)
  // Stock spent elsewhere while the Builder travelled.
  store.setState(s => ({ inventory: { ...s.inventory, plastic: 5 },
    builders: s.builders.map(b => ({ ...b, phase: 'working', job: job('plastic'), phaseTicks: 1000 })) }))
  run(store, 2)
  assert.equal(stock(store), 5)
  assert.equal(store.getState().patches.length, 0)
  assert.equal(store.getState().builders[0].done, 0)
  // Ground gone: dig the spot out before the job completes.
  store.setState(s => ({ inventory: { ...s.inventory, plastic: 40 }, builders: s.builders.map(b => ({ ...b, phase: 'working', job: job('plastic'), phaseTicks: 1000 })) }))
  world.edit('dig', { x: ground[0], y: ground[1] + HALF, z: ground[2] }, 0.5, 'radial')
  run(store, 2)
  assert.equal(stock(store), 40)
  assert.equal(store.getState().patches.length, 0)
})

test('PAT-T1: with a patch under it, the Cairn recovers, stops asking and settles; patches and stock survive a revisit', () => {
  const { store, world, cairn } = arrival()
  for (let i = 0; i < 4000 && !find(store, cairn.creatureId).request; i += 1) run(store, 1)
  const home = find(store, cairn.creatureId).home!
  const ground = groundPoint(world, unit(home))
  placeBuilder(store, world, 'builder-0', ground, 2.4)
  startBuilder(store, 'builder-0')
  run(store, 6000)
  const settled = find(store, cairn.creatureId)
  assert.equal(store.getState().patches.length, 1)
  assert.ok(['settling', 'established'].includes(settled.life), `${settled.life} comfort ${settled.comfort.toFixed(2)} belonging ${settled.belonging.toFixed(2)}`)
  assert.equal(settled.request, null)
  assert.ok(settled.passport.some(e => e.kind === 'homesick' || e.kind === 'settling'))
  const patches = store.getState().patches
  travelTo(store, P)
  travelTo(store, M)
  assert.deepEqual(store.getState().patches, patches)
  assert.equal(stock(store), 40 - tuning.patches.cost)
  assert.equal(find(store, cairn.creatureId).creatureId, cairn.creatureId)
})

test('PAT-04: digging out a patch\'s ground removes it, and an edit far away leaves it', () => {
  const { store, world } = arrival()
  const spot = groundPoint(world, unit([1, 0.2, 0.3]))
  addPatch(store, spot, 'plastic')
  const far: Vec3 = groundPoint(world, unit([-1, -0.2, -0.3]))
  world.edit('dig', { x: far[0], y: far[1] + HALF, z: far[2] }, 0.5, 'radial')
  notifyGroundChanged(store, far, 0.5, world)
  assert.equal(store.getState().patches.length, 1)
  world.edit('dig', { x: spot[0], y: spot[1] + HALF, z: spot[2] }, 0.6, 'radial')
  assert.equal(prunePatches(world, store), 1)
  assert.equal(store.getState().patches.length, 0)
})
