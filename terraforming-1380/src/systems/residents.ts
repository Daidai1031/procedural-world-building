import { tuning } from '../config/tuning'
import type { RunState, createRunStore } from '../state/runState'
import { burrowSites, type PlanetWorld } from '../world/planet'
import { HALF, add, distance, dot, scale, unit, type Vec3 } from './geometry'
import { groundRadius } from './exploration'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'

type Store = ReturnType<typeof createRunStore>
type World = Pick<PlanetWorld, 'densityAt'>
const rules = tuning.residents

// D-042: calm residents peek from the mouth; disturbed ones hide deep inside; sustained trouble sends them searching.
export type ResidentState = 'peeking' | 'hiding' | 'moving' | 'waiting'
export interface Resident {
  id: string
  // Seeded variation of one species: body scale only.
  size: number
  home: Vec3 | null
  // Where the body is now, and the point it is heading for inside or along its route.
  position: Vec3
  state: ResidentState
  path: Vec3[]
  // Refreshed by the periodic home check (HAB-03), not every tick.
  homeValid: boolean
  peek: Vec3 | null
  quietTicks: number
  disturbedTicks: number
  lastMoveTick: number
  nextCheck: number
}

export interface DisturbanceSource { position: Vec3; level: number }
export interface HabitatState {
  tick: number
  sources: DisturbanceSource[]
  // RES-05: recent excavation points that may have become cavities; validity is always recomputed from density.
  candidates: Vec3[]
}

const density = (world: World, p: Vec3) => world.densityAt(p[0], p[1] + HALF, p[2])
const inside = (p: Vec3) => Math.abs(p[0]) < HALF - 0.1 && Math.abs(p[1]) < HALF - 0.1 && Math.abs(p[2]) < HALF - 0.1
const solid = (world: World, p: Vec3) => !inside(p) ? false : density(world, p) < 0

const RAYS: Vec3[] = []
for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) if (x || y || z) RAYS.push(unit([x, y, z]))

// An open point from which a straight climb outward never meets rock: the outside of the planet.
function skyVisible(world: World, p: Vec3) {
  const up = unit(p)
  for (let r = Math.hypot(...p); r < HALF - 0.15; r += 0.04) if (solid(world, scale(up, r))) return false
  return true
}

const STEP = VOXEL_WORLD_SIZE / (tuning.grid.resolution - 1)
const NEIGHBOURS: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
function reachSky(world: World, start: Vec3) {
  const { accessReach, accessNodes } = rules.shelter
  const seen = new Set<string>(['0,0,0'])
  const queue: [number, number, number][] = [[0, 0, 0]]
  const parent: number[] = [-1]
  for (let head = 0; head < queue.length && head < accessNodes; head++) {
    const cell = queue[head]
    const point = add(start, scale(cell, STEP))
    if (head > 0 && skyVisible(world, point)) {
      // The open-space path from the home to the mouth, through neighbouring samples only.
      const route: Vec3[] = []
      for (let i = head; i > 0; i = parent[i]) route.unshift(add(start, scale(queue[i], STEP)))
      return route
    }
    for (const n of NEIGHBOURS) {
      const next: [number, number, number] = [cell[0] + n[0], cell[1] + n[1], cell[2] + n[2]]
      const key = next.join(',')
      if (seen.has(key)) continue
      seen.add(key)
      const q = add(start, scale(next, STEP))
      if (Math.hypot(...next) * STEP > accessReach || !inside(q) || solid(world, q)) continue
      queue.push(next)
      parent.push(head)
    }
  }
  return null
}

export interface Shelter { valid: boolean; enclosure: number; mouth: Vec3 | null; route: Vec3[]; reason: 'ok' | 'cramped' | 'exposed' | 'sealed' }

// HAB-01/03: judged from the current density every time, so an edit that opens, fills or blocks a cavity changes the answer.
export function shelterAt(world: World, p: Vec3): Shelter {
  const s = rules.shelter
  if (!inside(p) || density(world, p) < s.clearance) return { valid: false, enclosure: 0, mouth: null, route: [], reason: 'cramped' }
  let hits = 0
  const open: Vec3[] = []
  for (const ray of RAYS) {
    let hit = false
    for (let t = s.rayStep; t <= s.rayLength; t += s.rayStep) if (solid(world, add(p, scale(ray, t)))) { hit = true; break }
    if (hit) hits += 1
    else open.push(ray)
  }
  const enclosure = hits / RAYS.length
  if (enclosure < s.minEnclosure) return { valid: false, enclosure, mouth: null, route: [], reason: 'exposed' }
  // The entrance must lead outside through open space: a bounded flood fill over empty samples, nearest first,
  // until it reaches a point with open sky above. The fill never passes through rock, so this is real reachability.
  const route = reachSky(world, p)
  if (route) return { valid: true, enclosure, mouth: route[route.length - 1], route, reason: 'ok' }
  return { valid: false, enclosure, mouth: null, route: [], reason: 'sealed' }
}

// HAB-02: local disturbance at a point, from every fading source.
export function disturbanceAt(habitat: HabitatState, p: Vec3) {
  let total = 0
  for (const source of habitat.sources) {
    const f = Math.max(0, 1 - distance(source.position, p) / rules.disturbance.radius)
    total += source.level * f * f
  }
  return total
}

// HAB-02, RES-05: manual and robot terrain work report here. Nearby sources merge so a working robot builds up a level.
export function recordDisturbance(store: Store, position: Vec3, kind: 'manual' | 'robot', excavated: boolean) {
  const d = rules.disturbance
  store.setState(state => {
    const habitat = state.habitat
    const sources = habitat.sources.map(s => ({ ...s }))
    const near = sources.find(s => distance(s.position, position) < d.merge)
    const amount = kind === 'manual' ? d.manual : d.robot
    if (near) near.level = Math.min(d.cap, near.level + amount)
    else sources.push({ position, level: Math.min(d.cap, amount) })
    let candidates = habitat.candidates
    if (excavated && !candidates.some(c => distance(c, position) < rules.search.candidateMerge)) {
      candidates = [...candidates, position].slice(-rules.search.candidateLimit)
    }
    return { habitat: { ...habitat, sources: sources.sort((a, b) => b.level - a.level).slice(0, d.maxSources), candidates } }
  })
}

// RES-01: each group leaves its last burrows empty, so a disturbed resident has somewhere to go without player digging.
export function spawnResidents(seed: string): Resident[] {
  return burrowSites(seed).filter(burrow => Number(burrow.id.split('-')[2]) < rules.burrows.occupiedPerGroup).map((burrow, index) => ({
    id: `resident-${index}`, size: 0.85 + ((index * 37) % 10) / 30, home: burrow.pocket, position: burrow.pocket,
    state: 'peeking', path: [], homeValid: true, peek: null, quietTicks: 0, disturbedTicks: 0, lastMoveTick: -Infinity, nextCheck: index % rules.checkEvery,
  }))
}

// Where a calm resident sits: just inside the mouth, so its head shows at the opening.
export function peekPoint(world: World, home: Vec3) {
  const shelter = shelterAt(world, home)
  if (!shelter.mouth) return home
  const back = unit(add(home, scale(shelter.mouth, -1)))
  return add(shelter.mouth, scale(back, 0.05))
}

// A walk that never crosses rock: home → mouth → over the ground → the new mouth → the new home.
function routeBetween(world: World, from: Vec3, fromRoute: Vec3[], to: Vec3, toRoute: Vec3[]): Vec3[] | null {
  const points: Vec3[] = [...fromRoute]
  const fromMouth = fromRoute[fromRoute.length - 1] ?? from, toMouth = toRoute[toRoute.length - 1]
  const a = unit(fromMouth), b = unit(toMouth)
  const angle = Math.acos(Math.max(-1, Math.min(1, dot(a, b))))
  const steps = Math.max(1, Math.ceil(angle * 2.2 / rules.pathStep))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const sin = Math.sin(angle)
    const dir = sin < 1e-4 ? a : unit(add(scale(a, Math.sin((1 - t) * angle) / sin), scale(b, Math.sin(t * angle) / sin)))
    const ground = groundRadius(world, dir)
    if (!ground) return null
    points.push(scale(dir, ground + rules.surfaceLift))
  }
  points.push(...[...toRoute].reverse(), to)
  let previous = from
  for (const point of points) {
    const length = distance(previous, point)
    for (let t = 0; t <= length; t += 0.04) {
      const q = add(previous, scale(add(point, scale(previous, -1)), length ? t / length : 0))
      // Grazing a wall rounds to a solid sample; only half a sample spacing into rock counts as passing through it.
      if (inside(q) && density(world, q) < -STEP / 2) return null
    }
    previous = point
  }
  return points
}

function companionsNear(residents: Resident[], self: string, p: Vec3) {
  return residents.filter(r => r.id !== self && r.home && distance(r.home, p) < rules.companionRadius).length
}

function homeScore(world: World, habitat: HabitatState, residents: Resident[], self: string, p: Vec3, origin: Vec3) {
  const shelter = shelterAt(world, p)
  if (!shelter.valid) return null
  return { shelter, score: shelter.enclosure + companionsNear(residents, self, p) * rules.companionBonus
    - disturbanceAt(habitat, p) - distance(origin, p) * rules.distanceCost }
}

// RES-04/05/06: a bounded search over seeded burrows and recent excavations near the resident.
function search(world: World, state: RunState, resident: Resident, residents: Resident[]) {
  const origin = resident.home ?? resident.position
  const claimed = residents.filter(r => r.id !== resident.id && r.home).map(r => r.home!)
  const pool = [...burrowSites(state.seed).map(b => b.pocket), ...state.habitat.candidates]
    .filter(p => distance(p, origin) < rules.search.radius)
    .filter(p => !claimed.some(c => distance(c, p) < rules.search.occupiedRadius))
    .filter(p => !resident.home || distance(p, resident.home) > rules.search.occupiedRadius)
    .filter(p => disturbanceAt(state.habitat, p) < rules.quietLevel)
  const current = resident.home ? homeScore(world, state.habitat, residents, resident.id, resident.home, origin) : null
  let best: { point: Vec3; score: number; route: Vec3[] } | null = null
  for (const point of pool) {
    const result = homeScore(world, state.habitat, residents, resident.id, point, origin)
    if (!result) continue
    // Stable tie-break: earlier entries in the pool win equal scores.
    if (!best || result.score > best.score + 1e-9) best = { point, score: result.score, route: result.shelter.route }
  }
  if (!best) return null
  if (current && best.score < current.score + rules.advantage) return null
  // From inside a valid home, walk its own tunnel out; a waiting resident is already on the ground.
  const currentShelter = resident.home && resident.state !== 'waiting' ? shelterAt(world, resident.home) : null
  const path = routeBetween(world, resident.position, currentShelter?.valid ? currentShelter.route : [], best.point, best.route)
  return path ? { home: best.point, path } : null
}

function moveToward(position: Vec3, target: Vec3) {
  const gap = distance(position, target)
  if (gap <= rules.speed) return { position: target, arrived: true }
  return { position: add(position, scale(add(target, scale(position, -1)), rules.speed / gap)), arrived: false }
}

function stepResident(world: World, state: RunState, resident: Resident, residents: Resident[]): Resident {
  const r = { ...resident }
  const tick = state.habitat.tick
  if (r.state === 'moving') {
    const target = r.path[0]
    const step = moveToward(r.position, target)
    r.position = step.position
    if (step.arrived) r.path = r.path.slice(1)
    if (r.path.length === 0) { r.state = 'hiding'; r.quietTicks = 0; r.disturbedTicks = 0; r.lastMoveTick = tick; r.nextCheck = tick }
    return r
  }
  const here = r.home ?? r.position
  const level = disturbanceAt(state.habitat, here)
  r.disturbedTicks = level > rules.retreatLevel ? r.disturbedTicks + 1 : Math.max(0, r.disturbedTicks - 2)
  r.quietTicks = level < rules.quietLevel ? r.quietTicks + 1 : 0

  const due = tick >= r.nextCheck
  if (due) {
    r.nextCheck = tick + rules.checkEvery
    r.homeValid = r.home ? shelterAt(world, r.home).valid : false
    r.peek = r.home && r.homeValid ? peekPoint(world, r.home) : null
  }
  const homeValid = r.homeValid
  const cooled = tick - r.lastMoveTick >= rules.cooldownTicks
  // RES-04/07: no home, a lost home, sustained trouble, or (RES-05) an occasional look at better cavities after quiet.
  const wantsMove = r.state === 'waiting' ? due && tick % rules.waitRetry < rules.checkEvery
    : !homeValid ? due
    : r.disturbedTicks > rules.sustainedTicks ? due && cooled
    : r.state === 'peeking' && cooled && (tick + Number(r.id.split('-')[1]) * 41) % rules.reconsiderEvery === 0
  if (wantsMove) {
    const found = search(world, state, r, residents)
    if (found) {
      r.home = found.home
      r.path = found.path
      r.state = 'moving'
      return r
    }
    if (!homeValid) {
      // RES-07: stay visible on the ground near the lost home and keep looking.
      if (r.state !== 'waiting') {
        const dir = unit(r.home ?? r.position)
        r.position = scale(dir, (groundRadius(world, dir) || Math.hypot(...r.position)) + rules.surfaceLift)
        r.home = null
        r.peek = null
        r.state = 'waiting'
      }
      return r
    }
  }
  if (r.state === 'waiting') return r
  // RES-03: retreat at once when disturbed, return to the mouth only after a stretch of quiet.
  if (level > rules.retreatLevel) r.state = 'hiding'
  else if (r.state === 'hiding' && r.quietTicks >= rules.quietTicks) r.state = 'peeking'
  const target = r.state === 'peeking' && r.peek ? r.peek : r.home!
  r.position = moveToward(r.position, target).position
  return r
}

// One fixed resident step: fade disturbance, then update every resident in stable order.
export function stepResidents(world: World, store: Store) {
  const state = store.getState()
  const tick = state.habitat.tick + 1
  const sources = state.habitat.sources
    .map(s => ({ ...s, level: s.level * rules.disturbance.decay }))
    .filter(s => s.level > 0.01)
  const next = { ...state, habitat: { ...state.habitat, tick, sources } }
  const residents: Resident[] = []
  for (const resident of state.residents) {
    // Earlier residents' new homes count as claimed for later ones in the same step (RES-06).
    residents.push(stepResident(world, next, resident, [...residents, ...state.residents.slice(residents.length + 1)]))
  }
  store.setState({ habitat: next.habitat, residents })
}

export function residentSummary(residents: Resident[]) {
  return {
    total: residents.length,
    peeking: residents.filter(r => r.state === 'peeking').length,
    hiding: residents.filter(r => r.state === 'hiding').length,
    moving: residents.filter(r => r.state === 'moving').length,
    waiting: residents.filter(r => r.state === 'waiting').length,
  }
}
