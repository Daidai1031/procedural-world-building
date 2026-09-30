import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { buildPlanet, createPlanetField, PlanetWorld } from '../src/world/planet'
import type { PlanetChunks } from '../src/world/planet'
import { buildChunks, CHUNK_BORDER } from '../src/world/voxels/chunks.js'
import { fractalNoise } from '../src/world/proceduralMaps/noiseMath.js'
import { samplePosition } from '../src/world/voxels/voxelMath.js'
import { readStartup } from '../src/config/startup'
import { tuning } from '../src/config/tuning'
import { modeForClick, nextTerrainMode } from '../src/config/controls'
import { createInitialRunState, createRunStore } from '../src/state/runState'
import { collectExposedResources } from '../src/tools/collector'
import { detectedClusters, isResourceExposed, scanWithDetector } from '../src/tools/detector'
import { generateResourceClusters } from '../src/world/resourceClusters'
import { VOXEL_WORLD_SIZE } from '../src/world/voxels/voxelMath.js'
import { flattenNormal } from '../src/world/flattenPlane'

function meshHash(chunks: PlanetChunks) {
  const hash = createHash('sha256')
  for (const { mesh } of chunks) {
    hash.update(new Uint8Array(mesh.positions.buffer))
    hash.update(new Uint8Array(mesh.normals.buffer))
  }
  return hash.digest('hex')
}

function triangles(chunks: PlanetChunks) {
  return chunks.flatMap(({ mesh }) => {
    const result: string[] = []
    for (let i = 0; i < mesh.positions.length; i += 9) {
      result.push([...mesh.positions.slice(i, i + 9), ...mesh.normals.slice(i, i + 9)].join(','))
    }
    return result
  }).sort()
}

// TECH-07 / TERR-03: validate actual geometry, including normals at chunk seams.
test('seeded Marching Cubes is repeatable and preserves the single-volume surface', () => {
  const first = buildPlanet('1380')
  assert.equal(first.length, 64)
  assert.equal(meshHash(first), meshHash(buildPlanet('1380')))
  assert.notEqual(meshHash(first), meshHash(buildPlanet('1381')))
  const whole = buildChunks(createPlanetField('1380'), tuning.grid.resolution, 1, CHUNK_BORDER)
  assert.deepEqual(triangles(first), triangles(whole))
  assert.ok(first.some(({ mesh }) => mesh.positions.length > 0))
  for (const { mesh } of first) {
    assert.equal(mesh.positions.length, mesh.normals.length)
    assert.equal(mesh.positions.length % 9, 0)
    assert.ok(mesh.positions.every(Number.isFinite))
    assert.ok(mesh.normals.every(Number.isFinite))
  }
  const field = createPlanetField('1380')
  assert.ok(field(0, 3, 0) < 0)
  assert.ok(field(0, 0, 0) > 0)
})

test('DBG-01 preserves URL seeds and only debug=1 enables the overlay', () => {
  assert.deepEqual(readStartup('?seed=%E6%98%9F%E7%90%83&debug=1'), { seed: '\u661f\u7403', debug: true })
  assert.deepEqual(readStartup('?seed=&debug=0'), { seed: '', debug: false })
  assert.notEqual(readStartup('').seed, readStartup('').seed)
})

test('copied procedural noise dependency runs deterministically', () => {
  const settings = { seed: 1380, frequency: 0.5, octaves: 4, persistence: 0.5 }
  const value = fractalNoise('perlin', 0.27, 0.71, settings)
  assert.ok(Number.isFinite(value))
  assert.equal(value, fractalNoise('perlin', 0.27, 0.71, settings))
  assert.notEqual(value, fractalNoise('perlin', 0.27, 0.71, { ...settings, seed: 1381 }))
})

test('M1 dig/add edits only nearby chunks, tracks solid mass, and preserves seams', () => {
  const world = new PlanetWorld('1380')
  const original = world.planetRemaining
  const point = { x: 0, y: 3, z: 2 }
  const radius = tuning.brush.radius.default
  const edit = world.edit('dig', point, radius)
  assert.ok(edit.changed)
  assert.ok(edit.removedSamples > 0)
  assert.equal(edit.addedSamples, 0)
  assert.ok(world.planetRemaining < original)
  assert.ok(world.dirtyChunkCount > 0 && world.dirtyChunkCount < world.chunks.length)
  const dirtyCount = world.dirtyChunkCount
  const beforeVersions = world.chunks.map((chunk) => chunk.version)
  assert.ok(world.remeshDirty(0))
  assert.equal(world.dirtyChunkCount, dirtyCount - 1)
  while (world.dirtyChunkCount) world.remeshDirty(6)
  assert.equal(world.chunks.filter((chunk, index) => chunk.version > beforeVersions[index]).length, dirtyCount)
  const whole = buildChunks(world.densityAt, world.resolution, 1, CHUNK_BORDER)
  assert.deepEqual(triangles(world.chunks), triangles(whole))

  const afterDig = world.planetRemaining
  const restored = world.edit('add', point, radius)
  assert.ok(restored.addedSamples > 0)
  assert.ok(world.planetRemaining > afterDig)
  const flattened = world.edit('flatten', point, radius)
  assert.ok(flattened.changed)
  assert.ok(flattened.removedSamples + flattened.addedSamples > 0)
})

test('TECH-07 same seed and terrain inputs produce the same edited meshes', () => {
  const first = new PlanetWorld('m1-replay')
  const second = new PlanetWorld('m1-replay')
  const point = { x: 0, y: 3, z: 2 }
  for (const world of [first, second]) {
    world.edit('dig', point, 0.38)
    world.edit('add', { ...point, x: 0.2 }, 0.3)
    while (world.dirtyChunkCount) world.remeshDirty(6)
  }
  assert.equal(meshHash(first.chunks), meshHash(second.chunks))
  assert.equal(first.planetRemaining, second.planetRemaining)
})

test('M1 mode selection and temporary click overrides', () => {
  assert.equal(nextTerrainMode('dig'), 'add')
  assert.equal(nextTerrainMode('add'), 'flatten')
  assert.equal(nextTerrainMode('flatten'), 'dig')
  assert.equal(modeForClick('dig', true, false), 'add')
  assert.equal(modeForClick('dig', false, true), 'flatten')
  assert.equal(modeForClick('flatten', false, false), 'flatten')
  assert.equal(modeForClick('dig', true, true), null)
})

test('horizontal flatten preserves the global-Y plane beyond the old spherical cutoff', () => {
  const world = new PlanetWorld('1380')
  const radius = tuning.brush.radius.default
  const point = { x: 0, y: 3, z: 2 }
  const [x, y, z] = samplePosition(world.resolution, 35, 35, 52)
  assert.ok(Math.hypot(x - point.x, z - point.z) < radius)
  assert.ok(Math.abs(y - point.y) < radius)
  assert.ok(Math.hypot(x - point.x, y - point.y, z - point.z) > radius)
  const before = world.densityAt(x, y, z)
  const targetPlane = y - point.y
  const edit = world.edit('flatten', point, radius, 'horizontal')
  const after = world.densityAt(x, y, z)
  assert.ok(edit.changed)
  assert.notEqual(after, before)
  assert.ok(Math.abs(after - targetPlane) < Math.abs(before - targetPlane))
  while (world.dirtyChunkCount) world.remeshDirty(6)
  assert.deepEqual(triangles(world.chunks), triangles(buildChunks(world.densityAt, world.resolution, 1, CHUNK_BORDER)))
})

test('TOOL-04 radial flatten defaults to the planet-facing tangent plane', () => {
  assert.equal(createInitialRunState('1380').loadout.flattenOrientation, 'radial')
  assert.deepEqual(flattenNormal({ x: 2, y: 3, z: 0 }, 'radial'), [1, 0, 0])
  assert.deepEqual(flattenNormal({ x: 2, y: 3, z: 0 }, 'horizontal'), [0, 1, 0])

  const radius = tuning.brush.radius.default
  const point = { x: 2, y: 3, z: 0 }
  const [x, y, z] = samplePosition(tuning.grid.resolution, 56, 32, 31)
  const radial = new PlanetWorld('1380')
  const horizontal = new PlanetWorld('1380')
  const before = radial.densityAt(x, y, z)
  radial.edit('flatten', point, radius)
  horizontal.edit('flatten', point, radius, 'horizontal')
  const radialAfter = radial.densityAt(x, y, z)
  const horizontalAfter = horizontal.densityAt(x, y, z)
  assert.ok(Math.abs(radialAfter - (x - point.x)) < Math.abs(before - (x - point.x)))
  assert.ok(Math.abs(horizontalAfter - (y - point.y)) < Math.abs(before - (y - point.y)))
  assert.notEqual(radialAfter, horizontalAfter)
  while (radial.dirtyChunkCount) radial.remeshDirty(6)
  assert.deepEqual(triangles(radial.chunks), triangles(buildChunks(radial.densityAt, radial.resolution, 1, CHUNK_BORDER)))

  // An oblique plane reaches farther than one radius along a world axis.
  const oblique = new PlanetWorld('1380')
  const obliquePoint = { x: 1.4, y: 4.4, z: 0 }
  const [ox, oy, oz] = samplePosition(oblique.resolution, 51, 46, 31)
  assert.ok(ox - obliquePoint.x > radius)
  const obliqueBefore = oblique.densityAt(ox, oy, oz)
  const normal = flattenNormal(obliquePoint, 'radial')
  const target = (ox - obliquePoint.x) * normal[0] + (oy - obliquePoint.y) * normal[1]
    + (oz - obliquePoint.z) * normal[2]
  oblique.edit('flatten', obliquePoint, radius)
  assert.ok(Math.abs(oblique.densityAt(ox, oy, oz) - target) < Math.abs(obliqueBefore - target))
  while (oblique.dirtyChunkCount) oblique.remeshDirty(6)
  assert.deepEqual(triangles(oblique.chunks), triangles(buildChunks(oblique.densityAt, oblique.resolution, 1, CHUNK_BORDER)))
})

test('DET-01/03 seeded targets start embedded and stay hidden until scanned or exposed', () => {
  const seed = 'detector-replay'
  const clusters = generateResourceClusters(seed)
  const world = new PlanetWorld(seed)
  assert.deepEqual(clusters, generateResourceClusters(seed))
  assert.notDeepEqual(clusters, generateResourceClusters('other-seed'))
  assert.equal(clusters.length, 28)
  const exposed = clusters.filter((cluster) => isResourceExposed(world, cluster))
  const buried = clusters.filter((cluster) => !isResourceExposed(world, cluster))
  assert.equal(exposed.length, 0, 'every target starts embedded in the solid sphere')
  assert.equal(buried.length, clusters.length)

  const target = buried[0]
  const store = createRunStore(seed)
  scanWithDetector(store, target.position)
  assert.deepEqual(store.getState().detector.center, target.position)
  assert.ok(detectedClusters(clusters, target.position, tuning.detector.radius).some((cluster) => cluster.id === target.id))
  assert.ok(detectedClusters(clusters, [10, 10, 10], tuning.detector.radius).length === 0)
  assert.deepEqual(createInitialRunState(seed).resourceClusters, clusters)

  const [x, y, z] = target.position
  world.edit('dig', { x, y: y + VOXEL_WORLD_SIZE / 2, z }, tuning.brush.radius.default)
  assert.ok(isResourceExposed(world, target))

  const collected = collectExposedResources(world, store)
  assert.ok(collected.some((cluster) => cluster.id === target.id))
  assert.ok(store.getState().collectedIds.includes(target.id))
  assert.equal(collectExposedResources(world, store).length, 0, 'a target is only collected once')
})
