import assert from 'node:assert/strict'
import test from 'node:test'
import { tuning } from '../src/config/tuning'
import { createRunStore } from '../src/state/runState'
import { distance, dot, scale, unit, type Vec3 } from '../src/systems/geometry'
import { isProtected, measureLevel, placeBuilder, startBuilder, type BuilderJob } from '../src/systems/builder'
import { setWorkArea, startRobot, stepMiners } from '../src/systems/miner'
import { stepSimulation } from '../src/systems/simulation'
import { addStructure, groundPoint, surfaceNormal } from '../src/systems/structures'
import { PlanetWorld } from '../src/world/planet'

type Store = ReturnType<typeof createRunStore>
const builderOf = (store: Store) => store.getState().builders[0]

// Ground heights sampled evenly over the area, for measuring how level it is.
function heights(world: PlanetWorld, center: Vec3, radius: number) {
  const values: number[] = []
  for (let i = 0; i < 600; i += 1) {
    const y = 1 - (2 * i + 1) / 600
    const ring = Math.sqrt(1 - y * y)
    const ground = groundPoint(world, [Math.cos(i * 2.4) * ring, y, Math.sin(i * 2.4) * ring])
    if (distance(ground, center) <= radius) values.push(Math.hypot(...ground))
  }
  return values
}
const spread = (values: number[]) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length)
}

// Mine first so the area has tunnels and the stock has soil, then let the Builder work.
function minedSite(seed = '1380') {
  const world = new PlanetWorld(seed)
  const store = createRunStore(seed)
  const mineral = store.getState().resourceClusters.find(({ category }) => category === 'mineral')!
  const center = groundPoint(world, unit(mineral.position))
  setWorkArea(store, 'miner-0', { center, radius: 1.6 })
  startRobot(store, 'miner-0')
  for (let i = 0; i < 8000 && store.getState().robots[0].phase !== 'stopped'; i += 1) stepMiners(world, store)
  return { world, store, center }
}

function runBuilder(world: PlanetWorld, store: Store, ticks: number) {
  const jobs: { kind: BuilderJob; ground: Vec3 }[] = []
  for (let i = 0; i < ticks; i += 1) {
    const before = builderOf(store)
    stepSimulation(world, store)
    const after = builderOf(store)
    if (before.job && !after.job && after.done > before.done) jobs.push(before.job)
    if (after.phase === 'stopped') break
  }
  return jobs
}

test('Miner digging puts soil in stock', () => {
  const { store } = minedSite()
  assert.ok(store.getState().robots[0].collectedMinerals >= 1)
  assert.ok(store.getState().soil > 0)
})

// D-026: flatten and fill alternate, and the area ends up more level than it started.
test('the Builder alternates flatten and fill and levels its area', () => {
  const { world, store, center } = minedSite()
  const radius = tuning.builder.area.default
  const before = spread(heights(world, center, radius))
  placeBuilder(store, world, 'builder-0', center, radius)
  startBuilder(store, 'builder-0')
  const jobs = runBuilder(world, store, 30000)
  assert.equal(builderOf(store).phase, 'stopped')
  assert.ok(['level', 'no-soil'].includes(builderOf(store).stopReason!))
  assert.ok(jobs.some(({ kind }) => kind === 'flatten'))
  assert.ok(jobs.some(({ kind }) => kind === 'fill'))
  // The pattern is flatten, fill; a job only repeats when the other had nothing to do.
  assert.equal(jobs[0].kind, 'flatten')
  assert.ok(spread(heights(world, center, radius)) < before)
})

// Starting from an empty stock, every fill is paid for by soil already cut or dug.
test('the Builder only fills when the stock holds enough soil', () => {
  const { world, store, center } = minedSite()
  store.setState({ soil: 0 })
  const radius = tuning.builder.area.default
  placeBuilder(store, world, 'builder-0', center, radius)
  startBuilder(store, 'builder-0')
  const fills: Vec3[] = []
  for (let i = 0; i < 30000 && builderOf(store).phase !== 'stopped'; i += 1) {
    const soil = store.getState().soil
    const job = builderOf(store).job
    stepSimulation(world, store)
    if (job?.kind === 'fill' && !builderOf(store).job) {
      assert.ok(soil >= tuning.builder.fillCost)
      fills.push(job.ground)
    }
  }
  assert.ok(store.getState().soil >= 0)
})

// It leaves the ground around plants and antennas alone.
test('the Builder never shapes ground next to a plant or antenna', () => {
  const { world, store, center } = minedSite()
  const radius = tuning.builder.area.default
  const plantAt = groundPoint(world, unit(scale(center, 1)))
  addStructure(store, 'plant', plantAt, surfaceNormal(world, plantAt))
  const planted = store.getState().structures.length
  placeBuilder(store, world, 'builder-0', center, radius)
  startBuilder(store, 'builder-0')
  const jobs = runBuilder(world, store, 30000)
  for (const job of jobs) {
    const reach = job.kind === 'flatten' ? tuning.builder.flattenRadius : tuning.builder.fillRadius
    assert.ok(distance(job.ground, plantAt) >= reach + tuning.builder.structureMargin)
  }
  assert.ok(store.getState().structures.length >= planted, 'the plant is still standing')
})

// It does not shape ground on the line of a tunnel a Miner is digging.
test('ground on a live Miner tunnel is protected', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  const mineral = store.getState().resourceClusters.find(({ category }) => category === 'mineral')!
  const entry = groundPoint(world, unit(mineral.position))
  setWorkArea(store, 'miner-0', { center: entry, radius: 2.4 })
  startRobot(store, 'miner-0')
  for (let i = 0; i < 3000 && store.getState().robots[0].phase !== 'digging'; i += 1) stepMiners(world, store)
  const miner = store.getState().robots[0]
  assert.equal(miner.phase, 'digging')
  const target = store.getState().resourceClusters.find(({ id }) => id === miner.targetId)!
  const line = unit(target.position)
  const onLine = groundPoint(world, line)
  assert.equal(isProtected(store, onLine, tuning.builder.fillRadius), true)
  // Far from the tunnel and from any structure: free to shape.
  const far = groundPoint(world, scale(line, -1))
  assert.ok(dot(far, line) < 0)
  assert.equal(isProtected(store, far, tuning.builder.fillRadius), false)
})

test('the level is measured from the area and the run is reproducible', () => {
  function build() {
    const { world, store, center } = minedSite()
    placeBuilder(store, world, 'builder-0', center, tuning.builder.area.default)
    const level = measureLevel(world, '1380', builderOf(store))
    startBuilder(store, 'builder-0')
    runBuilder(world, store, 1200)
    return { level, robot: builderOf(store), soil: store.getState().soil, remaining: world.planetRemaining }
  }
  const a = build()
  assert.ok(a.level! > 1 && a.level! < 3)
  assert.deepEqual(a, build())
})
