import assert from 'node:assert/strict'
import test from 'node:test'
import { tuning } from '../src/config/tuning'
import { createRunStore } from '../src/state/runState'
import { distance, unit, type Vec3 } from '../src/systems/geometry'
import { nextJob, placeGardener, startGardener } from '../src/systems/gardener'
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

// AUT-15: the Gardener alternates plant, plant, antenna, on suitable ground inside its area, with one Start.
test('the Gardener alternates jobs and only builds on suitable ground in its area', () => {
  const { world, store, center, radius } = setup()
  assert.equal(startGardener(store, 'gardener-0'), true)
  run(world, store, 3000, () => gardenerOf(store).placed >= 6)
  const placed = store.getState().structures.slice(0, 6)
  assert.equal(placed.length, 6)
  assert.deepEqual(placed.map(({ kind }) => kind), ['plant', 'plant', 'antenna', 'plant', 'plant', 'antenna'])
  for (const structure of placed) {
    assert.ok(distance(structure.position, center) <= radius + 1e-6)
    assert.ok(isAnchored(world, structure.position, structure.normal))
    const limit = structure.kind === 'plant' ? tuning.gardener.plantMaxSlope : tuning.gardener.antennaMaxSlope
    assert.ok(slopeAt(structure.normal, structure.position) <= limit)
  }
  const antennas = placed.filter(({ kind }) => kind === 'antenna')
  assert.ok(distance(antennas[0].position, antennas[1].position) >= tuning.structures.antennaSpacing)
})

// Antennas favour high ground: each one stands higher than the plants placed just before it, on average.
test('antennas stand on higher ground than the plants around them', () => {
  const { world, store } = setup()
  startGardener(store, 'gardener-0')
  run(world, store, 3000, () => gardenerOf(store).placed >= 6)
  const placed = store.getState().structures.slice(0, 6)
  const height = (p: Vec3) => Math.hypot(...p)
  const plants = placed.filter(({ kind }) => kind === 'plant').map(({ position }) => height(position))
  const antennas = placed.filter(({ kind }) => kind === 'antenna').map(({ position }) => height(position))
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
  assert.ok(mean(antennas) > mean(plants))
})

test('the job pattern skips a kind whose cap is reached and stops when both are full', () => {
  assert.equal(nextJob(2, 0, 0), 'antenna')
  assert.equal(nextJob(2, 0, tuning.structures.maxAntennas), 'plant')
  assert.equal(nextJob(0, tuning.structures.maxPlants, 0), 'antenna')
  assert.equal(nextJob(0, tuning.structures.maxPlants, tuning.structures.maxAntennas), null)
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
