import assert from 'node:assert/strict'
import test from 'node:test'
import { tuning } from '../src/config/tuning'
import { buildNav, findPath, nodeCountFor } from '../src/graph/surfaceGraph'
import { createRunStore } from '../src/state/runState'
import { registryFor } from '../src/state/planets'
import { placeBuilder, startBuilder } from '../src/systems/builder'
import { HALF, distance, type Vec3 } from '../src/systems/geometry'
import { addPatch } from '../src/systems/patches'
import { stepSimulation } from '../src/systems/simulation'
import { travelTo } from '../src/systems/signal'
import { edgeCost, edgeInfo, emptyNav, leavesHeat, navGraph, refreshTraffic, roadCandidates, roadFactorOf, routeFor, serviceNodes, servicePairs, stepTraffic } from '../src/systems/traffic'
import { notifyGroundChanged } from '../src/systems/workSites'
import { groundPoint } from '../src/systems/structures'
import { planetConfig } from '../src/world/planet'
import { VOXEL_WORLD_SIZE } from '../src/world/voxels/voxelMath.js'

type Store = ReturnType<typeof createRunStore>
const SEED = '1380'
const radiusOf = (seed: string) => planetConfig(seed).radius * VOXEL_WORLD_SIZE

// A rock planet with a spaceport and two patches far apart: the spaceport goes to each patch and back.
function sites() {
  const store = createRunStore(SEED)
  const world = registryFor(store).world(SEED)
  const graph = navGraph(world, SEED)
  store.setState({ spaceport: true })
  const at = (direction: Vec3) => groundPoint(world, direction)
  addPatch(store, at([0, 1, 0]), 'soil')
  addPatch(store, at([0.9, -0.3, 0.3]), 'soil')
  return { store, world, graph }
}
// Advance only traffic, on the planet's own tick, so nothing else moves.
const traffic = (store: Store, world: ReturnType<typeof navWorld>, ticks: number) => {
  for (let i = 0; i < ticks; i += 1) { store.setState(s => ({ habitat: { ...s.habitat, tick: s.habitat.tick + 1 } })); stepTraffic(world, store) }
}
const navWorld = () => registryFor(createRunStore(SEED)).world(SEED)

test('RDS-01/08: the graph is deterministic, sized by the planet and covers it with passable ground', () => {
  const world = registryFor(createRunStore(SEED)).world(SEED)
  const a = buildNav(world, radiusOf(SEED)), b = buildNav(world, radiusOf(SEED))
  assert.equal(a.nodes.length, nodeCountFor(radiusOf(SEED)))
  assert.ok(a.nodes.length <= tuning.traffic.maxNodes)
  assert.deepEqual(a.nodes, b.nodes)
  assert.deepEqual(a.edges, b.edges)
  assert.ok(a.nodes.every(node => node.valid), 'an intact planet has ground everywhere')
  const passable = a.edges.filter(edge => edge.passable).length
  assert.ok(passable / a.edges.length > 0.9, `${passable}/${a.edges.length} edges passable`)
  assert.ok(a.around.every(list => list.length >= 3))
  assert.ok(nodeCountFor(0.17 * VOXEL_WORLD_SIZE) < nodeCountFor(0.38 * VOXEL_WORLD_SIZE))
})

test('RDS-02: A* returns a correct, repeatable path, matches an exhaustive search and respects its budget', () => {
  const { graph, store } = sites()
  const roads = new Set<string>()
  const price = (edge: (typeof graph.edges)[number]) => edgeCost(store.getState(), roads, edge)
  const from = 0, to = Math.floor(graph.nodes.length / 2)
  const star = findPath(graph, from, to, price, 1)!
  const exhaustive = findPath(graph, from, to, price, 0)!
  assert.ok(star && exhaustive)
  assert.ok(Math.abs(star.cost - exhaustive.cost) < 1e-9, 'an admissible estimate loses nothing')
  assert.ok(star.expanded <= exhaustive.expanded)
  assert.deepEqual(findPath(graph, from, to, price, 1), star)
  assert.equal(star.nodes[0], from)
  assert.equal(star.nodes.at(-1), to)
  let sum = 0
  for (let i = 0; i + 1 < star.nodes.length; i += 1) sum += price(graph.edges[graph.byId.get(`${Math.min(star.nodes[i], star.nodes[i + 1])}-${Math.max(star.nodes[i], star.nodes[i + 1])}`)!])
  assert.ok(Math.abs(sum - star.cost) < 1e-9)
  assert.equal(findPath(graph, from, to, price, 1, 3), null, 'a tiny budget gives up')
  assert.equal(findPath(graph, from, to, () => Infinity, 1), null, 'nothing walkable')
})

test('RDS-03: errands leave heat along the way, heat fades by a fixed factor, and the same inputs give the same heat', () => {
  const run = () => { const { store, world } = sites(); traffic(store, world, 2400); return store.getState().nav }
  const nav = run()
  assert.ok(nav.finished >= 3, `${nav.finished} errands finished`)
  assert.ok(Object.keys(nav.heat).length > 5)
  assert.ok(Math.max(...Object.values(nav.heat)) >= tuning.traffic.pathAt, 'repeated use makes a desire path')
  assert.ok(Object.keys(nav.uses).length >= Object.keys(nav.heat).length)
  assert.deepEqual(run().heat, nav.heat, 'repeatable')
  // Fading: with no errands left, heat falls by `decay` every interval and is gone below the floor.
  const { store, world } = sites()
  store.setState({ spaceport: false, patches: [], nav: { ...emptyNav(), heat: { '0-1': 10, '2-3': 0.052 } } })
  traffic(store, world, tuning.traffic.decayEvery * 10)
  const heat = store.getState().nav.heat
  assert.ok(Math.abs(heat['0-1'] - 10 * tuning.traffic.decay ** 10) < 1e-9)
  assert.equal(heat['2-3'], undefined)
})

test('RDS-07: only ground walkers leave heat; a hovering Miner at work makes none by itself', () => {
  assert.equal(leavesHeat('ground'), true)
  assert.equal(leavesHeat('air'), false)
  assert.equal(leavesHeat('burrow'), false)
  const store = createRunStore(SEED)
  const world = registryFor(store).world(SEED)
  // A mine is somewhere to go, but only for ground walkers: with no creatures there is nobody to send.
  store.setState(s => ({ residents: [], robots: s.robots.map(r => ({ ...r, phase: 'digging' as const })) }))
  traffic(store, world, 1000)
  assert.deepEqual(store.getState().nav.heat, {})
  const services = serviceNodes(navGraph(world, SEED), store.getState())
  assert.ok(services.some(s => s.kind === 'mine'))
  assert.equal(servicePairs(services).length, 0)
})

test('RDS-04/05: a Builder spends exactly the road price on a hot edge, only with stock, and the edge gets cheaper', () => {
  const { store, world, graph } = sites()
  traffic(store, world, 2000)
  const [hot] = roadCandidates(graph, store.getState().nav)
  assert.ok(hot, 'an edge has been walked enough')
  const before = edgeInfo(store.getState(), graph, hot.id)!
  assert.equal(before.kind, 'path')
  placeBuilder(store, world, 'builder-0', hot.mid, 1.4)
  store.setState(s => ({ inventory: { ...s.inventory, soil: tuning.roads.cost - 1 }, nav: { ...s.nav, trips: [] } }))
  startBuilder(store, 'builder-0')
  for (let i = 0; i < 400; i += 1) stepSimulation(world, store)
  assert.equal(store.getState().nav.roads.length, 0, 'not enough stock')
  assert.equal(store.getState().builders[0].stopReason, 'no-material')
  assert.equal(store.getState().inventory.soil, tuning.roads.cost - 1)
  store.setState(s => ({ inventory: { ...s.inventory, soil: 40 } }))
  for (let i = 0; i < 1500 && store.getState().nav.roads.length === 0; i += 1) stepSimulation(world, store)
  const state = store.getState()
  assert.ok(state.nav.roads.length >= 1)
  assert.equal(state.inventory.soil, 40 - tuning.roads.cost * state.nav.roads.length)
  const road = edgeInfo(state, graph, state.nav.roads[0])!
  assert.equal(road.kind, 'road')
  assert.ok(Math.abs(road.cost - road.plainCost * roadFactorOf(SEED)) < 1e-9)
  assert.ok(road.cost < road.plainCost)
  // The route between the two ends is no dearer than before, and strictly cheaper where it uses the road.
  const e = graph.edges[graph.byId.get(road.id)!]
  const around = routeFor({ ...state, nav: { ...state.nav, roads: [] } }, graph, e.a, e.b)!
  const along = routeFor(state, graph, e.a, e.b)!
  assert.ok(along.cost < around.cost)
  assert.equal(roadFactorOf(SEED), tuning.roads.factor.rock)
  assert.ok(tuning.roads.factor.ice > tuning.roads.factor.rock, 'ice helps less')
})

test('RDS-06: a cut across a route blocks only nearby edges, walkers turn around and go another way, and the log says why', () => {
  const { store, world, graph } = sites()
  traffic(store, world, 600)
  const nav0 = store.getState().nav
  assert.ok(nav0.trips.length > 0)
  const trip = nav0.trips[0]
  const ahead = trip.nodes.slice(trip.at)
  assert.ok(ahead.length > 4)
  const mid = graph.nodes[ahead[Math.floor(ahead.length / 2)]].pos
  const farNode = graph.nodes.findIndex(node => distance(node.pos, mid) > 3.2)
  const farBefore = JSON.stringify(graph.nodes[farNode])
  const edgesBefore = graph.edges.filter(edge => edge.passable).length
  // Dig a deep pit there, then tell the planet.
  world.edit('dig', { x: mid[0], y: mid[1] + HALF, z: mid[2] }, 0.9, 'radial')
  notifyGroundChanged(store, mid, 0.9, world)
  const blocked = graph.edges.filter(edge => !edge.passable).length
  assert.ok(blocked > 0 && graph.edges.filter(edge => edge.passable).length < edgesBefore, 'the pit blocks edges')
  assert.equal(JSON.stringify(graph.nodes[farNode]), farBefore, 'far ground was not re-read')
  const after = store.getState().nav
  const same = after.trips.find(t => t.id === trip.id)
  assert.ok(same, 'the walker found another way')
  assert.ok(same!.rerouted >= 1)
  assert.ok(after.reroutes.length >= 1)
  assert.equal(after.reroutes[0].why, 'blocked')
  // Nothing still walks through a blocked edge.
  for (const t of after.trips) for (let i = t.at; i + 1 < t.nodes.length; i += 1) {
    const e = graph.edges[graph.byId.get(`${Math.min(t.nodes[i], t.nodes[i + 1])}-${Math.max(t.nodes[i], t.nodes[i + 1])}`)!]
    assert.equal(e.passable, true)
  }
  // A road across the pit stays on the books but is marked blocked.
  const id = after.reroutes[0].edge
  store.setState(s => ({ nav: { ...s.nav, roads: [id] } }))
  assert.equal(edgeInfo(store.getState(), graph, id)!.blocked, true)
  assert.equal(edgeCost(store.getState(), new Set([id]), graph.edges[graph.byId.get(id)!]), Infinity)
  // Filling it back reopens the way.
  world.edit('add', { x: mid[0], y: mid[1] + HALF, z: mid[2] }, 1.1, 'radial')
  refreshTraffic(world, store, mid, 1.1)
  assert.ok(graph.edges.filter(edge => !edge.passable).length < blocked)
})

test('RDS-T: heat, roads and walkers stay with the planet across a switch', () => {
  const { store, world } = sites()
  traffic(store, world, 2000)
  store.setState(s => ({ nav: { ...s.nav, roads: ['0-1'] } }))
  const nav = store.getState().nav
  travelTo(store, 'home/signal-1')
  assert.deepEqual(store.getState().nav, emptyNav())
  travelTo(store, SEED)
  assert.deepEqual(store.getState().nav, nav)
})

// The target scenario of the brief, start to finish: plastic and a Cairn ride a train to a metal planet; the Cairn asks for plastic;
// a Builder lays a patch; walkers between the spaceport and the patch wear a path; a Builder paves it from the planet's own
// scrap; the player cuts across the road and the walkers go around; and everything is still there after a planet switch.
test('RDS-T: the whole loop, from a shipped Cairn to a road that is cut and walked around', async () => {
  const { buildRoute, buildSpaceport, routeQuote, ship, stepLogistics } = await import('../src/systems/logistics')
  const { planetSpecies } = await import('../src/systems/residents')
  const { deposit } = await import('../src/systems/inventory')
  const find = (kind: 'plastic' | 'metal', species: string) => {
    for (let parent = 0; parent < 800; parent += 1) for (let index = 1; index <= 5; index += 1) {
      const seed = `m${parent}/signal-${index}`
      if (planetConfig(seed).surface === kind && planetConfig(seed).shape === 'sphere' && planetConfig(seed).water === 0 && planetSpecies(seed) === species) return seed
    }
    throw new Error('no planet')
  }
  const P = find('plastic', 'cairn'), M = find('metal', 'sentinel')
  const store = createRunStore(P)
  store.setState(s => ({ metrics: { ...s.metrics, capital: 100000 }, inventory: { ...s.inventory, plastic: 60 } }))
  buildSpaceport(store)
  travelTo(store, M)
  buildSpaceport(store)
  assert.ok(buildRoute(store, P).ok)
  travelTo(store, P)
  const cairn = [...store.getState().residents].sort((a, b) => a.creatureId < b.creatureId ? -1 : 1)[0]
  assert.ok(ship(store, M, [{ material: 'plastic', amount: 40 }], [cairn.creatureId]).ok)
  for (let i = 0; i < routeQuote(P, M).travelTicks; i += 1) stepLogistics(store)
  travelTo(store, M)
  const world = registryFor(store).world(M)
  const step = (n: number) => { for (let i = 0; i < n; i += 1) stepSimulation(world, store) }
  const mine = () => store.getState().residents.find(r => r.creatureId === cairn.creatureId)!
  for (let i = 0; i < 3000 && !mine().request; i += 1) step(1)
  assert.equal(mine().request, 'plastic', 'the Cairn dislikes bare metal and asks')
  const spot = groundPoint(world, [mine().home![0], mine().home![1], mine().home![2]].map(v => v / Math.hypot(...mine().home!)) as Vec3)
  placeBuilder(store, world, 'builder-0', spot, 2.4)
  startBuilder(store, 'builder-0')
  step(800)
  assert.equal(store.getState().patches.length, 1, 'a Builder spent the delivered plastic on a patch')
  // Walkers between the spaceport and the patch (and the Cairn's colony) wear a path.
  deposit(store, 'scrap', 60)
  step(3500)
  const graph = navGraph(world, M)
  const nav = store.getState().nav
  assert.ok(nav.finished >= 5, `${nav.finished} errands`)
  assert.ok(Math.max(...Object.values(nav.heat)) >= tuning.traffic.pathAt, 'a desire path shows')
  // A Builder pays for a road with the planet's own scrap.
  const [hot] = roadCandidates(graph, store.getState().nav)
  if (hot) {
    store.setState(s => ({ builders: s.builders.map(b => ({ ...b, phase: 'scanning' as const, stopReason: null, misses: 0, area: { center: hot.mid, radius: 2.4 } })) }))
    step(1500)
  }
  const roads = store.getState().nav.roads
  assert.ok(roads.length >= 1, 'a road was built')
  assert.ok(store.getState().inventory.scrap <= 60 - tuning.roads.cost)
  // Cut across it: the road is marked blocked and walkers find another way.
  const edge = graph.edges[graph.byId.get(roads[0])!]
  world.edit('dig', { x: edge.mid[0], y: edge.mid[1] + HALF, z: edge.mid[2] }, 1.5, 'radial')
  notifyGroundChanged(store, edge.mid, 1.5, world)
  assert.equal(edgeInfo(store.getState(), graph, roads[0])!.blocked, true)
  step(300)
  for (const trip of store.getState().nav.trips) for (let i = trip.at; i + 1 < trip.nodes.length; i += 1) {
    assert.equal(graph.edges[graph.byId.get(`${Math.min(trip.nodes[i], trip.nodes[i + 1])}-${Math.max(trip.nodes[i], trip.nodes[i + 1])}`)!].passable, true)
  }
  // Everything survives a planet switch.
  const saved = { nav: store.getState().nav, patches: store.getState().patches, passport: mine().passport, id: mine().creatureId }
  travelTo(store, P)
  travelTo(store, M)
  assert.deepEqual(store.getState().nav, saved.nav)
  assert.deepEqual(store.getState().patches, saved.patches)
  assert.deepEqual(mine().passport, saved.passport)
})
