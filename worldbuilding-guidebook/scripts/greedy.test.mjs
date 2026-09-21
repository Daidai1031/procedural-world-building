import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildCulledMesh, buildGreedyMesh, growRectangle } from '../src/scene/demos/voxels/greedyMeshing.js'
import { sampleDensityGrid } from '../src/scene/demos/voxels/voxelMath.js'

const SHAPES = ['ground', 'caves', 'islands']
const RESOLUTIONS = [8, 16, 32]

// The area each flat plane of faces covers, keyed by which way it faces and where
// it sits. If two meshes cover exactly the same area on every plane, greedy
// meshing has neither dropped a face nor drawn one twice.
function areaByPlane(mesh) {
  const areas = new Map()
  for (let triangle = 0; triangle < mesh.positions.length / 9; triangle += 1) {
    const point = (corner) => [0, 1, 2].map((axis) => mesh.positions[(triangle * 3 + corner) * 3 + axis])
    const [a, b, c] = [point(0), point(1), point(2)]
    const u = b.map((value, axis) => value - a[axis])
    const w = c.map((value, axis) => value - a[axis])
    const cross = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const normal = [0, 1, 2].map((axis) => Math.round(mesh.normals[triangle * 9 + axis]))
    const axis = normal.findIndex((value) => value !== 0)

    // The winding must face the way the normal says.
    assert.ok(cross[axis] * normal[axis] > 0, 'a face is wound against its normal')
    const key = `${normal.join(',')}@${Math.round(a[axis] * 1e4)}`
    areas.set(key, (areas.get(key) ?? 0) + Math.abs(cross[axis]) / 2)
  }
  return areas
}

test('greedy meshing covers exactly the faces that culled meshing draws', () => {
  for (const shape of SHAPES) {
    for (const resolution of RESOLUTIONS) {
      const grid = sampleDensityGrid(shape, resolution)
      const culled = areaByPlane(buildCulledMesh(grid, resolution))
      const greedy = areaByPlane(buildGreedyMesh(grid, resolution))

      assert.equal(greedy.size, culled.size, `${shape} ${resolution}: different planes`)
      for (const [key, area] of culled) {
        assert.ok(Math.abs(greedy.get(key) - area) < 1e-6, `${shape} ${resolution}: plane ${key} covers a different area`)
      }
    }
  }
})

// The step says greedy meshing needs about a third to two fifths of the faces.
test('greedy meshing needs far fewer faces than culled meshing', () => {
  for (const shape of SHAPES) {
    for (const resolution of [16, 32, 64]) {
      const grid = sampleDensityGrid(shape, resolution)
      const ratio = buildGreedyMesh(grid, resolution).positions.length / buildCulledMesh(grid, resolution).positions.length
      assert.ok(ratio > 0.25 && ratio < 0.5, `${shape} ${resolution}: ${ratio.toFixed(2)} of the faces`)
    }
  }
})

test('a rectangle grows across a row, then down while every row stays as wide', () => {
  // 1 1 1 0
  // 1 1 1 0
  // 1 1 0 0
  // 0 0 0 0
  const mask = Uint8Array.from([1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0])
  assert.deepEqual(growRectangle(mask, 4, 0, 0), { width: 3, height: 2 })
  assert.deepEqual(growRectangle(mask, 4, 0, 2), { width: 2, height: 1 })
})
