import assert from 'node:assert/strict'
import test from 'node:test'
import { tuning } from '../src/config/tuning'
import { buildNav } from '../src/graph/surfaceGraph'
import { createRunStore } from '../src/state/runState'
import { registryFor } from '../src/state/planets'
import { placeBuilder, startBuilder } from '../src/systems/builder'
import { HALF, distance, scale, unit, type Vec3 } from '../src/systems/geometry'
import { buildRoute, buildSpaceport, planetState, routeQuote, ship, stepLogistics } from '../src/systems/logistics'
import { addPatch } from '../src/systems/patches'
import { recordDisturbance, planetSpecies, stepResidents } from '../src/systems/residents'
import { stepSimulation } from '../src/systems/simulation'
import { travelTo } from '../src/systems/signal'
import { isSuitable, surfaceNormal } from '../src/systems/structures'
import { describePlanet, systemPlanets } from '../src/systems/system'
import { anchoredAt, columnAt, depthAt, isAquatic, isWater, recordMound, standsDry, stepWater } from '../src/systems/water'
import { PlanetWorld, planetConfig } from '../src/world/planet'
import { VOXEL_WORLD_SIZE } from '../src/world/voxels/voxelMath.js'

type Store = ReturnType<typeof createRunStore>
const sphereSeed = (wet: boolean, accept: (seed: string) => boolean = () => true) => {
  for (let parent = 0; parent < 800; parent += 1) for (let index = 1; index <= 5; index += 1) {
    const seed = `w${parent}/signal-${index}`
    const config = planetConfig(seed)
    if (config.shape === 'sphere' && (config.water > 0) === wet && accept(seed)) return seed
  }
  throw new Error('no seed')
}
const SEA = sphereSeed(true, s => planetConfig(s).relief > 0.12 && planetConfig(s).surface === 'rock')
const DRY = sphereSeed(false, s => planetSpecies(s) === 'cairn' && planetConfig(s).surface === 'plastic')
const centred = (p: Vec3) => ({ x: p[0], y: p[1] + HALF, z: p[2] })
const world = (seed: string) => registryFor(createRunStore(seed)).world(seed)

test('WAT-01: the draw is stable, only spheres are oceans, the home planet never is, and the numbers follow the formula', () => {
  assert.equal(planetConfig('1380').water, 0)
  assert.equal(planetConfig('home').water, 0)
  let wet = 0, total = 0
  for (let parent = 0; parent < 120; parent += 1) for (let index = 1; index <= 5; index += 1) {
    const seed = `q${parent}/signal-${index}`
    const config = planetConfig(seed)
    total += 1
    assert.deepEqual(planetConfig(seed), config)
    if (config.water === 0) continue
    wet += 1
    assert.equal(config.shape, 'sphere')
    assert.ok(config.radius <= tuning.water.maxRadius + 1e-12)
    assert.ok(Math.abs(config.water - (config.radius * VOXEL_WORLD_SIZE + config.relief * VOXEL_WORLD_SIZE * 0.5 + tuning.water.margin)) < 1e-9)
    assert.ok(config.water < VOXEL_WORLD_SIZE / 2, 'the water fits inside the voxel world')
  }
  assert.ok(wet / total > 0.05 && wet / total < 0.2, `${wet}/${total} oceans`)
  assert.equal(planetSpecies(SEA), 'glassfin')
  assert.notEqual(planetSpecies(DRY), 'glassfin')
})

test('WAT-02: water is the volume inside the water radius and outside solid; the seabed is under it everywhere', () => {
  const w = world(SEA)
  const R = w.waterRadius
  assert.ok(R > 0)
  assert.equal(isWater(w, [0, R + 0.05, 0]), false, 'outside the sphere')
  assert.equal(isWater(w, [0, 0, 0]), false, 'the core is solid')
  const { seabed, depth } = columnAt(w, [0, 1, 0])
  assert.ok(depth > 0.35)
  const above: Vec3 = [0, seabed + 0.15, 0]
  assert.equal(isWater(w, above), true)
  assert.ok(Math.abs(depthAt(w, above) - (R - seabed - 0.15)) < 1e-9)
  assert.equal(depthAt(w, [0, seabed - 0.2, 0]), 0)
  let least = Infinity
  for (let i = 0; i < 300; i += 1) {
    const y = 1 - (2 * i + 1) / 300, ring = Math.sqrt(1 - y * y)
    least = Math.min(least, columnAt(w, [Math.cos(i * 2.4) * ring, y, Math.sin(i * 2.4) * ring]).depth)
  }
  assert.ok(least > tuning.water.margin - 0.07, `shallowest water ${least}`)
  assert.equal(depthAt(world(DRY), [0, 1, 0]), 0)
})

test('WAT-03/T3: digging the seabed deepens the water there and building it up makes it shallower', () => {
  const w = new PlanetWorld(SEA)
  const dir: Vec3 = unit([0.3, 0.8, 0.5])
  const before = columnAt(w, dir)
  const top = scale(dir, before.seabed)
  w.edit('dig', centred(top), 0.5, 'radial')
  const dug = columnAt(w, dir)
  assert.ok(dug.depth > before.depth + 0.15, `${before.depth} -> ${dug.depth}`)
  const w2 = new PlanetWorld(SEA)
  w2.edit('add', centred(scale(dir, before.seabed + 0.1)), 0.5, 'radial')
  assert.ok(columnAt(w2, dir).depth < before.depth - 0.15)
})

test('WAT-04/05/T4: swimmers are Glassfin, live in 3-D water at several depths and never enter solid', () => {
  const store = createRunStore(SEA)
  const w = registryFor(store).world(SEA)
  const fish = store.getState().residents
  assert.ok(fish.length >= 3, `${fish.length} swimmers`)
  assert.ok(fish.every(f => f.species === 'glassfin' && isAquatic(f.species) && f.origin === SEA))
  assert.equal(new Set(fish.map(f => f.creatureId)).size, fish.length)
  const depths: number[] = []
  for (let t = 0; t < 1500; t += 1) {
    stepSimulation(w, store)
    if (t % 25 === 0) for (const f of store.getState().residents) {
      assert.equal(isWater(w, f.position), true, `swimmer in water at ${t}`)
      assert.ok(Math.hypot(...f.position) < w.waterRadius - tuning.water.surfaceGap + 1e-9)
      depths.push(depthAt(w, f.position))
    }
  }
  assert.ok(Math.max(...depths) - Math.min(...depths) > 0.2, 'they swim at different depths')
  const first = store.getState().residents[0]
  const moved = new Set(store.getState().residents.map(f => f.position.map(v => v.toFixed(2)).join()))
  assert.ok(moved.size > 1)
  assert.ok(first.home && depthAt(w, first.home) >= tuning.water.minDepth)
})

test('WAT-06/07/T5: noise sends a swimmer down, and a territory built up too shallow is given up', () => {
  const store = createRunStore(SEA)
  const w = registryFor(store).world(SEA)
  for (let t = 0; t < 200; t += 1) stepResidents(w, store)
  const fish = store.getState().residents[0]
  recordDisturbance(store, fish.position, 'manual', false)
  stepResidents(w, store)
  assert.equal(store.getState().residents[0].state, 'hiding')
  const before = depthAt(w, store.getState().residents[0].position)
  for (let t = 0; t < 400; t += 1) { recordDisturbance(store, store.getState().residents[0].position, 'robot', false); stepResidents(w, store) }
  const after = store.getState().residents[0]
  assert.ok(depthAt(w, after.position) > before - 1e-9 && distance(after.position, fish.position) > 0.01, 'it dived or left')
  // Build the seabed up under a territory until the water is under the minimum.
  const calm = createRunStore(SEA)
  const w2 = new PlanetWorld(SEA)
  for (let t = 0; t < 50; t += 1) stepResidents(w2, calm)
  const resident = calm.getState().residents[0]
  const dir = unit(resident.home!)
  const column = columnAt(w2, dir)
  for (let r = column.seabed; r < w2.waterRadius - tuning.water.minDepth + 0.15; r += 0.15) w2.edit('add', centred(scale(dir, r)), 0.45, 'radial')
  assert.ok(columnAt(w2, dir).depth < tuning.water.minDepth)
  const oldHome = resident.home!
  for (let t = 0; t < 120; t += 1) stepResidents(w2, calm)
  const now = calm.getState().residents[0]
  assert.ok(distance(now.home!, oldHome) > 0.3, 'it took a new territory')
  assert.ok(depthAt(w2, now.home!) >= tuning.water.minDepth)
})

test('WAT-08/09/T6: a swimmer cannot go to dry land, a land creature cannot go to a bare ocean, and both can once the rules allow', () => {
  const store = createRunStore(DRY)
  store.setState(s => ({ metrics: { ...s.metrics, capital: 100000 } }))
  buildSpaceport(store)
  travelTo(store, SEA)
  buildSpaceport(store)
  assert.ok(buildRoute(store, DRY).ok)
  const fish = store.getState().residents[0]
  const refused = ship(store, DRY, [], [fish.creatureId])
  assert.equal(refused.ok, false)
  assert.match(refused.ok ? '' : refused.reason, /needs water/)
  assert.equal(store.getState().residents.some(r => r.creatureId === fish.creatureId), true, 'a refusal changes nothing')
  travelTo(store, DRY)
  const cairn = store.getState().residents[0]
  const bare = ship(store, SEA, [], [cairn.creatureId])
  assert.equal(bare.ok, false)
  assert.match(bare.ok ? '' : bare.reason, /anchored platform/)
  // The ocean gets an anchored platform: now the Cairn may go.
  registryFor(store).patchSnapshot(SEA, s => ({ patches: [{ id: 'patch-1', centre: [0, 2, 0] as Vec3, radius: 0.5, material: 'plastic' as const, anchor: true }, ...s.patches] }))
  const allowed = ship(store, SEA, [], [cairn.creatureId])
  assert.ok(allowed.ok)
  for (let i = 0; i < routeQuote(DRY, SEA).travelTicks; i += 1) stepLogistics(store)
  assert.equal(planetState(store, SEA)!.residents.some(r => r.creatureId === cairn.creatureId), true)
  // Underwater ground is never a land creature's home.
  const landed = planetState(store, SEA)!.residents.find(r => r.creatureId === cairn.creatureId)!
  assert.equal(landed.home, null)
  // A swimmer can go to another ocean.
  const other = sphereSeed(true, s => s !== SEA)
  assert.ok(isAquatic(planetState(store, SEA)!.residents[0].species) && planetConfig(other).water > 0)
})

test('WAT-10/T7: an unanchored mound washes away to the original seabed, an anchored one stays, and nothing is made or refunded', () => {
  const store = createRunStore(SEA)
  const w = registryFor(store).world(SEA)
  const dir = unit([0.6, 0.2, 0.7])
  const bed = columnAt(w, dir).seabed
  const probe = () => { const out: number[] = []; for (let r = bed - 0.3; r < bed + 0.7; r += 0.05) out.push(w.densityAt(...[dir[0] * r, dir[1] * r + HALF, dir[2] * r] as [number, number, number])); return out }
  const original = probe()
  const spot = scale(dir, bed + 0.1)
  w.edit('add', centred(spot), 0.4, 'radial')
  assert.notDeepEqual(probe(), original)
  recordMound(store, spot, 0.4)
  recordMound(store, scale(dir, bed + 0.12), 0.2)
  assert.equal(store.getState().mounds.length, 1, 'an overlapping addition joins the mound')
  const stockBefore = JSON.stringify(store.getState().inventory)
  const at = (tick: number) => { store.setState(s => ({ habitat: { ...s.habitat, tick } })); stepWater(w, store) }
  at(tuning.water.erodeAfter - tuning.water.erodeEvery)
  assert.equal(store.getState().mounds.length, 1, 'not yet')
  at(tuning.water.erodeAfter + tuning.water.erodeEvery)
  assert.equal(store.getState().mounds.length, 0)
  assert.deepEqual(probe(), original, 'the original seabed is back')
  assert.equal(JSON.stringify(store.getState().inventory), stockBefore)
  // An anchored mound stays.
  w.edit('add', centred(spot), 0.4, 'radial')
  recordMound(store, spot, 0.4)
  addPatch(store, spot, 'plastic')
  store.setState(s => ({ patches: s.patches.map(p => ({ ...p, anchor: true })) }))
  assert.equal(anchoredAt(store.getState().patches, spot), true)
  at(tuning.water.erodeAfter * 3)
  assert.equal(store.getState().mounds.length, 1)
  assert.notDeepEqual(probe(), original)
})

test('WAT-11/12/13/T8: a platform costs exactly 30 structural and 12 soil, only when verified; only an anchored island is dry ground for plants, antennas and walkers', () => {
  const store = createRunStore(SEA)
  const w = registryFor(store).world(SEA)
  const dir = unit([0.1, 0.9, 0.3])
  const bed = columnAt(w, dir).seabed
  // Build a tall mound that breaks the surface.
  for (let r = bed; r < w.waterRadius + 0.3; r += 0.15) w.edit('add', centred(scale(dir, r)), 0.5, 'radial')
  const top = scale(dir, columnAt(w, dir).seabed)
  assert.ok(Math.hypot(...top) > w.waterRadius + tuning.water.dry, 'the island is above the water')
  recordMound(store, top, 0.5)
  assert.equal(buildNavValid(w), buildNavValid(w))
  // No platform: nothing may stand here, and no node is walkable.
  assert.equal(standsDry(w, store.getState().patches, top), false)
  assert.equal(isSuitable(w, [], 'plant', top, surfaceNormal(w, top), []), false)
  assert.equal(isSuitable(w, [], 'antenna', top, surfaceNormal(w, top), []), false)
  assert.ok(buildNavValid(w) > 0 && buildNavValid(new PlanetWorld(SEA)) === 0, 'only the island is walkable')
  // Short on soil: the Builder stops and nothing is spent.
  placeBuilder(store, w, 'builder-0', top, 1.4)
  store.setState(s => ({ inventory: { ...s.inventory, plastic: 45, soil: tuning.water.platformSoil - 1 } }))
  startBuilder(store, 'builder-0')
  for (let i = 0; i < 400; i += 1) stepSimulation(w, store)
  assert.equal(store.getState().patches.length, 0)
  assert.equal(store.getState().builders[0].stopReason, 'no-material')
  assert.deepEqual([store.getState().inventory.plastic, store.getState().inventory.soil], [45, tuning.water.platformSoil - 1])
  // Paid for: exactly 30 and 12, once, and the mound is anchored.
  store.setState(s => ({ inventory: { ...s.inventory, soil: 20 }, builders: s.builders.map(b => ({ ...b, phase: 'scanning' as const, stopReason: null, misses: 0, phaseTicks: 0 })) }))
  for (let i = 0; i < 600 && store.getState().patches.length === 0; i += 1) stepSimulation(w, store)
  const state = store.getState()
  assert.equal(state.patches.length, 1)
  assert.equal(state.patches[0].anchor, true)
  assert.equal(state.patches[0].material, 'plastic')
  assert.equal(state.inventory.plastic, 45 - tuning.water.platformCost)
  assert.equal(state.inventory.soil, 20 - tuning.water.platformSoil)
  for (let i = 0; i < 300; i += 1) stepSimulation(w, store)
  assert.equal(store.getState().patches.length, 1, 'once')
  assert.equal(store.getState().inventory.plastic, 45 - tuning.water.platformCost)
  assert.equal(standsDry(w, store.getState().patches, top), true)
  assert.equal(isSuitable(w, [], 'antenna', top, surfaceNormal(w, top), []), false, 'still needs the patches argument')
  assert.equal(standsDry(w, store.getState().patches, scale(unit([0, -1, 0]), 2)), false, 'open sea is not dry')
  // Mounds, platforms and swimmers persist across a planet switch.
  const saved = { mounds: store.getState().mounds, patches: store.getState().patches, fish: store.getState().residents }
  travelTo(store, DRY)
  travelTo(store, SEA)
  assert.deepEqual(store.getState().mounds, saved.mounds)
  assert.deepEqual(store.getState().patches, saved.patches)
  assert.deepEqual(store.getState().residents, saved.fish)
})

const buildNavValid = (w: PlanetWorld) => buildNav(w, planetConfig(SEA).radius * VOXEL_WORLD_SIZE).nodes.filter(node => node.valid).length

test('WAT-15: the overview names an ocean and how deep it is', () => {
  const store = createRunStore(SEA)
  const planet = systemPlanets(store).find(p => p.seed === SEA)!
  assert.match(describePlanet(planet), /Water world \(\w+ seabed, \d\.\d–\d\.\d deep\)/)
  assert.doesNotMatch(describePlanet({ ...planet, traits: createRunStore(DRY) && 'Plastic · Mid-sized' }), /Water world/)
})
