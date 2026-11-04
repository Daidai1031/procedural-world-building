import test from 'node:test'
import assert from 'node:assert/strict'
import { HALF, type Vec3 } from '../src/systems/geometry'
import { findLandingSites, groundRadius, landingQuality, mapDirection, mapPoint, surfaceBasis, walkingStep, eyeHeight } from '../src/systems/exploration'
import { PlanetWorld } from '../src/world/planet'

const sphere = { densityAt: (x: number, y: number, z: number) => Math.hypot(x, y - HALF, z) - 1.8 }

test('world map projection round trips across hemispheres and the longitude seam', () => {
  for (const [x, y] of [[1, 1], [799, 399], [400, 200], [100, 270], [650, 90]]) {
    const d = mapDirection(x, y)
    const p = mapPoint(d)
    assert.ok(Math.abs(p[0] - x) < 1e-8)
    assert.ok(Math.abs(p[1] - y) < 1e-8)
    assert.ok(Math.abs(Math.hypot(...d) - 1) < 1e-8)
  }
})

test('landing sites have solid ground and an eye position in empty space', () => {
  const sites = findLandingSites(sphere)
  assert.equal(sites.length, 8)
  assert.ok(sites.every(s => s.available))
  for (const site of sites) {
    const radius = groundRadius(sphere, site.direction)
    assert.ok(Math.abs(radius - 1.8) < 0.001)
    const [x, y, z] = site.direction.map(v => v * (radius + eyeHeight))
    assert.ok(sphere.densityAt(x, y + HALF, z) > 0)
  }
  assert.equal(landingQuality({ densityAt: () => 1 }, [0, 0, 1]), Infinity)
})

test('walking follows the sphere and blocks a sudden cliff', () => {
  const start: Vec3 = [0, 0, 1]
  const next = walkingStep(sphere, start, [1, 0, 0], 0.02)
  assert.ok(next[0] > 0)
  assert.ok(Math.abs(Math.hypot(...next) - 1) < 1e-8)
  const cliff = { densityAt: (x: number, y: number, z: number) => Math.hypot(x, y - HALF, z) - (x > 0.005 ? 1.1 : 1.8) }
  assert.deepEqual(walkingStep(cliff, start, [1, 0, 0], 0.02), start)
})

test('surface orientation remains orthogonal at the poles', () => {
  for (const direction of [[0, 1, 0], [0, -1, 0], [0, 0, 1]] as Vec3[]) {
    const { up, north, east } = surfaceBasis(direction)
    assert.ok(Math.abs(up.dot(north)) < 1e-8)
    assert.ok(Math.abs(east.dot(north)) < 1e-8)
    assert.ok(Math.abs(east.length() - 1) < 1e-8)
  }
})

test('real terrain provides landing sites and maps excavation after edits', () => {
  const world = new PlanetWorld('exploration')
  const sites = findLandingSites(world)
  assert.ok(sites.some(s => s.available))
  const site = sites.find(s => s.available)!
  const before = groundRadius(world, site.direction)
  const [x, y, z] = site.direction.map(v => v * before)
  world.edit('dig', { x, y: y + HALF, z }, 0.5)
  const after = groundRadius(world, site.direction)
  assert.ok(after < before - 0.1)
})
