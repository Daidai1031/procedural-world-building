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

export type GardenerPhase = PlacerPhase
export type GardenerStopReason = PlacerStopReason
export type GardenerState = PlacerState

// AUT-14, D-057: the Gardener only plants, choosing the flattest ground in its area.
const spec: PlacerSpec = { list: 'gardeners', prefix: 'gardener', kind: 'plant', rules: tuning.gardener }

export const spawnGardener = (seed: string, index = 0) => spawnPlacer(spec, seed, index)
export const setGardenerArea = (store: RunStore, id: string, area: WorkArea) => setPlacerArea(spec, store, id, area)
export const placeGardener = (store: RunStore, world: Pick<PlanetWorld, 'densityAt'>, id: string, center: Vec3, radius: number) =>
  placePlacer(spec, store, world, id, center, radius)
export const startGardener = (store: RunStore, id: string) => startPlacer(spec, store, id)
export const pauseGardener = (store: RunStore, id: string) => pausePlacer(spec, store, id)
export const stepGardeners = (world: PlanetWorld, store: RunStore) => stepPlacers(spec, world, store)
