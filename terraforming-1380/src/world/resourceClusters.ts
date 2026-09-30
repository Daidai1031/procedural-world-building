import { tuning } from '../config/tuning'
import { createPlanetField, hashSeed } from './planet'
import { VOXEL_WORLD_SIZE } from './voxels/voxelMath.js'

export type ResourceCategory = 'mineral' | 'life' | 'memory'
export interface ResourceCluster {
  id: string
  category: ResourceCategory
  position: [number, number, number]
  radius: number
}

function randomStream(seed: number) {
  let state = seed
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

// GEN-01/07: early spatial targets for Detector; full irregular deposits remain M3.
export function generateResourceClusters(seed: string): ResourceCluster[] {
  const field = createPlanetField(seed)
  const categories: ResourceCategory[] = ['mineral', 'life', 'memory']
  const clusters: ResourceCluster[] = []

  for (const [categoryIndex, category] of categories.entries()) {
    const random = randomStream(hashSeed(`${seed}:resource:${category}`))
    const count = tuning.gen.cluster[category].count
    for (let index = 0; index < count; index += 1) {
      const height = random() * 2 - 1
      const angle = random() * Math.PI * 2
      const ring = Math.sqrt(1 - height * height)
      const direction = [Math.cos(angle) * ring, height, Math.sin(angle) * ring]
      let inside = 0
      let outside = VOXEL_WORLD_SIZE / 2
      for (let step = 0; step < 14; step += 1) {
        const middle = (inside + outside) / 2
        const [x, y, z] = direction.map((component) => component * middle)
        if (field(x, y + VOXEL_WORLD_SIZE / 2, z) < 0) inside = middle
        else outside = middle
      }
      // Every target starts embedded in the solid sphere. Teaching targets sit shallow so their glow
      // shows through the surface; the rest are deeper and only leak light at short range.
      const shallowTeachingTarget = index < Math.floor(tuning.gen.surfaceTeachingTargets / categories.length)
        + Number(categoryIndex < tuning.gen.surfaceTeachingTargets % categories.length)
      const depth = shallowTeachingTarget ? 0.14 + random() * 0.08 : 0.3 + random() * 1.15
      const distance = Math.max(0.25, inside - depth)
      clusters.push({
        id: `${category}-${index}`,
        category,
        position: direction.map((component) => component * distance) as [number, number, number],
        radius: 0.08 + random() * 0.08,
      })
    }
  }
  return clusters
}
