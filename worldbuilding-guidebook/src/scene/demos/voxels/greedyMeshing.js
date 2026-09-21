import { VOXEL_WORLD_SIZE, isSolid, sampleSpacing } from './voxelMath.js'

// Grows a rectangle of set cells from one corner: as wide as the row allows,
// then as tall as every row below it stays that wide. mask holds one cell per
// face on a size by size grid, and the rectangle is one flat piece in the mesh.
export function growRectangle(mask, size, firstU, firstV) {
  const isSet = (u, v) => mask[u + size * v] === 1
  const isRowSet = (v, width) => Array.from({ length: width }, (_, step) => isSet(firstU + step, v)).every(Boolean)

  let width = 1
  while (firstU + width < size && isSet(firstU + width, firstV)) width += 1

  let height = 1
  while (firstV + height < size && isRowSet(firstV + height, width)) height += 1

  return { width, height }
}

// One flat rectangle facing along an axis, as two triangles. The plane is where
// it sits along that axis. direction is 1 for facing the positive way and -1 for
// the negative way, which turns the winding round so the front stays outside.
function addQuad(mesh, axis, direction, plane, [firstA, lastA], [firstB, lastB]) {
  const acrossA = (axis + 1) % 3
  const acrossB = (axis + 2) % 3
  const corner = (a, b) => {
    const point = [0, 0, 0]
    point[axis] = plane
    point[acrossA] = a
    point[acrossB] = b
    return point
  }

  const corners = [corner(firstA, firstB), corner(lastA, firstB), corner(lastA, lastB), corner(firstA, lastB)]
  if (direction < 0) corners.reverse()

  const normal = [0, 0, 0]
  normal[axis] = direction
  for (const index of [0, 1, 2, 0, 2, 3]) {
    mesh.positions.push(...corners[index])
    mesh.normals.push(...normal)
  }
}

// Blocky meshing of the solid voxels. A face is drawn where a solid voxel has air
// next to it, and never between two solid voxels. The faces of one direction are
// swept a slice at a time, so each slice is a flat grid of faces. With merge on,
// neighbouring faces in a slice join into rectangles. Returns flat position and
// normal arrays, in the same shape as buildMarchingMesh.
function buildBlockMesh(densities, resolution, merge) {
  const mesh = { positions: [], normals: [] }
  const spacing = sampleSpacing(resolution)
  const half = spacing / 2
  const coordinate = (axis, index) => (axis === 1 ? 0 : -VOXEL_WORLD_SIZE / 2) + index * spacing
  const mask = new Uint8Array(resolution * resolution)
  const voxel = [0, 0, 0]

  for (let axis = 0; axis < 3; axis += 1) {
    const acrossA = (axis + 1) % 3
    const acrossB = (axis + 2) % 3

    for (const direction of [-1, 1]) {
      for (let slice = 0; slice < resolution; slice += 1) {
        for (let v = 0; v < resolution; v += 1) {
          for (let u = 0; u < resolution; u += 1) {
            voxel[axis] = slice
            voxel[acrossA] = u
            voxel[acrossB] = v
            const isFace = isSolid(densities, resolution, ...voxel) && !isSolid(densities, resolution, ...voxel.map((index, each) => (each === axis ? index + direction : index)))
            mask[u + resolution * v] = isFace ? 1 : 0
          }
        }

        for (let v = 0; v < resolution; v += 1) {
          for (let u = 0; u < resolution; u += 1) {
            if (mask[u + resolution * v] === 0) continue

            const { width, height } = merge ? growRectangle(mask, resolution, u, v) : { width: 1, height: 1 }
            for (let clearV = v; clearV < v + height; clearV += 1) {
              for (let clearU = u; clearU < u + width; clearU += 1) mask[clearU + resolution * clearV] = 0
            }

            addQuad(
              mesh,
              axis,
              direction,
              coordinate(axis, slice) + direction * half,
              [coordinate(acrossA, u) - half, coordinate(acrossA, u + width - 1) + half],
              [coordinate(acrossB, v) - half, coordinate(acrossB, v + height - 1) + half],
            )
          }
        }
      }
    }
  }

  return { positions: new Float32Array(mesh.positions), normals: new Float32Array(mesh.normals) }
}

// One square face for every voxel side that meets air.
export function buildCulledMesh(densities, resolution) {
  return buildBlockMesh(densities, resolution, false)
}

// The same faces, joined into as few rectangles as the greedy sweep finds.
export function buildGreedyMesh(densities, resolution) {
  return buildBlockMesh(densities, resolution, true)
}
