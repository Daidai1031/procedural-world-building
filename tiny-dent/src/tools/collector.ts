import { sellMinerals, updateSiteIndicators } from '../systems/economy'
import type { createRunStore } from '../state/runState'
import type { PlanetWorld } from '../world/planet'
import type { ResourceCluster } from '../world/resourceClusters'
import { isResourceExposed } from './detector'
import { tuning } from '../config/tuning'

// COL-01: a target is collected the moment terrain edits expose its center. Returns the newly collected ones.
export function collectExposedResources(world: PlanetWorld, store: ReturnType<typeof createRunStore>): ResourceCluster[] {
  const { resourceClusters, collectedIds } = store.getState()
  const done = new Set(collectedIds)
  const found = resourceClusters.filter((cluster) => !done.has(cluster.id) && isResourceExposed(world, cluster))
  if (found.length > 0) {
    store.setState(state => ({
      collectedIds: [...collectedIds, ...found.map(({ id }) => id)],
      economy: { ...state.economy, mineralStock: state.economy.mineralStock + found.length },
    }))
    // D-066: with the flag off, ore stays in economy.mineralStock until it is sold on purpose.
    if (tuning.materials.autoSellOre) sellMinerals(store)
    updateSiteIndicators(store)
  }
  return found
}
