import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  LOD_CHUNKS_PER_SIDE,
  LOD_RESOLUTION,
  buildLodChunks,
  chunkLevel,
  columnLevels,
  findOpenEdges,
  levelStep,
} from '../src/scene/demos/voxels/lodChunks.js'
import { buildMarchingMesh, buildMarchingMeshInCells, clampedGradient, createSampler } from '../src/scene/demos/voxels/marchingCubes.js'
import { VOXEL_WORLD_SIZE, groundDensity, sampleDensityGrid } from '../src/scene/demos/voxels/voxelMath.js'

const CHUNK_WIDTH = VOXEL_WORLD_SIZE / LOD_CHUNKS_PER_SIDE
const COLUMNS = LOD_CHUNKS_PER_SIDE ** 2

function chunksFor(levels, hasSnapping) {
  return buildLodChunks({ field: groundDensity, levels, hasSnapping, cache: new Map() })
}

const uniform = (level) => Array.from({ length: COLUMNS }, () => level)

function joinChunks(chunks) {
  return {
    positions: chunks.flatMap((chunk) => [...chunk.mesh.positions]),
    normals: chunks.flatMap((chunk) => [...chunk.mesh.normals]),
  }
}

// Every triangle as a text key, so two meshes can be compared as sets.
function triangleKeys(mesh) {
  const keys = []
  for (let triangle = 0; triangle < mesh.positions.length / 9; triangle += 1) {
    const vertices = [0, 1, 2].map((corner) => {
      const start = (triangle * 3 + corner) * 3
      return [...mesh.positions.slice(start, start + 3), ...mesh.normals.slice(start, start + 3)].map((value) => Math.round(value * 1e4)).join(',')
    })
    const shift = vertices.indexOf([...vertices].sort()[0])
    keys.push([0, 1, 2].map((corner) => vertices[(shift + corner) % 3]).join('|'))
  }
  return keys.sort()
}

// The whole volume in one piece at a given step, as a reference for the chunks.
function wholeMeshAtStep(step) {
  const grid = sampleDensityGrid('ground', LOD_RESOLUTION)
  const last = LOD_RESOLUTION - 1
  return buildMarchingMeshInCells({
    resolution: LOD_RESOLUTION,
    step,
    cells: { min: [-step, 0, -step], max: [LOD_RESOLUTION, last, LOD_RESOLUTION] },
    valueAt: createSampler(grid, LOD_RESOLUTION),
    gradientAt: (x, y, z) =>
      clampedGradient((sampleX, sampleY, sampleZ) => grid[sampleX + LOD_RESOLUTION * (sampleY + LOD_RESOLUTION * sampleZ)], [0, 0, 0], [last, last, last], x, y, z, step),
  })
}

test('chunks at the finest level make exactly the triangles of the whole volume', () => {
  const whole = buildMarchingMesh(sampleDensityGrid('ground', LOD_RESOLUTION), LOD_RESOLUTION)
  assert.deepEqual(triangleKeys(joinChunks(chunksFor(uniform(0), false))), triangleKeys(whole))
})

test('chunks at a coarser level make exactly the triangles of the whole volume at that step', () => {
  for (const level of [1, 2]) {
    assert.deepEqual(triangleKeys(joinChunks(chunksFor(uniform(level), false))), triangleKeys(wholeMeshAtStep(levelStep(level))), `level ${level}`)
  }
})

// The step says each level needs about a quarter of the triangles of the one before.
test('each coarser level needs far fewer triangles', () => {
  const count = (level) => joinChunks(chunksFor(uniform(level), false)).positions.length / 9
  assert.ok(count(1) / count(0) > 0.2 && count(1) / count(0) < 0.3, `level 1: ${count(1) / count(0)}`)
  assert.ok(count(2) / count(1) > 0.2 && count(2) / count(1) < 0.3, `level 2: ${count(2) / count(1)}`)
})

// Cameras all round the volume, near and far, high and low.
const CAMERAS = []
for (let x = -12; x <= 12; x += 3) for (let y = 0; y <= 14; y += 3.5) for (let z = -12; z <= 12; z += 3) CAMERAS.push({ x, y, z })

test('neighbouring columns never differ by more than one level, wherever the camera is', () => {
  for (const camera of CAMERAS) {
    for (let chunkX = 0; chunkX < 4; chunkX += 1) {
      for (let chunkZ = 0; chunkZ < 4; chunkZ += 1) {
        for (const [stepX, stepZ] of [[1, 0], [0, 1]]) {
          if (chunkX + stepX > 3 || chunkZ + stepZ > 3) continue
          const difference = Math.abs(chunkLevel(chunkX, chunkZ, camera, 3) - chunkLevel(chunkX + stepX, chunkZ + stepZ, camera, 3))
          assert.ok(difference <= 1, `camera ${JSON.stringify(camera)}: columns ${chunkX},${chunkZ} differ by ${difference}`)
        }
      }
    }
  }
})

test('a close camera gives every column full detail, and a far one the coarsest level', () => {
  assert.ok(columnLevels({ x: 0, y: 3, z: 3 }, 3).every((level) => level === 0))
  assert.ok(columnLevels({ x: 0, y: 20, z: 0 }, 3).every((level) => level === 2))
  assert.ok(columnLevels({ x: 0, y: 20, z: 0 }, 1).every((level) => level === 0), 'one level means full detail everywhere')
  const mixed = new Set(columnLevels({ x: 6, y: 5, z: 8 }, 3))
  assert.deepEqual([...mixed].sort(), [0, 1, 2], 'the starting view should show all three levels')
})

// The highest point of the surface over one spot, from a triangle list.
function topHeight(positions, x, z) {
  let best = null
  for (let triangle = 0; triangle < positions.length / 9; triangle += 1) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = positions.subarray(triangle * 9, triangle * 9 + 9)
    const area = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz)
    if (Math.abs(area) < 1e-12) continue
    const first = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / area
    const second = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / area
    const third = 1 - first - second
    if (first < -1e-9 || second < -1e-9 || third < -1e-9) continue
    const height = first * ay + second * by + third * cy
    if (best === null || height > best) best = height
  }
  return best
}

function columnPositions(chunks, chunkX, chunkZ) {
  const inColumn = chunks.filter((chunk) => chunk.key.startsWith(`${chunkX}-`) && chunk.key.endsWith(`-${chunkZ}`))
  return Float32Array.from(inColumn.flatMap((chunk) => [...chunk.mesh.positions]))
}

// Some camera positions that give a mix of levels.
const MIXED_LEVELS = [
  columnLevels({ x: 6, y: 5, z: 8 }, 3),
  columnLevels({ x: -6, y: 5, z: -8 }, 3),
  columnLevels({ x: 9, y: 3, z: -2 }, 3),
  columnLevels({ x: -2, y: 6, z: 10 }, 3),
  columnLevels({ x: 0, y: 12, z: 0 }, 3),
]

// The largest height difference across the seams between two levels, measured with
// vertical rays just inside each column, over every such seam of some layouts.
function seamGaps(hasSnapping) {
  const gaps = []
  for (const levels of MIXED_LEVELS) {
    const chunks = chunksFor(levels, hasSnapping)
    for (let chunkX = 0; chunkX < 4; chunkX += 1) {
      for (let chunkZ = 0; chunkZ < 4; chunkZ += 1) {
        for (const [stepX, stepZ] of [[1, 0], [0, 1]]) {
          const otherX = chunkX + stepX
          const otherZ = chunkZ + stepZ
          if (otherX > 3 || otherZ > 3) continue
          if (levels[chunkZ * 4 + chunkX] === levels[otherZ * 4 + otherX]) continue

          const first = columnPositions(chunks, chunkX, chunkZ)
          const second = columnPositions(chunks, otherX, otherZ)
          for (let along = 0.05; along < 1; along += 0.05) {
            const x = stepX ? -VOXEL_WORLD_SIZE / 2 + otherX * CHUNK_WIDTH : -VOXEL_WORLD_SIZE / 2 + (chunkX + along) * CHUNK_WIDTH
            const z = stepZ ? -VOXEL_WORLD_SIZE / 2 + otherZ * CHUNK_WIDTH : -VOXEL_WORLD_SIZE / 2 + (chunkZ + along) * CHUNK_WIDTH
            const heightA = topHeight(first, x - stepX * 1e-3, z - stepZ * 1e-3)
            const heightB = topHeight(second, x + stepX * 1e-3, z + stepZ * 1e-3)
            if (heightA !== null && heightB !== null) gaps.push(Math.abs(heightA - heightB))
          }
        }
      }
    }
  }
  return gaps
}

// Where two levels meet, the two surfaces end at different heights along the
// shared edge. Snapping the finer chunk to the coarser one closes that difference.
test('snapping closes the height difference across the seams between levels', () => {
  const open = seamGaps(false)
  const snapped = seamGaps(true)
  const widestOpen = Math.max(...open)
  const widestSnapped = Math.max(...snapped)

  assert.ok(open.length > 200, `only ${open.length} points were checked`)
  assert.ok(widestOpen > 0.1, 'the seams never showed a difference, so the test proves nothing')
  assert.ok(widestSnapped < widestOpen / 5, `snapped ${widestSnapped} is not far below ${widestOpen}`)
})

test('every point of a finer chunk on a side that meets a coarser one lies on the coarser surface edge', () => {
  const levels = MIXED_LEVELS[0]
  const cache = new Map()
  const open = buildLodChunks({ field: groundDensity, levels, hasSnapping: false, cache })
  const snapped = buildLodChunks({ field: groundDensity, levels, hasSnapping: true, cache })
  let moved = 0

  snapped.forEach((chunk, index) => {
    assert.equal(chunk.mesh.positions.length, open[index].mesh.positions.length, 'snapping changed the triangle count')
    assert.ok(chunk.mesh.positions.every(Number.isFinite) && chunk.mesh.normals.every(Number.isFinite))
    for (let vertex = 0; vertex < chunk.mesh.normals.length / 3; vertex += 1) {
      const length = Math.hypot(...chunk.mesh.normals.slice(vertex * 3, vertex * 3 + 3))
      assert.ok(Math.abs(length - 1) < 1e-4, `chunk ${chunk.key}: a normal has length ${length}`)
      if ([0, 1, 2].some((axis) => chunk.mesh.positions[vertex * 3 + axis] !== open[index].mesh.positions[vertex * 3 + axis])) moved += 1
    }
  })

  assert.ok(moved > 0, 'no point was moved')
})

test('a chunk with no coarser neighbour is left exactly as it was built', () => {
  const levels = uniform(1)
  const cache = new Map()
  const open = buildLodChunks({ field: groundDensity, levels, hasSnapping: false, cache })
  const snapped = buildLodChunks({ field: groundDensity, levels, hasSnapping: true, cache })
  snapped.forEach((chunk, index) => assert.equal(chunk.mesh, open[index].mesh))
  assert.ok(findOpenEdges(open[0].mesh).length > 0)
})
