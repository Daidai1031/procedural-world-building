import { fractalNoise } from '../proceduralMaps/noiseMath.js'
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

// Raw fractal noise sits mostly between 0.35 and 0.7. Stretching it to fill 0
// to 1 lets a mask or a moisture map use its whole range.
const NOISE_LOW = 0.35
const NOISE_HIGH = 0.7

export function normaliseNoise(raw) {
  return Math.min(1, Math.max(0, (raw - NOISE_LOW) / (NOISE_HIGH - NOISE_LOW)))
}

// Moisture is an artistic map with its own seed, not a simulation of water.
const MOISTURE_NOISE = { frequency: 0.35, octaves: 3, persistence: 0.5, seed: 11 }

export function moistureAt(x, z) {
  return normaliseNoise(fractalNoise('perlin', x, z, MOISTURE_NOISE))
}

// Where the water can reach. The lowest ground is about 1.3 and the median
// about 2.1.
export const WATER_LEVEL_RANGE = { min: 1.3, max: 2.2 }

const DISTANCE_GRID_SIZE = 128
const NOT_WATER = 1e20

// The exact squared distance transform of one row or column (Felzenszwalb and
// Huttenlocher): for each cell, the smallest of (distance to a seed)² plus that
// seed's own value, found by walking the lower envelope of parabolas.
function transformLine(values, length, output) {
  const parabolaIndices = new Int32Array(length)
  const boundaries = new Float64Array(length + 1)
  let parabolaCount = 0
  parabolaIndices[0] = 0
  boundaries[0] = -Infinity
  boundaries[1] = Infinity

  for (let index = 1; index < length; index += 1) {
    let intersection = 0
    while (true) {
      const previous = parabolaIndices[parabolaCount]
      intersection = (values[index] + index * index - (values[previous] + previous * previous)) / (2 * index - 2 * previous)
      if (intersection > boundaries[parabolaCount] || parabolaCount === 0) break
      parabolaCount -= 1
    }
    parabolaCount += 1
    parabolaIndices[parabolaCount] = index
    boundaries[parabolaCount] = intersection
    boundaries[parabolaCount + 1] = Infinity
  }

  parabolaCount = 0
  for (let index = 0; index < length; index += 1) {
    while (boundaries[parabolaCount + 1] < index) parabolaCount += 1
    const seed = parabolaIndices[parabolaCount]
    output[index] = (index - seed) ** 2 + values[seed]
  }
}

let cachedDistanceGrid = null

// A grid of distances to the nearest water, in world units: 0 wherever the
// ground is at or below the water level. Built once per water level.
export function buildWaterDistanceGrid(waterLevel) {
  if (cachedDistanceGrid?.waterLevel === waterLevel) return cachedDistanceGrid

  const size = DISTANCE_GRID_SIZE
  const spacing = SCATTER_WORLD_SIZE / (size - 1)
  const squared = new Float64Array(size * size)
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const x = -SCATTER_WORLD_SIZE / 2 + column * spacing
      const z = -SCATTER_WORLD_SIZE / 2 + row * spacing
      squared[row * size + column] = heightAt(x, z) <= waterLevel ? 0 : NOT_WATER
    }
  }

  const line = new Float64Array(size)
  const result = new Float64Array(size)
  for (let column = 0; column < size; column += 1) {
    for (let row = 0; row < size; row += 1) line[row] = squared[row * size + column]
    transformLine(line, size, result)
    for (let row = 0; row < size; row += 1) squared[row * size + column] = result[row]
  }
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) line[column] = squared[row * size + column]
    transformLine(line, size, result)
    for (let column = 0; column < size; column += 1) squared[row * size + column] = result[column]
  }

  const distances = new Float32Array(size * size)
  for (let index = 0; index < distances.length; index += 1) distances[index] = Math.sqrt(squared[index]) * spacing

  cachedDistanceGrid = { waterLevel, size, spacing, distances }
  return cachedDistanceGrid
}

// Distance to the nearest water at any x, z, read from the grid with bilinear
// interpolation. With no water at all, every distance is huge.
export function distanceToWaterAt(grid, x, z) {
  const columnPosition = Math.min(grid.size - 1.001, Math.max(0, (x + SCATTER_WORLD_SIZE / 2) / grid.spacing))
  const rowPosition = Math.min(grid.size - 1.001, Math.max(0, (z + SCATTER_WORLD_SIZE / 2) / grid.spacing))
  const column = Math.floor(columnPosition)
  const row = Math.floor(rowPosition)
  const fractionX = columnPosition - column
  const fractionZ = rowPosition - row
  const at = (rowIndex, columnIndex) => grid.distances[rowIndex * grid.size + columnIndex]
  const top = at(row, column) * (1 - fractionX) + at(row, column + 1) * fractionX
  const bottom = at(row + 1, column) * (1 - fractionX) + at(row + 1, column + 1) * fractionX
  return top * (1 - fractionZ) + bottom * fractionZ
}
