import test from 'node:test'
import assert from 'node:assert/strict'
import { tuning } from '../src/config/tuning'
import { createRunStore } from '../src/state/runState'
import { HALF, distance, unit, type Vec3 } from '../src/systems/geometry'
import { burrowOpen, disturbanceAt, homePreferenceScore, isValidHome, recordDisturbance, residentHomeSites, spawnResidents, stepResidents } from '../src/systems/residents'
import { burrowSites } from '../src/world/planet'
import { stepSimulation } from '../src/systems/simulation'
import { useTerrainTool } from '../src/tools/terrainTool'
import { PlanetWorld } from '../src/world/planet'
import { groundRadius } from '../src/systems/exploration'

const rules = tuning.residents
type Store = ReturnType<typeof createRunStore>
const run = (world: PlanetWorld, store: Store, ticks: number) => {
  for (let i = 0; i < ticks; i += 1) stepResidents(world, store)
}
const editPoint = (p: Vec3) => ({ x: p[0], y: p[1] + HALF, z: p[2] })

test('RES-01/T6: Ares-9 scatters residents, with one inside each open burrow', () => {
  const world = new PlanetWorld('1380')
  const residents = spawnResidents('1380')
  const burrows = burrowSites('1380').filter(burrow => burrowOpen(world, burrow))
  assert.deepEqual(residents, spawnResidents('1380'))
  assert.ok(residents.length >= 11 && residents.length <= Math.max(13, burrows.length))
  assert.ok(new Set(residents.map(resident => resident.size)).size > 1, 'one planet contains visibly different sizes')
  assert.ok(residents.every(resident => resident.size >= rules.size[0] && resident.size <= rules.size[1]))
  const inside = residents.filter(resident => resident.burrowId)
  assert.deepEqual(inside.map(resident => resident.burrowId).sort(), burrows.map(burrow => burrow.id).sort())
  assert.equal(new Set(inside.map(resident => resident.burrowId)).size, inside.length)
  const surface = residents.filter(resident => !resident.burrowId)
  assert.ok(surface.length >= 1, 'some residents start out on the surface')
  const occupied: Vec3[] = inside.map(resident => resident.home!)
  for (const resident of surface) {
    assert.equal(isValidHome(world, resident.home!, occupied), true)
    occupied.push(resident.home!)
  }
})

test('HAB-T0: surface homes require soil depth, slope, headroom, and spacing', () => {
  const sphere = { densityAt: (x: number, y: number, z: number) => Math.hypot(x, y - HALF, z) - 2 }
  const home: Vec3 = [0, 2, 0]
  assert.equal(isValidHome(sphere, home), true)
  assert.equal(isValidHome(sphere, home, [[0, 2, 0.2]]), false, 'spacing')
  const shallow = { densityAt: (x: number, y: number, z: number) => Math.abs(Math.hypot(x, y - HALF, z) - 2) - 0.2 }
  assert.equal(isValidHome(shallow, home), false, 'soil depth')
  const steep = { densityAt: (x: number, y: number) => (y - HALF - 2) + x * 2 }
  assert.equal(isValidHome(steep, home), false, 'slope')
  const blocked = { densityAt: (x: number, y: number, z: number) => {
    const radius = Math.hypot(x, y - HALF, z)
    return radius > 2.08 && radius < 2.16 ? -0.01 : radius - 2
  } }
  assert.equal(isValidHome(blocked, home), false, 'headroom')
})

test('RES-T1: brief Miner noise hides a resident and quiet brings it back to the same home', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  const home = store.getState().residents[0].home!
  recordDisturbance(store, home, 'robot', false)
  recordDisturbance(store, home, 'robot', false)
  stepSimulation(world, store)
  assert.equal(store.getState().residents[0].state, 'hiding')
  run(world, store, 400)
  const resident = store.getState().residents[0]
  assert.equal(resident.state, 'peeking')
  assert.deepEqual(resident.home, home)
})

test('RES-T2: sustained Miner noise moves a resident away from the work', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  const start = store.getState().residents[0]
  for (let tick = 0; tick < rules.fleeTicks + 20; tick += 1) {
    recordDisturbance(store, start.home!, 'robot', false)
    stepResidents(world, store)
  }
  const moving = store.getState().residents[0]
  assert.notEqual(moving.burrowId, start.burrowId)
  assert.ok(moving.home === null || distance(moving.home, start.home!) >= rules.minHomeSpacing)
  const ids = store.getState().residents.map(resident => resident.burrowId).filter((id): id is string => !!id)
  assert.equal(new Set(ids).size, ids.length, 'a burrow still holds at most one resident')
  if (moving.home && !moving.burrowId) {
    const claimed = store.getState().residents.slice(1).flatMap(resident => resident.home ? [resident.home] : [])
    assert.equal(isValidHome(world, moving.home, claimed), true)
    assert.ok(disturbanceAt(store.getState().habitat, moving.home) < rules.quietLevel)
  }
})

test('D-054: calm burrow residents shift inside the tunnel, and one hole is never shared', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  const burrowed = store.getState().residents.find(resident => resident.burrowId)!
  const before = burrowed.position
  run(world, store, rules.quietTicks + 40)
  const after = store.getState().residents.find(resident => resident.id === burrowed.id)!
  assert.equal(after.burrowId, burrowed.burrowId)
  assert.equal(after.state, 'peeking')
  assert.ok(distance(after.position, before) > 0.05, 'a burrow resident does not stay frozen')
  store.setState(state => ({ residents: state.residents.map(resident => ({ ...resident, burrowId: null, home: resident.home, state: 'peeking' as const, path: [], nextWander: 0, disturbedTicks: 0 })) }))
  stepResidents(world, store)
  const ids = store.getState().residents.map(resident => resident.burrowId).filter((id): id is string => !!id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.length >= 1)
  assert.ok(ids.length < store.getState().residents.length, 'shy residents leave someone outside when holes are full')
})

test('RES-T2/D-051: a nearby companion can make a slightly farther home preferable', () => {
  const origin: Vec3 = [0, 0, 0]
  const nearer: Vec3 = [1, 0, 0]
  const grouped: Vec3 = [1.5, 0, 0]
  const companion: Vec3 = [1.5, 0.8, 0]
  assert.ok(distance(grouped, companion) <= rules.companionRadius)
  assert.ok(distance(nearer, companion) > rules.companionRadius)
  assert.ok(homePreferenceScore(grouped, origin, [companion]) > homePreferenceScore(nearer, origin, [companion]))
})

test('RES-T3: no available home enters searching and stops after the retry limit', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  const sites = [...residentHomeSites(world, '1380'), ...burrowSites('1380').map(burrow => burrow.pocket)]
  const resident = store.getState().residents[0]
  store.setState({ residents: [{ ...resident, home: null, burrowId: null, state: 'searching', homeValid: false, searchRetries: 0, nextCheck: 0 }] })
  for (let tick = 0; tick < rules.searchRetryTicks * (rules.maxSearchRetries + 2); tick += 1) {
    store.setState(state => ({ habitat: { ...state.habitat,
      sources: sites.map(position => ({ position, level: rules.disturbance.cap })) } }))
    stepResidents(world, store)
  }
  const searching = store.getState().residents[0]
  assert.equal(searching.state, 'searching')
  assert.equal(searching.home, null)
  assert.equal(searching.searchRetries, rules.maxSearchRetries)
})

test('RES-T4: digging support under a hidden resident ejects it onto the new surface', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  const index = store.getState().residents.findIndex(resident => !resident.burrowId)
  const home = store.getState().residents[index].home!
  store.setState(state => ({ residents: state.residents.map((resident, residentIndex) => residentIndex === index
    ? { ...resident, state: 'hiding', position: [home[0], home[1], home[2]] as Vec3 } : resident) }))
  const result = useTerrainTool(world, store, 'dig', editPoint(home), 0.45, 'radial')
  assert.equal(result.changed, true)
  const resident = store.getState().residents[index]
  assert.equal(resident.state, 'searching')
  assert.equal(resident.home, null)
  const surface = groundRadius(world, unit(resident.position))
  assert.ok(Math.abs(Math.hypot(...resident.position) - (surface + rules.surfaceLift)) < 0.02)
})

test('RES-T5: added terrain over a hidden resident carries it up to the new surface', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  const index = store.getState().residents.findIndex(resident => !resident.burrowId)
  const before = store.getState().residents[index]
  const oldRadius = Math.hypot(...before.home!)
  store.setState(state => ({ residents: state.residents.map((resident, residentIndex) => residentIndex === index
    ? { ...resident, state: 'hiding' } : resident) }))
  const result = useTerrainTool(world, store, 'add', editPoint(before.home!), 0.38, 'radial')
  assert.equal(result.changed, true)
  const resident = store.getState().residents[index]
  assert.ok(resident.home)
  assert.ok(Math.hypot(...resident.home!) > oldRadius)
  assert.equal(resident.state, 'hiding')
  assert.ok(Math.hypot(...resident.position) > Math.hypot(...before.position))
})

test('RES-T6: residents never claim homes inside the spacing limit', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  const homes = store.getState().residents.flatMap(resident => resident.home ? [resident.home] : [])
  for (let i = 0; i < homes.length; i += 1) for (let j = i + 1; j < homes.length; j += 1) {
    assert.ok(distance(homes[i], homes[j]) >= rules.minHomeSpacing)
  }
  assert.ok(residentHomeSites(world, '1380').length > homes.length, 'free homes exist for relocation')
})
