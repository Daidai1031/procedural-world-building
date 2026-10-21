import { notifyGroundChanged } from '../systems/workSites'
import { recordDisturbance } from '../systems/residents'
import { billManualTerrain } from '../systems/economy'
import { HALF } from '../systems/geometry'
import type { createRunStore, TerrainMode } from '../state/runState'
import type { PlanetWorld } from '../world/planet'
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
  if (store.getState().economy.bankrupt) return { removedSamples: 0, addedSamples: 0, changed: false }
  const result = world.edit(mode, point, radius, orientation)
  if (result.changed) {
    billManualTerrain(store, result.removedSamples + result.addedSamples)
    store.setState({ planetRemaining: world.planetRemaining })
    notifyGroundChanged(store, [point.x, point.y - HALF, point.z], mode === 'flatten' ? radius * Math.SQRT2 : radius)
    recordDisturbance(store, [point.x, point.y - HALF, point.z], 'manual', result.removedSamples > 0)
  }
  return result
}
