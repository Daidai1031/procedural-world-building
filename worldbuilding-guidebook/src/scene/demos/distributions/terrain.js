import { VOXEL_WORLD_SIZE, groundHeight } from '../voxels/voxelMath.js'

// The same ground as Lessons 03 and 04, read straight from its height function
// instead of through a voxel grid, so every candidate gets the exact height.
export const SCATTER_WORLD_SIZE = VOXEL_WORLD_SIZE

// Grid cells along one side of the drawn surface. Fine enough that the mesh
// stays within a few hundredths of the true height between vertices.
export const TERRAIN_SEGMENTS = 96

export function heightAt(x, z) {
  return groundHeight(x, z)
}

function gridPosition(index) {
  return -SCATTER_WORLD_SIZE / 2 + (index / TERRAIN_SEGMENTS) * SCATTER_WORLD_SIZE
}

// The top surface as an indexed grid. Positions are [x, y, z] triples.
export function buildTerrainSurface() {
  const rowLength = TERRAIN_SEGMENTS + 1
  const positions = new Float32Array(rowLength * rowLength * 3)
  const indices = []

  for (let row = 0; row < rowLength; row += 1) {
    for (let column = 0; column < rowLength; column += 1) {
      const x = gridPosition(column)
      const z = gridPosition(row)
      positions.set([x, heightAt(x, z), z], (row * rowLength + column) * 3)
    }
  }

  for (let row = 0; row < TERRAIN_SEGMENTS; row += 1) {
    for (let column = 0; column < TERRAIN_SEGMENTS; column += 1) {
      const topLeft = row * rowLength + column
      const bottomLeft = topLeft + rowLength
      indices.push(topLeft, bottomLeft, topLeft + 1, topLeft + 1, bottomLeft, bottomLeft + 1)
    }
  }

  return { positions, indices }
}

// The four walls from the surface edge down to y = 0, so the ground reads as a
// cut-away block like the voxel volume. Each wall gets its own vertices, so its
// flat shading is not blended into the top surface.
export function buildTerrainWalls() {
  const half = SCATTER_WORLD_SIZE / 2
  const sides = [
    (offset) => [offset, -half],
    (offset) => [half, offset],
    (offset) => [-offset, half],
    (offset) => [-half, -offset],
  ]
  const positions = []
  const indices = []

  for (const sidePoint of sides) {
    const start = positions.length / 3
    for (let index = 0; index <= TERRAIN_SEGMENTS; index += 1) {
      const [x, z] = sidePoint(gridPosition(index))
      positions.push(x, heightAt(x, z), z, x, 0, z)
    }
    for (let index = 0; index < TERRAIN_SEGMENTS; index += 1) {
      const top = start + index * 2
      indices.push(top, top + 2, top + 1, top + 1, top + 2, top + 3)
    }
  }

  return { positions: new Float32Array(positions), indices }
}
