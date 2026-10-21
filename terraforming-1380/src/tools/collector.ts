import { sellMinerals, updateSiteIndicators } from '../systems/economy'
import type { createRunStore } from '../state/runState'
import type { PlanetWorld } from '../world/planet'
import type { ResourceCategory, ResourceCluster } from '../world/resourceClusters'
import { isResourceExposed } from './detector'

// COL-01: a target is collected the moment terrain edits expose its center. Returns the newly collected ones.
export function collectExposedResources(world: PlanetWorld, store: ReturnType<typeof createRunStore>,
  categories?: ResourceCategory[]): ResourceCluster[] {
  const { resourceClusters, collectedIds } = store.getState()
  const done = new Set(collectedIds)
  const found = resourceClusters.filter((cluster) => !done.has(cluster.id) && (!categories || categories.includes(cluster.category)) && isResourceExposed(world, cluster))
  if (found.length > 0) {
    store.setState(state => ({
      collectedIds: [...collectedIds, ...found.map(({ id }) => id)],
      economy: { ...state.economy, mineralStock: state.economy.mineralStock + found.filter(c => c.category === 'mineral').length },
      discoveries: {
        artifactIds: [...state.discoveries.artifactIds, ...found.filter(c => c.category === 'memory').map(c => c.id)],
        lifeClusterIds: [...state.discoveries.lifeClusterIds, ...found.filter(c => c.category === 'life').map(c => c.id)],
      },
    }))
    sellMinerals(store)
    updateSiteIndicators(store)
  }
  return found
}
