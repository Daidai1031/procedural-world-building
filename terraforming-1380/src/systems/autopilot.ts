import type { createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import type { PlanetWorld } from '../world/planet'
import { scale, surfaceRadius, type Vec3 } from './geometry'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { pauseRobot, setWorkArea, spawnRobot, startRobot, type WorkArea } from './miner'
import { pauseGardener, setGardenerArea, spawnGardener, startGardener } from './gardener'
import { pauseRigger, setRiggerArea, spawnRigger, startRigger } from './rigger'
import { placerFull } from './placer'
import { measureLevel, pauseBuilder, setBuilderArea, spawnBuilder, startBuilder } from './builder'
import { antennaCount, broadcast, visiblePlanetCount } from './signal'

type RunStore = ReturnType<typeof createRunStore>
const rules = tuning.autopilot

export type CrewKind = 'miner' | 'gardener' | 'rigger' | 'builder'
export const crewKinds: CrewKind[] = ['miner', 'gardener', 'rigger', 'builder']

// What the controller remembers about one robot between ticks.
export interface CrewProgress {
  // The sector the robot was last sent to.
  cursor: number
  // Sectors in a row that gave no work; a whole lap of them sends the robot to rest.
  misses: number
  // Fruitless laps in a row; each one doubles the next rest.
  laps: number
  // Output counter at the last tick, to notice that the robot did something.
  progress: number
  restUntil: number
  // Builders: the progress counter on arrival in the current sector, and whether the queue ran out for this one.
  sectorStart: number
  retired: boolean
}

export interface AutopilotState {
  enabled: boolean
  counts: Record<CrewKind, number>
  autoBroadcast: boolean
  // Funds are low: Gardeners, Riggers and Builders wait while the Miners earn.
  holding: boolean
  // Stable Builder reference height measured when Autopilot starts.
  level: number | null
  // Builder sectors handed out so far; they are claimed in order and never revisited.
  claimed: number
  lastBroadcastTick: number | null
  crew: Record<string, CrewProgress>
}

// D-043: the "whole planet" is a ring of overlapping sectors; sector k of n is the k-th point of a Fibonacci sphere.
export function sectorDirection(k: number, count: number): Vec3 {
  const y = 1 - 2 * (k + 0.5) / count
  const ring = Math.sqrt(1 - y * y)
  const angle = k * 2.399963229728653
  return [Math.cos(angle) * ring, y, Math.sin(angle) * ring]
}

export function sectorArea(world: Pick<PlanetWorld, 'densityAt'>, kind: CrewKind, k: number): WorkArea {
  const direction = sectorDirection(k, rules[kind].sectors)
  return { center: scale(direction, surfaceRadius(world.densityAt, direction)), radius: rules[kind].radius }
}

const clampCount = (n: number) => Math.max(0, Math.min(rules.maxPerKind, Math.round(n)))

// What each kind of robot needs from the controller. Everything else is shared.
const crews = {
  miner: {
    list: (state: ReturnType<RunStore['getState']>) => state.robots,
    setArea: setWorkArea, start: startRobot, pause: pauseRobot,
    holdable: false,
  },
  gardener: {
    list: (state: ReturnType<RunStore['getState']>) => state.gardeners,
    setArea: setGardenerArea, start: startGardener, pause: pauseGardener,
    holdable: true,
  },
  rigger: {
    list: (state: ReturnType<RunStore['getState']>) => state.riggers,
    setArea: setRiggerArea, start: startRigger, pause: pauseRigger,
    holdable: true,
  },
  builder: {
    list: (state: ReturnType<RunStore['getState']>) => state.builders,
    setArea: setBuilderArea, start: startBuilder, pause: pauseBuilder,
    holdable: true,
  },
} as const

type Robot = { id: string; phase: string; stopReason: string | null; collectedMinerals?: number; placed?: number; done?: number }
const working = (phase: string) => !['idle', 'paused', 'stopped'].includes(phase)
// What each kind has produced so far: minerals mined, structures placed, terrain jobs done.
const progressOf = (kind: CrewKind, robot: Robot) => (kind === 'miner' ? robot.collectedMinerals : kind === 'builder' ? robot.done : robot.placed) as number

const fresh = (cursor: number, progress: number): CrewProgress => ({ cursor, laps: 0, misses: 0, progress, restUntil: 0, sectorStart: progress, retired: false })

function send(store: RunStore, world: PlanetWorld, kind: CrewKind, id: string, cursor: number) {
  crews[kind].setArea(store, id, sectorArea(world, kind, cursor))
  // Give overlapping Builder sectors the same stable reference sample.
  if (kind === 'builder') {
    const { level } = store.getState().autopilot
    store.setState((state) => ({ builders: state.builders.map((robot) => robot.id === id ? { ...robot, level } : robot) }))
  }
  crews[kind].start(store, id)
}

// D-043: give every robot its sector and start it. Existing robots keep their state; extras are built at their seeded spots.
export function startAutopilot(store: RunStore, world: PlanetWorld, requested: Record<CrewKind, number>) {
  const counts = { miner: clampCount(requested.miner), gardener: clampCount(requested.gardener), rigger: clampCount(requested.rigger), builder: clampCount(requested.builder) }
  if (crewKinds.every(kind => counts[kind] === 0)) return false
  const { seed } = store.getState()
  const fit = <T,>(list: T[], count: number, make: (index: number) => T) => Array.from({ length: count }, (_, index) => list[index] ?? make(index))
  store.setState((state) => ({
    robots: fit(state.robots, counts.miner, (index) => spawnRobot(seed, index)),
    gardeners: fit(state.gardeners, counts.gardener, (index) => spawnGardener(seed, index)),
    riggers: fit(state.riggers, counts.rigger, (index) => spawnRigger(seed, index)),
    builders: fit(state.builders, counts.builder, (index) => spawnBuilder(seed, index)),
    loadout: { ...state.loadout, activeTool: 'auto' },
    autopilot: { ...state.autopilot, enabled: true, counts, holding: false, lastBroadcastTick: null, crew: {},
      claimed: 0,
      level: measureLevel(world, seed, { id: 'autopilot', area: { center: [0, 0, 0], radius: 2 * VOXEL_WORLD_SIZE } }) },
  }))
  const crew: Record<string, CrewProgress> = {}
  for (const kind of crewKinds) {
    crews[kind].list(store.getState()).forEach((robot, index, all) => {
      // Spread each kind around the ring so robots of one kind start in different sectors.
      const cursor = kind === 'builder' ? index : Math.floor(index * rules[kind].sectors / all.length)
      crew[robot.id] = fresh(cursor, progressOf(kind, robot as unknown as Robot))
      send(store, world, kind, robot.id, cursor)
    })
  }
  store.setState((state) => ({ autopilot: { ...state.autopilot, crew, claimed: counts.builder } }))
  return true
}

// Back to the human-in-the-loop Auto mode with one paused robot of each kind, as the player would have set up.
export function cancelAutopilot(store: RunStore) {
  if (!store.getState().autopilot.enabled) return
  const { seed } = store.getState()
  store.setState((state) => ({
    robots: [state.robots[0] ?? spawnRobot(seed, 0)],
    gardeners: [state.gardeners[0] ?? spawnGardener(seed, 0)],
    riggers: [state.riggers[0] ?? spawnRigger(seed, 0)],
    builders: [state.builders[0] ?? spawnBuilder(seed, 0)],
    loadout: { ...state.loadout, activeTool: 'auto' },
    autopilot: { ...state.autopilot, enabled: false, holding: false, crew: {} },
  }))
  const state = store.getState()
  const defaults = { miner: tuning.miner.area.default, gardener: tuning.gardener.area.default, rigger: tuning.rigger.area.default, builder: tuning.builder.area.default }
  for (const kind of crewKinds) {
    const [robot] = crews[kind].list(state)
    crews[kind].pause(store, robot.id)
    if (robot.area) crews[kind].setArea(store, robot.id, { ...robot.area, radius: defaults[kind] })
  }
}

export function setAutopilotCount(store: RunStore, kind: CrewKind, count: number) {
  store.setState((state) => ({ autopilot: { ...state.autopilot, counts: { ...state.autopilot.counts, [kind]: clampCount(count) } } }))
}

export function setAutoBroadcast(store: RunStore, on: boolean) {
  store.setState((state) => ({ autopilot: { ...state.autopilot, autoBroadcast: on } }))
}

// One fixed step of the controller: keep every robot busy, send idle ones to the next sector, pause the spenders when funds are low.
export function stepAutopilot(world: PlanetWorld, store: RunStore) {
  const first = store.getState()
  if (!first.autopilot.enabled) return
  const tick = first.simTick
  const capital = first.metrics.capital
  const holding = first.autopilot.holding ? capital < rules.resumeAbove : capital <= rules.holdBelow
  const crewProgress: Record<string, CrewProgress> = { ...first.autopilot.crew }
  let changed = holding !== first.autopilot.holding
  let claimed = first.autopilot.claimed

  for (const kind of crewKinds) {
    const sectors = rules[kind].sectors
    crews[kind].list(first).forEach((source, index, all) => {
      const robot = source as unknown as Robot
      const known = crewProgress[robot.id] ?? fresh(kind === 'builder' ? index : Math.floor(index * sectors / all.length), progressOf(kind, robot))
      const mine = { ...known }
      const progress = progressOf(kind, robot)
      if (progress > mine.progress) { mine.progress = progress; mine.misses = 0; mine.laps = 0 }
      if (mine.misses !== known.misses || mine.laps !== known.laps || mine.progress !== known.progress || !crewProgress[robot.id]) { crewProgress[robot.id] = mine; changed = true }

      if (crews[kind].holdable && holding) {
        if (working(robot.phase)) crews[kind].pause(store, robot.id)
        return
      }
      if (robot.phase === 'paused' || robot.phase === 'idle') {
        crews[kind].start(store, robot.id)
        return
      }
      if (kind === 'builder') {
        // A Builder leaves its sector when the job budget is spent or the ground there is done, then claims the next one.
        if (mine.retired) return
        const spent = working(robot.phase) && progress - mine.sectorStart >= rules.builderJobsPerSector
        if (robot.phase !== 'stopped' && !spent) return
        if (claimed >= sectors) {
          mine.retired = true
          store.setState((state) => ({ builders: state.builders.map((builder) => builder.id === robot.id
            ? { ...builder, phase: 'stopped', stopReason: 'level', job: null } : builder) }))
        } else {
          mine.cursor = claimed
          claimed += 1
          mine.sectorStart = progress
          send(store, world, kind, robot.id, mine.cursor)
        }
        crewProgress[robot.id] = mine
        changed = true
        return
      }
      if (robot.phase !== 'stopped' || tick < mine.restUntil) return
      // A Gardener or Rigger whose structure cap is reached has nothing left to do anywhere.
      if (kind === 'gardener' && placerFull(first, 'plant')) return
      if (kind === 'rigger' && placerFull(first, 'antenna')) return
      // A Miner on a planet with no mineral left has nothing to look for.
      if (kind === 'miner' && !first.resourceClusters.some(({ category, id }) => category === 'mineral' && !first.collectedIds.includes(id))) return
      mine.misses += 1
      if (mine.misses >= sectors) {
        mine.misses = 0
        mine.restUntil = tick + rules.restTicks * Math.min(2 ** mine.laps, rules.maxRestFactor)
        mine.laps += 1
      } else {
        mine.cursor = (mine.cursor + 1) % sectors
        send(store, world, kind, robot.id, mine.cursor)
      }
      crewProgress[robot.id] = mine
      changed = true
    })
  }

  const { autopilot, signal, simTick } = store.getState()
  const due = autopilot.autoBroadcast && antennaCount(store.getState()) > 0 && visiblePlanetCount(signal.broadcastCount) < tuning.signal.maxPlanets
    && (autopilot.lastBroadcastTick === null || simTick - autopilot.lastBroadcastTick >= rules.broadcastEvery)
  const sent = due && broadcast(store)
  if (changed || sent) {
    store.setState((state) => ({ autopilot: { ...state.autopilot, holding, crew: crewProgress, claimed,
      lastBroadcastTick: sent ? simTick : state.autopilot.lastBroadcastTick } }))
  }
}
