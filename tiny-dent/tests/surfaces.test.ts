import assert from 'node:assert/strict'
import test from 'node:test'
import { surfaces, surfaceKinds, brushScale, type SurfaceKind } from '../src/content/surfaces'
import { tuning } from '../src/config/tuning'
import { createRunStore } from '../src/state/runState'
import { billManualTerrain, powerDemand, sellMinerals } from '../src/systems/economy'
import { recordDisturbance, planetSpecies } from '../src/systems/residents'
import { broadcast } from '../src/systems/signal'
import { PlanetWorld, burrowSites, planetConfig, surfaceOf } from '../src/world/planet'
import { HALF, surfaceRadius, type Vec3 } from '../src/systems/geometry'
import { burrowOpen, isValidHome } from '../src/systems/residents'
import { placeGardener, startGardener, stepGardeners } from '../src/systems/gardener'
import { placeBuilder, startBuilder, stepBuilders } from '../src/systems/builder'
import { crackBurrows, meltUnderRobots, stepSurface } from '../src/systems/surface'
import { shearDirection } from '../src/systems/shear'
import { commsMessages } from '../src/systems/comms'
import { addStructure } from '../src/systems/structures'
import { mergeChunks } from '../src/render/worldMesh'
import { generateResourceClusters } from '../src/world/resourceClusters'

// Captured before the material draw existed.
const PINNED = {
  '1380/signal-1': { radius: 0.1832, relief: 0.1929, minerals: 0.5506, residents: 1.96, shape: 'sphere' },
  'a/signal-1': { radius: 0.3289, relief: 0.1749, minerals: 0.4, residents: 1.1467, shape: 'sphere' },
  firstMineral: [-0.1521, -0.0063, -0.9117],
}

// The first seed in a fixed scan whose material is `kind`, optionally filtered further.
export function seedOf(kind: SurfaceKind, accept: (seed: string) => boolean = () => true) {
  for (let parent = 0; parent < 500; parent += 1) {
    for (let index = 1; index <= 5; index += 1) {
      const seed = `s${parent}/signal-${index}`
      if (planetConfig(seed).surface === kind && planetConfig(seed).water === 0 && accept(seed)) return seed
    }
  }
  throw new Error(`no planet of ${kind}`)
}

test('SUR-T1: home planets are rock, the draw is stable and every material occurs', () => {
  assert.equal(planetConfig('1380').surface, 'rock')
  assert.equal(planetConfig('anything').surface, 'rock')
  const seen = new Map<string, number>()
  for (let i = 0; i < 2000; i += 1) {
    const { surface } = planetConfig(`x${i}/signal-1`)
    seen.set(surface, (seen.get(surface) ?? 0) + 1)
    assert.equal(planetConfig(`x${i}/signal-1`).surface, surface)
  }
  for (const kind of surfaceKinds) assert.ok((seen.get(kind) ?? 0) > 80, `${kind} came up ${seen.get(kind)} times of 2000`)
  assert.ok(seen.get('rock')! < seen.get('metal')!, 'rock stays the rare draw')
})

test('SUR-T1: the surface draw moved no earlier seeded value', () => {
  const a = planetConfig('1380/signal-1'), b = planetConfig('a/signal-1')
  assert.deepEqual(
    [a.radius, a.relief, a.minerals, a.residents, a.shape].map(v => typeof v === 'number' ? Number(v.toFixed(4)) : v),
    [PINNED['1380/signal-1'].radius, PINNED['1380/signal-1'].relief, PINNED['1380/signal-1'].minerals, PINNED['1380/signal-1'].residents, PINNED['1380/signal-1'].shape])
  assert.deepEqual(
    [b.radius, b.relief, b.minerals, b.residents, b.shape].map(v => typeof v === 'number' ? Number(v.toFixed(4)) : v),
    [PINNED['a/signal-1'].radius, PINNED['a/signal-1'].relief, PINNED['a/signal-1'].minerals, PINNED['a/signal-1'].residents, PINNED['a/signal-1'].shape])
  assert.deepEqual(generateResourceClusters('1380/signal-1')[0].position.map(v => Number(v.toFixed(4))), PINNED.firstMineral)
})

test('SUR-T2: rock leaves the shared rules alone', () => {
  const rock = surfaces.rock
  assert.deepEqual([rock.hardness, rock.noise, rock.conductivity, rock.price, rock.population, brushScale(rock)], [1, 1, 1, 1, 1, 1])
  const store = createRunStore('1380')
  store.setState(s => ({ economy: { ...s.economy, mineralStock: 2 } }))
  assert.equal(sellMinerals(store), 2 * tuning.economy.mineralPrice)
  recordDisturbance(store, [1, 0, 0], 'manual', false)
  assert.equal(store.getState().habitat.sources[0].level, tuning.residents.disturbance.manual)
})

test('SUR-T2: metal is hard, loud, conductive and valuable, and doubles the Miner bill', () => {
  const store = createRunStore(seedOf('metal'))
  store.setState(s => ({ economy: { ...s.economy, mineralStock: 1 } }))
  assert.equal(sellMinerals(store), tuning.economy.mineralPrice * surfaces.metal.price)
  recordDisturbance(store, [1, 0, 0], 'robot', false)
  assert.equal(store.getState().habitat.sources[0].level, tuning.residents.disturbance.robot * 2)
  store.setState(s => ({ robots: s.robots.map(r => ({ ...r, phase: 'digging' as const })) }))
  assert.equal(powerDemand(store.getState()), tuning.economy.power.miner * 2)
  store.setState(s => ({ structures: [...s.structures, { id: 'a', kind: 'antenna', position: [1, 0, 0], normal: [1, 0, 0], bornTick: 0 }] }))
  assert.ok(broadcast(store))
  assert.equal(store.getState().signal.broadcastCount, 2)
  assert.equal(store.getState().signal.exposureScore, 2)
  const capital = store.getState().metrics.capital
  billManualTerrain(store, 100)
  assert.ok(Math.abs(capital - store.getState().metrics.capital - 100 * tuning.economy.manualTerrainRate * 2) < 1e-9)
  assert.ok(Math.abs(brushScale(surfaces.metal) ** 3 - 0.5) < 1e-9, 'one click removes half the volume')
})

test('SUR-T2: fur is quiet and plastic halves the Builder\'s work and thins the population', () => {
  const store = createRunStore(seedOf('fur'))
  recordDisturbance(store, [1, 0, 0], 'manual', false)
  assert.equal(store.getState().habitat.sources[0].level, tuning.residents.disturbance.manual / 2)
  assert.equal((surfaces.plastic.crew as { work: { builder: number } }).work.builder, 0.5)
  assert.ok(surfaceOf(seedOf('plastic')).population < 1)
  assert.equal(surfaceOf(seedOf('plastic')).plantable, false)
})

test('SUR-11: ice is Crystal Crown\'s home and fur is Moss Cap\'s, and siblings still differ', () => {
  const share = (kind: SurfaceKind, species: string) => {
    let hits = 0, total = 0
    for (let parent = 0; parent < 200; parent += 1) {
      const seed = `p${parent}/signal-1`
      if (planetConfig(seed).surface !== kind) continue
      total += 1
      if (planetSpecies(seed) === species) hits += 1
    }
    return hits / total
  }
  assert.ok(share('ice', 'crystal') > 0.6, `crystal on ice ${share('ice', 'crystal')}`)
  assert.ok(share('fur', 'moss') > 0.6, `moss on fur ${share('fur', 'moss')}`)
})

const groundAt = (world: PlanetWorld, direction: Vec3) => {
  const r = surfaceRadius(world.densityAt, direction)
  return { x: direction[0] * r, y: direction[1] * r + HALF, z: direction[2] * r, r }
}
const maxEdit = (world: PlanetWorld, channel: number) => world.chunks.reduce((most, { mesh }) => {
  for (let i = channel; i < mesh.edits.length; i += 3) most = Math.max(most, mesh.edits[i])
  return most
}, 0)

test('SUR-T3: aEdit is zero on a fresh planet, marks a dug wall and reaches every LOD and merged mesh', () => {
  const world = new PlanetWorld('1380')
  for (const { mesh } of world.chunks) assert.equal(mesh.edits.length, mesh.positions.length)
  assert.equal(maxEdit(world, 0), 0)
  const { x, y, z } = groundAt(world, [0, 1, 0])
  world.edit('dig', { x, y, z }, 0.5)
  world.remeshDirty(Infinity)
  assert.ok(maxEdit(world, 0) > 0.5, 'the wall of a pit is scarred')
  assert.equal(maxEdit(world, 1), 0, 'only fur goes bald')
  world.setLodCamera({ x: 0, y: 0, z: 14 }, Infinity)
  assert.ok(world.chunks.some(({ level }) => level > 0), 'some chunks are coarse')
  for (const { mesh } of world.chunks) assert.equal(mesh.edits.length, mesh.positions.length)
  const merged = mergeChunks(world)
  assert.equal(merged.getAttribute('aEdit').count, merged.getAttribute('position').count)
  assert.ok(maxEdit(world, 0) > 0.5, 'the scar survives the LOD rebuild')
})

test('SUR-T4: filling a pit keeps its scar', () => {
  const world = new PlanetWorld('1380')
  const ground = groundAt(world, [1, 0, 0])
  world.edit('dig', ground, 0.5)
  const wall = { x: ground.x - 0.3, y: ground.y, z: ground.z }
  const scar = world.wearNear(wall.x, wall.y, wall.z, 0)
  assert.equal(world.wearNear(ground.x + 0.3, ground.y, ground.z, 0), 0, 'air that stays air is no mark')
  assert.ok(scar > 0)
  world.edit('add', ground, 0.6)
  assert.ok(world.wearNear(wall.x, wall.y, wall.z, 0) >= scar)
})

test('SUR-T5: jelly returns to its original shape after a rest, and keeps the scar', () => {
  const seed = seedOf('jelly', candidate => planetConfig(candidate).shape === 'sphere')
  const world = new PlanetWorld(seed)
  const { x, y, z } = groundAt(world, [0, 0, 1])
  const untouched = world.densityAt(x, y, z - 0.2)
  world.edit('dig', { x, y, z }, 0.5)
  assert.ok(world.densityAt(x, y, z - 0.2) >= 0, 'the pit is open')
  assert.ok(world.planetRemaining < 1)
  assert.deepEqual(world.settle(1), [], 'a freshly edited chunk stays open')
  for (let elapsed = 0; elapsed < 180; elapsed += 0.25) world.settle(0.25)
  assert.equal(world.densityAt(x, y, z - 0.2), untouched, 'the ground is back')
  assert.equal(world.planetRemaining, 1)
  assert.ok(world.excavated > 0, 'what was dug stays counted')
  assert.ok(world.wearNear(x, y, z - 0.2, 0) > 0, 'the scar stays')
  assert.deepEqual(world.settle(10), [], 'nothing is left to settle')
})

test('SUR-T5: a jelly chunk under continuous edits stays open', () => {
  const world = new PlanetWorld(seedOf('jelly', candidate => planetConfig(candidate).shape === 'sphere'))
  const ground = groundAt(world, [0, 0, 1])
  for (let elapsed = 0; elapsed < 30; elapsed += 0.25) {
    world.edit('dig', ground, 0.5)
    world.settle(0.25)
  }
  assert.ok(world.densityAt(ground.x, ground.y, ground.z - 0.2) >= 0)
})

test('SUR-T5: rock and metal never settle', () => {
  const world = new PlanetWorld(seedOf('metal'))
  const ground = groundAt(world, [0, 0, 1])
  world.edit('dig', ground, 0.5)
  const open = world.densityAt(ground.x, ground.y, ground.z - 0.2)
  assert.deepEqual(world.settle(100), [])
  assert.equal(world.densityAt(ground.x, ground.y, ground.z - 0.2), open)
})

const sphereOf = (kind: SurfaceKind) => seedOf(kind, candidate => planetConfig(candidate).shape === 'sphere' && planetConfig(candidate).radius > 0.26)
const ground3 = (world: PlanetWorld, direction: Vec3): Vec3 => {
  const r = surfaceRadius(world.densityAt, direction)
  return [direction[0] * r, direction[1] * r, direction[2] * r]
}

test('SUR-T6: on plastic the Gardener stops with its own reason and plants nothing', () => {
  const seed = sphereOf('plastic')
  const world = new PlanetWorld(seed)
  const store = createRunStore(seed)
  placeGardener(store, world, 'gardener-0', ground3(world, [0, 1, 0]), 1.6)
  startGardener(store, 'gardener-0')
  for (let i = 0; i < 40; i += 1) stepGardeners(world, store)
  const gardener = store.getState().gardeners[0]
  assert.equal(gardener.stopReason, 'barren')
  assert.equal(store.getState().structures.length, 0)
  assert.ok(commsMessages(store.getState()).some(message => message.text === 'Nothing takes root in plastic.'))
})

test('SUR-T6: every shearing pattern stays inside the area and they differ', () => {
  const area = { center: [0, 2, 0] as Vec3, radius: 1.2 }
  const points = (pattern: 'stripes' | 'rings' | 'spiral') => {
    const out: Vec3[] = []
    for (let step = 0; ; step += 1) {
      const direction = shearDirection(pattern, area, step)
      if (!direction) return out
      out.push(direction)
      assert.ok(Math.hypot(direction[0] * 2, direction[2] * 2) <= 1.21, `${pattern} left the area`)
    }
  }
  const [stripes, rings, spiral] = [points('stripes'), points('rings'), points('spiral')]
  assert.ok(stripes.length > 20 && rings.length > 20 && spiral.length > 20)
  assert.notDeepEqual(stripes[3], rings[3])
  assert.notDeepEqual(rings[3], spiral[3])
})

test('SUR-T6: on fur the Gardener shears bald ground that regrows paler, and the planet keeps its shape', () => {
  const seed = sphereOf('fur')
  const world = new PlanetWorld(seed)
  const store = createRunStore(seed)
  const solid = world.planetRemaining
  const center = ground3(world, [0, 1, 0])
  placeGardener(store, world, 'gardener-0', center, 0.6)
  startGardener(store, 'gardener-0')
  for (let i = 0; i < 2400 && store.getState().gardeners[0].stopReason === null; i += 1) stepGardeners(world, store)
  const gardener = store.getState().gardeners[0]
  assert.equal(gardener.stopReason, 'pattern-done')
  assert.ok(gardener.placed > 5, `${gardener.placed} cuts`)
  assert.equal(store.getState().structures.length, 0, 'no plants on fur')
  assert.equal(world.planetRemaining, solid)
  world.remeshDirty(Infinity)
  assert.ok(maxEdit(world, 1) > 0.5, 'shaved ground is bald')
  for (let elapsed = 0; elapsed < 130; elapsed += 1) stepSurface(world, store, 1)
  world.remeshDirty(Infinity)
  assert.equal(maxEdit(world, 1), 0, 'the fur grew back')
  assert.ok(maxEdit(world, 0) >= tuning.surface.shear.scar - 1e-6, 'the scar stayed')
})

test('SUR-08: a shaved home no longer shelters a resident', () => {
  const seed = sphereOf('fur')
  const world = new PlanetWorld(seed)
  const home = createRunStore(seed).getState().residents.find(resident => !resident.burrowId)!.home!
  assert.ok(isValidHome(world, home))
  world.groom('shear', { x: home[0], y: home[1] + HALF, z: home[2] }, 0.3)
  assert.ok(!isValidHome(world, home))
})

test('SUR-08: on fur the Builder combs instead of cutting', () => {
  const seed = sphereOf('fur')
  const world = new PlanetWorld(seed)
  const store = createRunStore(seed)
  const solid = world.planetRemaining
  placeBuilder(store, world, 'builder-0', ground3(world, [0, 1, 0]), 0.8)
  startBuilder(store, 'builder-0')
  for (let i = 0; i < 400; i += 1) stepBuilders(world, store)
  world.remeshDirty(Infinity)
  assert.ok(store.getState().builders[0].done > 0)
  assert.ok(maxEdit(world, 2) > 0.5, 'the fur is combed')
  assert.ok(store.getState().economy.preparedSamples > 0)
  assert.equal(world.planetRemaining, solid, 'no rock was cut')
})

test('SUR-T7: ice breaks further than the brush, reproducibly', () => {
  const seed = sphereOf('ice')
  const dig = (world: PlanetWorld) => {
    const { x, y, z } = groundAt(world, [0, 0, 1])
    return world.edit('dig', { x, y, z }, 0.4)
  }
  const a = new PlanetWorld(seed), b = new PlanetWorld(seed)
  const rock = new PlanetWorld('1380')
  const first = dig(a)
  assert.deepEqual(dig(b), first)
  assert.ok(first.reach > 0.4, 'the damage reaches past the brush')
  assert.ok(first.removedSamples > dig(rock).removedSamples, 'a chip comes away')
  assert.equal(a.excavated, b.excavated)
  assert.equal(a.chips, 1)
  const { x, y, z } = groundAt(a, [0, 0.5, 1])
  assert.ok(a.wearNear(x, y, z, 0) >= 0, 'cracks are readable')
})

test('SUR-T7: a crack can block a burrow tunnel on ice', () => {
  const seed = sphereOf('ice')
  const world = new PlanetWorld(seed)
  const store = createRunStore(seed)
  const burrow = burrowSites(seed).find(candidate => burrowOpen(world, candidate))!
  const middle: Vec3 = [0, 1, 2].map(i => (burrow.mouth[i] + burrow.pocket[i]) / 2) as Vec3
  for (let i = 0; i < 40 && burrowOpen(world, burrow); i += 1) {
    world.chips += 1
    crackBurrows(world, store, middle)
  }
  assert.ok(!burrowOpen(world, burrow), 'some chip blocks it')
})

test('SUR-T7: a robot parked over ice sinks with the ground it melts', () => {
  const seed = sphereOf('ice')
  const world = new PlanetWorld(seed)
  const store = createRunStore(seed)
  const start = store.getState().robots[0].position
  const ground = Math.hypot(...start) - tuning.miner.hoverHeight
  for (let i = 0; i < tuning.surface.melt.afterTicks + tuning.surface.melt.everyTicks * 8; i += 1) meltUnderRobots(world, store)
  const now = store.getState().robots[0].position
  assert.ok(Math.hypot(...now) < Math.hypot(...start) - 0.05, 'the robot went down')
  assert.ok(surfaceRadius(world.densityAt, [start[0] / Math.hypot(...start), start[1] / Math.hypot(...start), start[2] / Math.hypot(...start)]) < ground)
  const rock = createRunStore('1380')
  const position = rock.getState().robots[0].position
  meltUnderRobots(new PlanetWorld('1380'), rock)
  assert.deepEqual(rock.getState().robots[0].position, position, 'nothing melts on rock')
})

test('SUR-09: rebound buries what stands in the pit and updates the planet', () => {
  const seed = sphereOf('jelly')
  const world = new PlanetWorld(seed)
  const store = createRunStore(seed)
  const direction: Vec3 = [0, 0, 1]
  const { x, y, z } = groundAt(world, direction)
  world.edit('dig', { x, y, z }, 0.5)
  const floor = ground3(world, direction)
  addStructure(store, 'antenna', floor, direction)
  store.setState({ planetRemaining: world.planetRemaining })
  for (let elapsed = 0; elapsed < 120; elapsed += 0.25) stepSurface(world, store, 0.25)
  assert.equal(store.getState().structures.length, 0, 'the ground closed over it')
  assert.equal(store.getState().planetRemaining, 1)
})

test('SUR-T8: excavation only ever rises', () => {
  const seed = sphereOf('jelly')
  const world = new PlanetWorld(seed)
  const store = createRunStore(seed)
  world.edit('dig', groundAt(world, [1, 0, 0]), 0.4)
  const dug = world.excavated
  assert.ok(dug > 0)
  world.edit('add', groundAt(world, [1, 0, 0]), 0.4)
  for (let elapsed = 0; elapsed < 60; elapsed += 0.25) stepSurface(world, store, 0.25)
  assert.equal(world.excavated, dug)
})
