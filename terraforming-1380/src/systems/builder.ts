import { notifyGroundChanged } from './workSites'
import { recordDisturbance } from './residents'
import type { createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { createPlanetField, hashSeed, type PlanetWorld } from '../world/planet'
import { randomStream } from '../world/resourceClusters'
import { add, distance, dot, HALF, hoverGoal, hoverStep, scale, surfaceRadius, unit, type Vec3 } from './geometry'
import type { WorkArea } from './miner'
import { groundPoint, pruneStructures } from './structures'

type RunStore = ReturnType<typeof createRunStore>
const rules = tuning.builder

export type BuilderJob = 'flatten' | 'fill'
export type BuilderPhase = 'idle' | 'scanning' | 'moving' | 'working' | 'paused' | 'stopped'
export type BuilderStopReason = 'level' | 'no-soil' | 'blocked'

// D-026/D-050: one robot that repairs local holes first, then trims isolated obstructions.
export interface BuilderState {
  id: string
  position: Vec3
  area: WorkArea | null
  phase: BuilderPhase
  // Seeded reference height retained for stable surveys and autopilot hand-off.
  level: number | null
  job: { kind: BuilderJob; ground: Vec3 } | null
  done: number
  surveys: number
  misses: number
  stopReason: BuilderStopReason | null
  phaseTicks: number
  resumePhase: BuilderPhase | null
}

export function spawnBuilder(seed: string, index = 0): BuilderState {
  const random = randomStream(hashSeed(`${seed}:builder:${index}`))
  const height = random() * 2 - 1
  const angle = random() * Math.PI * 2
  const ring = Math.sqrt(1 - height * height)
  const direction: Vec3 = [Math.cos(angle) * ring, height, Math.sin(angle) * ring]
  const radius = surfaceRadius(createPlanetField(seed), direction)
  return {
    id: `builder-${index}`,
    position: scale(direction, radius + rules.hoverHeight),
    area: { center: scale(direction, radius), radius: rules.area.default },
    phase: 'idle', level: null, job: null, done: 0, surveys: 0, misses: 0, stopReason: null, phaseTicks: 0, resumePhase: null,
  }
}

function update(store: RunStore, id: string, change: (robot: BuilderState) => BuilderState) {
  store.setState((state) => ({ builders: state.builders.map((robot) => robot.id === id ? change(robot) : robot) }))
}

// A new center discards the job and the measured level, and waits for Start; a new radius only resizes the area.
export function setBuilderArea(store: RunStore, id: string, area: WorkArea) {
  update(store, id, (robot) => {
    const moved = !robot.area || distance(robot.area.center, area.center) > 1e-6
    if (!moved) return { ...robot, area, level: null }
    return { ...robot, area, phase: 'idle', level: null, job: null, misses: 0, stopReason: null, phaseTicks: 0, resumePhase: null }
  })
}

export function placeBuilder(store: RunStore, world: Pick<PlanetWorld, 'densityAt'>, id: string, center: Vec3, radius: number) {
  setBuilderArea(store, id, { center, radius })
  const position = hoverGoal(world.densityAt, unit(center), rules.hoverHeight)
  update(store, id, (robot) => ({ ...robot, position }))
}

export function startBuilder(store: RunStore, id: string) {
  const robot = store.getState().builders.find((candidate) => candidate.id === id)
  if (!robot?.area) return false
  update(store, id, (current) => {
    if (current.phase === 'paused') return { ...current, phase: current.resumePhase ?? 'scanning', resumePhase: null }
    if (current.phase === 'idle' || current.phase === 'stopped') {
      return { ...current, phase: 'scanning', stopReason: null, misses: 0, phaseTicks: 0 }
    }
    return current
  })
  return true
}

export function pauseBuilder(store: RunStore, id: string) {
  update(store, id, (robot) => ['scanning', 'moving', 'working'].includes(robot.phase)
    ? { ...robot, phase: 'paused', resumePhase: robot.phase } : robot)
}

function areaPoints(world: PlanetWorld, seed: string, key: string, area: WorkArea, count: number) {
  const random = randomStream(hashSeed(key))
  const points: Vec3[] = []
  for (let i = 0; i < count; i += 1) {
    const offset: Vec3 = [random() * 2 - 1, random() * 2 - 1, random() * 2 - 1]
    const ground = groundPoint(world, unit(add(area.center, scale(offset, area.radius))))
    if (distance(ground, area.center) <= area.radius) points.push(ground)
  }
  return points
}

// A stable reference height for the area. D-050 no longer flattens every point to it.
export function measureLevel(world: PlanetWorld, seed: string, robot: Pick<BuilderState, 'id' | 'area'>) {
  if (!robot.area) return null
  const points = areaPoints(world, seed, `${seed}:${robot.id}:level`, robot.area, rules.levelSamples)
  if (points.length === 0) return null
  return points.reduce((sum, point) => sum + Math.hypot(...point), 0) / points.length
}

// Ground the Builder must leave alone: near a plant or antenna, or on the line of a Miner's live tunnel.
export function isProtected(store: RunStore, ground: Vec3, reach: number) {
  const { structures, robots, residents, resourceClusters } = store.getState()
  if (structures.some(({ position }) => distance(position, ground) < reach + rules.structureMargin)) return true
  if (residents.some(resident => [resident.position, resident.peek].some(point => point && distance(point, ground) < reach + rules.residentMargin))) return true
  return robots.some((miner) => {
    if (!['moving', 'digging', 'collecting'].includes(miner.phase)) return false
    if (distance(miner.position, ground) < rules.minerClearance + reach) return true
    const target = resourceClusters.find(({ id }) => id === miner.targetId)
    if (!target) return false
    const line = unit(target.position)
    const along = dot(ground, line)
    const offLine = distance(ground, scale(line, along))
    return along > 0 && offLine < rules.minerClearance + reach
  })
}

const reachOf = (kind: BuilderJob) => kind === 'flatten' ? rules.flattenRadius : rules.fillRadius

function localSurfaceLevel(world: PlanetWorld, ground: Vec3) {
  const up = unit(ground)
  const tangent = Math.abs(up[1]) < 0.9 ? unit([-up[2], 0, up[0]]) : [1, 0, 0] as Vec3
  const bitangent = unit([
    up[1] * tangent[2] - up[2] * tangent[1],
    up[2] * tangent[0] - up[0] * tangent[2],
    up[0] * tangent[1] - up[1] * tangent[0],
  ])
  const radius = Math.max(0.5, Math.hypot(...ground))
  const heights: number[] = []
  for (let i = 0; i < rules.surfaceProbeSamples; i += 1) {
    const angle = i * Math.PI * 2 / rules.surfaceProbeSamples
    const side = add(scale(tangent, Math.cos(angle)), scale(bitangent, Math.sin(angle)))
    const direction = unit(add(up, scale(side, rules.surfaceProbeRadius / radius)))
    heights.push(Math.hypot(...groundPoint(world, direction)))
  }
  heights.sort((a, b) => a - b)
  return heights[Math.floor(heights.length / 2)]
}

// A fill target must be a local depression, not merely the low side of a naturally sloped area.
// Flatten is a fallback for a locally prominent obstruction; it no longer cuts every point above one global plane.
function survey(world: PlanetWorld, store: RunStore, robot: BuilderState, kind: BuilderJob, area: WorkArea) {
  const { seed } = store.getState()
  let best: { ground: Vec3; off: number } | null = null
  for (const ground of areaPoints(world, seed, `${seed}:${robot.id}:survey:${robot.surveys}`, area, rules.candidates)) {
    const height = Math.hypot(...ground)
    const nearby = localSurfaceLevel(world, ground)
    const off = kind === 'fill' ? nearby - height : height - nearby
    const threshold = kind === 'fill' ? rules.minHoleDepth : rules.minBumpHeight
    if (off <= threshold || isProtected(store, ground, reachOf(kind))) continue
    if (!best || off > best.off) best = { ground, off }
  }
  return best
}

function stop(robot: BuilderState, reason: BuilderStopReason) {
  robot.phase = 'stopped'
  robot.stopReason = reason
  robot.job = null
}

// One bounded terrain edit at the end of a job. Flatten only cuts and returns the rock it removes; fill spends soil.
function build(world: PlanetWorld, store: RunStore, kind: BuilderJob, ground: Vec3, level: number) {
  const direction = unit(ground)
  const targetLevel = kind === 'flatten' ? localSurfaceLevel(world, ground) : level
  const result = kind === 'flatten'
    ? world.edit('flatten', ((p) => ({ x: p[0], y: p[1] + HALF, z: p[2] }))(scale(direction, targetLevel)), rules.flattenRadius, 'radial', true)
    : world.edit('add', { x: ground[0], y: ground[1] + HALF, z: ground[2] }, rules.fillRadius)
  if (!result.changed) return
  store.setState((state) => ({
    planetRemaining: world.planetRemaining,
    economy: { ...state.economy, preparedSamples: state.economy.preparedSamples + result.removedSamples + result.addedSamples },
    preparedSites: [...state.preparedSites.filter(p => distance(p, ground) > 0.12), groundPoint(world, direction)].slice(-64),
    soil: Math.max(0, state.soil + result.removedSamples - result.addedSamples),
  }))
  pruneStructures(world, store)
  notifyGroundChanged(store, ground, reachOf(kind), world)
  recordDisturbance(store, ground, 'robot', false)
}

function stepBuilder(world: PlanetWorld, store: RunStore, source: BuilderState) {
  const robot: BuilderState = { ...source }
  const area = robot.area
  if (!area || !['scanning', 'moving', 'working'].includes(robot.phase)) return robot
  if (robot.level === null) robot.level = measureLevel(world, store.getState().seed, robot)
  const level = robot.level
  if (level === null) {
    stop(robot, 'level')
    return robot
  }

  // AUT-07 for the Builder: a Miner may have started a tunnel, or the Gardener planted, where the job was.
  if (robot.job && isProtected(store, robot.job.ground, reachOf(robot.job.kind))) {
    robot.job = null
    robot.phase = 'scanning'
    robot.phaseTicks = 0
  }

  if (robot.phase === 'scanning') {
    robot.phaseTicks += 1
    if (robot.phaseTicks < rules.scanTicks) return robot
    robot.phaseTicks = 0
    const canFill = store.getState().soil >= rules.fillCost
    const order = rules.pattern as readonly BuilderJob[]
    let found: { ground: Vec3 } | null = null
    let kind: BuilderJob = order[0]
    let wantedFill = false
    for (const job of order) {
      const candidate = survey(world, store, robot, job, area)
      robot.surveys += 1
      if (job === 'fill' && candidate && !canFill) {
        wantedFill = true
        continue
      }
      if (candidate) {
        found = candidate
        kind = job
        break
      }
    }
    if (!found) {
      robot.misses += 1
      if (robot.misses >= rules.blockedScans) stop(robot, wantedFill ? 'no-soil' : 'level')
      return robot
    }
    robot.misses = 0
    robot.job = { kind, ground: found.ground }
    robot.phase = 'moving'
    return robot
  }

  if (!robot.job) return robot
  if (robot.phase === 'moving') {
    robot.phaseTicks += 1
    if (robot.phaseTicks > rules.maxMoveTicks) {
      stop(robot, 'blocked')
      return robot
    }
    const direction = unit(robot.job.ground)
    const goal = hoverGoal(world.densityAt, direction, rules.hoverHeight)
    if (distance(robot.position, goal) <= rules.arriveDistance) {
      robot.position = goal
      robot.phase = 'working'
      robot.phaseTicks = 0
      return robot
    }
    robot.position = hoverStep(world.densityAt, robot.position, direction, rules.travelSpeed, rules.hoverHeight)
    return robot
  }

  robot.phaseTicks += 1
  if (robot.phaseTicks < rules.workTicks) return robot
  if (robot.job.kind === 'fill' && store.getState().soil < rules.fillCost) {
    robot.job = null
    robot.phase = 'scanning'
    robot.phaseTicks = 0
    return robot
  }
  build(world, store, robot.job.kind, robot.job.ground, level)
  // The edit may have raised the ground under the robot; lift it back onto the hover shell.
  robot.position = hoverGoal(world.densityAt, unit(robot.position), rules.hoverHeight)
  robot.done += 1
  robot.job = null
  robot.phase = 'scanning'
  return robot
}

export function stepBuilders(world: PlanetWorld, store: RunStore) {
  const builders = store.getState().builders.map((robot) => stepBuilder(world, store, robot))
  store.setState({ builders })
}
