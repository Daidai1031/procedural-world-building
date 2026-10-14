import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { tuning } from '../src/config/tuning'
import { createRunStore } from '../src/state/runState'
import { isEmptyAt, pauseRobot, setWorkArea, spawnRobot, startRobot, stepMiners, surfaceRadius, type Vec3 } from '../src/systems/miner'
import { PlanetWorld } from '../src/world/planet'
import { VOXEL_WORLD_SIZE } from '../src/world/voxels/voxelMath.js'

const HALF = VOXEL_WORLD_SIZE / 2

function unit(v: Vec3): Vec3 {
  const length = Math.hypot(...v)
  return [v[0] / length, v[1] / length, v[2] / length]
}

// A work area whose center sits on the surface above the chosen mineral.
function areaAbove(world: PlanetWorld, position: Vec3, radius: number) {
  const direction = unit(position)
  const reach = surfaceRadius(world.densityAt, direction)
  return { center: direction.map((component) => component * reach) as Vec3, radius }
}

function setup(seed: string, radius: number = tuning.miner.area.max) {
  const world = new PlanetWorld(seed)
  const store = createRunStore(seed)
  const minerals = store.getState().resourceClusters.filter(({ category }) => category === 'mineral')
  const area = areaAbove(world, minerals[0].position, radius)
  const eligible = minerals.filter(({ position }) => Math.hypot(
    position[0] - area.center[0], position[1] - area.center[1], position[2] - area.center[2]) <= radius)
  setWorkArea(store, 'miner-0', area)
  return { world, store, area, minerals, eligible }
}

function run(world: PlanetWorld, store: ReturnType<typeof createRunStore>, maxTicks: number,
  until: () => boolean = () => false) {
  const trace: Vec3[] = []
  for (let tick = 0; tick < maxTicks; tick += 1) {
    stepMiners(world, store)
    trace.push([...store.getState().robots[0].position])
    if (until()) break
  }
  return trace
}

const robotOf = (store: ReturnType<typeof createRunStore>) => store.getState().robots[0]

// AUT-T1: one Start, two complete scan / move / dig / collect cycles, no further input.
test('a started Miner collects two minerals without more input', () => {
  const { world, store, eligible } = setup('1380')
  assert.ok(eligible.length >= 2, 'the test area must hold at least two minerals')
  assert.equal(startRobot(store, 'miner-0'), true)
  run(world, store, 6000, () => robotOf(store).collectedMinerals >= 2)
  assert.ok(robotOf(store).collectedMinerals >= 2)
  assert.ok(store.getState().collectedIds.length >= 2)
  assert.ok(store.getState().collectedIds.every((id) => id.startsWith('mineral-')))
  assert.ok(world.planetRemaining < 1)
})

// A robot that spawns far from its area flies there before scanning.
test('a Miner assigned to a distant area travels there first and then mines', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  const spawn = robotOf(store).position
  const minerals = store.getState().resourceClusters.filter(({ category }) => category === 'mineral')
  const far = minerals.reduce((best, mineral) => Math.hypot(...mineral.position.map((v, i) => v - spawn[i]))
    > Math.hypot(...best.position.map((v, i) => v - spawn[i])) ? mineral : best)
  const area = areaAbove(world, far.position, tuning.miner.area.min + 0.4)
  setWorkArea(store, 'miner-0', area)
  startRobot(store, 'miner-0')
  run(world, store, 6000, () => robotOf(store).collectedMinerals >= 1)
  assert.ok(Math.hypot(...far.position.map((v, i) => v - spawn[i])) > tuning.miner.scanRange)
  assert.ok(robotOf(store).collectedMinerals >= 1)
})

// AUT-T2: travel never leaves empty space, and the tunnel is real density.
test('every position and travel segment stays in empty space, and the tunnel is carved density', () => {
  const { world, store } = setup('1380')
  startRobot(store, 'miner-0')
  const trace = [[...robotOf(store).position] as Vec3]
  trace.push(...run(world, store, 6000, () => robotOf(store).collectedMinerals >= 1))
  assert.ok(robotOf(store).collectedMinerals >= 1)
  for (let i = 0; i < trace.length; i += 1) {
    assert.ok(isEmptyAt(world, trace[i]), `tick ${i} is inside solid terrain`)
    if (i === 0) continue
    for (const t of [0.25, 0.5, 0.75]) {
      const p = trace[i - 1].map((value, axis) => value + (trace[i][axis] - value) * t) as Vec3
      assert.ok(isEmptyAt(world, p), `segment ${i} crosses solid terrain`)
    }
  }
  const [mineral] = store.getState().collectedIds
  const cluster = store.getState().resourceClusters.find(({ id }) => id === mineral)!
  assert.ok(world.densityAt(cluster.position[0], cluster.position[1] + HALF, cluster.position[2]) >= 0)
})

// AUT-T3: targets outside the area stay unknown and untouched; each target is collected once.
test('minerals outside the area are never discovered or collected', () => {
  const { world, store, area } = setup('1380', tuning.miner.area.min)
  startRobot(store, 'miner-0')
  run(world, store, 6000, () => ['stopped'].includes(robotOf(store).phase))
  const robot = robotOf(store)
  const outside = store.getState().resourceClusters.filter(({ category, position }) => category === 'mineral'
    && Math.hypot(position[0] - area.center[0], position[1] - area.center[1], position[2] - area.center[2]) > area.radius)
  assert.ok(outside.length > 0)
  for (const { id } of outside) {
    assert.ok(!robot.knownTargetIds.includes(id))
    assert.ok(!store.getState().collectedIds.includes(id))
  }
  assert.equal(new Set(store.getState().collectedIds).size, store.getState().collectedIds.length)
})

// AUT-T4: Pause freezes everything; an empty area stops with a readable reason.
test('Pause freezes the robot and an empty area stops with no-targets', () => {
  const { world, store } = setup('1380')
  startRobot(store, 'miner-0')
  run(world, store, 40)
  pauseRobot(store, 'miner-0')
  const frozen = JSON.stringify(robotOf(store))
  const remaining = world.planetRemaining
  run(world, store, 50)
  assert.equal(robotOf(store).phase, 'paused')
  assert.equal(JSON.stringify(robotOf(store).position), JSON.stringify(JSON.parse(frozen).position))
  assert.equal(world.planetRemaining, remaining)
  startRobot(store, 'miner-0')
  assert.notEqual(robotOf(store).phase, 'paused')

  // Reassignment discards the task and waits for Start. Search for a patch of surface with no mineral under it.
  const fresh = setup('1380')
  let empty = null
  for (let i = 0; i < 200 && !empty; i += 1) {
    const y = 1 - (2 * i + 1) / 200
    const ring = Math.sqrt(1 - y * y)
    const candidate = areaAbove(fresh.world, [Math.cos(i * 2.4) * ring, y, Math.sin(i * 2.4) * ring], tuning.miner.area.min)
    const nearby = fresh.minerals.some(({ position }) => Math.hypot(
      position[0] - candidate.center[0], position[1] - candidate.center[1], position[2] - candidate.center[2]) <= candidate.radius)
    if (!nearby) empty = candidate
  }
  assert.ok(empty, 'the seed has a surface patch with no mineral')
  setWorkArea(fresh.store, 'miner-0', empty)
  assert.equal(robotOf(fresh.store).phase, 'idle')
  startRobot(fresh.store, 'miner-0')
  run(fresh.world, fresh.store, 400, () => robotOf(fresh.store).phase === 'stopped')
  assert.equal(robotOf(fresh.store).stopReason, 'no-targets')
})

// AUT-T5: edits made while the robot works change its decision.
test('a target collected by hand while the robot works is dropped', () => {
  const { world, store, eligible } = setup('1380')
  startRobot(store, 'miner-0')
  run(world, store, 40, () => robotOf(store).targetId !== null)
  const target = robotOf(store).targetId!
  assert.ok(eligible.some(({ id }) => id === target))
  store.setState((state) => ({ collectedIds: [...state.collectedIds, target] }))
  stepMiners(world, store)
  assert.notEqual(robotOf(store).targetId, target)
  assert.equal(robotOf(store).phase, 'scanning')
})

// AUT-T6: same seed and commands reproduce target order and terrain; another seed differs.
test('the same seed and tick-indexed commands reproduce the same run', () => {
  function replay(seed: string) {
    const { world, store } = setup(seed)
    startRobot(store, 'miner-0')
    run(world, store, 500)
    const hash = createHash('sha256')
    for (const { mesh } of world.chunks) hash.update(new Uint8Array(mesh.positions.buffer))
    world.remeshDirty(1e9)
    for (const { mesh } of world.chunks) hash.update(new Uint8Array(mesh.positions.buffer))
    return { collected: store.getState().collectedIds, robot: robotOf(store), remaining: world.planetRemaining, hash: hash.digest('hex') }
  }
  const a = replay('1380')
  const b = replay('1380')
  assert.deepEqual(a, b)
  assert.notDeepEqual(replay('9001').robot.position, a.robot.position)
})

test('the Miner spawn is seeded and starts idle above the surface', () => {
  assert.deepEqual(spawnRobot('1380'), spawnRobot('1380'))
  assert.notDeepEqual(spawnRobot('1380').position, spawnRobot('1381').position)
  const robot = spawnRobot('1380')
  assert.equal(robot.phase, 'idle')
  assert.ok(Math.hypot(...robot.position) > Math.hypot(...robot.area!.center))
})

// AUT-12: at most one bounded terrain edit per robot per step.
test('a step edits a bounded number of samples', () => {
  const { world, store } = setup('1380')
  startRobot(store, 'miner-0')
  let largest = 0
  let previous = world.planetRemaining
  for (let i = 0; i < 1500; i += 1) {
    stepMiners(world, store)
    largest = Math.max(largest, Math.abs(previous - world.planetRemaining))
    previous = world.planetRemaining
  }
  const samples = (2 * tuning.miner.digRadius * (tuning.grid.resolution - 1) / VOXEL_WORLD_SIZE + 2) ** 3
  assert.ok(largest * world.initialSolidCount <= samples)
})
