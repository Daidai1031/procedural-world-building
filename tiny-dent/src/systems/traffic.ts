import type { RunState, createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { buildNav, findPath, nearestNode, refreshNav, type NavEdge, type NavGraph } from '../graph/surfaceGraph'
import { hashSeed, planetConfig, type PlanetWorld } from '../world/planet'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { distance, type Vec3 } from './geometry'
import { coloniesOf } from './migration'
import { disturbanceAt } from './residents'
import { isAquatic } from './water'

type Store = ReturnType<typeof createRunStore>
type World = Pick<PlanetWorld, 'densityAt'> & Partial<Pick<PlanetWorld, 'waterRadius'>>
const rules = tuning.traffic

// D-070: what the planet remembers of how it is walked. The graph itself is derived from terrain and is never stored.
export interface Trip { id: number; from: number; to: number; nodes: number[]; at: number; wait: number; rerouted: number }
export interface Reroute { edge: string; tick: number; why: 'blocked' | 'no-way' }
export interface NavState {
  /** Traffic heat per edge id: +1 per crossing, decaying slowly. Only edges with heat are listed. */
  heat: Record<string, number>
  /** Crossings ever made per edge id. */
  uses: Record<string, number>
  /** Edge ids the Builder has upgraded, sorted. */
  roads: string[]
  trips: Trip[]
  nextTrip: number
  cursor: number
  /** The last few times a terrain edit changed a journey. */
  reroutes: Reroute[]
  finished: number
}
export const emptyNav = (): NavState => ({ heat: {}, uses: {}, roads: [], trips: [], nextTrip: 1, cursor: 0, reroutes: [], finished: 0 })

// Only ground walkers leave heat (RDS-07). Hovering robots and underground residents have their own ways and never touch it.
export type Mover = 'ground' | 'air' | 'burrow'
export const leavesHeat = (mover: Mover) => mover === 'ground'

// Where each walking resident was last seen on the graph, so a crossing is counted once. The graph is derived, so this is too.
const lastNode = new WeakMap<NavGraph, Map<string, number>>()

// One graph per world, built the first time something needs it and then only refreshed locally.
const graphs = new WeakMap<object, NavGraph>()
export function navGraph(world: World, seed: string): NavGraph {
  let graph = graphs.get(world)
  if (!graph) { graph = buildNav(world, planetConfig(seed).radius * VOXEL_WORLD_SIZE); graphs.set(world, graph) }
  return graph
}
export const hasNavGraph = (world: object) => graphs.has(world)

/** How much cheaper a road makes an edge on this planet's material. Ice melts and jelly shifts, so they help less. */
export const roadFactorOf = (seed: string) => tuning.roads.factor[planetConfig(seed).surface]
const FLOOR = Math.min(...Object.values(tuning.roads.factor))

// The price of crossing an edge for a walker: length, steeper ground, nearby disturbance, less on a road; blocked is Infinity.
export function edgeCost(state: Pick<RunState, 'seed' | 'habitat'>, roads: ReadonlySet<string>, edge: NavEdge) {
  if (!edge.passable) return Infinity
  const slope = 1 + rules.slopeCost * Math.min(edge.slope, rules.maxSlope)
  const hazard = rules.hazardCost * disturbanceAt(state.habitat, edge.mid)
  return edge.len * (slope + hazard) * (roads.has(edge.id) ? roadFactorOf(state.seed) : 1)
}

export interface Service { kind: 'port' | 'colony' | 'mine' | 'site'; node: number }

// Places creatures and crews have a reason to go between: the spaceport, colonies, mines (a Miner's work area) and
// construction sites (patches). Each is the nearest valid node.
export function serviceNodes(graph: NavGraph, state: RunState): Service[] {
  const out: Service[] = []
  const add = (kind: Service['kind'], point: Vec3) => {
    const node = nearestNode(graph, point)
    if (node >= 0 && !out.some(s => s.node === node)) out.push({ kind, node })
  }
  if (state.spaceport) {
    const h = hashSeed(`${state.seed}:spaceport`)
    const angle = (h % 6283) / 1000, y = ((h >>> 12) % 1000) / 500 - 1
    const ring = Math.sqrt(1 - y * y)
    add('port', [Math.cos(angle) * ring, y, Math.sin(angle) * ring])
  }
  // Swimmers do not walk, so their colonies send nobody along the ground (RDS-07).
  for (const colony of coloniesOf(state.residents.filter(r => !isAquatic(r.species)))) add('colony', colony.centre)
  for (const robot of state.robots) if (robot.area && ['scanning', 'moving', 'digging', 'collecting'].includes(robot.phase)) add('mine', robot.area.center)
  for (const patch of state.patches) add('site', patch.centre)
  return out
}

// Everything goes to and from the spaceport when there is one; without it colonies visit mines and sites.
export function servicePairs(services: readonly Service[]): [Service, Service][] {
  const hub = services.find(s => s.kind === 'port')
  const pairs: [Service, Service][] = []
  if (hub) { for (const s of services) if (s !== hub) pairs.push([hub, s]) } else {
    for (const c of services.filter(s => s.kind === 'colony')) for (const s of services) if (s.kind !== 'colony') pairs.push([c, s])
  }
  return pairs.sort((p, q) => p[1].node - q[1].node || p[0].node - q[0].node)
}

export function routeFor(state: RunState, graph: NavGraph, from: number, to: number) {
  const roads = new Set(state.nav.roads)
  return findPath(graph, from, to, edge => edgeCost(state, roads, edge), roadFactorOf(state.seed) < 1 ? FLOOR : 1)
}

const bump = (map: Record<string, number>, id: string, by: number, cap = Infinity) => ({ ...map, [id]: Math.min(cap, (map[id] ?? 0) + by) })

// RDS-03: one tick of traffic. New errands start on a rhythm, walkers cross one edge per its cost, each crossing adds heat,
// and heat fades by a fixed factor every interval. Nothing here draws or builds; roads come from the Builder (RDS-04).
export function stepTraffic(world: World, store: Store) {
  const state = store.getState()
  const tick = state.habitat.tick
  let nav = state.nav
  const hasHeat = Object.keys(nav.heat).length > 0
  const walking = state.residents.filter(r => r.state === 'moving' && !isAquatic(r.species))
  const busy = nav.trips.length > 0 || hasHeat || walking.length > 0
  if (!busy && tick % rules.spawnEvery !== 0) return
  // Build the graph only when there is somewhere to go (a spaceport, a patch or a mine); other planets cost nothing.
  const somewhere = state.spaceport || state.patches.length > 0 || state.robots.some(r => r.area && ['scanning', 'moving', 'digging', 'collecting'].includes(r.phase))
  if (!busy && !hasNavGraph(world) && !somewhere) return
  const graph = navGraph(world, state.seed)
  const roads = new Set(nav.roads)
  const price = (edge: NavEdge) => edgeCost(state, roads, edge)
  const floor = roadFactorOf(state.seed) < 1 ? FLOOR : 1
  const wornRoads: string[] = []

  if (tick % rules.spawnEvery === 0 && nav.trips.length < rules.maxTrips) {
    const pairs = servicePairs(serviceNodes(graph, state))
    if (pairs.length) {
      const [from, to] = pairs[nav.cursor % pairs.length]
      const forward = Math.floor(nav.cursor / pairs.length) % 2 === 0
      const [a, b] = forward ? [from.node, to.node] : [to.node, from.node]
      const path = findPath(graph, a, b, price, floor)
      nav = { ...nav, cursor: nav.cursor + 1 }
      if (path && path.nodes.length > 1) nav = { ...nav, trips: [...nav.trips, { id: nav.nextTrip, from: a, to: b, nodes: path.nodes, at: 0, wait: 0, rerouted: 0 }], nextTrip: nav.nextTrip + 1 }
    }
  }

  let heat = nav.heat, uses = nav.uses, reroutes = nav.reroutes, finished = nav.finished
  const trips: Trip[] = []
  // D-075: one crossing of an edge, by an errand or by a resident on foot. Enough of them wear the edge into a road.
  const cross = (id: string) => {
    if ((heat[id] ?? 0) < rules.roadAt && (heat[id] ?? 0) + 1 >= rules.roadAt && !roads.has(id)) { roads.add(id); wornRoads.push(id) }
    heat = bump(heat, id, 1, rules.heatCap)
    uses = bump(uses, id, 1)
  }
  for (const source of nav.trips) {
    const trip = { ...source }
    if (trip.wait > 0) { trip.wait -= 1; trips.push(trip); continue }
    if (trip.at >= trip.nodes.length - 1) { finished += 1; continue }
    const edge = graph.edges[graph.byId.get(edgeId(trip.nodes[trip.at], trip.nodes[trip.at + 1]))!]
    if (!edge.passable) {
      const path = findPath(graph, trip.nodes[trip.at], trip.to, price, floor)
      reroutes = [...reroutes, { edge: edge.id, tick, why: path ? 'blocked' as const : 'no-way' as const }].slice(-rules.rerouteLog)
      if (!path) continue
      trip.nodes = path.nodes; trip.at = 0; trip.rerouted += 1
      trips.push(trip)
      continue
    }
    cross(edge.id)
    trip.wait = Math.max(0, Math.ceil(price(edge) / rules.walkSpeed) - 1)
    trip.at += 1
    trips.push(trip)
  }
  // D-075: residents walking to a new home wear the ground they cross, like any errand.
  const seen = lastNode.get(graph) ?? new Map<string, number>()
  lastNode.set(graph, seen)
  for (const resident of walking) {
    const node = nearestNode(graph, resident.position)
    const before = seen.get(resident.id)
    seen.set(resident.id, node)
    const id = before === undefined || before === node || node < 0 ? undefined : edgeId(before, node)
    if (id && graph.edges[graph.byId.get(id) ?? -1]?.passable) cross(id)
  }
  for (const id of [...seen.keys()]) if (!walking.some(r => r.id === id)) seen.delete(id)
  if (tick % rules.decayEvery === 0 && Object.keys(heat).length) {
    const next: Record<string, number> = {}
    for (const [id, value] of Object.entries(heat)) if (value * rules.decay >= rules.heatFloor) next[id] = value * rules.decay
    heat = next
  }
  if (trips.length || nav.trips.length || heat !== state.nav.heat || nav !== state.nav) {
    store.setState({ nav: { ...nav, roads: wornRoads.length ? [...nav.roads, ...wornRoads].sort() : nav.roads, trips, heat, uses, reroutes, finished } })
  }
}

// D-075: the points of a walk that follows worn roads, or null when the straight walk is as good. A resident only turns
// toward a road that is close to where it starts and where it is going, and never takes one that is a long way round.
export function roadRoute(world: World, state: RunState, from: Vec3, to: Vec3): Vec3[] | null {
  if (state.nav.roads.length === 0) return null
  const graph = navGraph(world, state.seed)
  const a = nearestNode(graph, from), b = nearestNode(graph, to)
  if (a < 0 || b < 0 || a === b) return null
  if (distance(from, graph.nodes[a].pos) > rules.roadReach || distance(to, graph.nodes[b].pos) > rules.roadReach) return null
  const path = routeFor(state, graph, a, b)
  if (!path) return null
  const roads = new Set(state.nav.roads)
  let onRoad = 0, length = distance(from, graph.nodes[a].pos) + distance(graph.nodes[b].pos, to)
  for (let i = 1; i < path.nodes.length; i += 1) {
    const edge = graph.edges[graph.byId.get(edgeId(path.nodes[i - 1], path.nodes[i]))!]
    length += edge.len
    if (roads.has(edge.id)) onRoad += 1
  }
  if (onRoad === 0 || length > distance(from, to) * rules.roadDetour) return null
  return path.nodes.map(n => graph.nodes[n].pos)
}

export const edgeId = (a: number, b: number) => a < b ? `${a}-${b}` : `${b}-${a}`

// RDS-06: a terrain edit re-reads only the ground it touched. A walker whose way ahead is now blocked turns around at once
// and looks for another, within the same search budget; the edit and the turn are written to the log.
export function refreshTraffic(world: World, store: Store, centre: Vec3, reach: number) {
  const graph = graphs.get(world)
  if (!graph) return
  const changed = refreshNav(graph, world, centre, reach)
  if (changed.length === 0) return
  const state = store.getState()
  const roads = new Set(state.nav.roads)
  const price = (edge: NavEdge) => edgeCost(state, roads, edge)
  const floor = roadFactorOf(state.seed) < 1 ? FLOOR : 1
  let reroutes = state.nav.reroutes
  const trips = state.nav.trips.flatMap(trip => {
    for (let i = trip.at; i < trip.nodes.length - 1; i += 1) {
      const id = edgeId(trip.nodes[i], trip.nodes[i + 1])
      if (!changed.includes(id) || graph.edges[graph.byId.get(id)!].passable) continue
      const path = findPath(graph, trip.nodes[trip.at], trip.to, price, floor)
      reroutes = [...reroutes, { edge: id, tick: state.habitat.tick, why: path ? 'blocked' as const : 'no-way' as const }].slice(-rules.rerouteLog)
      return path ? [{ ...trip, nodes: path.nodes, at: 0, rerouted: trip.rerouted + 1 }] : []
    }
    return [trip]
  })
  store.setState({ nav: { ...state.nav, trips, reroutes } })
}

export type EdgeKind = 'road' | 'path' | 'trail' | 'none'
// RDS-10: why an edge looks the way it does, in numbers a card can print.
export function edgeInfo(state: RunState, graph: NavGraph, id: string) {
  const edge = graph.edges[graph.byId.get(id) ?? -1]
  if (!edge) return null
  const heat = state.nav.heat[id] ?? 0
  const road = state.nav.roads.includes(id)
  const roads = new Set(state.nav.roads)
  const kind: EdgeKind = road ? 'road' : heat >= rules.pathAt ? 'path' : heat > 0 ? 'trail' : 'none'
  return {
    id, kind, heat, uses: state.nav.uses[id] ?? 0, blocked: !edge.passable, cost: edgeCost(state, roads, edge), plainCost: edgeCost(state, new Set(), edge),
    pathAt: rules.pathAt, roadAt: rules.roadAt, reroutes: state.nav.reroutes.filter(r => r.edge === id),
  }
}
