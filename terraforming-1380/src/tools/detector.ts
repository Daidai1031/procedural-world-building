import type { createRunStore } from '../state/runState'
import type { ResourceCluster } from '../world/resourceClusters'
import type { PlanetWorld } from '../world/planet'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'

type Point3 = [number, number, number]

// DET-01: a scan only inspects a bounded area around the clicked surface.
export function scanWithDetector(store: ReturnType<typeof createRunStore>, center: Point3) {
  store.setState((state) => ({ detector: { ...state.detector, center } }))
}

export function detectedClusters(clusters: ResourceCluster[], center: Point3, radius: number) {
  return clusters.filter(({ position }) => Math.hypot(
    position[0] - center[0], position[1] - center[1], position[2] - center[2],
  ) <= radius)
}

// DET-03: a target becomes normally visible only after terrain exposes its center.
export function isResourceExposed(world: PlanetWorld, cluster: ResourceCluster) {
  const [x, y, z] = cluster.position
  return world.densityAt(x, y + VOXEL_WORLD_SIZE / 2, z) >= 0
}
