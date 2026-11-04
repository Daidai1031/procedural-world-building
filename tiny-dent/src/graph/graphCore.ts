// D-067: a tiny undirected weighted graph with a deterministic shortest path. Pure data and arithmetic, so the
// interplanetary graph now and the surface graph later (D-070) share it and tests run in node.

export interface Edge { id: string; a: string; b: string; weight: number }
export interface GraphPath { nodes: string[]; edges: string[]; cost: number }

const other = (edge: Edge, node: string) => edge.a === node ? edge.b : edge.a

// Dijkstra. Ties go to the smaller edge id, so the same graph always returns the same path.
export function shortestPath(edges: readonly Edge[], from: string, to: string): GraphPath | null {
  if (from === to) return { nodes: [from], edges: [], cost: 0 }
  const best = new Map<string, number>([[from, 0]])
  const via = new Map<string, { node: string; edge: string }>()
  const done = new Set<string>()
  for (;;) {
    let current: string | null = null
    for (const [node, cost] of best) {
      if (done.has(node)) continue
      if (current === null || cost < best.get(current)! || (cost === best.get(current) && node < current)) current = node
    }
    if (current === null) return null
    if (current === to) break
    done.add(current)
    for (const edge of [...edges].sort((x, y) => x.id < y.id ? -1 : 1)) {
      if (edge.a !== current && edge.b !== current) continue
      const next = other(edge, current)
      if (done.has(next)) continue
      const cost = best.get(current)! + edge.weight
      if (!best.has(next) || cost < best.get(next)!) { best.set(next, cost); via.set(next, { node: current, edge: edge.id }) }
    }
  }
  const nodes = [to], path: string[] = []
  for (let node = to; node !== from;) { const step = via.get(node)!; path.unshift(step.edge); nodes.unshift(step.node); node = step.node }
  return { nodes, edges: path, cost: best.get(to)! }
}
