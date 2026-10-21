import { tuning } from '../config/tuning'
import type { Home, Resident, RunState, createRunStore } from '../state/runState'
import { burrowSites, createPlanetField, hashSeed, type Burrow, type PlanetWorld } from '../world/planet'
import { HALF, add, distance, dot, scale, unit, type Vec3 } from './geometry'
import { groundRadius } from './exploration'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'

type Store = ReturnType<typeof createRunStore>
type World = Pick<PlanetWorld, 'densityAt'>
const rules = tuning.residents
const STEP = VOXEL_WORLD_SIZE / (tuning.grid.resolution - 1)

export type { Home, Resident, ResidentState } from '../state/runState'

export interface DisturbanceSource { position: Vec3; level: number }
export interface HabitatState { tick: number; sources: DisturbanceSource[]; candidates: Vec3[] }

const density = (world: World, p: Vec3) => world.densityAt(p[0], p[1] + HALF, p[2])
const inside = (p: Vec3) => Math.abs(p[0]) < HALF - 0.1 && Math.abs(p[1]) < HALF - 0.1 && Math.abs(p[2]) < HALF - 0.1
const solid = (world: World, p: Vec3) => inside(p) && density(world, p) < 0

// D-045: a sunk home needs deep supporting soil, a walkable surface, empty headroom and spacing.
export function isValidHome(world: World, candidate: Home, occupied: readonly Home[] = []) {
  const up = unit(candidate)
  if (Math.hypot(...candidate) < 0.5) return false
  for (let depth = STEP / 2; depth <= rules.minSoilDepth + STEP / 4; depth += STEP / 2) {
    if (!solid(world, add(candidate, scale(up, -Math.min(depth, rules.minSoilDepth))))) return false
  }
  const gradient = [0, 1, 2].map(axis => {
    const offset: Vec3 = [0, 0, 0]
    offset[axis] = STEP
    return density(world, add(candidate, offset)) - density(world, add(candidate, scale(offset, -1)))
  }) as Vec3
  const slope = Math.acos(Math.max(-1, Math.min(1, dot(unit(gradient), up)))) * 180 / Math.PI
  if (!Number.isFinite(slope) || slope > rules.maxSlopeDeg) return false
  for (let height = STEP / 2; height <= rules.headroom + STEP / 4; height += STEP / 2) {
    if (solid(world, add(candidate, scale(up, Math.min(height, rules.headroom))))) return false
  }
  return occupied.every(home => distance(home, candidate) >= rules.minHomeSpacing)
}

function surfacePoint(world: World, direction: Vec3) {
  const up = unit(direction)
  return scale(up, groundRadius(world, up))
}

function poseAt(home: Home, state: 'peeking' | 'hiding') {
  return add(home, scale(unit(home), state === 'peeking' ? rules.peekLift : -rules.hideDepth))
}

function mix(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

// Hiding sits deep in the pocket; peeking slides up the tunnel without leaving the burrow.
function burrowPose(burrow: Burrow, state: 'peeking' | 'hiding') {
  return mix(burrow.mouth, burrow.pocket, state === 'hiding' ? 0.82 : 0.42)
}

function findBurrow(seed: string, id: string | null) {
  return id ? burrowSites(seed).find(burrow => burrow.id === id) ?? null : null
}

export function burrowOpen(world: World, burrow: Burrow) {
  const steps = Math.max(2, Math.ceil(distance(burrow.mouth, burrow.pocket) / rules.pathStep))
  for (let i = 1; i <= steps; i += 1) if (solid(world, mix(burrow.mouth, burrow.pocket, i / steps))) return false
  return true
}

function poseFor(seed: string, resident: Resident, state: 'peeking' | 'hiding') {
  const burrow = findBurrow(seed, resident.burrowId)
  if (burrow) return burrowPose(burrow, state)
  if (resident.home) return poseAt(resident.home, state)
  return resident.position
}

// Stable surface candidates. Current density is checked again whenever a resident searches.
export function residentHomeSites(world: World, seed: string, limit = rules.homeCandidates): Home[] {
  const homes: Home[] = []
  const offset = hashSeed(`${seed}:resident-homes`) / 4294967296
  for (let i = 0; i < rules.homeCandidateSamples && homes.length < limit; i += 1) {
    const y = 1 - (2 * i + 1) / rules.homeCandidateSamples
    const ring = Math.sqrt(1 - y * y)
    const angle = (i + offset) * 2.399963229728653
    const direction: Vec3 = [Math.cos(angle) * ring, y, Math.sin(angle) * ring]
    const candidate = surfacePoint(world, direction)
    if (isValidHome(world, candidate, homes)) homes.push(candidate)
  }
  return homes
}

export function disturbanceAt(habitat: HabitatState, p: Vec3) {
  let total = 0
  for (const source of habitat.sources) {
    const f = Math.max(0, 1 - distance(source.position, p) / rules.disturbance.radius)
    total += source.level * f * f
  }
  return total
}

// Dense nearby plants make this shy species more willing to show itself. Antennas do not count.
export function plantCoverAt(structures: RunState['structures'], p: Vec3) {
  const { radius, fullAt } = rules.look.plants
  let cover = 0
  for (const structure of structures) {
    if (structure.kind !== 'plant') continue
    const proximity = Math.max(0, 1 - distance(structure.position, p) / radius)
    cover += proximity * proximity
  }
  return Math.min(1, cover / fullAt)
}

export function recordDisturbance(store: Store, position: Vec3, kind: 'manual' | 'robot', excavated: boolean) {
  const d = rules.disturbance
  store.setState(state => {
    const sources = state.habitat.sources.map(source => ({ ...source }))
    const near = sources.find(source => distance(source.position, position) < d.merge)
    const amount = kind === 'manual' ? d.manual : d.robot
    if (near) near.level = Math.min(d.cap, near.level + amount)
    else sources.push({ position, level: Math.min(d.cap, amount) })
    let candidates = state.habitat.candidates
    if (excavated && !candidates.some(candidate => distance(candidate, position) < rules.search.candidateMerge)) {
      candidates = [...candidates, position].slice(-rules.search.candidateLimit)
    }
    return { habitat: { ...state.habitat, sources: sources.sort((a, b) => b.level - a.level).slice(0, d.maxSources), candidates } }
  })
}

function makeResident(seed: string, index: number, home: Home, burrow: Burrow | null): Resident {
  const state = burrow ? 'hiding' as const : 'peeking' as const
  const resident: Resident = {
    id: `resident-${index}`,
    // D-053: stable per-resident variation makes individuals readable within one population.
    size: rules.size[0] + (hashSeed(`${seed}:resident:${index}:size`) % 101) / 100 * (rules.size[1] - rules.size[0]),
    home, burrowId: burrow?.id ?? null,
    position: home, state, path: [], homeValid: true, peek: home,
    quietTicks: 0, disturbedTicks: 0, lastMoveTick: -Infinity,
    nextCheck: index % rules.checkEvery,
    nextWander: rules.wanderEvery + index * 40,
    searchRetries: 0,
  }
  resident.position = poseFor(seed, resident, state)
  resident.peek = poseFor(seed, resident, 'peeking')
  return resident
}

// RES-01, D-052/D-054: one resident starts inside each open burrow; the rest are scattered on the surface.
export function spawnResidents(seed: string): Resident[] {
  const field = createPlanetField(seed)
  const spacing = VOXEL_WORLD_SIZE / (tuning.grid.resolution - 1)
  // Match PlanetWorld's nearest-sample density reads without constructing and meshing a second world.
  const snap = (value: number, centered: boolean) => Math.round((value + (centered ? HALF : 0)) / spacing) * spacing - (centered ? HALF : 0)
  const world = { densityAt: (x: number, y: number, z: number) => field(snap(x, true), snap(y, false), snap(z, true)) }
  const burrows = burrowSites(seed).filter(burrow => burrowOpen(world, burrow))
  const homes = residentHomeSites(world, seed).filter(home => burrows.every(burrow => distance(home, burrow.pocket) >= rules.minHomeSpacing))
  const rolled = rules.initialCount[0] + hashSeed(`${seed}:residents:count`) % (rules.initialCount[1] - rules.initialCount[0] + 1)
  const surfaceCount = Math.max(0, Math.min(homes.length, Math.max(rolled, burrows.length) - burrows.length))
  return [
    ...burrows.map((burrow, index) => makeResident(seed, index, burrow.pocket, burrow)),
    ...homes.slice(0, surfaceCount).map((home, index) => makeResident(seed, burrows.length + index, home, null)),
  ]
}

function walkSurface(world: World, from: Vec3, toward: Vec3, final: Vec3) {
  const a = unit(from), b = unit(toward)
  const angle = Math.acos(Math.max(-1, Math.min(1, dot(a, b))))
  const steps = Math.max(1, Math.ceil(angle * Math.max(Math.hypot(...from), Math.hypot(...toward)) / rules.pathStep))
  const points: Vec3[] = []
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    const sin = Math.sin(angle)
    const direction = sin < 1e-5 ? a : unit(add(scale(a, Math.sin((1 - t) * angle) / sin), scale(b, Math.sin(t * angle) / sin)))
    const ground = groundRadius(world, direction)
    if (!ground) return null
    const point = scale(direction, ground + rules.surfaceLift)
    if (solid(world, point)) return null
    points.push(point)
  }
  if (solid(world, final)) return null
  points.push(final)
  return points
}

function throughTunnel(burrow: Burrow, fromMouth: boolean) {
  const steps = Math.max(2, Math.ceil(distance(burrow.mouth, burrow.pocket) / rules.pathStep))
  const points: Vec3[] = []
  for (let i = 1; i <= steps; i += 1) points.push(mix(burrow.mouth, burrow.pocket, fromMouth ? i / steps : 1 - i / steps))
  return points
}

function routeTo(world: World, seed: string, from: Vec3, home: Home, burrowId: string | null, leavingId: string | null) {
  const leaving = findBurrow(seed, leavingId)
  const exit = leaving && leaving.id !== burrowId ? throughTunnel(leaving, false) : []
  const start = exit.at(-1) ?? from
  const burrow = findBurrow(seed, burrowId)
  if (!burrow) {
    const walk = walkSurface(world, start, home, poseAt(home, 'hiding'))
    return walk ? [...exit, ...walk] : null
  }
  const outside = walkSurface(world, start, burrow.mouth, burrow.mouth)
  if (!outside) return null
  const tunnel = throughTunnel(burrow, true)
  tunnel[tunnel.length - 1] = burrowPose(burrow, 'hiding')
  return [...exit, ...outside, ...tunnel]
}

// D-051: nearby occupied homes make a candidate more attractive, without overriding habitat constraints.
export function homePreferenceScore(candidate: Home, origin: Vec3, companionHomes: readonly Home[]) {
  const companions = companionHomes.filter(home => distance(home, candidate) <= rules.companionRadius).length
  return companions * rules.companionBonus - distance(candidate, origin) * rules.distanceCost
}

interface Destination { home: Home; burrowId: string | null }

// D-054: a free burrow outranks open ground, but an occupied burrow is never a choice.
function destinations(world: World, state: RunState, resident: Resident, residents: Resident[], wander: boolean): Destination[] {
  const origin = resident.home ?? resident.position
  const claimed = residents.filter(other => other.id !== resident.id && other.home).map(other => other.home!)
  const taken = new Set(residents.filter(other => other.id !== resident.id && other.burrowId).map(other => other.burrowId!))
  const burrows: Destination[] = []
  for (const burrow of burrowSites(state.seed)) {
    if (taken.has(burrow.id) || burrow.id === resident.burrowId) continue
    if (disturbanceAt(state.habitat, burrow.pocket) >= rules.quietLevel || !burrowOpen(world, burrow)) continue
    if (claimed.some(home => distance(home, burrow.pocket) < rules.minHomeSpacing)) continue
    burrows.push({ home: burrow.pocket, burrowId: burrow.id })
  }
  const seen = new Set<string>()
  const surface: Destination[] = []
  const edited = state.habitat.candidates.map(candidate => surfacePoint(world, candidate))
  for (const candidate of [...residentHomeSites(world, state.seed), ...edited]) {
    const key = candidate.map(value => value.toFixed(3)).join(',')
    if (seen.has(key)) continue
    seen.add(key)
    if (distance(candidate, origin) < rules.minHomeSpacing) continue
    if (disturbanceAt(state.habitat, candidate) >= rules.quietLevel) continue
    if (!isValidHome(world, candidate, claimed)) continue
    surface.push({ home: candidate, burrowId: null })
  }
  const score = (destination: Destination) => homePreferenceScore(destination.home, origin, claimed) + (destination.burrowId ? rules.burrowBonus : 0)
  const ordered = [...burrows, ...surface].sort((a, b) => score(b) - score(a)
    || distance(a.home, origin) - distance(b.home, origin)
    || a.home[0] - b.home[0] || a.home[1] - b.home[1] || a.home[2] - b.home[2])
  if (!wander) {
    const nearby = ordered.filter(destination => distance(destination.home, origin) <= rules.search.radius)
    return nearby.length ? nearby : ordered
  }
  const hole = ordered.find(destination => destination.burrowId && distance(destination.home, origin) <= rules.search.radius)
  if (hole) return [hole]
  const stroll = ordered.filter(destination => !destination.burrowId && distance(destination.home, origin) <= rules.search.radius)
  if (!stroll.length) return []
  const turn = hashSeed(`${resident.id}:${state.habitat.tick}:wander`) % stroll.length
  return [stroll[turn]]
}

function nearestHome(world: World, state: RunState, resident: Resident, residents: Resident[], wander = false) {
  for (const destination of destinations(world, state, resident, residents, wander)) {
    const path = routeTo(world, state.seed, resident.position, destination.home, destination.burrowId, resident.burrowId)
    if (path) return { ...destination, path }
  }
  return null
}

function moveToward(position: Vec3, target: Vec3) {
  const gap = distance(position, target)
  if (gap <= rules.speed) return { position: target, arrived: true }
  return { position: add(position, scale(add(target, scale(position, -1)), rules.speed / gap)), arrived: false }
}

function beginSearch(world: World, state: RunState, resident: Resident, residents: Resident[], wander = false) {
  const found = nearestHome(world, state, resident, residents, wander)
  if (found) return { ...resident, home: found.home, burrowId: found.burrowId, homeValid: true, path: found.path, state: 'moving' as const, searchRetries: 0 }
  if (wander) return resident
  const ground = surfacePoint(world, resident.home ?? resident.position)
  return { ...resident, home: null, burrowId: null, homeValid: false, peek: null, path: [],
    position: add(ground, scale(unit(ground), rules.surfaceLift)), state: 'searching' as const,
    searchRetries: Math.min(rules.maxSearchRetries, resident.searchRetries + 1),
    nextCheck: state.habitat.tick + rules.searchRetryTicks }
}

function stepResident(world: World, state: RunState, resident: Resident, residents: Resident[]): Resident {
  let r = { ...resident, path: [...resident.path] }
  const tick = state.habitat.tick
  if (r.state === 'moving') {
    const target = r.path[0]
    if (!target) return { ...r, state: 'hiding', position: poseFor(state.seed, r, 'hiding'), quietTicks: 0, nextWander: tick + rules.wanderEvery }
    const step = moveToward(r.position, target)
    r.position = step.position
    if (step.arrived) r.path = r.path.slice(1)
    if (r.path.length === 0) {
      r.state = 'hiding'; r.position = poseFor(state.seed, r, 'hiding'); r.quietTicks = 0; r.disturbedTicks = 0
      r.lastMoveTick = tick; r.nextCheck = tick; r.nextWander = tick + rules.wanderEvery
    }
    return r
  }

  const here = r.home ?? r.position
  const level = disturbanceAt(state.habitat, here)
  r.disturbedTicks = level > rules.retreatLevel ? r.disturbedTicks + 1 : Math.max(0, r.disturbedTicks - 2)
  r.quietTicks = level < rules.quietLevel ? r.quietTicks + 1 : 0
  const due = tick >= r.nextCheck
  if (r.state === 'searching') {
    if (!due || r.searchRetries >= rules.maxSearchRetries) return r
    return beginSearch(world, state, r, residents)
  }
  if (due) {
    r.nextCheck = tick + rules.checkEvery
    const occupied = residents.filter(other => other.id !== r.id && other.home).map(other => other.home!)
    const burrow = findBurrow(state.seed, r.burrowId)
    r.homeValid = burrow ? burrowOpen(world, burrow) : !!r.home && isValidHome(world, r.home, occupied)
    if (!r.homeValid) return beginSearch(world, state, r, residents)
  }
  // Leave ongoing work instead of waiting in place. A taken burrow stays taken.
  if (r.disturbedTicks >= rules.fleeTicks && tick - r.lastMoveTick >= rules.cooldownTicks) {
    return beginSearch(world, state, r, residents)
  }
  if (!r.burrowId && r.state === 'peeking' && r.disturbedTicks === 0 && tick >= r.nextWander) {
    r.nextWander = tick + rules.wanderEvery
    const strolling = beginSearch(world, state, r, residents, true)
    if (strolling !== r) return strolling
  }
  if (level > rules.retreatLevel) r.state = 'hiding'
  else if (r.state === 'hiding' && r.quietTicks >= rules.quietTicks) r.state = 'peeking'
  if (r.home) {
    const pose = r.state === 'hiding' || r.state === 'peeking' ? r.state : 'peeking'
    r.peek = poseFor(state.seed, r, 'peeking')
    r.position = moveToward(r.position, poseFor(state.seed, r, pose)).position
  }
  return r
}

export function stepResidents(world: World, store: Store) {
  const state = store.getState()
  const tick = state.habitat.tick + 1
  const sources = state.habitat.sources.map(source => ({ ...source, level: source.level * rules.disturbance.decay }))
    .filter(source => source.level > 0.01)
  const next = { ...state, habitat: { ...state.habitat, tick, sources } }
  const residents: Resident[] = []
  for (const resident of state.residents) {
    residents.push(stepResident(world, next, resident, [...residents, ...state.residents.slice(residents.length + 1)]))
  }
  store.setState({ habitat: next.habitat, residents })
}

// D-046: removed support ejects a sunk resident; added terrain carries it outward to the new surface.
export function reconcileResidentsAfterGroundChange(world: World, store: Store, center: Vec3, radius: number) {
  const current = store.getState().residents
  const occupiedFor = (id: string) => current.filter(other => other.id !== id && other.home).map(other => other.home!)
  const seed = store.getState().seed
  const residents = current.map(resident => {
    const anchor = resident.home ?? resident.position
    if (distance(anchor, center) > radius + rules.bodyRadius * resident.size) return resident
    if (resident.burrowId) {
      const burrow = findBurrow(seed, resident.burrowId)
      if (burrow && burrowOpen(world, burrow)) return resident
      const opening = surfacePoint(world, anchor)
      return { ...resident, burrowId: null, home: null, homeValid: false, peek: null, path: [], state: 'searching' as const,
        position: add(opening, scale(unit(opening), rules.surfaceLift)), searchRetries: 0,
        nextCheck: store.getState().habitat.tick }
    }
    const surface = surfacePoint(world, anchor)
    const delta = Math.hypot(...surface) - Math.hypot(...anchor)
    if (resident.home && delta > STEP / 4 && isValidHome(world, surface, occupiedFor(resident.id))) {
      const state = resident.state === 'peeking' ? 'peeking' : 'hiding'
      return { ...resident, home: surface, homeValid: true, peek: poseAt(surface, 'peeking'),
        position: poseAt(surface, state), searchRetries: 0 }
    }
    if (!resident.home || delta < -STEP / 4 || !isValidHome(world, resident.home, occupiedFor(resident.id))) {
      return { ...resident, home: null, homeValid: false, peek: null, path: [], state: 'searching' as const,
        position: add(surface, scale(unit(surface), rules.surfaceLift)), searchRetries: 0,
        nextCheck: store.getState().habitat.tick }
    }
    return resident.state === 'searching'
      ? { ...resident, searchRetries: 0, nextCheck: store.getState().habitat.tick }
      : resident
  })
  if (residents.some((resident, index) => resident !== current[index])) store.setState({ residents })
}

export function residentSummary(residents: Resident[]) {
  return {
    total: residents.length,
    peeking: residents.filter(resident => resident.state === 'peeking').length,
    hiding: residents.filter(resident => resident.state === 'hiding').length,
    moving: residents.filter(resident => resident.state === 'moving').length,
    searching: residents.filter(resident => resident.state === 'searching').length,
  }
}
