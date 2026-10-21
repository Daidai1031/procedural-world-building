import { notifyGroundChanged } from './workSites'
import { recordDisturbance } from './residents'
import type { createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { collectExposedResources } from '../tools/collector'
import { createPlanetField, hashSeed, type PlanetWorld } from '../world/planet'
import { randomStream, type ResourceCluster } from '../world/resourceClusters'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { distance, hoverGoal, hoverStep, isEmptyAt, scale, surfaceRadius, unit, type Vec3 } from './geometry'
import { pruneStructures } from './structures'

// AUT-01–12. Positions are centered world coordinates, see geometry.ts.
export type { Vec3 } from './geometry'
export { isEmptyAt, surfaceRadius } from './geometry'
type RunStore = ReturnType<typeof createRunStore>

export type RobotPhase = 'idle' | 'scanning' | 'moving' | 'digging' | 'collecting' | 'paused' | 'stopped'
export type StopReason = 'no-targets' | 'blocked'
export interface WorkArea { center: Vec3; radius: number }

export interface MiningRobotState {
  id: string
  position: Vec3
  area: WorkArea | null
  phase: RobotPhase
  knownTargetIds: string[]
  targetId: string | null
  collectedMinerals: number
  stopReason: StopReason | null
  phaseTicks: number
  stall: number
  resumePhase: RobotPhase | null
}

const HALF = VOXEL_WORLD_SIZE / 2
const miner = tuning.miner

// A seeded Miner above a random surface point; its work area starts under it. Index 0 is the Auto-mode Miner.
export function spawnRobot(seed: string, index = 0): MiningRobotState {
  const random = randomStream(hashSeed(`${seed}:miner:${index}`))
  const height = random() * 2 - 1
  const angle = random() * Math.PI * 2
  const ring = Math.sqrt(1 - height * height)
  const direction: Vec3 = [Math.cos(angle) * ring, height, Math.sin(angle) * ring]
  const radius = surfaceRadius(createPlanetField(seed), direction)
  return {
    id: `miner-${index}`,
    position: scale(direction, radius + miner.hoverHeight),
    area: { center: scale(direction, radius), radius: miner.area.default },
    phase: 'idle', knownTargetIds: [], targetId: null, collectedMinerals: 0, stopReason: null,
    phaseTicks: 0, stall: 0, resumePhase: null,
  }
}

function update(store: RunStore, id: string, change: (robot: MiningRobotState) => MiningRobotState) {
  store.setState((state) => ({ robots: state.robots.map((robot) => robot.id === id ? change(robot) : robot) }))
}

// AUT-01/08: a new center discards the old task and waits for Start; a new radius only resizes the area.
export function setWorkArea(store: RunStore, id: string, area: WorkArea) {
  update(store, id, (robot) => {
    const moved = !robot.area || distance(robot.area.center, area.center) > 1e-6
    if (!moved) return { ...robot, area }
    return { ...robot, area, phase: 'idle', targetId: null, knownTargetIds: [], stopReason: null,
      phaseTicks: 0, stall: 0, resumePhase: null }
  })
}

// Placing the Miner: the user clicks the surface and the robot (and its area) start there.
export function placeRobot(store: RunStore, world: Pick<PlanetWorld, 'densityAt'>, id: string, center: Vec3, radius: number) {
  setWorkArea(store, id, { center, radius })
  const direction = unit(center)
  const position = scale(direction, surfaceRadius(world.densityAt, direction) + miner.hoverHeight)
  update(store, id, (robot) => ({ ...robot, position }))
}

export function startRobot(store: RunStore, id: string) {
  const robot = store.getState().robots.find((candidate) => candidate.id === id)
  if (!robot?.area) return false
  update(store, id, (current) => {
    if (current.phase === 'paused') return { ...current, phase: current.resumePhase ?? 'scanning', resumePhase: null }
    if (current.phase === 'idle' || current.phase === 'stopped') {
      return { ...current, phase: 'scanning', stopReason: null, phaseTicks: 0, stall: 0 }
    }
    return current
  })
  return true
}

export function pauseRobot(store: RunStore, id: string) {
  update(store, id, (robot) => ['scanning', 'moving', 'digging', 'collecting'].includes(robot.phase)
    ? { ...robot, phase: 'paused', resumePhase: robot.phase } : robot)
}

function stop(robot: MiningRobotState, reason: StopReason) {
  robot.phase = 'stopped'
  robot.stopReason = reason
  robot.targetId = null
}

function stepRobot(world: PlanetWorld, store: RunStore, source: MiningRobotState, collected: ResourceCluster[]) {
  const robot: MiningRobotState = { ...source }
  const area = robot.area
  if (!area || !['scanning', 'moving', 'digging', 'collecting'].includes(robot.phase)) return robot
  const { resourceClusters, collectedIds, detector } = store.getState()
  const done = new Set(collectedIds)
  const inArea = (cluster: ResourceCluster) => distance(cluster.position, area.center) <= area.radius
  const isOpen = (cluster: ResourceCluster) => cluster.category === 'mineral' && !done.has(cluster.id) && inArea(cluster)

  // AUT-07: the target may have been collected, or left the area, since the last tick.
  let target = robot.targetId ? resourceClusters.find(({ id }) => id === robot.targetId) : undefined
  if (robot.targetId && (!target || !isOpen(target)) && robot.phase !== 'collecting') {
    robot.targetId = null
    robot.phase = 'scanning'
    robot.phaseTicks = 0
    target = undefined
  }

  const candidatesIn = (known: Set<string>) => resourceClusters.filter((cluster) => known.has(cluster.id) && isOpen(cluster))

  if (robot.phase === 'scanning') {
    robot.phaseTicks += 1
    if (robot.phaseTicks < miner.scanTicks) return robot
    // AUT-02: only minerals inside the area that the robot (or the manual Detector) can see.
    const known = new Set(robot.knownTargetIds)
    for (const cluster of resourceClusters) {
      if (!isOpen(cluster)) continue
      const detected = detector.center && distance(cluster.position, detector.center) <= detector.radius
      if (detected || distance(cluster.position, robot.position) <= miner.scanRange) known.add(cluster.id)
    }
    robot.knownTargetIds = [...known].sort()
    // A robot that is still far from its area first flies there; scanning only covers its own surroundings.
    if (distance(robot.position, area.center) > area.radius && candidatesIn(known).length === 0) {
      robot.phase = 'moving'
      robot.phaseTicks = 0
      return robot
    }
    // AUT-03: nearest first; equal distances fall back to the smaller ID.
    const candidates = candidatesIn(known)
      .map((cluster) => ({ cluster, away: distance(cluster.position, robot.position) }))
      .sort((a, b) => a.away - b.away || (a.cluster.id < b.cluster.id ? -1 : 1))
    if (candidates.length === 0) {
      stop(robot, 'no-targets')
      return robot
    }
    robot.targetId = candidates[0].cluster.id
    robot.phase = 'moving'
    robot.phaseTicks = 0
    robot.stall = 0
    return robot
  }

  if (robot.phase === 'collecting') {
    robot.phaseTicks += 1
    if (robot.phaseTicks >= miner.collectTicks) {
      robot.phase = 'scanning'
      robot.phaseTicks = 0
    }
    return robot
  }

  if (!target && robot.phase !== 'moving') return robot
  const direction = unit(target ? target.position : area.center)

  if (robot.phase === 'moving') {
    // AUT-04: hover shell travel, shared with the Gardener (geometry.ts).
    robot.phaseTicks += 1
    if (robot.phaseTicks > miner.maxMoveTicks) {
      stop(robot, 'blocked')
      return robot
    }
    const goal = hoverGoal(world.densityAt, direction, miner.hoverHeight)
    if (distance(robot.position, goal) <= miner.arriveDistance) {
      robot.position = goal
      robot.phase = target ? 'digging' : 'scanning'
      robot.phaseTicks = 0
      robot.stall = 0
      return robot
    }
    robot.position = hoverStep(world.densityAt, robot.position, direction, miner.travelSpeed, miner.hoverHeight)
    return robot
  }

  // AUT-05: carve one bounded step toward the ore, then advance only if the new position is empty.
  robot.phaseTicks += 1
  if (robot.phaseTicks > miner.maxDigTicks) {
    stop(robot, 'blocked')
    return robot
  }
  const next: Vec3 = [
    robot.position[0] - direction[0] * miner.digStep,
    robot.position[1] - direction[1] * miner.digStep,
    robot.position[2] - direction[2] * miner.digStep,
  ]
  const edit = world.edit('dig', { x: next[0], y: next[1] + HALF, z: next[2] }, miner.digRadius)
  if (edit.changed) {
    // D-026: the rock the Miner removes becomes soil the Builder can fill with.
    store.setState((state) => ({ planetRemaining: world.planetRemaining, soil: state.soil + edit.removedSamples }))
    pruneStructures(world, store)
    notifyGroundChanged(store, next, miner.digRadius)
    recordDisturbance(store, next, 'robot', edit.removedSamples > 0)
  }
  if (isEmptyAt(world, next)) {
    robot.position = next
    robot.stall = 0
  } else {
    robot.stall += 1
    if (robot.stall >= miner.blockedTicks) {
      stop(robot, 'blocked')
      return robot
    }
  }
  // AUT-06: only Minerals are mined; Life and Memory stay where they are.
  const found = collectExposedResources(world, store, ['mineral'])
  if (found.length > 0) {
    collected.push(...found)
    robot.collectedMinerals += found.length
    if (target && found.some(({ id }) => id === target.id)) {
      robot.targetId = null
      robot.phase = 'collecting'
      robot.phaseTicks = 0
    }
  }
  return robot
}

// AUT-11: one fixed step for every Miner, in stable array order. Returns what this step collected.
export function stepMiners(world: PlanetWorld, store: RunStore) {
  const collected: ResourceCluster[] = []
  const robots = store.getState().robots.map((robot) => stepRobot(world, store, robot, collected))
  store.setState({ robots })
  return collected
}
