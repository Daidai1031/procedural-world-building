import { tuning } from '../config/tuning'
import { buildChunks, buildChunk, chunkAxisRange, chunkIndices, chunkIsReached, CHUNK_BORDER } from './voxels/chunks.js'
import { fractalNoise3D, sampleSpacing, VOXEL_WORLD_SIZE } from './voxels/voxelMath.js'
import { buildLodChunk, buildLodChunks, columnLevels, LOD_MAX_LEVELS } from './lodChunks.js'
import type { TerrainMode } from '../state/runState'
import { flattenNormal, type FlattenOrientation } from './flattenPlane'
import { surfaces, type SurfaceKind, type SurfaceProfile } from '../content/surfaces'

// TECH-07: FNV-1a over UTF-16 code units, stable for arbitrary URL seed strings.
export function hashSeed(seed: string) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619)
  }
  return hash >>> 0
}

export type PlanetShape = 'sphere' | 'cube' | 'tetra' | 'donut' | 'apple' | 'nail'
export interface PlanetConfig { radius: number; relief: number; minerals: number; residents: number; shape: PlanetShape; surface: SurfaceKind }

// PLN-02, D-041: the starting conditions of a planet. The home seed keeps the original values; a planet found by a
// signal reads each property from a different byte of its hash, so size, relief and abundance vary independently.
// D-060: the material comes from a stream of its own, so adding it moved no other seeded value.
export function planetConfig(seed: string): PlanetConfig {
  const { home, radius, relief, minerals, residents, shapes, shapeWeights, surfaces: kinds, surfaceWeights, smoothBelow } = tuning.planets
  if (!seed.includes('/signal-')) return home
  const hash = hashSeed(`${seed}:config`)
  const pick = ([min, max]: readonly number[], shift: number) => min + ((hash >>> shift) & 255) / 255 * (max - min)
  let roll = hashSeed(`${seed}:shape`) / 4294967296
  const shape = shapes.find((_, i) => (roll -= shapeWeights[i]) < 0) ?? shapes[0]
  const rough = pick(relief, 8)
  let material = hashSeed(`${seed}:surface`) / 4294967296
  const surface = kinds.find((_, i) => (material -= surfaceWeights[i]) < 0) ?? kinds[0]
  return { radius: pick(radius, 0), relief: shape !== 'sphere' || rough < smoothBelow ? 0 : rough,
    minerals: pick(minerals, 16), residents: pick(residents, 24), shape, surface }
}

export const surfaceOf = (seed: string): SurfaceProfile => surfaces[planetConfig(seed).surface]

// Signed distance to the planet's solid, negative inside. `radius` is the sphere radius the config asks for.
const TETRA_FACES: V3[] = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v => v.map(c => c / Math.sqrt(3)) as V3)
const unitVector = ([x, y, z]: readonly number[]): V3 => { const length = Math.hypot(x, y, z); return [x / length, y / length, z / length] }
const APPLE_BITE = unitVector(tuning.planets.apple.biteDirection)
// The bite's tooth marks sit on the rim of the bite, one each side of it, in the plane through the bite and the pole.
const APPLE_TEETH = (() => {
  const side = unitVector([-APPLE_BITE[2], 0, APPLE_BITE[0]])
  return [-1, 1].map(sign => unitVector([0, 1, 2].map(i => APPLE_BITE[i] + side[i] * sign * 0.42))) as V3[]
})()

export function shapeDistance(shape: PlanetShape, radius: number, x: number, y: number, z: number) {
  const { cubeHalf, cubeRound, tetraReach } = tuning.planets
  if (shape === 'donut') {
    const { major, minor } = tuning.planets.donut
    return Math.hypot(Math.hypot(x, z) - radius * major, y) - radius * minor
  }
  if (shape === 'apple') {
    const { bite, biteReach, scallop, dimple } = tuning.planets.apple
    const to = (c: V3, reach: number, r: number) => r - Math.hypot(x - c[0] * radius * reach, y - c[1] * radius * reach, z - c[2] * radius * reach)
    const cut = Math.max(to(APPLE_BITE, biteReach, radius * bite), ...APPLE_TEETH.map(t => to(t, biteReach, radius * scallop)),
      to([0, 1, 0], biteReach, radius * dimple))
    return Math.max(Math.hypot(x, y, z) - radius, cut)
  }
  if (shape === 'nail') {
    const { scale, shaft, head, headTop, headBottom, tip, shoulder } = tuning.planets.nail
    const r = radius * scale, round = Math.hypot(x, z)
    const body = Math.max(round - r * shaft, shoulder * r - y, y - headTop * r)
    const point = Math.max(round - r * shaft * Math.min(1, Math.max(0, (y - tip * r) / ((shoulder - tip) * r))), tip * r - y, y - shoulder * r)
    const cap = Math.max(round - r * head, headBottom * r - y, y - headTop * r)
    return Math.min(body, point, cap)
  }
  if (shape === 'cube') {
    const half = radius * cubeHalf - cubeRound
    const qx = Math.abs(x) - half, qy = Math.abs(y) - half, qz = Math.abs(z) - half
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - cubeRound
  }
  if (shape === 'tetra') {
    const inradius = radius * tetraReach / 3
    return Math.max(...TETRA_FACES.map(n => n[0] * x + n[1] * y + n[2] * z)) - inradius
  }
  return Math.hypot(x, y, z) - radius
}

function seededStream(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let value = Math.imul(state ^ (state >>> 15), state | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function createBaseField(seed: string) {
  const noise = { seed: hashSeed(seed), frequency: 3 / VOXEL_WORLD_SIZE, octaves: 4, persistence: 0.5 }
  const config = planetConfig(seed)
  const radius = VOXEL_WORLD_SIZE * config.radius
  return (x: number, y: number, z: number) => {
    // TERR-01, TERR-02: negative inside; guidebook volume is y=0..size.
    const centeredY = y - VOXEL_WORLD_SIZE / 2
    const relief = (fractalNoise3D(x, centeredY, z, noise) - 0.5) * VOXEL_WORLD_SIZE * config.relief
    return shapeDistance(config.shape, radius, x, centeredY, z) + relief
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
  const random = seededStream(hashSeed(`${seed}:burrows`))
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
      // A planet with a hole or a thin neck has no ground in some directions; a burrow needs rock to sink into.
      if (ground < burrows.depth + 0.25) continue
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
  // D-061: three numbers per sample, 0 to 1: scar (never falls), bald and comb (fade as fur regrows).
  private readonly wear: Float32Array
  // The original shape: scar measures the distance from it, and elastic ground returns to it.
  private readonly base: Float32Array
  private readonly elastic: boolean
  // Only planets that heal track which chunks to settle.
  private readonly heals: boolean
  private readonly resting = new Map<string, number>()
  private settleClock = 0
  readonly surface: SurfaceKind
  private readonly profile: SurfaceProfile
  /** Rock samples ever removed. Rebound does not take any back, so what it feeds never fades. */
  excavated = 0
  /** Counts every edit that changed the ground, so a viewer can react without being called. */
  edits = 0
  /** Chips broken off so far; the next chip's seed. */
  chips = 0
  private chipBudget = 0
  private readonly dirty = new Set<string>()
  private readonly indices = chunkIndices(this.chunksPerSide)
  private readonly lodCache = new Map()
  private lodLevels: number[] | null = null
  private pendingLodLevels: number[] | null = null
  lastRemeshMs = 0

  constructor(readonly seed: string) {
    const field = createPlanetField(seed)
    const resolution = this.resolution
    const spacing = VOXEL_WORLD_SIZE / (resolution - 1)
    this.surface = planetConfig(seed).surface
    this.profile = surfaces[this.surface]
    this.elastic = this.profile.elasticity > 0
    this.heals = this.elastic || this.surface === 'fur'
    this.density = new Float32Array(resolution ** 3)
    this.wear = new Float32Array(resolution ** 3 * 3)
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
    this.base = this.density.slice()
    this.chunks = buildChunks(this.densityAt, resolution, this.chunksPerSide, CHUNK_BORDER, this.wearAt)
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
      this.lodCache.set(key, buildLodChunk(this.densityAt, [chunkX, chunkY, chunkZ], level, this.wearAt))
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
      hasSnapping: true, cache: this.lodCache, wearAt: this.wearAt })
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

  // D-061: padding samples sit outside the grid and carry no wear.
  wearAt = (sampleX: number, sampleY: number, sampleZ: number, channel: number) => {
    const { resolution } = this
    if (sampleX < 0 || sampleY < 0 || sampleZ < 0 || sampleX >= resolution || sampleY >= resolution || sampleZ >= resolution) return 0
    return this.wear[this.index(sampleX, sampleY, sampleZ) * 3 + channel]
  }

  // Wear at a point in guidebook grid coordinates, read from the nearest sample like densityAt.
  wearNear(x: number, y: number, z: number, channel: number) {
    const scale = (this.resolution - 1) / VOXEL_WORLD_SIZE
    return this.wearAt(Math.round((x + VOXEL_WORLD_SIZE / 2) * scale), Math.round(y * scale), Math.round((z + VOXEL_WORLD_SIZE / 2) * scale), channel)
  }

  // D-061: how far this sample now is from the original shape, kept at its highest. Scar only ever rises, so it survives
  // a fill or a rebound that brings the density back. Air that stays air is no mark, or a pit's rim would get a halo.
  private scarSample(index: number, after: number) {
    const original = this.base[index]
    if (Math.min(after, original) >= 0) return
    const amount = Math.min(1, Math.abs(after - original) / tuning.surface.scarDepth)
    const at = index * 3
    if (amount > this.wear[at]) this.wear[at] = amount
    if (this.surface === 'fur' && amount > this.wear[at + 1]) this.wear[at + 1] = amount
  }

  // Every sample within `reach` of a point, with its world position.
  private eachSample(point: Point, reach: number, visit: (index: number, x: number, y: number, z: number) => void) {
    const scale = (this.resolution - 1) / VOXEL_WORLD_SIZE
    const last = this.resolution - 1
    const first = (center: number) => Math.max(0, Math.floor((center - reach) * scale))
    const final = (center: number) => Math.min(last, Math.ceil((center + reach) * scale))
    for (let z = first(point.z + VOXEL_WORLD_SIZE / 2); z <= final(point.z + VOXEL_WORLD_SIZE / 2); z += 1) {
      for (let y = first(point.y); y <= final(point.y); y += 1) {
        for (let x = first(point.x + VOXEL_WORLD_SIZE / 2); x <= final(point.x + VOXEL_WORLD_SIZE / 2); x += 1) {
          visit(this.index(x, y, z), -VOXEL_WORLD_SIZE / 2 + x / scale, y / scale, -VOXEL_WORLD_SIZE / 2 + z / scale)
        }
      }
    }
  }

  // SUR-10: brittle ground breaks further than the brush. A seeded convex chunk comes away beside the cut, and cracks
  // run past it. Returns how much rock left and how far the damage reached from the brush's center.
  private chip(point: Point, radius: number) {
    const { chip } = tuning.surface
    const random = seededStream(hashSeed(`${this.seed}:chip:${this.chips}`))
    this.chips += 1
    const direction = () => {
      const h = random() * 2 - 1, a = random() * Math.PI * 2, r = Math.sqrt(1 - h * h)
      return [Math.cos(a) * r, h, Math.sin(a) * r]
    }
    // Sideways along the ground: a chip that went straight down or up would be buried or hit only air.
    const raw = direction()
    const up = [point.x, point.y - VOXEL_WORLD_SIZE / 2, point.z].map((c, _, v) => c / (Math.hypot(...v) || 1))
    const along = raw[0] * up[0] + raw[1] * up[1] + raw[2] * up[2]
    const side = raw.map((c, i) => c - up[i] * along)
    const length = Math.hypot(...side) || 1
    const center = { x: point.x + side[0] / length * radius * chip.offset, y: point.y + side[1] / length * radius * chip.offset,
      z: point.z + side[2] / length * radius * chip.offset }
    const size = radius * chip.size * this.profile.brittleness
    const faces = Array.from({ length: chip.faces }, () => ({ normal: direction(), reach: size * (0.65 + random() * 0.45) }))
    let removed = 0
    this.eachSample(center, size * 1.2, (index, x, y, z) => {
      const inside = Math.max(...faces.map(({ normal, reach }) =>
        normal[0] * (x - center.x) + normal[1] * (y - center.y) + normal[2] * (z - center.z) - reach))
      if (inside >= 0) return
      const before = this.density[index]
      const after = Math.fround(Math.max(before, -inside))
      if (after === before) return
      this.density[index] = after
      this.scarSample(index, after)
      if (before < 0 && after >= 0) removed += 1
    })
    const reach = radius * chip.crackReach
    this.eachSample(point, reach, (index, x, y, z) => {
      const fade = 1 - Math.hypot(x - point.x, y - point.y, z - point.z) / reach
      if (fade > this.wear[index * 3]) this.wear[index * 3] = fade
    })
    return { removed, reach: Math.max(reach, radius * chip.offset + size * 1.2) }
  }

  // SUR-08: changes the hair and leaves the ground alone. Shearing leaves bald ground and a scar; combing lays hair flat.
  groom(kind: 'shear' | 'comb', point: Point, radius: number) {
    let samples = 0
    const channel = kind === 'shear' ? 1 : 2
    const { scar } = tuning.surface.shear
    this.eachSample(point, radius, (index, x, y, z) => {
      if (Math.hypot(x - point.x, y - point.y, z - point.z) >= radius) return
      this.wear[index * 3 + channel] = 1
      if (kind === 'shear' && scar > this.wear[index * 3]) this.wear[index * 3] = scar
      samples += 1
    })
    this.markDirty((chunkIndex) => chunkIsReached(this.resolution, this.chunksPerSide, chunkIndex, CHUNK_BORDER, { ...point, radius }))
    return samples
  }

  private markDirty(reached: (chunkIndex: number[]) => boolean) {
    for (const chunkIndex of this.indices) {
      if (!reached(chunkIndex)) continue
      const key = chunkIndex.join('-')
      this.dirty.add(key)
      if (this.heals) this.resting.set(key, 0)
    }
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
          this.scarSample(index, after)
          if (before < 0 && after >= 0) removedSamples += 1
          if (before >= 0 && after < 0) addedSamples += 1
        }
      }
    }
    if (!changed) return { removedSamples: 0, addedSamples: 0, changed: false, reach: radius }
    let reach = radius
    if (mode === 'dig' && this.profile.brittleness > 0) {
      this.chipBudget += removedSamples
      if (this.chipBudget >= tuning.surface.chip.everySamples) {
        this.chipBudget = 0
        const chipped = this.chip(point, radius)
        removedSamples += chipped.removed
        reach = chipped.reach
      }
    }

    // TERR-04: neighbouring chunks see the same edited border samples.
    this.markDirty((chunkIndex) => mode === 'flatten'
      ? orientation === 'horizontal'
        ? flattenChunkIsReached(this.resolution, this.chunksPerSide, chunkIndex, point, radius)
        : chunkIsReached(this.resolution, this.chunksPerSide, chunkIndex, CHUNK_BORDER,
          { ...point, radius: Math.SQRT2 * radius })
      : chunkIsReached(this.resolution, this.chunksPerSide, chunkIndex, CHUNK_BORDER, { ...point, radius: reach }))
    this.solidCount += addedSamples - removedSamples
    this.excavated += removedSamples
    this.edits += 1
    return { removedSamples, addedSamples, changed: true, reach }
  }

  // SUR-09, D-061: rested chunks heal a step. Elastic ground moves toward its original density; fur regrows. Scar is
  // left alone, so the shape comes back and the mark stays. Returns the ground that moved, in guidebook grid coordinates.
  settle(seconds: number) {
    const moved: { x: number; y: number; z: number; radius: number }[] = []
    if (!this.heals || this.resting.size === 0) return moved
    const { settle, regrow } = tuning.surface
    const interval = this.elastic ? settle.stepSeconds : regrow.stepSeconds
    this.settleClock += seconds
    for (const [key, age] of this.resting) this.resting.set(key, age + seconds)
    if (this.settleClock < interval) return moved
    const step = this.settleClock
    this.settleClock = 0
    const rested = [...this.resting].filter(([, age]) => !this.elastic || age >= settle.restSeconds).map(([key]) => key)
    for (const key of rested) {
      const region = this.settleChunk(key.split('-').map(Number), step)
      if (!region) { this.resting.delete(key); continue }
      const sphere = { ...region, radius: region.radius + 2 * sampleSpacing(this.resolution) }
      for (const chunkIndex of this.indices) {
        if (chunkIsReached(this.resolution, this.chunksPerSide, chunkIndex, CHUNK_BORDER, sphere)) this.dirty.add(chunkIndex.join('-'))
      }
      if (this.elastic) moved.push(region)
    }
    return moved
  }

  // One chunk's own samples. The box around what changed bounds the neighbours that must remesh too.
  private settleChunk(chunkIndex: number[], seconds: number) {
    const { base, density, wear, resolution, elastic } = this
    const { settle, regrow } = tuning.surface
    const pull = 1 - Math.exp(-seconds * this.profile.elasticity / settle.timeConstant)
    const fade = seconds / regrow.seconds
    const [rangeX, rangeY, rangeZ] = chunkIndex.map((index, axis) => chunkAxisRange(resolution, this.chunksPerSide, index, axis))
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
    for (let z = Math.max(0, rangeZ.firstSample); z <= Math.min(resolution - 1, rangeZ.lastSample); z += 1) {
      for (let y = Math.max(0, rangeY.firstSample); y <= Math.min(resolution - 1, rangeY.lastSample); y += 1) {
        for (let x = Math.max(0, rangeX.firstSample); x <= Math.min(resolution - 1, rangeX.lastSample); x += 1) {
          const index = this.index(x, y, z)
          let changed = false
          if (elastic) {
            const before = density[index]
            const gap = base[index] - before
            if (gap !== 0) {
              const after = Math.abs(gap) < settle.snap ? base[index] : Math.fround(before + gap * pull)
              density[index] = after
              if (before < 0 && after >= 0) this.solidCount -= 1
              if (before >= 0 && after < 0) this.solidCount += 1
              changed = true
            }
          }
          const wearAt = index * 3
          if (wear[wearAt + 1] > 0 || wear[wearAt + 2] > 0) {
            wear[wearAt + 1] = Math.max(0, wear[wearAt + 1] - fade)
            wear[wearAt + 2] = Math.max(0, wear[wearAt + 2] - fade)
            changed = true
          }
          if (!changed) continue
          min[0] = Math.min(min[0], x); min[1] = Math.min(min[1], y); min[2] = Math.min(min[2], z)
          max[0] = Math.max(max[0], x); max[1] = Math.max(max[1], y); max[2] = Math.max(max[2], z)
        }
      }
    }
    if (min[0] === Infinity) return null
    const spacing = sampleSpacing(resolution)
    const center = [0, 1, 2].map(axis => (min[axis] + max[axis]) / 2 * spacing)
    return { x: center[0] - VOXEL_WORLD_SIZE / 2, y: center[1], z: center[2] - VOXEL_WORLD_SIZE / 2,
      radius: Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2 * spacing }
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
      const rebuilt = buildChunk(this.densityAt, this.resolution, this.chunksPerSide, chunkIndex, CHUNK_BORDER, this.wearAt)
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
