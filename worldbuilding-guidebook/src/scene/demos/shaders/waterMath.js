import { DataTexture, LinearFilter, RedFormat, UnsignedByteType } from 'three'
import { groundHeight, VOXEL_WORLD_SIZE } from '../voxels/voxelMath.js'

// Resolution of the 2D grid the flood fill runs on — independent of the
// voxel mesh's own resolution control, since this reads groundHeight
// directly rather than the mesh.
const WATER_GRID_RESOLUTION = 48

// Measured (scripts/water-diagnostic, see docs/exercise/06-shader-studies.md):
// the deepest puddle this height field ever traps is about 0.384 world
// units. A fixed ceiling — not the actual max recomputed live — is what
// keeps a stable puddle from changing colour as something unrelated moves.
const MAX_WATER_DEPTH = 0.4

function gridPosition(row, col, resolution) {
  const spacing = VOXEL_WORLD_SIZE / (resolution - 1)
  return [-VOXEL_WORLD_SIZE / 2 + col * spacing, -VOXEL_WORLD_SIZE / 2 + row * spacing]
}

// The classic "trapped rainwater" flood fill: water can only ever sit as
// high as the lowest rim it would have to cross to reach the map edge. A
// plain array as the frontier is fine at this grid size — no real heap
// needed for a few thousand cells, run once, not per frame.
function computeStandingWaterDepth(resolution = WATER_GRID_RESOLUTION) {
  const size = resolution * resolution
  const height = new Float32Array(size)
  for (let row = 0; row < resolution; row += 1) {
    for (let col = 0; col < resolution; col += 1) {
      const [x, z] = gridPosition(row, col, resolution)
      height[row * resolution + col] = groundHeight(x, z)
    }
  }

  const waterLevel = new Float32Array(size).fill(Infinity)
  const visited = new Uint8Array(size)
  const frontier = []

  function enqueue(index, level) {
    waterLevel[index] = level
    visited[index] = 1
    frontier.push(index)
  }

  for (let row = 0; row < resolution; row += 1) {
    for (let col = 0; col < resolution; col += 1) {
      if (row === 0 || col === 0 || row === resolution - 1 || col === resolution - 1) {
        enqueue(row * resolution + col, height[row * resolution + col])
      }
    }
  }

  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  while (frontier.length > 0) {
    let bestSlot = 0
    for (let i = 1; i < frontier.length; i += 1) {
      if (waterLevel[frontier[i]] < waterLevel[frontier[bestSlot]]) bestSlot = i
    }
    const index = frontier[bestSlot]
    frontier[bestSlot] = frontier[frontier.length - 1]
    frontier.pop()

    const row = Math.floor(index / resolution)
    const col = index % resolution
    for (const [rowOffset, colOffset] of offsets) {
      const neighborRow = row + rowOffset
      const neighborCol = col + colOffset
      if (neighborRow < 0 || neighborRow >= resolution || neighborCol < 0 || neighborCol >= resolution) continue
      const neighborIndex = neighborRow * resolution + neighborCol
      if (visited[neighborIndex]) continue
      enqueue(neighborIndex, Math.max(waterLevel[index], height[neighborIndex]))
    }
  }

  const depth = new Float32Array(size)
  for (let i = 0; i < size; i += 1) depth[i] = Math.max(0, waterLevel[i] - height[i])
  return { depth, resolution }
}

// A pure function of groundHeight, so it never needs to change with voxel
// shape, resolution, or any control — computed once and cached.
let cachedWaterTexture = null

export function getWaterTexture() {
  if (cachedWaterTexture) return cachedWaterTexture
  const { depth, resolution } = computeStandingWaterDepth()
  const data = new Uint8Array(depth.length)
  for (let i = 0; i < depth.length; i += 1) {
    data[i] = Math.round(Math.min(1, depth[i] / MAX_WATER_DEPTH) * 255)
  }
  cachedWaterTexture = new DataTexture(data, resolution, resolution, RedFormat, UnsignedByteType)
  // A DataTexture defaults to NearestFilter, which reads back as a grid of
  // hard-edged squares at only 48x48 samples across the map — exactly the
  // "little blocks" a puddle should not look like. Linear filtering blends
  // neighbouring samples, so a puddle's edge softens the way a boundary
  // interpolated across a mesh already does elsewhere in this study.
  cachedWaterTexture.magFilter = LinearFilter
  cachedWaterTexture.minFilter = LinearFilter
  cachedWaterTexture.needsUpdate = true
  return cachedWaterTexture
}
