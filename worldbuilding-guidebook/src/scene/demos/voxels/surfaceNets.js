import {
  CELL_CORNER_COUNT,
  ISOVALUE,
  VOXEL_WORLD_SIZE,
  cellCornerOffset,
  cellEdges,
  crossingFraction,
  sampleSpacing,
} from './voxelMath.js'
import {
  createSampler,
  isPaddingSample,
  normalize,
  sampleGradient,
  subtract,
} from './marchingCubes.js'

// One vertex per cell: the average of the points where the surface crosses its edges.
export function averagePoint(points) {
  const total = points.reduce((sum, point) => sum.map((value, axis) => value + point[axis]), [0, 0, 0])
  return total.map((value) => value / points.length)
}

// Surface Nets over every cell of the grid. Every cell the surface passes
// through gets one vertex. Every grid edge the surface crosses then joins the
// four cells around it into a quad. Returns flat position and normal arrays, in
// the same shape as buildMarchingMesh, with each quad cut into two triangles.
export function buildSurfaceNetsMesh(densities, resolution) {
  const valueAt = createSampler(densities, resolution)
  const spacing = sampleSpacing(resolution)
  const edges = cellEdges()
  const cornerOffsets = Array.from({ length: CELL_CORNER_COUNT }, (_, corner) => cellCornerOffset(corner))
  const cornerValues = new Array(CELL_CORNER_COUNT)
  const vertices = new Map()
  const positions = []
  const normals = []

  const samplePosition = (sampleX, sampleY, sampleZ) => [
    -VOXEL_WORLD_SIZE / 2 + sampleX * spacing,
    sampleY * spacing,
    -VOXEL_WORLD_SIZE / 2 + sampleZ * spacing,
  ]

  // The same cells as Marching Cubes: one step past the volume on the sides and
  // top, so the surface closes there, and none below it.
  const cellKey = (cellX, cellY, cellZ) => (cellX + 1) + (resolution + 1) * (cellY + (resolution + 1) * (cellZ + 1))

  for (let cellZ = -1; cellZ < resolution; cellZ += 1) {
    for (let cellY = 0; cellY < resolution; cellY += 1) {
      for (let cellX = -1; cellX < resolution; cellX += 1) {
        for (let corner = 0; corner < CELL_CORNER_COUNT; corner += 1) {
          const [offsetX, offsetY, offsetZ] = cornerOffsets[corner]
          cornerValues[corner] = valueAt(cellX + offsetX, cellY + offsetY, cellZ + offsetZ)
        }

        const crossings = []
        const slopes = []
        const outward = [0, 0, 0]

        for (const [cornerA, cornerB] of edges) {
          const isInsideA = cornerValues[cornerA] < ISOVALUE
          if (isInsideA === (cornerValues[cornerB] < ISOVALUE)) continue

          const sampleA = cornerOffsets[cornerA].map((offset, axis) => [cellX, cellY, cellZ][axis] + offset)
          const sampleB = cornerOffsets[cornerB].map((offset, axis) => [cellX, cellY, cellZ][axis] + offset)
          const fraction = crossingFraction(cornerValues[cornerA], cornerValues[cornerB])
          const pointA = samplePosition(...sampleA)
          const pointB = samplePosition(...sampleB)
          crossings.push(pointA.map((start, axis) => start + (pointB[axis] - start) * fraction))

          const [inside, outside] = isInsideA ? [cornerA, cornerB] : [cornerB, cornerA]
          subtract(cornerOffsets[outside], cornerOffsets[inside]).forEach((step, axis) => { outward[axis] += step })

          // A crossing next to the padding has no real slope to read.
          if (!isPaddingSample(resolution, sampleA) && !isPaddingSample(resolution, sampleB)) {
            const slopeA = sampleGradient(densities, resolution, ...sampleA)
            const slopeB = sampleGradient(densities, resolution, ...sampleB)
            slopes.push(slopeA.map((start, axis) => start + (slopeB[axis] - start) * fraction))
          }
        }

        if (crossings.length === 0) continue

        // The volume has no floor, so the mesh ends on the ground plane. The
        // first row of the walls is pulled down to it, or a gap would open under
        // the wall, where an averaged vertex hangs above the plane.
        const touchesPadding = cornerOffsets.some(([offsetX, offsetY, offsetZ]) =>
          isPaddingSample(resolution, [cellX + offsetX, cellY + offsetY, cellZ + offsetZ]),
        )
        const position = averagePoint(crossings)
        if (cellY === 0 && touchesPadding) position[1] = 0

        const slopeTotal = slopes.reduce((sum, slope) => sum.map((value, axis) => value + slope[axis]), [0, 0, 0])
        vertices.set(cellKey(cellX, cellY, cellZ), {
          position,
          normal: normalize(slopes.length > 0 ? slopeTotal : outward),
        })
      }
    }
  }

  // Every grid edge whose two ends disagree. The quad walks the four cells
  // around it, counter-clockwise seen from the edge's positive end, so it is
  // reversed when the solid lies at the positive end.
  const quadCorners = [[0, 0], [1, 0], [1, 1], [0, 1]]

  for (let sampleZ = -1; sampleZ <= resolution; sampleZ += 1) {
    for (let sampleY = 0; sampleY <= resolution; sampleY += 1) {
      for (let sampleX = -1; sampleX <= resolution; sampleX += 1) {
        const start = [sampleX, sampleY, sampleZ]
        const isInsideStart = valueAt(...start) < ISOVALUE

        for (let axis = 0; axis < 3; axis += 1) {
          const end = [...start]
          end[axis] += 1
          if (isInsideStart === (valueAt(...end) < ISOVALUE)) continue

          const across = [(axis + 1) % 3, (axis + 2) % 3]
          const quad = quadCorners.map(([stepU, stepV]) => {
            const cell = [...start]
            cell[across[0]] += stepU - 1
            cell[across[1]] += stepV - 1
            return vertices.get(cellKey(...cell))
          })
          // At the edge of the volume some of the four cells do not exist.
          if (quad.some((vertex) => vertex === undefined)) continue

          const ordered = isInsideStart ? quad : quad.toReversed()
          for (const index of [0, 1, 2, 0, 2, 3]) {
            positions.push(...ordered[index].position)
            normals.push(...ordered[index].normal)
          }
        }
      }
    }
  }

  return { positions: new Float32Array(positions), normals: new Float32Array(normals) }
}
