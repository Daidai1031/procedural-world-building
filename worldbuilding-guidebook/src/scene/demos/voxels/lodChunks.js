import { buildMarchingMeshInCells, clampedGradient, withPadding } from './marchingCubes.js'
import { VOXEL_WORLD_SIZE, samplePosition } from './voxelMath.js'

// The level-of-detail volume has its own layout. It is four chunks a side, each
// eight cells wide at full detail, so the whole volume is 32 cells across and
// every chunk boundary falls on a sample at every level.
export const LOD_CHUNKS_PER_SIDE = 4
export const LOD_CELLS_PER_CHUNK = 8
export const LOD_RESOLUTION = LOD_CHUNKS_PER_SIDE * LOD_CELLS_PER_CHUNK + 1
export const LOD_MAX_LEVELS = 3

const CHUNK_WIDTH = VOXEL_WORLD_SIZE / LOD_CHUNKS_PER_SIDE

// A column is at full detail closer than this to the camera, in world units. Each
// level after that reaches this much further. The width is more than the distance
// between the centres of two neighbouring columns (2.12), so however the camera is
// placed, two neighbouring columns never differ by more than one level.
export const LOD_FULL_DETAIL_DISTANCE = 8.5
export const LOD_BAND_WIDTH = 2.5

// The height, above the ground plane, of the point of a column the camera is
// measured to.
const LOD_COLUMN_HEIGHT = 2

// Each level doubles the distance between the samples a chunk uses.
export function levelStep(level) {
  return 2 ** level
}

function columnCenter(index) {
  return -VOXEL_WORLD_SIZE / 2 + (index + 0.5) * CHUNK_WIDTH
}

// A column of chunks, all the way up, shares one level. It grows with the
// distance from the camera, up to the last level offered.
export function chunkLevel(chunkX, chunkZ, camera, levelCount) {
  const distance = Math.hypot(columnCenter(chunkX) - camera.x, LOD_COLUMN_HEIGHT - camera.y, columnCenter(chunkZ) - camera.z)
  return Math.min(levelCount - 1, Math.max(0, Math.floor((distance - LOD_FULL_DETAIL_DISTANCE) / LOD_BAND_WIDTH) + 1))
}

// The level of every column, in the order chunkZ * 4 + chunkX.
export function columnLevels(camera, levelCount) {
  return Array.from({ length: LOD_CHUNKS_PER_SIDE ** 2 }, (_, column) =>
    chunkLevel(column % LOD_CHUNKS_PER_SIDE, Math.floor(column / LOD_CHUNKS_PER_SIDE), camera, levelCount),
  )
}

// The cells a chunk owns along one axis, by the sample each one starts on. The
// outermost chunks along x and z also own the padding cell that closes the
// volume, one step past the last real sample. Nothing closes the top or bottom.
function ownedCells(index, axis, step) {
  const isPadded = axis !== 1
  return {
    first: index === 0 && isPadded ? -step : index * LOD_CELLS_PER_CHUNK,
    last: index === LOD_CHUNKS_PER_SIDE - 1 && isPadded ? LOD_CHUNKS_PER_SIDE * LOD_CELLS_PER_CHUNK : (index + 1) * LOD_CELLS_PER_CHUNK - step,
  }
}

// One chunk at one level. It reads the field only at every step-th sample, so a
// coarse chunk works out far fewer values and makes far fewer triangles.
export function buildLodChunk(field, chunkIndex, level) {
  const step = levelStep(level)
  const resolution = LOD_RESOLUTION
  const cells = chunkIndex.map((index, axis) => ownedCells(index, axis, step))
  // A cell's far corner is one step on, and the slope there needs one more.
  const held = cells.map(({ first, last }) => ({ first: first - step, last: last + 2 * step }))
  const counts = held.map(({ first, last }) => (last - first) / step + 1)
  const values = new Float32Array(counts[0] * counts[1] * counts[2])
  const heldIndex = (sampleX, sampleY, sampleZ) =>
    (sampleX - held[0].first) / step + counts[0] * ((sampleY - held[1].first) / step + counts[1] * ((sampleZ - held[2].first) / step))

  const fieldAt = withPadding(resolution, (sampleX, sampleY, sampleZ) =>
    field(...samplePosition(resolution, sampleX, sampleY, sampleZ)),
  )
  for (let sampleZ = held[2].first; sampleZ <= held[2].last; sampleZ += step) {
    for (let sampleY = held[1].first; sampleY <= held[1].last; sampleY += step) {
      for (let sampleX = held[0].first; sampleX <= held[0].last; sampleX += step) {
        values[heldIndex(sampleX, sampleY, sampleZ)] = fieldAt(sampleX, sampleY, sampleZ)
      }
    }
  }

  const valueAt = (sampleX, sampleY, sampleZ) => values[heldIndex(sampleX, sampleY, sampleZ)]
  return buildMarchingMeshInCells({
    resolution,
    step,
    cells: { min: cells.map(({ first }) => first), max: cells.map(({ last }) => last + 1) },
    valueAt,
    gradientAt: (sampleX, sampleY, sampleZ) =>
      clampedGradient(valueAt, [0, 0, 0], [resolution - 1, resolution - 1, resolution - 1], sampleX, sampleY, sampleZ, step),
  })
}

// The four sides of a column that can meet a chunk of another level: which axis
// they are square to, which way they face, and the neighbouring column.
const SIDES = [
  { axis: 0, direction: -1, neighbour: [-1, 0] },
  { axis: 0, direction: 1, neighbour: [1, 0] },
  { axis: 2, direction: -1, neighbour: [0, -1] },
  { axis: 2, direction: 1, neighbour: [0, 1] },
]

function pointKey(point) {
  return point.map((value) => Math.round(value * 1e4)).join(',')
}

// The edges only one triangle uses, which is where a chunk's surface stops. Each
// comes with the normal at both of its ends.
export function findOpenEdges(mesh) {
  const edges = new Map()
  const read = (array, vertex) => Array.from(array.slice(vertex * 3, vertex * 3 + 3))

  for (let triangle = 0; triangle < mesh.positions.length / 9; triangle += 1) {
    for (let edge = 0; edge < 3; edge += 1) {
      const from = triangle * 3 + edge
      const to = triangle * 3 + ((edge + 1) % 3)
      const start = read(mesh.positions, from)
      const end = read(mesh.positions, to)
      const key = [pointKey(start), pointKey(end)].sort().join('|')
      const used = edges.get(key)
      edges.set(key, used
        ? { ...used, count: used.count + 1 }
        : { start, end, startNormal: read(mesh.normals, from), endNormal: read(mesh.normals, to), count: 1 })
    }
  }

  return [...edges.values()].filter((edge) => edge.count === 1)
}

function normalize([x, y, z]) {
  const length = Math.hypot(x, y, z) || 1
  return [x / length, y / length, z / length]
}

// The point on a set of edges that is nearest to a point, with the normal there,
// worked out from the normals at the two ends of the edge.
function nearestOnEdges(point, edges) {
  let best = null

  for (const { start, end, startNormal, endNormal } of edges) {
    const along = end.map((value, axis) => value - start[axis])
    const lengthSquared = along[0] ** 2 + along[1] ** 2 + along[2] ** 2
    const fraction = lengthSquared === 0
      ? 0
      : Math.min(1, Math.max(0, point.reduce((sum, value, axis) => sum + (value - start[axis]) * along[axis], 0) / lengthSquared))
    const nearest = start.map((value, axis) => value + along[axis] * fraction)
    const distanceSquared = nearest.reduce((sum, value, axis) => sum + (value - point[axis]) ** 2, 0)

    if (best === null || distanceSquared < best.distanceSquared) {
      best = {
        distanceSquared,
        position: nearest,
        normal: normalize(startNormal.map((value, axis) => value + (endNormal[axis] - value) * fraction)),
      }
    }
  }

  return best
}

// Moves every point of a chunk that sits on a side facing a coarser neighbour onto
// the edge that neighbour's surface ends in, and gives it the neighbour's normal
// there. The two surfaces then meet along the seam. Each side is a plane, and the
// edges are the coarser column's own open edges on it. A point keeps its place
// along the plane's axis, so it slides in the plane and never leaves it.
export function snapToCoarseEdges(mesh, sides) {
  const positions = Float32Array.from(mesh.positions)
  const normals = Float32Array.from(mesh.normals)

  for (let vertex = 0; vertex < positions.length / 3; vertex += 1) {
    const point = Array.from(positions.slice(vertex * 3, vertex * 3 + 3))
    const side = sides.find(({ axis, plane, edges }) => edges.length > 0 && Math.abs(point[axis] - plane) < 1e-4)
    if (!side) continue

    const nearest = nearestOnEdges(point, side.edges)
    nearest.position[side.axis] = point[side.axis]
    positions.set(nearest.position, vertex * 3)
    normals.set(nearest.normal, vertex * 3)
  }

  return { positions, normals }
}

// Every chunk of the volume, each column at its own level. levels is the level of
// each column, in the order chunkZ * 4 + chunkX. With hasSnapping on, a chunk
// whose neighbour is coarser is snapped to it along the side they share.
export function buildLodChunks({ field, levels, hasSnapping, cache }) {
  const chunks = []
  const meshOf = (chunkX, chunkY, chunkZ) => {
    const level = levels[chunkZ * LOD_CHUNKS_PER_SIDE + chunkX]
    const key = `${chunkX}-${chunkY}-${chunkZ}-${level}`
    if (!cache.has(key)) cache.set(key, buildLodChunk(field, [chunkX, chunkY, chunkZ], level))
    return { key, mesh: cache.get(key) }
  }

  for (let chunkZ = 0; chunkZ < LOD_CHUNKS_PER_SIDE; chunkZ += 1) {
    for (let chunkY = 0; chunkY < LOD_CHUNKS_PER_SIDE; chunkY += 1) {
      for (let chunkX = 0; chunkX < LOD_CHUNKS_PER_SIDE; chunkX += 1) {
        const level = levels[chunkZ * LOD_CHUNKS_PER_SIDE + chunkX]
        const { mesh: baseMesh } = meshOf(chunkX, chunkY, chunkZ)
        const sides = []

        if (hasSnapping) {
          for (const { axis, direction, neighbour } of SIDES) {
            const neighbourX = chunkX + neighbour[0]
            const neighbourZ = chunkZ + neighbour[1]
            if (neighbourX < 0 || neighbourX >= LOD_CHUNKS_PER_SIDE || neighbourZ < 0 || neighbourZ >= LOD_CHUNKS_PER_SIDE) continue
            if (levels[neighbourZ * LOD_CHUNKS_PER_SIDE + neighbourX] <= level) continue

            // The coarser neighbour's edge is the edge of the whole column beside
            // this chunk, so chunks stacked in this column all follow the same line.
            const index = axis === 0 ? chunkX : chunkZ
            const plane = -VOXEL_WORLD_SIZE / 2 + (direction > 0 ? index + 1 : index) * CHUNK_WIDTH
            const edges = []
            for (let neighbourY = 0; neighbourY < LOD_CHUNKS_PER_SIDE; neighbourY += 1) {
              const { key, mesh } = meshOf(neighbourX, neighbourY, neighbourZ)
              if (!cache.has(`edges-${key}`)) cache.set(`edges-${key}`, findOpenEdges(mesh))
              edges.push(...cache.get(`edges-${key}`).filter((edge) => [edge.start, edge.end].every((point) => Math.abs(point[axis] - plane) < 1e-4)))
            }
            sides.push({ axis, plane, edges })
          }
        }

        chunks.push({
          key: `${chunkX}-${chunkY}-${chunkZ}`,
          level,
          mesh: sides.length === 0 ? baseMesh : snapToCoarseEdges(baseMesh, sides),
          triangleCount: baseMesh.positions.length / 9,
          bounds: {
            min: [-VOXEL_WORLD_SIZE / 2 + chunkX * CHUNK_WIDTH, chunkY * CHUNK_WIDTH, -VOXEL_WORLD_SIZE / 2 + chunkZ * CHUNK_WIDTH],
            max: [-VOXEL_WORLD_SIZE / 2 + (chunkX + 1) * CHUNK_WIDTH, (chunkY + 1) * CHUNK_WIDTH, -VOXEL_WORLD_SIZE / 2 + (chunkZ + 1) * CHUNK_WIDTH],
          },
        })
      }
    }
  }

  return chunks
}
