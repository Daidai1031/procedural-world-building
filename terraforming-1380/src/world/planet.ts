import { tuning } from '../config/tuning'
import { buildChunks, buildChunk, chunkAxisRange, chunkIndices, chunkIsReached, CHUNK_BORDER } from './voxels/chunks.js'
import { fractalNoise3D, sampleSpacing, VOXEL_WORLD_SIZE } from './voxels/voxelMath.js'
import type { TerrainMode } from '../state/runState'
import { flattenNormal, type FlattenOrientation } from './flattenPlane'

// TECH-07: FNV-1a over UTF-16 code units, stable for arbitrary URL seed strings.
export function hashSeed(seed: string) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619)
  }
  return hash >>> 0
}

export function createPlanetField(seed: string) {
  const noise = { seed: hashSeed(seed), frequency: 3 / VOXEL_WORLD_SIZE, octaves: 4, persistence: 0.5 }
  const radius = VOXEL_WORLD_SIZE * 0.34
  return (x: number, y: number, z: number) => {
    // TERR-01, TERR-02: negative inside; guidebook volume is y=0..size.
    const centeredY = y - VOXEL_WORLD_SIZE / 2
    const relief = (fractalNoise3D(x, centeredY, z, noise) - 0.5) * VOXEL_WORLD_SIZE * 0.16
    return Math.hypot(x, centeredY, z) - radius + relief
  }
}

export function buildPlanet(seed: string) {
  // TERR-03: retain the copied two-sample border.
  return buildChunks(
    createPlanetField(seed),
    tuning.grid.resolution,
    tuning.grid.resolution / tuning.chunk.size,
    CHUNK_BORDER,
  )
}

export type PlanetChunks = ReturnType<typeof buildPlanet>

type Chunk = PlanetChunks[number] & { version: number }
type Point = { x: number; y: number; z: number }

function planeFalloff(distance: number, radius: number) {
  const inner = radius * tuning.flatten.innerFraction
  const t = Math.max(0, Math.min(1, (radius - distance) / (radius - inner)))
  return t * t * (3 - 2 * t)
}

function flattenChunkIsReached(resolution: number, chunksPerSide: number, chunkIndex: number[], point: Point, radius: number) {
  const spacing = sampleSpacing(resolution)
  const axisDistance = (axis: number, center: number) => {
    const range = chunkAxisRange(resolution, chunksPerSide, chunkIndex[axis], axis)
    const origin = axis === 1 ? 0 : -VOXEL_WORLD_SIZE / 2
    const min = origin + (range.firstSample - CHUNK_BORDER) * spacing
    const max = origin + (range.lastSample + CHUNK_BORDER) * spacing
    return Math.max(min - center, 0, center - max)
  }
  return Math.hypot(axisDistance(0, point.x), axisDistance(2, point.z)) < radius
    && axisDistance(1, point.y) < radius
}

// TERR-01, TERR-04: edits live in one sample grid; meshes are derived from it.
export class PlanetWorld {
  readonly resolution = tuning.grid.resolution
  readonly chunksPerSide = this.resolution / tuning.chunk.size
  readonly chunks: Chunk[]
  readonly initialSolidCount: number
  private solidCount = 0
  private readonly density: Float32Array
  private readonly dirty = new Set<string>()
  private readonly indices = chunkIndices(this.chunksPerSide)
  lastRemeshMs = 0

  constructor(seed: string) {
    const field = createPlanetField(seed)
    const resolution = this.resolution
    const spacing = VOXEL_WORLD_SIZE / (resolution - 1)
    this.density = new Float32Array(resolution ** 3)
    for (let z = 0; z < resolution; z += 1) {
      for (let y = 0; y < resolution; y += 1) {
        for (let x = 0; x < resolution; x += 1) {
          const value = field(-VOXEL_WORLD_SIZE / 2 + x * spacing, y * spacing, -VOXEL_WORLD_SIZE / 2 + z * spacing)
          this.density[this.index(x, y, z)] = value
          if (value < 0) this.solidCount += 1
        }
      }
    }
    this.initialSolidCount = this.solidCount
    this.chunks = buildChunks(this.densityAt, resolution, this.chunksPerSide, CHUNK_BORDER)
      .map((chunk) => ({ ...chunk, version: 0 }))
  }

  get planetRemaining() {
    return Math.min(1, this.solidCount / this.initialSolidCount)
  }

  get dirtyChunkCount() {
    return this.dirty.size
  }

  private index(x: number, y: number, z: number) {
    return x + this.resolution * (y + this.resolution * z)
  }

  densityAt = (x: number, y: number, z: number) => {
    const scale = (this.resolution - 1) / VOXEL_WORLD_SIZE
    const sx = Math.round((x + VOXEL_WORLD_SIZE / 2) * scale)
    const sy = Math.round(y * scale)
    const sz = Math.round((z + VOXEL_WORLD_SIZE / 2) * scale)
    return this.density[this.index(sx, sy, sz)]
  }

  // TERR-09, TOOL-02–04: one brush operation; point is in guidebook grid coordinates.
  edit(mode: TerrainMode, point: Point, radius: number, orientation: FlattenOrientation = 'radial') {
    const normal = mode === 'flatten' ? flattenNormal(point, orientation) : null
    const searchRadius = mode === 'flatten' && orientation === 'radial' ? Math.SQRT2 * radius : radius
    const scale = (this.resolution - 1) / VOXEL_WORLD_SIZE
    const spacing = 1 / scale
    const minX = Math.max(0, Math.floor((point.x - searchRadius + VOXEL_WORLD_SIZE / 2) * scale))
    const maxX = Math.min(this.resolution - 1, Math.ceil((point.x + searchRadius + VOXEL_WORLD_SIZE / 2) * scale))
    const minY = Math.max(0, Math.floor((point.y - searchRadius) * scale))
    const maxY = Math.min(this.resolution - 1, Math.ceil((point.y + searchRadius) * scale))
    const minZ = Math.max(0, Math.floor((point.z - searchRadius + VOXEL_WORLD_SIZE / 2) * scale))
    const maxZ = Math.min(this.resolution - 1, Math.ceil((point.z + searchRadius + VOXEL_WORLD_SIZE / 2) * scale))
    let removedSamples = 0
    let addedSamples = 0
    let changed = false

    for (let z = minZ; z <= maxZ; z += 1) {
      const wz = -VOXEL_WORLD_SIZE / 2 + z * spacing
      for (let y = minY; y <= maxY; y += 1) {
        const wy = y * spacing
        for (let x = minX; x <= maxX; x += 1) {
          const wx = -VOXEL_WORLD_SIZE / 2 + x * spacing
          const index = this.index(x, y, z)
          const before = this.density[index]
          let after = before
          if (mode === 'flatten') {
            // TOOL-04: cylindrical footprint around the selected plane normal.
            const dx = wx - point.x
            const dy = wy - point.y
            const dz = wz - point.z
            const signed = dx * normal![0] + dy * normal![1] + dz * normal![2]
            const tangent = Math.sqrt(Math.max(0, dx * dx + dy * dy + dz * dz - signed * signed))
            if (tangent >= radius || Math.abs(signed) >= radius) continue
            const weight = planeFalloff(tangent, radius) * planeFalloff(Math.abs(signed), radius)
            after = before + (signed - before) * weight
          } else {
            const distance = Math.hypot(wx - point.x, wy - point.y, wz - point.z)
            if (distance >= radius) continue
            if (mode === 'dig') after = Math.max(before, radius - distance)
            if (mode === 'add') after = Math.min(before, distance - radius)
          }
          after = Math.fround(after)
          if (after === before) continue
          this.density[index] = after
          changed = true
          if (before < 0 && after >= 0) removedSamples += 1
          if (before >= 0 && after < 0) addedSamples += 1
        }
      }
    }
    if (!changed) return { removedSamples: 0, addedSamples: 0, changed: false }

    // TERR-04: neighbouring chunks see the same edited border samples.
    for (const chunkIndex of this.indices) {
      const reached = mode === 'flatten'
        ? orientation === 'horizontal'
          ? flattenChunkIsReached(this.resolution, this.chunksPerSide, chunkIndex, point, radius)
          : chunkIsReached(this.resolution, this.chunksPerSide, chunkIndex, CHUNK_BORDER,
            { ...point, radius: Math.SQRT2 * radius })
        : chunkIsReached(this.resolution, this.chunksPerSide, chunkIndex, CHUNK_BORDER, { ...point, radius })
      if (reached) {
        this.dirty.add(chunkIndex.join('-'))
      }
    }
    this.solidCount += addedSamples - removedSamples
    return { removedSamples, addedSamples, changed: true }
  }

  // TERR-04, TECH-06: process dirty chunks over successive frames.
  remeshDirty(timeBudgetMs: number) {
    if (this.dirty.size === 0) return false
    const started = performance.now()
    let changed = false
    while (this.dirty.size > 0) {
      const key = this.dirty.values().next().value!
      this.dirty.delete(key)
      const chunkIndex = key.split('-').map(Number)
      const index = chunkIndex[0] + this.chunksPerSide * (chunkIndex[1] + this.chunksPerSide * chunkIndex[2])
      const rebuilt = buildChunk(this.densityAt, this.resolution, this.chunksPerSide, chunkIndex, CHUNK_BORDER)
      this.chunks[index] = { ...this.chunks[index], ...rebuilt, version: this.chunks[index].version + 1 }
      changed = true
      if (performance.now() - started >= timeBudgetMs) break
    }
    this.lastRemeshMs = performance.now() - started
    return changed
  }
}
