import { notifyGroundChanged } from './workSites'
import { recordDisturbance } from './residents'
import type { createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { createPlanetField, hashSeed, surfaceOf, type PlanetWorld } from '../world/planet'
import { randomStream } from '../world/resourceClusters'
import { add, distance, dot, HALF, hoverGoal, hoverStep, scale, surfaceRadius, unit, type Vec3 } from './geometry'
import type { WorkArea } from './miner'
import { groundPoint, pruneStructures } from './structures'
import { nativeMaterial, nativeStock, settle, unitsFor, withdraw } from './inventory'
import { addPatch, hasPatch } from './patches'
import { addRoad, hasNavGraph, navGraph, roadCandidates } from './traffic'
import { buildPlatform, platformDemand, recordMound } from './water'
import type { MaterialId } from '../content/materials'

type RunStore = ReturnType<typeof createRunStore>
const rules = tuning.builder

// D-069: 'patch' lays shipped material under a creature that asked for it. It edits no terrain.
// D-070: 'road' turns a well-walked edge into a road. It also edits no terrain.
// D-073: 'platform' anchors a mound built in open water, with structural material and soil.
export type BuilderJob = 'flatten' | 'fill' | 'patch' | 'road' | 'platform'
export type BuilderPhase = 'idle' | 'scanning' | 'moving' | 'working' | 'paused' | 'stopped'
export type BuilderStopReason = 'level' | 'no-soil' | 'no-material' | 'blocked'

// D-026/D-050: one robot that repairs local holes first, then trims isolated obstructions.
export interface BuilderState {
  id: string
  position: Vec3
  area: WorkArea | null
  phase: BuilderPhase
  // Seeded reference height retained for stable surveys and autopilot hand-off.
  level: number | null
  job: { kind: BuilderJob; ground: Vec3; material?: MaterialId; edge?: string; mound?: string } | null
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

// Ground the Builder must leave alone: near an antenna, or on the line of a Miner's live tunnel. D-063: plants do not
// count. Once spread they cover the ground it would work, and they grow back.
export function isProtected(store: RunStore, ground: Vec3, reach: number) {
  const { structures, robots, residents, resourceClusters, mounds } = store.getState()
  // D-073: a mound built in open water waits for its platform; the Builder does not trim it away.
  if (mounds.some(mound => distance(mound.centre, ground) < mound.radius + reach)) return true
  if (structures.some(({ kind, position }) => kind === 'antenna' && distance(position, ground) < reach + rules.structureMargin)) return true
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
// D-060: on fur, Flatten is combing. It leaves the ground as it is, so nothing nearby needs protecting from it.
const combs = (world: PlanetWorld, kind: BuilderJob) => kind === 'flatten' && world.surface === 'fur'

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
  // D-073: on an ocean the Builder levels nothing: a bump is a mound waiting for a platform, a hole is the sea floor.
  if (world.waterRadius > 0) return null
  const { seed } = store.getState()
  let best: { ground: Vec3; off: number } | null = null
  for (const ground of areaPoints(world, seed, `${seed}:${robot.id}:survey:${robot.surveys}`, area, rules.candidates)) {
    // Any unkempt ground is a job, whatever its height.
    if (combs(world, kind)) {
      if (world.wearNear(ground[0], ground[1] + HALF, ground[2], 2) > 0.5) continue
      return { ground, off: 1 }
    }
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

// One bounded terrain edit at the end of a job. Flatten only cuts and returns the rock it removes; fill spends the planet's native material.
// D-069/PAT-01/02: a visitor that asked for a material, whose home is in this area, and whether the stock can pay for it.
// The first one by creature id, so the choice is stable.
export function patchDemand(world: PlanetWorld, store: RunStore, area: WorkArea) {
  const { residents, patches, inventory } = store.getState()
  if (patches.length >= tuning.patches.max) return null
  for (const resident of [...residents].sort((a, b) => a.creatureId < b.creatureId ? -1 : 1)) {
    const { request, home } = resident
    if (!request || !home || distance(home, area.center) > area.radius || hasPatch(patches, home, request)) continue
    return { ground: groundPoint(world, unit(home)), material: request, enough: inventory[request] >= tuning.patches.cost }
  }
  return null
}

// PAT-02: the stock is spent only here, once the ground is checked again, all or nothing. A job that cannot be paid
// for or whose ground has gone costs nothing.
function buildPatch(world: PlanetWorld, store: RunStore, ground: Vec3, material: MaterialId) {
  const now = groundPoint(world, unit(ground))
  if (Math.abs(Math.hypot(...now) - Math.hypot(...ground)) > tuning.patches.tolerance) return false
  if (hasPatch(store.getState().patches, ground, material) || store.getState().patches.length >= tuning.patches.max) return false
  if (!withdraw(store, material, tuning.patches.cost)) return false
  // Laying a patch digs nothing and makes no noise, so the creature it is for is not frightened off it.
  addPatch(store, ground, material)
  return true
}

// D-070/RDS-04: the most walked edge in this area that is not a road yet, and whether the stock can pay for it.
export function roadDemand(world: PlanetWorld, store: RunStore, area: WorkArea) {
  if (!hasNavGraph(world)) return null
  const state = store.getState()
  const edge = roadCandidates(navGraph(world, state.seed), state.nav).find(candidate => distance(candidate.mid, area.center) <= area.radius)
  return edge ? { edge: edge.id, ground: edge.mid, enough: nativeStock(state) >= tuning.roads.cost } : null
}

// The stock is spent here, all or nothing, once the edge is checked again: still walkable and still walked.
function buildRoad(world: PlanetWorld, store: RunStore, id: string) {
  const state = store.getState()
  const graph = navGraph(world, state.seed)
  const edge = graph.edges[graph.byId.get(id) ?? -1]
  if (!edge || !edge.passable || state.nav.roads.includes(id) || (state.nav.heat[id] ?? 0) < tuning.traffic.roadAt * 0.5) return false
  if (!withdraw(store, nativeMaterial(state.seed), tuning.roads.cost)) return false
  addRoad(store, id)
  return true
}

function build(world: PlanetWorld, store: RunStore, kind: Exclude<BuilderJob, 'patch' | 'road' | 'platform'>, ground: Vec3, level: number) {
  const direction = unit(ground)
  if (combs(world, kind)) {
    const combed = world.groom('comb', { x: ground[0], y: ground[1] + HALF, z: ground[2] }, rules.flattenRadius)
    store.setState((state) => ({ economy: { ...state.economy, preparedSamples: state.economy.preparedSamples + combed } }))
    recordDisturbance(store, ground, 'robot', false)
    return
  }
  const targetLevel = kind === 'flatten' ? localSurfaceLevel(world, ground) : level
  const result = kind === 'flatten'
    ? world.edit('flatten', ((p) => ({ x: p[0], y: p[1] + HALF, z: p[2] }))(scale(direction, targetLevel)), rules.flattenRadius, 'radial', true)
    : world.edit('add', { x: ground[0], y: ground[1] + HALF, z: ground[2] }, rules.fillRadius)
  if (!result.changed) return
  store.setState((state) => ({
    planetRemaining: world.planetRemaining,
    economy: { ...state.economy, preparedSamples: state.economy.preparedSamples + result.removedSamples + result.addedSamples },
    preparedSites: [...state.preparedSites.filter(p => distance(p, ground) > 0.12), groundPoint(world, direction)].slice(-64),
  }))
  // D-066: a flatten returns the material it cuts, a fill spends what it adds.
  settle(store, nativeMaterial(store.getState().seed), unitsFor(result.removedSamples), unitsFor(result.addedSamples))
  // D-073: ground added on an ocean is a mound until a platform anchors it.
  if (result.addedSamples > 0) recordMound(store, ground, rules.fillRadius)
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
  if (robot.job && robot.job.kind !== 'patch' && robot.job.kind !== 'road' && robot.job.kind !== 'platform' && !combs(world, robot.job.kind) && isProtected(store, robot.job.ground, reachOf(robot.job.kind))) {
    robot.job = null
    robot.phase = 'scanning'
    robot.phaseTicks = 0
  }

  if (robot.phase === 'scanning') {
    robot.phaseTicks += 1
    if (robot.phaseTicks < rules.scanTicks) return robot
    robot.phaseTicks = 0
    // D-069: a visitor asking for a material comes first, if the stock can pay for it.
    const demand = patchDemand(world, store, area)
    if (demand?.enough) {
      robot.misses = 0
      robot.job = { kind: 'patch', ground: demand.ground, material: demand.material }
      robot.phase = 'moving'
      return robot
    }
    // D-073: a mound built in open water would wash away; a platform holds it, if the stock can pay.
    const platform = platformDemand(store, area)
    if (platform?.enough) {
      robot.misses = 0
      robot.job = { kind: 'platform', ground: platform.mound.centre, material: platform.material, mound: platform.mound.id }
      robot.phase = 'moving'
      return robot
    }
    // D-070: then the most walked edge in the area, if the stock can pay for a road.
    const road = roadDemand(world, store, area)
    if (road?.enough) {
      robot.misses = 0
      robot.job = { kind: 'road', ground: road.ground, edge: road.edge }
      robot.phase = 'moving'
      return robot
    }
    const canFill = nativeStock(store.getState()) >= rules.fillCost
    const order = rules.pattern as readonly Exclude<BuilderJob, 'patch' | 'road' | 'platform'>[]
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
      if (robot.misses >= rules.blockedScans) stop(robot, demand || road || platform ? 'no-material' : wantedFill ? 'no-soil' : 'level')
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
  const crew: { work?: { builder?: number } } = surfaceOf(store.getState().seed).crew
  if (robot.phaseTicks < rules.workTicks * (crew.work?.builder ?? 1)) return robot
  if (robot.job.kind === 'platform') {
    if (buildPlatform(world, store, robot.job.mound!, robot.job.material!)) robot.done += 1
    robot.job = null
    robot.phase = 'scanning'
    robot.phaseTicks = 0
    return robot
  }
  if (robot.job.kind === 'road') {
    if (buildRoad(world, store, robot.job.edge!)) robot.done += 1
    robot.job = null
    robot.phase = 'scanning'
    robot.phaseTicks = 0
    return robot
  }
  if (robot.job.kind === 'patch') {
    if (buildPatch(world, store, robot.job.ground, robot.job.material!)) robot.done += 1
    robot.job = null
    robot.phase = 'scanning'
    robot.phaseTicks = 0
    return robot
  }
  if (robot.job.kind === 'fill' && nativeStock(store.getState()) < rules.fillCost) {
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

// A Builder that stopped for want of a job or of material starts scanning again when a visitor near its area asks.
export function wakeBuilders(store: RunStore, near: Vec3) {
  const wake = (robot: BuilderState) => robot.phase === 'stopped' && (robot.stopReason === 'level' || robot.stopReason === 'no-material')
    && !!robot.area && distance(robot.area.center, near) <= robot.area.radius
  if (!store.getState().builders.some(wake)) return
  store.setState(state => ({ builders: state.builders.map(robot => wake(robot) ? { ...robot, phase: 'scanning' as const, stopReason: null, misses: 0, phaseTicks: 0 } : robot) }))
}

export function stepBuilders(world: PlanetWorld, store: RunStore) {
  const builders = store.getState().builders.map((robot) => stepBuilder(world, store, robot))
  store.setState({ builders })
}
