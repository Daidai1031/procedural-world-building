import { tuning } from '../config/tuning'
import { buildChunks, buildChunk, chunkAxisRange, chunkIndices, chunkIsReached, CHUNK_BORDER } from './voxels/chunks.js'
import { fractalNoise3D, sampleSpacing, VOXEL_WORLD_SIZE } from './voxels/voxelMath.js'
import { buildLodChunk, buildLodChunks, columnLevels, LOD_MAX_LEVELS } from './lodChunks.js'
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

export interface PlanetConfig { radius: number; relief: number; minerals: number; residents: number }

// PLN-02, D-041: the starting conditions of a planet. The home seed keeps the original values; a planet found by a
// signal reads each property from a different byte of its hash, so size, relief and abundance vary independently.
export function planetConfig(seed: string): PlanetConfig {
  const { home, radius, relief, minerals, residents } = tuning.planets
  if (!seed.includes('/signal-')) return home
  const hash = hashSeed(`${seed}:config`)
  const pick = ([min, max]: readonly number[], shift: number) => min + ((hash >>> shift) & 255) / 255 * (max - min)
  return { radius: pick(radius, 0), relief: pick(relief, 8), minerals: pick(minerals, 16), residents: pick(residents, 24) }
}

function createBaseField(seed: string) {
  const noise = { seed: hashSeed(seed), frequency: 3 / VOXEL_WORLD_SIZE, octaves: 4, persistence: 0.5 }
  const config = planetConfig(seed)
  const radius = VOXEL_WORLD_SIZE * config.radius
  return (x: number, y: number, z: number) => {
    // TERR-01, TERR-02: negative inside; guidebook volume is y=0..size.
    const centeredY = y - VOXEL_WORLD_SIZE / 2
    const relief = (fractalNoise3D(x, centeredY, z, noise) - 0.5) * VOXEL_WORLD_SIZE * config.relief
    return Math.hypot(x, centeredY, z) - radius + relief
  }
}

type V3 = [number, number, number]
export interface Burrow { id: string; pocket: V3; mouth: V3 }

// RES-01, D-042: the seed places a few groups of burrows. Each is a pocket below the surface reached by a slanted
// tunnel, so it is enclosed on most sides, unlike an open pit. Positions are centered coordinates (planet center at 0).
const burrowCache = new Map<string, Burrow[]>()
export function burrowSites(seed: string): Burrow[] {
  const cached = burrowCache.get(seed)
  if (cached) return cached
  const field = createBaseField(seed)
  const { burrows } = tuning.residents
  const random = (() => {
    let state = hashSeed(`${seed}:burrows`)
    return () => {
      state = (state + 0x6D2B79F5) >>> 0
      let value = Math.imul(state ^ (state >>> 15), state | 1)
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296
    }
  })()
  const norm = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
  const surface = (d: V3) => {
    let inside = 0, outside = VOXEL_WORLD_SIZE / 2 - 0.1
    for (let i = 0; i < 16; i++) {
      const mid = (inside + outside) / 2
      if (field(d[0] * mid, d[1] * mid + VOXEL_WORLD_SIZE / 2, d[2] * mid) < 0) inside = mid
      else outside = mid
    }
    return inside
  }
  const randomDirection = (): V3 => {
    const h = random() * 2 - 1, a = random() * Math.PI * 2, r = Math.sqrt(1 - h * h)
    return [Math.cos(a) * r, h, Math.sin(a) * r]
  }
  const groups = Math.max(1, Math.round(burrows.groups * planetConfig(seed).residents))
  const out: Burrow[] = []
  for (let g = 0; g < groups; g++) {
    const center = randomDirection()
    // Burrows sit on a ring around the group center, each tunnel leaving away from the center so neighbours never merge.
    const helper: V3 = Math.abs(center[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
    const t1 = norm([center[1] * helper[2] - center[2] * helper[1], center[2] * helper[0] - center[0] * helper[2], center[0] * helper[1] - center[1] * helper[0]])
    const t2: V3 = [center[1] * t1[2] - center[2] * t1[1], center[2] * t1[0] - center[0] * t1[2], center[0] * t1[1] - center[1] * t1[0]]
    const turn = random() * Math.PI * 2
    for (let k = 0; k < burrows.perGroup; k++) {
      const theta = turn + k * Math.PI * 2 / burrows.perGroup + (random() - 0.5) * 0.6
      // The spread is a distance at pocket depth, so small planets get as much room between burrows as large ones.
      const angle = burrows.groupSpread / Math.max(0.4, VOXEL_WORLD_SIZE * planetConfig(seed).radius - burrows.depth) * (0.85 + random() * 0.3)
      const side: V3 = [0, 1, 2].map(i => t1[i] * Math.cos(theta) + t2[i] * Math.sin(theta)) as V3
      const direction = norm([0, 1, 2].map(i => center[i] * Math.cos(angle) + side[i] * Math.sin(angle)) as V3)
      const ground = surface(direction)
      const pocket = direction.map(c => c * (ground - burrows.depth)) as V3
      const mouthDirection = norm(direction.map((c, i) => c + side[i] * burrows.slant) as V3)
      const mouth = mouthDirection.map(c => c * (surface(mouthDirection) + 0.12)) as V3
      // Two groups can land close together on a small planet; keep pockets apart rather than merging them.
      if (out.some(o => Math.hypot(o.pocket[0] - pocket[0], o.pocket[1] - pocket[1], o.pocket[2] - pocket[2]) < burrows.minGap)) continue
      out.push({ id: `burrow-${g}-${k}`, pocket, mouth })
    }
  }
  burrowCache.set(seed, out)
  return out
}

function segmentDistance(p: V3, a: V3, b: V3) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]]
  const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2)))
  return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t)
}

// The planet's initial density: noisy sphere minus the seeded burrows (max with the negated carve distance).
export function createPlanetField(seed: string) {
  const base = createBaseField(seed)
  const burrows = burrowSites(seed)
  const { pocketRadius, tunnelRadius } = tuning.residents.burrows
  const reach = Math.max(...burrows.map(b => Math.hypot(b.mouth[0] - b.pocket[0], b.mouth[1] - b.pocket[1], b.mouth[2] - b.pocket[2]))) + pocketRadius
  return (x: number, y: number, z: number) => {
    let value = base(x, y, z)
    const p: V3 = [x, y - VOXEL_WORLD_SIZE / 2, z]
    for (const burrow of burrows) {
      if (Math.abs(p[0] - burrow.pocket[0]) > reach || Math.abs(p[1] - burrow.pocket[1]) > reach || Math.abs(p[2] - burrow.pocket[2]) > reach) continue
      const pocket = pocketRadius - Math.hypot(p[0] - burrow.pocket[0], p[1] - burrow.pocket[1], p[2] - burrow.pocket[2])
      const tunnel = tunnelRadius - segmentDistance(p, burrow.pocket, burrow.mouth)
      value = Math.max(value, pocket, tunnel)
    }
    return value
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

type Chunk = PlanetChunks[number] & { version: number; level: number }
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
  private readonly lodCache = new Map()
  private lodLevels: number[] | null = null
  private pendingLodLevels: number[] | null = null
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
      .map((chunk) => ({ ...chunk, version: 0, level: 0 }))
    for (const chunk of this.chunks) this.lodCache.set(`${chunk.key}-0`, chunk.mesh)
  }

  // SYS-02/04: changes whenever any chunk mesh is rebuilt, so a viewer can refresh only when the shape really changed.
  get meshVersion() {
    return this.chunks.reduce((sum, chunk) => sum + chunk.version, 0)
  }

  get planetRemaining() {
    return Math.min(1, this.solidCount / this.initialSolidCount)
  }

  get dirtyChunkCount() {
    return this.dirty.size
  }

  get lodCounts() {
    return Array.from({ length: LOD_MAX_LEVELS }, (_, level) =>
      this.chunks.filter((chunk) => chunk.level === level && chunk.mesh.positions.length > 0).length)
  }

  setLodCamera(camera: { x: number; y: number; z: number }, timeBudgetMs: number) {
    if (this.dirty.size > 0) return false
    const levels = columnLevels(camera, LOD_MAX_LEVELS)
    if (this.lodLevels?.every((level, index) => level === levels[index])) {
      this.pendingLodLevels = null
      return false
    }
    if (!this.pendingLodLevels?.every((level, index) => level === levels[index])) {
      this.pendingLodLevels = levels
    }
    const started = performance.now()
    for (const [chunkX, chunkY, chunkZ] of this.indices) {
      const level = levels[chunkZ * this.chunksPerSide + chunkX]
      const key = `${chunkX}-${chunkY}-${chunkZ}-${level}`
      if (this.lodCache.has(key)) continue
      this.lodCache.set(key, buildLodChunk(this.densityAt, [chunkX, chunkY, chunkZ], level))
      if (performance.now() - started >= timeBudgetMs) return false
    }
    this.lodLevels = levels
    this.pendingLodLevels = null
    this.applyLod()
    return true
  }

  private applyLod() {
    if (!this.lodLevels) return
    const lodChunks = buildLodChunks({ field: this.densityAt, levels: this.lodLevels,
      hasSnapping: true, cache: this.lodCache })
    lodChunks.forEach(({ mesh, level }, index) => {
      const chunk = this.chunks[index]
      if (chunk.mesh !== mesh || chunk.level !== level) {
        this.chunks[index] = { ...chunk, mesh, level, version: chunk.version + 1 }
      }
    })
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
  // cutOnly (D-026) makes Flatten remove rock above the plane without filling below it.
  edit(mode: TerrainMode, point: Point, radius: number, orientation: FlattenOrientation = 'radial', cutOnly = false) {
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
            if (cutOnly) after = Math.max(before, after)
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
      if (!this.lodLevels) {
        this.chunks[index] = { ...this.chunks[index], ...rebuilt, level: 0, version: this.chunks[index].version + 1 }
      }
      this.lodCache.set(`${key}-0`, rebuilt.mesh)
      for (let level = 0; level < LOD_MAX_LEVELS; level += 1) {
        if (level > 0) this.lodCache.delete(`${key}-${level}`)
        this.lodCache.delete(`edges-${key}-${level}`)
      }
      changed = true
      if (performance.now() - started >= timeBudgetMs) break
    }
    if (changed && this.dirty.size === 0) this.applyLod()
    this.lastRemeshMs = performance.now() - started
    return changed && (this.lodLevels === null || this.dirty.size === 0)
  }
}
