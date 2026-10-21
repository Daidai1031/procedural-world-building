import { Vector3 } from 'three'
import type { createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { createPlanetField, hashSeed, type PlanetWorld } from '../world/planet'
import { randomStream } from '../world/resourceClusters'
import { distance, hoverGoal, hoverStep, scale, surfaceRadius, unit, type Vec3 } from './geometry'
import type { WorkArea } from './miner'
import { addStructure, groundPoint, isSuitable, slopeAt, surfaceNormal, type StructureKind } from './structures'

type RunStore = ReturnType<typeof createRunStore>
const rules = tuning.gardener

export type GardenerPhase = 'idle' | 'scanning' | 'moving' | 'working' | 'paused' | 'stopped'
export type GardenerStopReason = 'no-sites' | 'blocked'

// AUT-14/15: one robot that alternates between planting and raising antennas, choosing ground by its shape.
export interface GardenerState {
  id: string
  position: Vec3
  area: WorkArea | null
  phase: GardenerPhase
  site: { kind: StructureKind; anchor: Vec3; normal: Vec3 } | null
  placed: number
  surveys: number
  misses: number
  stopReason: GardenerStopReason | null
  phaseTicks: number
  resumePhase: GardenerPhase | null
}

export function spawnGardener(seed: string, index = 0): GardenerState {
  const random = randomStream(hashSeed(`${seed}:gardener:${index}`))
  const height = random() * 2 - 1
  const angle = random() * Math.PI * 2
  const ring = Math.sqrt(1 - height * height)
  const direction: Vec3 = [Math.cos(angle) * ring, height, Math.sin(angle) * ring]
  const radius = surfaceRadius(createPlanetField(seed), direction)
  return {
    id: `gardener-${index}`,
    position: scale(direction, radius + rules.hoverHeight),
    area: { center: scale(direction, radius), radius: rules.area.default },
    phase: 'idle', site: null, placed: 0, surveys: 0, misses: 0, stopReason: null, phaseTicks: 0, resumePhase: null,
  }
}

function update(store: RunStore, id: string, change: (robot: GardenerState) => GardenerState) {
  store.setState((state) => ({ gardeners: state.gardeners.map((robot) => robot.id === id ? change(robot) : robot) }))
}

// A new center discards the current job and waits for Start; a new radius only resizes the area.
export function setGardenerArea(store: RunStore, id: string, area: WorkArea) {
  update(store, id, (robot) => {
    const moved = !robot.area || distance(robot.area.center, area.center) > 1e-6
    if (!moved) return robot.phase === 'stopped' && robot.stopReason === 'no-sites' && area.radius !== robot.area?.radius
      ? { ...robot, area, phase: 'scanning', stopReason: null, misses: 0, phaseTicks: 0 } : { ...robot, area }
    return { ...robot, area, phase: 'idle', site: null, misses: 0, stopReason: null, phaseTicks: 0, resumePhase: null }
  })
}

// The user clicks the surface and the Gardener (and its area) start there.
export function placeGardener(store: RunStore, world: Pick<PlanetWorld, 'densityAt'>, id: string, center: Vec3, radius: number) {
  setGardenerArea(store, id, { center, radius })
  const position = hoverGoal(world.densityAt, unit(center), rules.hoverHeight)
  update(store, id, (robot) => ({ ...robot, position }))
}

export function startGardener(store: RunStore, id: string) {
  const robot = store.getState().gardeners.find((candidate) => candidate.id === id)
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

export function pauseGardener(store: RunStore, id: string) {
  update(store, id, (robot) => robot.phase === 'stopped' && robot.stopReason === 'no-sites'
    ? { ...robot, phase: 'paused', resumePhase: 'scanning', stopReason: null, misses: 0 }
    : ['scanning', 'moving', 'working'].includes(robot.phase)
      ? { ...robot, phase: 'paused', resumePhase: robot.phase } : robot)
}

// Jobs in pattern order from the current position, without kinds whose cap is reached.
export function jobOrder(placed: number, plants: number, antennas: number): StructureKind[] {
  const open = { plant: plants < tuning.structures.maxPlants, antenna: antennas < tuning.structures.maxAntennas }
  const order: StructureKind[] = []
  for (let offset = 0; offset < rules.pattern.length; offset += 1) {
    const kind = rules.pattern[(placed + offset) % rules.pattern.length] as StructureKind
    if (open[kind] && !order.includes(kind)) order.push(kind)
  }
  return order
}

// The next job follows the pattern, skipping a kind whose cap is reached. Null when both are full.
export function nextJob(placed: number, plants: number, antennas: number): StructureKind | null {
  return jobOrder(placed, plants, antennas)[0] ?? null
}

// Recheck Builder work first, then cover the work disc rather than scattering points through a volume.
function survey(world: PlanetWorld, store: RunStore, robot: GardenerState, kind: StructureKind, area: WorkArea): { anchor: Vec3; normal: Vec3; score: number } | null {
  const { seed, structures, preparedSites } = store.getState()
  const random = randomStream(hashSeed(seed + ':' + robot.id + ':survey:' + robot.surveys))
  let best: { anchor: Vec3; normal: Vec3; score: number } | null = null
  const inspect = (point: Vec3) => {
    const anchor = groundPoint(world, unit(point))
    if (distance(anchor, area.center) > area.radius) return
    const normal = surfaceNormal(world, anchor)
    if (!isSuitable(world, structures, kind, anchor, normal)) return
    const score = kind === 'plant' ? -slopeAt(normal, anchor) : Math.hypot(...anchor)
    if (!best || score > best.score) best = { anchor, normal, score }
  }
  const up = new Vector3(...unit(area.center))
  const east = new Vector3().crossVectors(up, Math.abs(up.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)).normalize()
  const north = new Vector3().crossVectors(east, up).normalize()
  for (const point of preparedSites) {
    if (distance(point, area.center) > area.radius + rules.area.min) continue
    inspect(point)
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2
      inspect(new Vector3(...point).addScaledVector(east, Math.cos(angle) * 0.12)
        .addScaledVector(north, Math.sin(angle) * 0.12).toArray() as Vec3)
    }
  }
  if (best) return best
  inspect(area.center)
  const rotation = random() * Math.PI * 2
  for (let i = 0; i < rules.candidates; i++) {
    const reach = Math.sqrt((i + 0.5) / rules.candidates) * area.radius
    const angle = rotation + i * 2.399963229728653
    inspect(new Vector3(...area.center).addScaledVector(east, Math.cos(angle) * reach)
      .addScaledVector(north, Math.sin(angle) * reach).toArray() as Vec3)
  }
  return best
}

function stop(robot: GardenerState, reason: GardenerStopReason) {
  robot.phase = 'stopped'
  robot.stopReason = reason
  robot.site = null
}

function stepGardener(world: PlanetWorld, store: RunStore, source: GardenerState) {
  const robot: GardenerState = { ...source }
  const area = robot.area
  if (!area || !['scanning', 'moving', 'working'].includes(robot.phase)) return robot

  // AUT-07 for the Gardener: the chosen ground may have been dug, buried or taken since the last tick.
  if (robot.site && !isSuitable(world, store.getState().structures, robot.site.kind, robot.site.anchor, robot.site.normal)) {
    robot.site = null
    robot.phase = 'scanning'
    robot.phaseTicks = 0
  }

  if (robot.phase === 'scanning') {
    robot.phaseTicks += 1
    if (robot.phaseTicks < rules.scanTicks) return robot
    const { structures } = store.getState()
    const jobs = jobOrder(robot.placed,
      structures.filter((s) => s.kind === 'plant').length, structures.filter((s) => s.kind === 'antenna').length)
    if (jobs.length === 0) {
      stop(robot, 'no-sites')
      return robot
    }
    // If the pattern's job has no room (an antenna needs wide spacing), the other job may still fit.
    let kind = jobs[0]
    let found = null
    for (const job of jobs) {
      found = survey(world, store, robot, job, area)
      robot.surveys += 1
      kind = job
      if (found) break
    }
    robot.phaseTicks = 0
    if (!found) {
      robot.misses += 1
      if (robot.misses >= rules.blockedScans) stop(robot, 'no-sites')
      return robot
    }
    robot.misses = 0
    robot.site = { kind, anchor: found.anchor, normal: found.normal }
    robot.phase = 'moving'
    return robot
  }

  if (!robot.site) return robot
  if (robot.phase === 'moving') {
    robot.phaseTicks += 1
    if (robot.phaseTicks > rules.maxMoveTicks) {
      stop(robot, 'blocked')
      return robot
    }
    const direction = unit(robot.site.anchor)
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
  addStructure(store, robot.site.kind, robot.site.anchor, robot.site.normal)
  robot.placed += 1
  robot.site = null
  robot.phase = 'scanning'
  robot.phaseTicks = 0
  return robot
}

export function stepGardeners(world: PlanetWorld, store: RunStore) {
  const gardeners = store.getState().gardeners.map((robot) => stepGardener(world, store, robot))
  store.setState({ gardeners })
}
