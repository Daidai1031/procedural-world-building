import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CHUNKS_PER_SIDE_OPTIONS, CHUNK_BORDER, buildChunks, buildEditedChunks } from '../src/scene/demos/voxels/chunks.js'
import { buildMarchingMesh } from '../src/scene/demos/voxels/marchingCubes.js'
import {
  dentDensity,
  dentAt,
  groundDensity,
  sampleDensityGrid,
  samplePosition,
  shapeField,
} from '../src/scene/demos/voxels/voxelMath.js'

const SHAPES = ['ground', 'caves', 'islands']
const RESOLUTIONS = [8, 16, 32]

// Every triangle as a text key, so two meshes can be compared as sets. A vertex
// is its position and its normal, rounded well below anything the eye can see.
function triangleKeys(mesh) {
  const keys = []
  for (let triangle = 0; triangle < mesh.positions.length / 9; triangle += 1) {
    const vertices = [0, 1, 2].map((corner) => {
      const start = (triangle * 3 + corner) * 3
      const values = [...mesh.positions.slice(start, start + 3), ...mesh.normals.slice(start, start + 3)]
      return values.map((value) => Math.round(value * 1e4)).join(',')
    })
    // The same triangle can start from any of its corners.
    const shift = vertices.indexOf([...vertices].sort()[0])
    keys.push([0, 1, 2].map((corner) => vertices[(shift + corner) % 3]).join('|'))
  }
  return keys.sort()
}

function joinChunks(chunks) {
  return {
    positions: chunks.flatMap((chunk) => [...chunk.mesh.positions]),
    normals: chunks.flatMap((chunk) => [...chunk.mesh.normals]),
  }
}

test('chunks with a border make exactly the triangles of the whole volume', () => {
  for (const shape of SHAPES) {
    for (const resolution of RESOLUTIONS) {
      const whole = triangleKeys(buildMarchingMesh(sampleDensityGrid(shape, resolution), resolution))

      for (const chunksPerSide of CHUNKS_PER_SIDE_OPTIONS) {
        const chunked = triangleKeys(joinChunks(buildChunks(shapeField(shape), resolution, chunksPerSide, CHUNK_BORDER)))
        assert.equal(chunked.length, whole.length, `${shape} ${resolution} x${chunksPerSide}: triangle count`)
        assert.deepEqual(chunked, whole, `${shape} ${resolution} x${chunksPerSide}: triangles differ`)
      }
    }
  }
})

test('chunks without a border leave a row of cells unmeshed along every seam', () => {
  for (const shape of SHAPES) {
    const resolution = 32
    const whole = triangleKeys(buildMarchingMesh(sampleDensityGrid(shape, resolution), resolution))
    const single = triangleKeys(joinChunks(buildChunks(shapeField(shape), resolution, 1, 0)))
    assert.deepEqual(single, whole, `${shape}: one chunk has no seam, so it needs no border`)

    for (const chunksPerSide of [2, 4]) {
      const chunked = triangleKeys(joinChunks(buildChunks(shapeField(shape), resolution, chunksPerSide, 0)))
      assert.ok(chunked.length < whole.length, `${shape} x${chunksPerSide}: nothing is missing`)
    }
  }
})

test('the border costs extra samples, and more of them the smaller the chunks are', () => {
  const resolution = 32
  const held = (chunksPerSide, border) =>
    buildChunks(shapeField('ground'), resolution, chunksPerSide, border).reduce((total, chunk) => total + chunk.heldSampleCount, 0)

  assert.ok(held(4, CHUNK_BORDER) > held(2, CHUNK_BORDER))
  assert.ok(held(2, CHUNK_BORDER) > held(2, 0))
})

// The samples of a whole volume for any field, so an edited volume can be meshed in one piece.
function fieldGrid(field, resolution) {
  const densities = new Float32Array(resolution ** 3)
  for (let sampleZ = 0; sampleZ < resolution; sampleZ += 1) {
    for (let sampleY = 0; sampleY < resolution; sampleY += 1) {
      for (let sampleX = 0; sampleX < resolution; sampleX += 1) {
        densities[sampleX + resolution * (sampleY + resolution * sampleZ)] = field(...samplePosition(resolution, sampleX, sampleY, sampleZ))
      }
    }
  }
  return densities
}

const HOLE_CENTERS = [[-2.4, -2.4], [-1.5, -1.5], [0, 0], [0.05, 1.2], [1.5, -0.6], [2.4, 2.4], [-0.9, 2.1]]

test('rebuilding only the chunks an edit reaches gives the same mesh as rebuilding the whole volume', () => {
  for (const resolution of [16, 32]) {
    for (const chunksPerSide of [2, 4]) {
      const cache = new Map()
      const baseField = groundDensity
      const options = { baseField, resolution, chunksPerSide, border: CHUNK_BORDER, cache }

      // The first pass fills the cache, as the terrain before any dent is dug.
      buildEditedChunks({ ...options, edit: dentAt(0, 0), editedField: dentDensity(dentAt(0, 0)), reuse: true })

      for (const [x, z] of HOLE_CENTERS) {
        const edit = dentAt(x, z)
        const editedField = dentDensity(edit)
        const whole = triangleKeys(buildMarchingMesh(fieldGrid(editedField, resolution), resolution))
        const label = `${resolution} x${chunksPerSide} dent at ${x}, ${z}`

        const reused = buildEditedChunks({ ...options, edit, editedField, reuse: true })
        const rebuilt = buildEditedChunks({ ...options, edit, editedField, reuse: false })
        assert.deepEqual(triangleKeys(joinChunks(reused)), whole, `${label}: reusing chunks changed the mesh`)
        assert.deepEqual(triangleKeys(joinChunks(rebuilt)), whole, `${label}: rebuilding chunks changed the mesh`)
        assert.ok(rebuilt.every((chunk) => chunk.isRebuilt), `${label}: rebuild-everything skipped a chunk`)
      }
    }
  }
})

test('a dent reaches fewer than half of the chunks, and the chunks it does not reach are the same as before', () => {
  const resolution = 32
  const chunksPerSide = 4
  const options = { baseField: groundDensity, resolution, chunksPerSide, border: CHUNK_BORDER, cache: new Map(), reuse: true }
  const edit = dentAt(-1.5, -1.5)
  const chunks = buildEditedChunks({ ...options, edit, editedField: dentDensity(edit) })
  const rebuilt = chunks.filter((chunk) => chunk.isRebuilt).length

  assert.ok(rebuilt >= 1 && rebuilt < chunks.length / 2, `${rebuilt} of ${chunks.length} chunks reached`)

  const before = buildChunks(groundDensity, resolution, chunksPerSide, CHUNK_BORDER)
  for (const chunk of chunks.filter((each) => !each.isRebuilt)) {
    const untouched = before.find((each) => each.key === chunk.key)
    assert.deepEqual(triangleKeys(chunk.mesh), triangleKeys(untouched.mesh), `chunk ${chunk.key} changed without being reached`)
  }
})
