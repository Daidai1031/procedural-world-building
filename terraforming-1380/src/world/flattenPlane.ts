import { VOXEL_WORLD_SIZE } from './voxels/voxelMath.js'

export type FlattenOrientation = 'radial' | 'horizontal'
export type GridPoint = { x: number; y: number; z: number }

// TOOL-04: the default plane faces away from the planet center at the click.
export function flattenNormal(point: GridPoint, orientation: FlattenOrientation): [number, number, number] {
  if (orientation === 'horizontal') return [0, 1, 0]
  const cy = point.y - VOXEL_WORLD_SIZE / 2
  const length = Math.hypot(point.x, cy, point.z)
  return length > 1e-6 ? [point.x / length, cy / length, point.z / length] : [0, 1, 0]
}
