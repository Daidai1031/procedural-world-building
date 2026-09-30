import type { createRunStore } from '../state/runState'
import type { PlanetWorld } from '../world/planet'
import type { ResourceCluster } from '../world/resourceClusters'
import { isResourceExposed } from './detector'

// COL-01: a target is collected the moment terrain edits expose its center. Returns the newly collected ones.
export function collectExposedResources(world: PlanetWorld, store: ReturnType<typeof createRunStore>): ResourceCluster[] {
  const { resourceClusters, collectedIds } = store.getState()
  const done = new Set(collectedIds)
  const found = resourceClusters.filter((cluster) => !done.has(cluster.id) && isResourceExposed(world, cluster))
  if (found.length > 0) store.setState({ collectedIds: [...collectedIds, ...found.map(({ id }) => id)] })
  return found
}
