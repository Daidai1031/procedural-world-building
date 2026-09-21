import {
  CELL_CORNER_COUNT,
  ISOVALUE,
  VOXEL_WORLD_SIZE,
  cellCaseIndex,
  cellCornerOffset,
  cellEdges,
  crossingFraction,
  findSurfaceEdgeTriangles,
  sampleSpacing,
  voxelIndex,
} from './voxelMath.js'

// Every one of the 256 corner patterns has a row: the triangles of that cell, as
// triples of edge indices. Only which corners are inside matters here, so each
// pattern is drawn with corners exactly one unit inside or outside. The rule
// that joins the dots runs 256 times when this file loads, and never again.
export const TRIANGLE_TABLE = Array.from({ length: 2 ** CELL_CORNER_COUNT }, (_, caseIndex) =>
  findSurfaceEdgeTriangles(
    Array.from({ length: CELL_CORNER_COUNT }, (_, corner) => ((caseIndex >> corner) & 1 ? ISOVALUE - 1 : ISOVALUE + 1)),
  ),
)

// The case index picks the row of the table. The row lists which crossed edges make each triangle.
export function trianglesForCell(cornerValues) {
  return TRIANGLE_TABLE[cellCaseIndex(cornerValues)]
}

// Samples just outside the volume. They are far from zero, so a wall of surface
// lands next to the last real sample and the volume reads as a closed block.
// Below the volume counts as solid, so no floor is made; every other side is air.
const PADDING_DISTANCE = 10

// Reads real samples with readSample, and answers with the padding values for
// any sample outside the volume.
export function withPadding(resolution, readSample) {
  return (sampleX, sampleY, sampleZ) => {
    if (sampleY < 0) return ISOVALUE - PADDING_DISTANCE
    const isOutside =
      sampleX < 0 || sampleX >= resolution ||
      sampleY >= resolution ||
      sampleZ < 0 || sampleZ >= resolution
    if (isOutside) return ISOVALUE + PADDING_DISTANCE
    return readSample(sampleX, sampleY, sampleZ)
  }
}

export function createSampler(densities, resolution) {
  return withPadding(resolution, (sampleX, sampleY, sampleZ) =>
    densities[voxelIndex(resolution, sampleX, sampleY, sampleZ)],
  )
}

// The value climbs fastest towards the air, so its slope points out of the
// solid. That makes a smooth surface normal at a real sample. It reads only the
// samples between first and last (one [x, y, z] corner each), and at the edge of
// that range it steps to the nearest one. step is how far apart the samples it
// compares are, which is more than one on a coarse grid.
export function clampedGradient(valueAt, first, last, sampleX, sampleY, sampleZ, step = 1) {
  const clamp = (index, axis) => Math.min(last[axis], Math.max(first[axis], index))
  const clampedValueAt = (x, y, z) => valueAt(clamp(x, 0), clamp(y, 1), clamp(z, 2))
  return [
    clampedValueAt(sampleX + step, sampleY, sampleZ) - clampedValueAt(sampleX - step, sampleY, sampleZ),
    clampedValueAt(sampleX, sampleY + step, sampleZ) - clampedValueAt(sampleX, sampleY - step, sampleZ),
    clampedValueAt(sampleX, sampleY, sampleZ + step) - clampedValueAt(sampleX, sampleY, sampleZ - step),
  ]
}

export function sampleGradient(densities, resolution, sampleX, sampleY, sampleZ) {
  const last = resolution - 1
  return clampedGradient(
    (x, y, z) => densities[voxelIndex(resolution, x, y, z)],
    [0, 0, 0],
    [last, last, last],
    sampleX,
    sampleY,
    sampleZ,
  )
}

export function isPaddingSample(resolution, [sampleX, sampleY, sampleZ]) {
  return sampleX < 0 || sampleX >= resolution || sampleY < 0 || sampleY >= resolution || sampleZ < 0 || sampleZ >= resolution
}

export function normalize([x, y, z]) {
  const length = Math.hypot(x, y, z) || 1
  return [x / length, y / length, z / length]
}

export function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

// The cells that close the whole volume: one step past it on the sides and top,
// so the padding samples get their own cells, and none below it. max is exclusive.
export function volumeCellRange(resolution) {
  return { min: [-1, 0, -1], max: [resolution, resolution, resolution] }
}

// Marching Cubes over every cell of the grid. Returns flat position and normal
// arrays, three numbers per vertex and three vertices per triangle.
export function buildMarchingMesh(densities, resolution) {
  return buildMarchingMeshInCells({
    resolution,
    cells: volumeCellRange(resolution),
    valueAt: createSampler(densities, resolution),
    gradientAt: (sampleX, sampleY, sampleZ) => sampleGradient(densities, resolution, sampleX, sampleY, sampleZ),
  })
}

// Marching Cubes over the cells in one range. valueAt answers for the corners
// of those cells and gradientAt for the slope at their real samples, so a chunk
// can run this over the samples it holds without the rest of the volume. With a
// step above one every cell spans that many samples, which is a coarser mesh of
// the same field, and the cell range must start on a multiple of it.
export function buildMarchingMeshInCells({ resolution, cells, valueAt, gradientAt, step = 1 }) {
  const spacing = sampleSpacing(resolution)
  const edges = cellEdges()
  const cornerOffsets = Array.from({ length: CELL_CORNER_COUNT }, (_, corner) => cellCornerOffset(corner).map((offset) => offset * step))
  const cornerValues = new Array(CELL_CORNER_COUNT)
  const positions = []
  const normals = []

  const samplePosition = (sampleX, sampleY, sampleZ) => [
    -VOXEL_WORLD_SIZE / 2 + sampleX * spacing,
    sampleY * spacing,
    -VOXEL_WORLD_SIZE / 2 + sampleZ * spacing,
  ]

  for (let cellZ = cells.min[2]; cellZ < cells.max[2]; cellZ += step) {
    for (let cellY = cells.min[1]; cellY < cells.max[1]; cellY += step) {
      for (let cellX = cells.min[0]; cellX < cells.max[0]; cellX += step) {
        for (let corner = 0; corner < CELL_CORNER_COUNT; corner += 1) {
          const [offsetX, offsetY, offsetZ] = cornerOffsets[corner]
          cornerValues[corner] = valueAt(cellX + offsetX, cellY + offsetY, cellZ + offsetZ)
        }

        for (const triangle of trianglesForCell(cornerValues)) {
          // Each vertex sits on an edge. outward adds up which way those edges
          // run from an inside corner to an outside corner.
          const outward = [0, 0, 0]
          const vertices = triangle.map((edgeIndex) => {
            const [cornerA, cornerB] = edges[edgeIndex]
            const sampleA = cornerOffsets[cornerA].map((offset, axis) => [cellX, cellY, cellZ][axis] + offset)
            const sampleB = cornerOffsets[cornerB].map((offset, axis) => [cellX, cellY, cellZ][axis] + offset)
            const fraction = crossingFraction(cornerValues[cornerA], cornerValues[cornerB])
            const pointA = samplePosition(...sampleA)
            const pointB = samplePosition(...sampleB)

            const [inside, outside] = cornerValues[cornerA] < ISOVALUE ? [cornerA, cornerB] : [cornerB, cornerA]
            subtract(cornerOffsets[outside], cornerOffsets[inside]).forEach((change, axis) => { outward[axis] += change })

            // A vertex next to the padding has no real slope to read, so it
            // takes the flat normal of its triangle below.
            const isNextToPadding = isPaddingSample(resolution, sampleA) || isPaddingSample(resolution, sampleB)
            const gradientA = isNextToPadding ? null : gradientAt(...sampleA)
            const gradientB = isNextToPadding ? null : gradientAt(...sampleB)
            return {
              position: pointA.map((start, axis) => start + (pointB[axis] - start) * fraction),
              normal: isNextToPadding ? null : normalize(gradientA.map((start, axis) => start + (gradientB[axis] - start) * fraction)),
            }
          })

          // Wind the triangle so that it faces out of the solid, towards the air.
          let faceNormal = cross(
            subtract(vertices[1].position, vertices[0].position),
            subtract(vertices[2].position, vertices[0].position),
          )
          if (dot(faceNormal, outward) < 0) {
            ;[vertices[1], vertices[2]] = [vertices[2], vertices[1]]
            faceNormal = faceNormal.map((value) => -value)
          }
          const flatNormal = normalize(faceNormal)

          for (const vertex of vertices) {
            positions.push(...vertex.position)
            normals.push(...(vertex.normal ?? flatNormal))
          }
        }
      }
    }
  }

  return { positions: new Float32Array(positions), normals: new Float32Array(normals) }
}
