import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, Points, PointsMaterial } from 'three'
import type { createRunStore } from '../state/runState'
import type { PlanetWorld } from '../world/planet'
import type { NavEdge, NavGraph } from '../graph/surfaceGraph'
import { hasNavGraph, navGraph } from '../systems/traffic'
import { scale, unit, type Vec3 } from '../systems/geometry'
import { palette } from '../config/palette'
import { tuning } from '../config/tuning'
import { useNavLayers } from '../state/navLayers'

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const LIFT = 0.05
const lifted = (p: Vec3): Vec3 => scale(p, 1 + LIFT / Math.max(Math.hypot(...p), 0.1))

// A flat strip along each edge, on the ground. One geometry per kind of edge, rebuilt only when that set changes.
function ribbons(graph: NavGraph, edges: readonly NavEdge[], width: number) {
  const positions: number[] = []
  const index: number[] = []
  for (const edge of edges) {
    const a = lifted(graph.nodes[edge.a].pos), b = lifted(graph.nodes[edge.b].pos)
    const along: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const side = scale(unit(cross(along, unit(edge.mid))), width / 2)
    const base = positions.length / 3
    for (const [p, s] of [[a, 1], [a, -1], [b, 1], [b, -1]] as const) positions.push(p[0] + side[0] * s, p[1] + side[1] * s, p[2] + side[2] * s)
    index.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(index)
  return geometry
}

const ribbonMaterial = (color: string, opacity: number) => new MeshBasicMaterial({ color: new Color(color), transparent: opacity < 1, opacity, side: DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })

// RDS-09: desire paths, roads, blocked roads, heat and nodes, each its own layer. The ground graph is derived from the terrain;
// this reads the planet's heat and roads twice a second and redraws only what changed.
export function RoadsView({ world, store }: { world: PlanetWorld; store: ReturnType<typeof createRunStore> }) {
  const group = useRef<Group>(null)
  const last = useRef('')
  const built = useRef<{ paths?: Mesh; roads?: Mesh; blocked?: Mesh; picked?: Mesh; heat?: LineSegments; nodes?: Points }>({})
  const clock = useRef(0)
  const materials = useMemo(() => ({
    paths: ribbonMaterial(palette.road.path, 0.6), roads: ribbonMaterial(palette.road.road, 0.95), blocked: ribbonMaterial(palette.road.blocked, 0.95), picked: ribbonMaterial(palette.road.pick, 0.9),
    heat: new LineBasicMaterial({ vertexColors: true }), nodes: new PointsMaterial({ color: palette.road.node, size: 3, sizeAttenuation: false }),
  }), [])
  useEffect(() => () => { Object.values(built.current).forEach(object => object?.geometry.dispose()); Object.values(materials).forEach(m => m.dispose()) }, [materials])

  useFrame((_, delta) => {
    const layers = useNavLayers.getState()
    const root = group.current
    if (!root) return
    clock.current += delta
    const state = store.getState()
    const active = (hasNavGraph(world) || layers.nodes) && (state.nav.roads.length > 0 || Object.keys(state.nav.heat).length > 0 || layers.nodes)
    if (!active) { root.visible = false; return }
    root.visible = true
    if (clock.current < 0.5 && last.current) return
    clock.current = 0
    const graph = navGraph(world, state.seed)
    const { pathAt, roadAt } = tuning.traffic
    const roads = new Set(state.nav.roads)
    const signature = [state.nav.roads.join(), Object.entries(state.nav.heat).map(([id, h]) => id + (h >= pathAt ? 'p' : h > 0 ? 't' : '')).join(), graph.edges.filter(e => !e.passable).length, layers.selected, layers.nodes, layers.heat].join('|')
    if (signature === last.current) return
    last.current = signature
    const parts = built.current
    const set = <K extends keyof typeof parts>(key: K, make: () => NonNullable<(typeof parts)[K]> | undefined) => {
      parts[key]?.geometry.dispose()
      root.remove(parts[key] as never)
      parts[key] = make() as never
      if (parts[key]) root.add(parts[key] as never)
    }
    const edgesOf = (ids: Iterable<string>) => [...ids].map(id => graph.edges[graph.byId.get(id) ?? -1]).filter(Boolean)
    const mesh = (edges: NavEdge[], width: number, material: MeshBasicMaterial) => { const m = new Mesh(ribbons(graph, edges, width), material); m.renderOrder = 3; m.raycast = () => {}; m.frustumCulled = false; return m }
    const hot = edgesOf(Object.keys(state.nav.heat).filter(id => state.nav.heat[id] >= pathAt && !roads.has(id)))
    set('paths', () => mesh(hot.filter(e => e.passable), 0.035, materials.paths))
    set('roads', () => mesh(edgesOf(roads).filter(e => e.passable), 0.085, materials.roads))
    set('blocked', () => mesh(edgesOf(roads).filter(e => !e.passable).concat(edgesOf(Object.keys(state.nav.heat)).filter(e => !e.passable)), 0.085, materials.blocked))
    set('picked', () => layers.selected ? mesh(edgesOf([layers.selected]), 0.13, materials.picked) : undefined)
    set('heat', () => {
      const edges = edgesOf(Object.keys(state.nav.heat))
      const positions: number[] = [], colors: number[] = []
      const cold = new Color(palette.road.cold), warm = new Color(palette.road.warm), tint = new Color()
      for (const edge of edges) {
        tint.copy(cold).lerp(warm, Math.min(1, state.nav.heat[edge.id] / roadAt))
        for (const n of [edge.a, edge.b]) { positions.push(...lifted(graph.nodes[n].pos)); colors.push(tint.r, tint.g, tint.b) }
      }
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
      geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
      const lines = new LineSegments(geometry, materials.heat)
      lines.frustumCulled = false
      lines.raycast = () => {}
      return lines
    })
    set('nodes', () => {
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new Float32BufferAttribute(graph.nodes.filter(n => n.valid).flatMap(n => lifted(n.pos)), 3))
      const points = new Points(geometry, materials.nodes)
      points.frustumCulled = false
      points.raycast = () => {}
      return points
    })
  })
  // Layer switches only show or hide what is already built, so toggling one never rebuilds.
  useFrame(() => {
    const layers = useNavLayers.getState()
    const parts = built.current
    if (parts.paths) parts.paths.visible = layers.paths
    if (parts.roads) parts.roads.visible = layers.roads
    if (parts.blocked) parts.blocked.visible = layers.blocked
    if (parts.heat) parts.heat.visible = layers.heat
    if (parts.nodes) parts.nodes.visible = layers.nodes
  })
  return <group ref={group} visible={false} />
}
