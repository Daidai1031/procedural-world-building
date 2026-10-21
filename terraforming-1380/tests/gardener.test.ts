import { placeBuilder, startBuilder } from '../src/systems/builder'
import { notifyGroundChanged } from '../src/systems/workSites'
import assert from 'node:assert/strict'
import test from 'node:test'
import { tuning } from '../src/config/tuning'
import { createRunStore } from '../src/state/runState'
import { distance, unit, type Vec3 } from '../src/systems/geometry'
import { pauseGardener, placeGardener, startGardener } from '../src/systems/gardener'
import { placeRigger, startRigger } from '../src/systems/rigger'
import { placerFull } from '../src/systems/placer'
import { setWorkArea, startRobot, stepMiners } from '../src/systems/miner'
import { stepSimulation } from '../src/systems/simulation'
import {
  addStructure, groundPoint, isAnchored, isSuitable, plantStage, pruneStructures, slopeAt, stepStructures, surfaceNormal,
} from '../src/systems/structures'
import { PlanetWorld } from '../src/world/planet'
import { VOXEL_WORLD_SIZE } from '../src/world/voxels/voxelMath.js'

const HALF = VOXEL_WORLD_SIZE / 2
type Store = ReturnType<typeof createRunStore>

function setup(seed = '1380', radius: number = tuning.gardener.area.max, direction: Vec3 = [0, 0, 1]) {
  const world = new PlanetWorld(seed)
  const store = createRunStore(seed)
  const center = groundPoint(world, unit(direction))
  placeGardener(store, world, 'gardener-0', center, radius)
  return { world, store, center, radius }
}

function run(world: PlanetWorld, store: Store, ticks: number, until: () => boolean = () => false) {
  for (let i = 0; i < ticks; i += 1) {
    stepSimulation(world, store)
    if (until()) return i + 1
  }
  return ticks
}

const gardenerOf = (store: Store) => store.getState().gardeners[0]
const riggerOf = (store: Store) => store.getState().riggers[0]

function setupRigger(seed = '1380', radius: number = tuning.rigger.area.max, direction: Vec3 = [0, 0, 1]) {
  const world = new PlanetWorld(seed)
  const store = createRunStore(seed)
  const center = groundPoint(world, unit(direction))
  placeRigger(store, world, 'rigger-0', center, radius)
  return { world, store, center, radius }
}

// A flat, suitable spot for a test plant near a direction.
function plantSpot(world: PlanetWorld, store: Store) {
  for (let i = 0; i < 400; i += 1) {
    const y = 1 - (2 * i + 1) / 400
    const ring = Math.sqrt(1 - y * y)
    const anchor = groundPoint(world, [Math.cos(i * 2.4) * ring, y, Math.sin(i * 2.4) * ring])
    const normal = surfaceNormal(world, anchor)
    if (isSuitable(world, store.getState().structures, 'plant', anchor, normal)) return { anchor, normal }
  }
  throw new Error('no flat ground on this seed')
}

// AUT-14, D-057: the Gardener only plants, on suitable ground inside its area, with one Start.
test('the Gardener only plants, on suitable ground in its area', () => {
  const { world, store, center, radius } = setup()
  assert.equal(startGardener(store, 'gardener-0'), true)
  run(world, store, 3000, () => gardenerOf(store).placed >= 6)
  const placed = store.getState().structures.slice(0, 6)
  assert.equal(placed.length, 6)
  assert.ok(placed.every(({ kind }) => kind === 'plant'))
  for (const structure of placed) {
    assert.ok(distance(structure.position, center) <= radius + 1e-6)
    assert.ok(isAnchored(world, structure.position, structure.normal))
    assert.ok(slopeAt(structure.normal, structure.position) <= tuning.gardener.plantMaxSlope)
  }
})

// AUT-15, D-057: the Rigger only raises antennas, far apart, on high suitable ground inside its area.
test('the Rigger only raises antennas, spaced apart, on suitable ground in its area', () => {
  const { world, store, center, radius } = setupRigger()
  assert.equal(startRigger(store, 'rigger-0'), true)
  run(world, store, 3000, () => riggerOf(store).placed >= 2)
  const placed = store.getState().structures
  assert.ok(placed.length >= 2)
  assert.ok(placed.every(({ kind }) => kind === 'antenna'))
  for (const structure of placed) {
    assert.ok(distance(structure.position, center) <= radius + 1e-6)
    assert.ok(isAnchored(world, structure.position, structure.normal))
    assert.ok(slopeAt(structure.normal, structure.position) <= tuning.rigger.antennaMaxSlope)
  }
  assert.ok(distance(placed[0].position, placed[1].position) >= tuning.structures.antennaSpacing)
  assert.equal(store.getState().structures.filter(({ kind }) => kind === 'plant').length, 0)
})

// Antennas favour high ground: the Rigger's first antenna stands higher than the mean height of the ground in its area.
test('the Rigger picks high ground', () => {
  const { world, store, center, radius } = setupRigger()
  startRigger(store, 'rigger-0')
  run(world, store, 600, () => riggerOf(store).placed >= 1)
  const [antenna] = store.getState().structures
  const height = (p: Vec3) => Math.hypot(...p)
  const samples = Array.from({ length: 80 }, (_, i) => {
    const angle = i * 2.4, reach = Math.sqrt((i + 0.5) / 80) * radius
    const side = unit([-center[2], 0, center[0]])
    const around = unit([center[0] + side[0] * Math.cos(angle) * reach, center[1] + Math.sin(angle) * reach, center[2] + side[2] * Math.cos(angle) * reach])
    return height(groundPoint(world, around))
  })
  assert.ok(height(antenna.position) >= samples.reduce((a, b) => a + b, 0) / samples.length)
})

test('each robot stops once the planet holds its structure cap', () => {
  const state = createRunStore('1380').getState()
  const structure = (kind: 'plant' | 'antenna') => ({ kind }) as unknown as typeof state.structures[number]
  assert.equal(placerFull({ structures: [] }, 'plant'), false)
  assert.equal(placerFull({ structures: Array.from({ length: tuning.structures.maxPlants }, () => structure('plant')) }, 'plant'), true)
  assert.equal(placerFull({ structures: Array.from({ length: tuning.structures.maxPlants }, () => structure('plant')) }, 'antenna'), false)
  assert.equal(placerFull({ structures: Array.from({ length: tuning.structures.maxAntennas }, () => structure('antenna')) }, 'antenna'), true)
})

// AUT-16: plants grow by age and spread once mature.
test('plants grow in stages and seed neighbours once mature', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  const { anchor, normal } = plantSpot(world, store)
  addStructure(store, 'plant', anchor, normal)
  const [first] = store.getState().structures
  assert.equal(plantStage(first, 0), 0)
  assert.equal(plantStage(first, tuning.structures.growTicks), 1)
  const mature = (tuning.structures.stages - 1) * tuning.structures.growTicks
  for (let tick = 1; tick <= mature + tuning.structures.spreadTicks * 6; tick += 1) {
    store.setState({ simTick: tick })
    stepStructures(world, store)
  }
  const plants = store.getState().structures
  assert.ok(plants.length > 1, 'a mature plant seeds at least one neighbour')
  assert.ok(plants.length <= tuning.structures.maxPlants)
  assert.equal(new Set(plants.map(({ id }) => id)).size, plants.length)
  for (const plant of plants.slice(1)) {
    assert.ok(distance(plant.position, first.position) <= tuning.structures.spreadRadius * 3)
    assert.ok(isAnchored(world, plant.position, plant.normal))
  }
})

// Terrain edits remove structures whose ground is gone: dug away or buried.
test('digging or burying the ground removes a structure', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  const { anchor, normal } = plantSpot(world, store)
  addStructure(store, 'plant', anchor, normal)
  world.edit('dig', { x: anchor[0], y: anchor[1] + HALF, z: anchor[2] }, 0.3)
  assert.equal(pruneStructures(world, store), 1)
  assert.equal(store.getState().structures.length, 0)

  const second = plantSpot(world, store)
  addStructure(store, 'antenna', second.anchor, second.normal)
  world.edit('add', { x: second.anchor[0], y: second.anchor[1] + HALF, z: second.anchor[2] }, 0.4)
  assert.equal(pruneStructures(world, store), 1)
})

// The Miner's tunnel destroys a plant standing on its entry.
test('a Miner digging its entry destroys the plant standing there', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  const mineral = store.getState().resourceClusters.find(({ category }) => category === 'mineral')!
  const entry = groundPoint(world, unit(mineral.position))
  const normal = surfaceNormal(world, entry)
  assert.ok(isAnchored(world, entry, normal), 'the entry must hold a plant for this test')
  addStructure(store, 'plant', entry, normal)
  setWorkArea(store, 'miner-0', { center: entry, radius: tuning.miner.area.max })
  startRobot(store, 'miner-0')
  for (let i = 0; i < 6000 && store.getState().structures.length > 0; i += 1) stepMiners(world, store)
  assert.equal(store.getState().structures.length, 0)
})

test('the same seed reproduces the same garden', () => {
  function grow(seed: string) {
    const { world, store } = setup(seed)
    startGardener(store, 'gardener-0')
    run(world, store, 1500)
    return store.getState().structures
  }
  assert.deepEqual(grow('1380'), grow('1380'))
})

test('a full area stops the Gardener with no-sites', () => {
  const { world, store } = setup('1380', tuning.gardener.area.min)
  startGardener(store, 'gardener-0')
  run(world, store, 30000, () => gardenerOf(store).phase === 'stopped')
  assert.equal(gardenerOf(store).phase, 'stopped')
  assert.equal(gardenerOf(store).stopReason, 'no-sites')
})


test('Builder preparation wakes a waiting Gardener and Rigger without moving them', () => {
  const { world, store, center } = setup('1380', 1.2)
  placeRigger(store, world, 'rigger-0', center, 1.2)
  store.setState(state => ({ soil: 5000,
    gardeners: state.gardeners.map(robot => ({ ...robot, phase: 'stopped', stopReason: 'no-sites' })),
    riggers: state.riggers.map(robot => ({ ...robot, phase: 'stopped', stopReason: 'no-sites' })) }))
  placeBuilder(store, world, 'builder-0', center, 1.2)
  startBuilder(store, 'builder-0')
  run(world, store, 2400, () => gardenerOf(store).placed >= 2 && riggerOf(store).placed >= 1)
  assert.ok(store.getState().preparedSites.length > 0, 'Builder must have changed real ground')
  const kinds = store.getState().structures.map(s => s.kind)
  assert.ok(kinds.includes('plant') && kinds.includes('antenna'))
  assert.deepEqual(gardenerOf(store).area?.center, center)
  assert.deepEqual(riggerOf(store).area?.center, center)
  assert.equal(gardenerOf(store).stopReason, null)
  assert.equal(riggerOf(store).stopReason, null)
  for (const structure of store.getState().structures) {
    assert.ok(isAnchored(world, structure.position, structure.normal))
    assert.ok(distance(structure.position, center) <= 1.2)
  }
})

test('terrain changes outside the work area do not wake a waiting Gardener; explicit pause is respected', () => {
  const { store, center } = setup('1380', 0.6)
  store.setState(state => ({ gardeners: state.gardeners.map(robot => ({ ...robot, phase: 'stopped', stopReason: 'no-sites' })) }))
  notifyGroundChanged(store, [0, 0, -2], 0.2)
  assert.equal(gardenerOf(store).phase, 'stopped')
  pauseGardener(store, 'gardener-0')
  notifyGroundChanged(store, center, 0.3)
  assert.equal(gardenerOf(store).phase, 'paused')
  assert.equal(gardenerOf(store).resumePhase, 'scanning')
  startGardener(store, 'gardener-0')
  assert.equal(gardenerOf(store).phase, 'scanning')
})
