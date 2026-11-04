import { tuning } from '../config/tuning'
import { distance, scale, surfaceRadius, unit, type Vec3 } from '../systems/geometry'

// D-070: a sampled navigation graph of one planet's ground. Nodes sit on a fixed spiral of directions, so their count and
// order depend only on the planet's size; their heights follow the terrain. Edges join near neighbours and carry what a
// walker needs to price them. No React, no three.js: it is built, refreshed and searched in node tests.
type DensityAt = (x: number, y: number, z: number) => number
type World = { densityAt: DensityAt; waterRadius?: number }

export interface NavNode { dir: Vec3; pos: Vec3; valid: boolean }
export interface NavEdge {
  id: string
  a: number
  b: number
  len: number
  /** Rise over run between the two ends. */
  slope: number
  /** False when an end has no ground or the slope is a cliff. */
  passable: boolean
  mid: Vec3
}
export interface NavGraph {
  nodes: NavNode[]
  edges: NavEdge[]
  /** Edge indices touching each node. */
  around: number[][]
  byId: Map<string, number>
}

const rules = tuning.traffic
const GOLDEN = 2.399963229728653
const MIN_GROUND = 0.5

export const nodeCountFor = (baseRadius: number) =>
  Math.max(60, Math.min(rules.maxNodes, Math.round(4 * Math.PI * baseRadius * baseRadius / (rules.spacing * rules.spacing))))

function placeNode(world: World, node: NavNode) {
  const r = surfaceRadius(world.densityAt, node.dir)
  // D-073: on an ocean only dry ground can be walked.
  const wet = world.waterRadius ?? 0
  node.valid = r > MIN_GROUND && (wet === 0 || r > wet + tuning.water.dry)
  node.pos = scale(node.dir, r)
}

function measureEdge(graph: NavGraph, edge: NavEdge) {
  const a = graph.nodes[edge.a], b = graph.nodes[edge.b]
  const ra = Math.hypot(...a.pos), rb = Math.hypot(...b.pos)
  edge.len = distance(a.pos, b.pos)
  const rise = Math.abs(ra - rb)
  edge.slope = rise / Math.max(Math.sqrt(Math.max(edge.len * edge.len - rise * rise, 0)), 1e-6)
  edge.passable = a.valid && b.valid && edge.slope <= rules.maxSlope
  edge.mid = scale(unit([a.pos[0] + b.pos[0], a.pos[1] + b.pos[1], a.pos[2] + b.pos[2]]), (ra + rb) / 2)
}

// MIG/RDS-01: deterministic from the planet's size and its terrain alone.
export function buildNav(world: World, baseRadius: number): NavGraph {
  const count = nodeCountFor(baseRadius)
  const nodes: NavNode[] = []
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (2 * i + 1) / count
    const ring = Math.sqrt(1 - y * y)
    const angle = i * GOLDEN
    const node: NavNode = { dir: [Math.cos(angle) * ring, y, Math.sin(angle) * ring], pos: [0, 0, 0], valid: true }
    placeNode(world, node)
    nodes.push(node)
  }
  const reach = Math.cos(Math.min(Math.PI / 2, 2.4 * rules.spacing / Math.max(baseRadius, 0.5)))
  const edges: NavEdge[] = []
  const byId = new Map<string, number>()
  const around: number[][] = nodes.map(() => [])
  for (let i = 0; i < count; i += 1) {
    const near: { j: number; d: number }[] = []
    for (let j = 0; j < count; j += 1) {
      if (j === i) continue
      const d = nodes[i].dir[0] * nodes[j].dir[0] + nodes[i].dir[1] * nodes[j].dir[1] + nodes[i].dir[2] * nodes[j].dir[2]
      if (d >= reach) near.push({ j, d })
    }
    near.sort((p, q) => q.d - p.d || p.j - q.j)
    for (const { j } of near.slice(0, rules.neighbours)) {
      const a = Math.min(i, j), b = Math.max(i, j)
      const id = `${a}-${b}`
      if (byId.has(id)) continue
      const edge: NavEdge = { id, a, b, len: 0, slope: 0, passable: true, mid: [0, 0, 0] }
      measureEdge({ nodes, edges, around, byId }, edge)
      byId.set(id, edges.length)
      around[a].push(edges.length)
      around[b].push(edges.length)
      edges.push(edge)
    }
  }
  return { nodes, edges, around, byId }
}

// RDS-06: after an edit only the nodes within its reach are re-read, and only their edges re-measured. Returns the edges
// whose passability changed, so a caller can reroute what used them.
export function refreshNav(graph: NavGraph, world: World, centre: Vec3, reach: number) {
  const span = Math.hypot(...centre)
  const limit = reach + rules.spacing * 1.5
  const touched = new Set<number>()
  graph.nodes.forEach((node, i) => {
    if (distance(scale(node.dir, span), centre) > limit && distance(node.pos, centre) > limit) return
    placeNode(world, node)
    for (const e of graph.around[i]) touched.add(e)
  })
  const changed: string[] = []
  for (const e of touched) {
    const edge = graph.edges[e]
    const was = edge.passable
    measureEdge(graph, edge)
    if (was !== edge.passable) changed.push(edge.id)
  }
  return changed
}

/** The valid node whose direction is closest to a point. */
export function nearestNode(graph: NavGraph, point: Vec3) {
  const d = unit(point)
  let best = -1
  let bestDot = -2
  graph.nodes.forEach((node, i) => {
    if (!node.valid) return
    const dot = node.dir[0] * d[0] + node.dir[1] * d[1] + node.dir[2] * d[2]
    if (dot > bestDot) { bestDot = dot; best = i }
  })
  return best
}

export interface NavPath { nodes: number[]; cost: number; expanded: number }

// RDS-02: A* with a hard budget on expanded nodes. `cost` prices one edge (Infinity blocks it); `floor` is the cheapest a
// unit of distance can ever cost, which keeps the straight-line estimate admissible when roads make ground cheaper.
// Ties go to the smaller node index, so the same graph and prices always return the same path.
export function findPath(graph: NavGraph, from: number, to: number, cost: (edge: NavEdge) => number, floor: number = 1, budget: number = rules.expand): NavPath | null {
  if (from < 0 || to < 0) return null
  if (from === to) return { nodes: [from], cost: 0, expanded: 0 }
  const best = new Map<number, number>([[from, 0]])
  const came = new Map<number, number>()
  const goal = graph.nodes[to].pos
  const h = (n: number) => distance(graph.nodes[n].pos, goal) * floor
  const heap: [number, number][] = [[h(from), from]]
  const less = (x: [number, number], y: [number, number]) => x[0] < y[0] || (x[0] === y[0] && x[1] < y[1])
  const push = (item: [number, number]) => {
    heap.push(item)
    for (let i = heap.length - 1; i > 0;) { const p = (i - 1) >> 1; if (!less(heap[i], heap[p])) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p }
  }
  const pop = () => {
    const top = heap[0], last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1
        let m = i
        if (l < heap.length && less(heap[l], heap[m])) m = l
        if (r < heap.length && less(heap[r], heap[m])) m = r
        if (m === i) break
        ;[heap[i], heap[m]] = [heap[m], heap[i]]
        i = m
      }
    }
    return top
  }
  const done = new Set<number>()
  let expanded = 0
  while (heap.length) {
    const [, n] = pop()
    if (done.has(n)) continue
    if (n === to) {
      const nodes = [n]
      for (let at = n; at !== from;) { at = came.get(at)!; nodes.unshift(at) }
      return { nodes, cost: best.get(n)!, expanded }
    }
    if (++expanded > budget) return null
    done.add(n)
    for (const e of graph.around[n]) {
      const edge = graph.edges[e]
      const next = edge.a === n ? edge.b : edge.a
      if (done.has(next)) continue
      const price = cost(edge)
      if (!Number.isFinite(price)) continue
      const g = best.get(n)! + price
      if (g < (best.get(next) ?? Infinity)) { best.set(next, g); came.set(next, n); push([g + h(next), next]) }
    }
  }
  return null
}
