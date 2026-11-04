import { notifyGroundChanged } from '../systems/workSites'
import { recordDisturbance } from '../systems/residents'
import { billManualTerrain } from '../systems/economy'
import { crackBurrows } from '../systems/surface'
import { HALF } from '../systems/geometry'
import type { createRunStore, TerrainMode } from '../state/runState'
import { surfaceOf, type PlanetWorld } from '../world/planet'
import { brushScale } from '../content/surfaces'
import { nextTerrainMode } from '../config/controls'
import type { FlattenOrientation } from '../world/flattenPlane'

type RunStore = ReturnType<typeof createRunStore>

export function selectTerrainMode(store: RunStore, mode: TerrainMode) {
  store.setState((state) => ({ loadout: { ...state.loadout, terrainMode: mode } }))
}

export function selectFlattenOrientation(store: RunStore, orientation: FlattenOrientation) {
  store.setState((state) => ({ loadout: { ...state.loadout, flattenOrientation: orientation } }))
}

export function cycleTerrainMode(store: RunStore) {
  selectTerrainMode(store, nextTerrainMode(store.getState().loadout.terrainMode))
}

// TERR-09: M1 changes terrain and remaining mass. Canister costs start in M2.
export function useTerrainTool(world: PlanetWorld, store: RunStore, mode: TerrainMode,
  point: { x: number; y: number; z: number }, radius: number, orientation: FlattenOrientation) {
  if (store.getState().economy.bankrupt) return { removedSamples: 0, addedSamples: 0, changed: false, reach: 0 }
  const brush = radius * brushScale(surfaceOf(store.getState().seed))
  const result = world.edit(mode, point, brush, orientation)
  if (result.changed) {
    billManualTerrain(store, result.removedSamples + result.addedSamples)
    store.setState({ planetRemaining: world.planetRemaining })
    notifyGroundChanged(store, [point.x, point.y - HALF, point.z], mode === 'flatten' ? brush * Math.SQRT2 : result.reach, world)
    recordDisturbance(store, [point.x, point.y - HALF, point.z], 'manual', result.removedSamples > 0)
    if (mode === 'dig') crackBurrows(world, store, [point.x, point.y - HALF, point.z])
  }
  return result
}
