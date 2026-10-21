import { tubeIndex, triangleCount } from './assetGeometry.js'

// Sides per tube for LOD 0, 1 and 2.
export const LOD_SIDES = [8, 4, 3]
export const MIN_LOD_GAP = 0.5

// The levels are cut from one full seeded asset, never regenerated: LOD 1 drops
// the finest level of branches and LOD 2 keeps only the trunk and the first
// side branches. Every kept segment is the same segment as in LOD 0.
export function buildLodSet(segments) {
  const deepest = Math.max(...segments.map((segment) => segment.depth))
  const limits = [deepest, Math.max(0, deepest - 1), Math.min(1, Math.max(0, deepest - 1))]
  return LOD_SIDES.map((sides, level) => {
    const kept = segments.filter((segment) => segment.depth <= limits[level])
    return { level, sides, segments: kept, triangles: triangleCount(tubeIndex(kept.length, sides)) }
  })
}

// Which level to draw at a distance. Distances below near use LOD 0; below far
// use LOD 1; beyond that LOD 2. The far edge is kept a little past near, so two
// sliders crossed over still switch in order.
export function chooseLod(distance, near, far) {
  const farEdge = Math.max(far, near + MIN_LOD_GAP)
  // #region pick-level
  if (distance < near) return 0
  return distance < farEdge ? 1 : 2
  // #endregion
}
