import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildMarchingMesh } from '../src/scene/demos/voxels/marchingCubes.js'
import { buildSurfaceNetsMesh } from '../src/scene/demos/voxels/surfaceNets.js'
import { sampleDensityGrid, sampleSpacing } from '../src/scene/demos/voxels/voxelMath.js'

const SHAPES = ['ground', 'caves', 'islands']
// On a coarse grid the mesh strays from the true surface, so some thin triangles
// point against the smoothed normal of their corners, and the same is true of
// both meshers measured against the density field itself. The share falls as the
// resolution rises, so the allowance does too.
const RESOLUTIONS = [8, 16, 32]
const ALLOWED_AGAINST_NORMALS = { 8: 0.1, 16: 0.07, 32: 0.03 }

// Counts how many triangles use each edge, keyed by the two rounded end points.
function edgeUses(positions) {
  const key = (vertex) => [0, 1, 2].map((axis) => Math.round(positions[vertex * 3 + axis] * 1e4)).join(',')
  const uses = new Map()

  for (let triangle = 0; triangle < positions.length / 9; triangle += 1) {
    const ids = [0, 1, 2].map((corner) => key(triangle * 3 + corner))
    if (new Set(ids).size < 3) continue

    for (let edge = 0; edge < 3; edge += 1) {
      const [a, b] = [ids[edge], ids[(edge + 1) % 3]].sort()
      const id = `${a}|${b}`
      uses.set(id, (uses.get(id) ?? 0) + 1)
    }
  }

  return uses
}

// The volume has no floor, so the mesh is open along the bottom. Marching Cubes
// stops exactly at y = 0. Surface Nets stops at its first row of vertices, which
// hang up to one grid step above it. Any other edge that only one triangle uses
// is a crack.
function countCracks(positions, bottomHeight) {
  const limit = Math.round(bottomHeight * 1e4)
  let cracks = 0
  for (const [id, count] of edgeUses(positions)) {
    if (count !== 1) continue
    const heights = id.split('|').map((point) => Number(point.split(',')[1]))
    if (!heights.every((height) => height <= limit)) cracks += 1
  }
  return cracks
}

function countAgainstNormals(mesh) {
  let against = 0
  for (let triangle = 0; triangle < mesh.positions.length / 9; triangle += 1) {
    const point = (corner) => [0, 1, 2].map((axis) => mesh.positions[(triangle * 3 + corner) * 3 + axis])
    const [p0, p1, p2] = [point(0), point(1), point(2)]
    const u = p1.map((value, axis) => value - p0[axis])
    const w = p2.map((value, axis) => value - p0[axis])
    const face = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const average = [0, 1, 2].map((axis) => mesh.normals[triangle * 9 + axis] + mesh.normals[triangle * 9 + 3 + axis] + mesh.normals[triangle * 9 + 6 + axis])
    if (face[0] * average[0] + face[1] * average[1] + face[2] * average[2] < -1e-9) against += 1
  }
  return against
}

const MESHERS = [
  { name: 'Marching Cubes', build: buildMarchingMesh, bottomRows: 0 },
  { name: 'Surface Nets', build: buildSurfaceNetsMesh, bottomRows: 1 },
]

for (const { name, build, bottomRows } of MESHERS) {
  test(`${name} makes a mesh with no cracks and faces that agree with the surface normals`, () => {
    for (const shape of SHAPES) {
      for (const resolution of RESOLUTIONS) {
        const mesh = build(sampleDensityGrid(shape, resolution), resolution)
        assert.ok(mesh.positions.length > 0, `${name} ${shape} ${resolution}: no triangles`)
        assert.equal(mesh.positions.length, mesh.normals.length)
        assert.ok(mesh.positions.every(Number.isFinite) && mesh.normals.every(Number.isFinite), `${name} ${shape} ${resolution}: not finite`)
        assert.equal(countCracks(mesh.positions, bottomRows * sampleSpacing(resolution)), 0, `${name} ${shape} ${resolution}: cracks`)
        assert.ok(countAgainstNormals(mesh) <= mesh.positions.length / 9 * ALLOWED_AGAINST_NORMALS[resolution], `${name} ${shape} ${resolution}: winding disagrees with normals`)
      }
    }
  })
}

// 1 for an equilateral triangle, near 0 for a thin sliver.
function triangleQuality(positions, triangle) {
  const point = (corner) => [0, 1, 2].map((axis) => positions[(triangle * 3 + corner) * 3 + axis])
  const [a, b, c] = [point(0), point(1), point(2)]
  const edge = (from, to) => to.map((value, axis) => value - from[axis])
  const squared = (vector) => vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2
  const ab = edge(a, b)
  const ac = edge(a, c)
  const bc = edge(b, c)
  const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]]
  const area = 0.5 * Math.sqrt(squared(cross))
  return (4 * Math.sqrt(3) * area) / (squared(ab) + squared(ac) + squared(bc))
}

function sliverShare(positions) {
  const count = positions.length / 9
  let slivers = 0
  for (let triangle = 0; triangle < count; triangle += 1) if (triangleQuality(positions, triangle) < 0.3) slivers += 1
  return slivers / count
}

// The number of faces is about the same. What differs is their shape, and that
// is what the Surface Nets step teaches, so it is checked here.
test('Surface Nets makes about as many faces as Marching Cubes, but far fewer thin slivers', () => {
  for (const shape of SHAPES) {
    const grid = sampleDensityGrid(shape, 32)
    const marching = buildMarchingMesh(grid, 32).positions
    const nets = buildSurfaceNetsMesh(grid, 32).positions

    const countRatio = nets.length / marching.length
    assert.ok(countRatio > 0.9 && countRatio < 1.1, `${shape}: face counts differ by more than 10%`)
    assert.ok(sliverShare(nets) < sliverShare(marching) / 2, `${shape}: ${sliverShare(nets)} slivers is not far below ${sliverShare(marching)}`)
  }
})
