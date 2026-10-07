import assert from 'node:assert/strict'
import test from 'node:test'
import { Vector3 } from 'three'
import { createRandom } from '../src/scene/demos/distributions/random.js'
import { buildRockGeometry } from '../src/scene/demos/distributions/rock.js'
import { generateCandidates, instanceMatrix } from '../src/scene/demos/distributions/scatter.js'
import { SCATTER_WORLD_SIZE, buildTerrainSurface, heightAt } from '../src/scene/demos/distributions/terrain.js'

test('the seeded generator repeats its sequence and stays in [0, 1)', () => {
  const first = createRandom(42)
  const second = createRandom(42)
  const values = Array.from({ length: 1000 }, () => first())
  assert.deepEqual(values, Array.from({ length: 1000 }, () => second()))
  assert.ok(values.every((value) => value >= 0 && value < 1))
  assert.notDeepEqual(values.slice(0, 10), Array.from({ length: 10 }, createRandom(43)))
})

test('candidates: requested count, inside the footprint, y from the terrain', () => {
  const candidates = generateCandidates(200, 42)
  assert.equal(candidates.length, 200)
  for (const { x, y, z } of candidates) {
    assert.ok(Math.abs(x) < SCATTER_WORLD_SIZE / 2 && Math.abs(z) < SCATTER_WORLD_SIZE / 2)
    assert.equal(y, heightAt(x, z))
  }
  assert.deepEqual(generateCandidates(0, 42), [])
})

test('same seed gives the same layout, another seed a different one', () => {
  assert.deepEqual(generateCandidates(100, 42), generateCandidates(100, 42))
  assert.notDeepEqual(generateCandidates(100, 42), generateCandidates(100, 43))
})

test('a larger count keeps the first candidates where they were', () => {
  assert.deepEqual(generateCandidates(200, 42).slice(0, 100), generateCandidates(100, 42))
})

test('the scatter seed does not change the terrain', () => {
  const before = buildTerrainSurface().positions
  generateCandidates(400, 7)
  assert.deepEqual(buildTerrainSurface().positions, before)
})

test('instance matrices: scale ignores the count, position is the candidate', () => {
  for (const count of [10, 200, 400]) {
    for (const candidate of generateCandidates(count, 42)) {
      const matrix = instanceMatrix(candidate, 1.3)
      const scale = new Vector3().setFromMatrixScale(matrix)
      const position = new Vector3().setFromMatrixPosition(matrix)
      for (const axis of ['x', 'y', 'z']) {
        assert.ok(Math.abs(scale[axis] - 1.3) < 1e-6)
        assert.ok(Math.abs(position[axis] - candidate[axis]) < 1e-6)
      }
    }
  }
})

test('the rock base sits just below its origin, so it rests on its point', () => {
  const geometry = buildRockGeometry()
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  assert.ok(min.y < 0, 'base is sunk a little into the ground')
  assert.ok(-min.y < (max.y - min.y) * 0.3, 'most of the rock is above ground')
})
