import { tuning } from '../config/tuning'
import type { createRunStore } from '../state/runState'
import type { PlanetWorld } from '../world/planet'
import type { Vec3 } from './geometry'
import type { WorkArea } from './miner'
import {
  pausePlacer, placePlacer, setPlacerArea, spawnPlacer, startPlacer, stepPlacers,
  type PlacerPhase, type PlacerSpec, type PlacerState, type PlacerStopReason,
} from './placer'

type RunStore = ReturnType<typeof createRunStore>

export type RiggerPhase = PlacerPhase
export type RiggerStopReason = PlacerStopReason
export type RiggerState = PlacerState

// AUT-15, D-057: the Rigger only raises antennas, choosing the highest suitable ground in its area.
const spec: PlacerSpec = { list: 'riggers', prefix: 'rigger', kind: 'antenna', rules: tuning.rigger }

export const spawnRigger = (seed: string, index = 0) => spawnPlacer(spec, seed, index)
export const setRiggerArea = (store: RunStore, id: string, area: WorkArea) => setPlacerArea(spec, store, id, area)
export const placeRigger = (store: RunStore, world: Pick<PlanetWorld, 'densityAt'>, id: string, center: Vec3, radius: number) =>
  placePlacer(spec, store, world, id, center, radius)
export const startRigger = (store: RunStore, id: string) => startPlacer(spec, store, id)
export const pauseRigger = (store: RunStore, id: string) => pausePlacer(spec, store, id)
export const stepRiggers = (world: PlanetWorld, store: RunStore) => stepPlacers(spec, world, store)
