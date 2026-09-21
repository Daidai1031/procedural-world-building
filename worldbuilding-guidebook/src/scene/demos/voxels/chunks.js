import { buildMarchingMeshInCells, clampedGradient, withPadding } from './marchingCubes.js'
import { VOXEL_WORLD_SIZE, samplePosition, sampleSpacing } from './voxelMath.js'

// A chunk with a border keeps this many extra samples on every side. The first
// layer is what its last cells need for their corners. The second is what the
// lighting needs at those corners, so the shading matches across the seam.
export const CHUNK_BORDER = 2

// How many chunks fit along each side. Each divides every resolution the
// controls offer.
export const CHUNKS_PER_SIDE_OPTIONS = [1, 2, 4]

// One axis of one chunk. The chunk owns a run of cells, and a run of samples
// that is one shorter, since the last cell reaches one sample further on. The
// outermost chunks also own the padding that closes the volume: x and z have a
// padding sample and cell on the low side, and y has none below the floor.
export function chunkAxisRange(resolution, chunksPerSide, chunkIndex, axis) {
  const size = resolution / chunksPerSide
  const isFirst = chunkIndex === 0
  const isLast = chunkIndex === chunksPerSide - 1
  const lowPadding = axis === 1 ? 0 : 1
  const firstCell = isFirst ? -lowPadding : chunkIndex * size

  return {
    firstCell,
    lastCell: (chunkIndex + 1) * size - 1,
    firstSample: firstCell,
    lastSample: isLast ? resolution : (chunkIndex + 1) * size - 1,
  }
}

// A chunk owns the cells from firstCell to lastCell, but a cell has corners one
// sample further on. Without a border the chunk holds only its own samples, so
// the last row of cells has corners it cannot read, and nobody meshes them.
export function meshableCells(range, border) {
  const lastHeldSample = range.lastSample + border
  return { first: range.firstCell, last: Math.min(range.lastCell, lastHeldSample - 1) }
}

export function chunkIndices(chunksPerSide) {
  const indices = []
  for (let chunkZ = 0; chunkZ < chunksPerSide; chunkZ += 1) {
    for (let chunkY = 0; chunkY < chunksPerSide; chunkY += 1) {
      for (let chunkX = 0; chunkX < chunksPerSide; chunkX += 1) indices.push([chunkX, chunkY, chunkZ])
    }
  }
  return indices
}

// The box a chunk fills in the world, drawn round the sample cubes it owns, so
// the seams between boxes run through the row of cells nobody owns without a border.
export function chunkBounds(resolution, chunksPerSide, chunkIndex) {
  const size = resolution / chunksPerSide
  const half = sampleSpacing(resolution) / 2
  const firstSample = chunkIndex.map((index) => index * size)
  const lastSample = chunkIndex.map((index) => (index + 1) * size - 1)
  const min = samplePosition(resolution, ...firstSample).map((value) => value - half)
  const max = samplePosition(resolution, ...lastSample).map((value) => value + half)
  return { min, max }
}

// One chunk on its own. It works out the field, a function of x, y and z, for
// the samples it holds and nothing else, then meshes the cells it can read.
export function buildChunk(field, resolution, chunksPerSide, chunkIndex, border) {
  const ranges = chunkIndex.map((index, axis) => chunkAxisRange(resolution, chunksPerSide, index, axis))
  const held = ranges.map((range) => ({ first: range.firstSample - border, last: range.lastSample + border }))
  const counts = held.map(({ first, last }) => last - first + 1)
  const densities = new Float32Array(counts[0] * counts[1] * counts[2])
  const heldIndex = (sampleX, sampleY, sampleZ) =>
    sampleX - held[0].first + counts[0] * (sampleY - held[1].first + counts[1] * (sampleZ - held[2].first))

  const fieldAt = withPadding(resolution, (sampleX, sampleY, sampleZ) =>
    field(...samplePosition(resolution, sampleX, sampleY, sampleZ)),
  )
  for (let sampleZ = held[2].first; sampleZ <= held[2].last; sampleZ += 1) {
    for (let sampleY = held[1].first; sampleY <= held[1].last; sampleY += 1) {
      for (let sampleX = held[0].first; sampleX <= held[0].last; sampleX += 1) {
        densities[heldIndex(sampleX, sampleY, sampleZ)] = fieldAt(sampleX, sampleY, sampleZ)
      }
    }
  }

  const valueAt = (sampleX, sampleY, sampleZ) => densities[heldIndex(sampleX, sampleY, sampleZ)]
  const mesh = buildMarchingMeshInCells({
    resolution,
    cells: {
      min: ranges.map((range) => meshableCells(range, border).first),
      max: ranges.map((range) => meshableCells(range, border).last + 1),
    },
    valueAt,
    gradientAt: (sampleX, sampleY, sampleZ) =>
      clampedGradient(
        valueAt,
        held.map(({ first }) => Math.max(0, first)),
        held.map(({ last }) => Math.min(resolution - 1, last)),
        sampleX,
        sampleY,
        sampleZ,
      ),
  })

  return { mesh, heldSampleCount: densities.length }
}

// Every chunk of the volume, each with its own mesh.
export function buildChunks(field, resolution, chunksPerSide, border) {
  return chunkIndices(chunksPerSide).map((chunkIndex) => ({
    key: chunkIndex.join('-'),
    bounds: chunkBounds(resolution, chunksPerSide, chunkIndex),
    ...buildChunk(field, resolution, chunksPerSide, chunkIndex, border),
  }))
}

// A chunk has to be rebuilt when the edit, a sphere that changes nothing beyond
// its radius, comes near any sample the chunk holds. Border included, because
// its mesh is made from all of them. The test is the distance from the sphere's
// centre to the box of held samples.
export function chunkIsReached(resolution, chunksPerSide, chunkIndex, border, sphere) {
  const spacing = sampleSpacing(resolution)
  let distanceSquared = 0

  chunkIndex.forEach((index, axis) => {
    const range = chunkAxisRange(resolution, chunksPerSide, index, axis)
    const origin = axis === 1 ? 0 : -VOXEL_WORLD_SIZE / 2
    const center = [sphere.x, sphere.y, sphere.z][axis]
    const nearest = Math.min(origin + (range.lastSample + border) * spacing, Math.max(origin + (range.firstSample - border) * spacing, center))
    distanceSquared += (center - nearest) ** 2
  })

  return distanceSquared <= sphere.radius ** 2
}

// Every chunk of a volume with one edit in it. With reuse, a chunk the edit does
// not reach keeps the mesh it had before, held in cache, and only the reached
// chunks are built again. Without it, every chunk is built again. The result is
// the same either way. isRebuilt tells which chunks were built again.
export function buildEditedChunks({ baseField, editedField, edit, resolution, chunksPerSide, border, cache, reuse }) {
  return chunkIndices(chunksPerSide).map((chunkIndex) => {
    const key = chunkIndex.join('-')
    // #region reuse-unchanged-chunks
    const isReached = chunkIsReached(resolution, chunksPerSide, chunkIndex, border, edit)
    const isRebuilt = isReached || !reuse
    let built = !isReached && reuse ? cache.get(key) : undefined

    if (!built) {
      built = buildChunk(isReached ? editedField : baseField, resolution, chunksPerSide, chunkIndex, border)
      if (!isReached) cache.set(key, built)
    }
    // #endregion

    return { key, bounds: chunkBounds(resolution, chunksPerSide, chunkIndex), isRebuilt, ...built }
  })
}
