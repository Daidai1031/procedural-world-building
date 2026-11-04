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
import { findOpenEdges } from '../src/world/lodChunks.js'

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

test('TERR-06 LOD reduces distant geometry, closes mixed-detail seams, and follows edits', () => {
  const world = new PlanetWorld('1380')
  const fullTriangles = world.chunks.reduce((sum, chunk) => sum + chunk.mesh.positions.length / 9, 0)
  const camera = { x: 0, y: 0, z: 8 }
  const fullMesh = meshHash(world.chunks)
  assert.equal(world.setLodCamera(camera, 0), false)
  assert.equal(meshHash(world.chunks), fullMesh, 'the current mesh stays visible while LOD prepares')
  let frames = 0
  while (!world.setLodCamera(camera, 6) && frames++ < 100) {}
  assert.ok(frames < 100)
  assert.ok(world.lodCounts[0] > 0 && world.lodCounts[1] > 0 && world.lodCounts[2] > 0)
  assert.ok(world.chunks.reduce((sum, chunk) => sum + chunk.mesh.positions.length / 9, 0) < fullTriangles / 2)

  // The fine side's boundary vertices must land on the neighboring coarse edge.
  const byKey = new Map(world.chunks.map((chunk) => [chunk.key, chunk]))
  let checked = 0
  for (let z = 0; z < world.chunksPerSide; z += 1) {
    for (let x = 0; x < world.chunksPerSide; x += 1) {
      for (const [dx, dz, axis] of [[1, 0, 0], [0, 1, 2]]) {
        const nx = x + dx
        const nz = z + dz
        if (nx >= world.chunksPerSide || nz >= world.chunksPerSide) continue
        const a = byKey.get(`${x}-1-${z}`)!
        const b = byKey.get(`${nx}-1-${nz}`)!
        if (a.level === b.level) continue
        const fineX = a.level < b.level ? x : nx
        const fineZ = a.level < b.level ? z : nz
        const coarseX = a.level < b.level ? nx : x
        const coarseZ = a.level < b.level ? nz : z
        const boundary = (axis === 0 ? nx : nz) * tuning.chunk.size
        const plane = samplePosition(world.resolution, axis === 0 ? boundary : 0, 0,
          axis === 2 ? boundary : 0)[axis]
        const coarseEdges: { start: number[]; end: number[] }[] = Array.from({ length: world.chunksPerSide }, (_, y) =>
          findOpenEdges(byKey.get(`${coarseX}-${y}-${coarseZ}`)!.mesh))
          .flat().filter(({ start, end }) => Math.abs(start[axis] - plane) < 1e-4 && Math.abs(end[axis] - plane) < 1e-4)
        if (coarseEdges.length === 0) continue
        const fine = byKey.get(`${fineX}-1-${fineZ}`)!
        for (let i = 0; i < fine.mesh.positions.length; i += 3) {
          const point = Array.from(fine.mesh.positions.slice(i, i + 3))
          if (Math.abs(point[axis] - plane) >= 1e-4) continue
          const nearest = Math.min(...coarseEdges.map(({ start, end }) => {
            const along = end.map((value, coordinate) => value - start[coordinate])
            const lengthSquared = along.reduce((sum, value) => sum + value * value, 0)
            const fraction = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
              along.reduce((sum, value, coordinate) => sum + value * (point[coordinate] - start[coordinate]), 0) / lengthSquared))
            return Math.hypot(...point.map((value, coordinate) => value - start[coordinate] - along[coordinate] * fraction))
          }))
          assert.ok(nearest < 1e-3, `LOD seam gap ${nearest} at ${fine.key}`)
          checked += 1
        }
      }
    }
  }
  assert.ok(checked > 0)

  const before = meshHash(world.chunks)
  assert.ok(world.edit('dig', { x: 0, y: 3, z: -2 }, tuning.brush.radius.default).changed)
  world.remeshDirty(0)
  if (world.dirtyChunkCount > 0) assert.equal(meshHash(world.chunks), before, 'an incomplete edit is not shown')
  while (world.dirtyChunkCount) world.remeshDirty(6)
  assert.notEqual(meshHash(world.chunks), before)
  assert.ok(world.chunks.every(({ mesh }) => mesh.positions.every(Number.isFinite) && mesh.normals.every(Number.isFinite)))
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

test('D-048 keeps every mineral position unchanged across the mineral-only migration', () => {
  const positionsBeforeD044 = [
    [1.7174622022441317, 0.44063174096594376, -0.7625572093745543],
    [-1.2358108980700884, 0.27575876632840113, 0.6609710863023397],
    [0.15399435380392532, 0.577197587242331, -0.2592952105413721],
    [-0.42698852681751537, 0.17303856986071778, 1.006425975114094],
    [0.9052334335709449, -0.35059678427540847, 0.3173773543276138],
    [0.053498596787922216, -0.6874241144339878, -0.37427916205200573],
    [0.5942006743862053, -1.1393128085884214, 0.07525207413889144],
    [-0.9638299757786644, -0.15133098182215549, -0.2098871361040838],
    [0.31145277164936, -1.0931249811383994, 0.6055621157491644],
    [-0.23283557159265694, -1.3701685340351162, 0.5379025466937378],
    [0.8010505478431065, 0.1822865033875555, -0.4125189462753083],
    [0.24428509904831372, 0.8033279044602925, 0.531425374915966],
    [-1.3032839176022335, -0.2737866456590217, -0.11317986261760046],
    [1.0524203583129033, 0.1101812382872728, 0.7975747336475583],
  ]
  assert.deepEqual(generateResourceClusters('1380').map(({ position }) => position), positionsBeforeD044)
})

test('DET-01/03 seeded targets start embedded and stay hidden until scanned or exposed', () => {
  const seed = 'detector-replay'
  const clusters = generateResourceClusters(seed)
  const world = new PlanetWorld(seed)
  assert.deepEqual(clusters, generateResourceClusters(seed))
  assert.notDeepEqual(clusters, generateResourceClusters('other-seed'))
  assert.equal(clusters.length, 14)
  assert.ok(clusters.every(({ category }) => category === 'mineral'))
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
