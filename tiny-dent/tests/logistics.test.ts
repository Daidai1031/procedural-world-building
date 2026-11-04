import assert from 'node:assert/strict'
import test from 'node:test'
import { shortestPath } from '../src/graph/graphCore'
import { tuning } from '../src/config/tuning'
import { createRunStore } from '../src/state/runState'
import { registryFor } from '../src/state/planets'
import { deposit } from '../src/systems/inventory'
import { buildRoute, buildSpaceport, cancelShipment, closeRoute, logisticsOf, materialTotal, planetState, routeQuote, ship, shipmentPoint, stepLogistics } from '../src/systems/logistics'
import { travelTo } from '../src/systems/signal'

const A = 'home', B = 'home/signal-1', C = 'home/signal-2'
type Store = ReturnType<typeof createRunStore>

// Home and B (and optionally C) each have a spaceport; B and C are joined to home / B. The player ends at home.
function network(extra = false) {
  const store = createRunStore(A)
  store.setState(s => ({ metrics: { ...s.metrics, capital: 10000 } }))
  buildSpaceport(store)
  travelTo(store, B)
  buildSpaceport(store)
  assert.ok(buildRoute(store, A).ok)
  if (extra) {
    travelTo(store, C)
    buildSpaceport(store)
    assert.ok(buildRoute(store, B).ok)
  }
  travelTo(store, A)
  return store
}
const run = (store: Store, ticks: number) => { for (let i = 0; i < ticks; i += 1) stepLogistics(store) }
const soil = (store: Store, seed: string) => planetState(store, seed)!.inventory.soil

test('graph: shortest path is deterministic, multi-hop, and null when disconnected', () => {
  const edges = [{ id: 'e1', a: 'x', b: 'y', weight: 2 }, { id: 'e2', a: 'y', b: 'z', weight: 2 }, { id: 'e3', a: 'x', b: 'z', weight: 4 }]
  assert.deepEqual(shortestPath(edges, 'x', 'z'), { nodes: ['x', 'z'], edges: ['e3'], cost: 4 }) // equal cost: smaller edge id wins
  assert.deepEqual(shortestPath(edges.slice(0, 2), 'x', 'z')!.edges, ['e1', 'e2'])
  assert.equal(shortestPath(edges.slice(0, 1), 'x', 'z'), null)
  assert.deepEqual(shortestPath([], 'x', 'x'), { nodes: ['x'], edges: [], cost: 0 })
})

test('LOG-01/10: a route needs two different visited planets, each with a spaceport', () => {
  const store = createRunStore(A)
  store.setState(s => ({ metrics: { ...s.metrics, capital: 1000 } }))
  assert.equal(buildRoute(store, A).ok, false)
  assert.equal(buildRoute(store, B).ok, false, 'B is only a discovery arc target so far')
  buildSpaceport(store)
  travelTo(store, B)
  const noPort = buildRoute(store, A)
  assert.equal(noPort.ok, false)
  buildSpaceport(store)
  assert.equal(buildSpaceport(store).ok, false, 'one spaceport per planet')
  assert.equal(buildRoute(store, 'home/signal-3').ok, false, 'never visited')
  assert.equal(buildRoute(store, A).ok, true)
  assert.equal(buildRoute(store, A).ok, false, 'already joined')
})

test('LOG-02: building charges shared credits once, at the quoted price', () => {
  const store = createRunStore(A)
  store.setState(s => ({ metrics: { ...s.metrics, capital: 500 } }))
  buildSpaceport(store)
  assert.equal(store.getState().metrics.capital, 500 - tuning.logistics.spaceportCost)
  travelTo(store, B)
  buildSpaceport(store)
  const before = store.getState().metrics.capital
  const result = buildRoute(store, A)
  assert.ok(result.ok)
  assert.equal(before - store.getState().metrics.capital, routeQuote(B, A).cost)
  const poor = createRunStore(A)
  assert.equal(buildSpaceport(poor).ok, false, 'no funds, no spaceport')
  assert.equal(poor.getState().spaceport, false)
})

test('LOG-T1: cargo leaves the origin at departure and arrives once; the world total never changes', () => {
  const store = network()
  deposit(store, 'soil', 50)
  const total = materialTotal(store, 'soil')
  const money = store.getState().metrics.capital
  const sent = ship(store, B, [{ material: 'soil', amount: 20 }])
  assert.ok(sent.ok)
  assert.equal(soil(store, A), 30)
  assert.equal(materialTotal(store, 'soil'), total, 'in transit still counts')
  assert.ok(Math.abs(money - store.getState().metrics.capital - 20 * tuning.logistics.feePerUnit) < 1e-9)
  run(store, routeQuote(A, B).travelTicks - 1)
  assert.equal(soil(store, B), 0, 'not there yet')
  run(store, 1)
  assert.equal(soil(store, B), 20)
  assert.equal(materialTotal(store, 'soil'), total)
  run(store, 500)
  assert.equal(soil(store, B), 20, 'delivered once')
  assert.equal(logisticsOf(store).getState().shipments[0].status, 'delivered')
})

test('LOG-T2: a delivery lands on a frozen planet, and on the active one, exactly once', () => {
  const store = network()
  deposit(store, 'soil', 40)
  ship(store, B, [{ material: 'soil', amount: 10 }])
  run(store, 5)
  travelTo(store, B) // the player leaves before the train arrives; home is now frozen
  run(store, routeQuote(A, B).travelTicks)
  assert.equal(soil(store, B), 10, 'arrived while B is active')
  travelTo(store, A)
  assert.equal(soil(store, A), 30)
  ship(store, B, [{ material: 'soil', amount: 5 }])
  travelTo(store, B)
  assert.equal(soil(store, B), 10)
  run(store, routeQuote(A, B).travelTicks)
  assert.equal(soil(store, B), 15)
  travelTo(store, A)
  travelTo(store, B)
  run(store, 50)
  assert.equal(soil(store, B), 15)
})

test('LOG-T3: invalid shipments change nothing; cancel and a closed route refund exactly', () => {
  const store = network()
  deposit(store, 'soil', 30)
  const snapshot = () => JSON.stringify([store.getState().inventory, store.getState().metrics.capital, logisticsOf(store).getState().shipments])
  const before = snapshot()
  assert.equal(ship(store, B, [{ material: 'soil', amount: 31 }]).ok, false, 'more than stock')
  assert.equal(ship(store, B, [{ material: 'soil', amount: tuning.logistics.capacity + 1 }]).ok, false, 'more than capacity')
  assert.equal(ship(store, B, [{ material: 'soil', amount: 1.5 }]).ok, false, 'fractions')
  assert.equal(ship(store, B, [{ material: 'soil', amount: -2 }]).ok, false, 'negative')
  assert.equal(ship(store, 'home/signal-4', [{ material: 'soil', amount: 1 }]).ok, false, 'unknown planet')
  assert.equal(ship(store, A, [{ material: 'soil', amount: 1 }]).ok, false, 'itself')
  assert.equal(ship(store, B, []).ok, false)
  assert.equal(snapshot(), before)
  const money = store.getState().metrics.capital
  const sent = ship(store, B, [{ material: 'soil', amount: 12 }])
  assert.ok(sent.ok)
  assert.equal(cancelShipment(store, sent.value.id), true)
  assert.equal(cancelShipment(store, sent.value.id), false, 'a second cancel does nothing')
  assert.equal(soil(store, A), 30)
  assert.ok(Math.abs(store.getState().metrics.capital - money) < 1e-9)
  const second = ship(store, B, [{ material: 'soil', amount: 12 }])
  assert.ok(second.ok)
  assert.equal(closeRoute(store, 'route-1'), true)
  assert.equal(soil(store, A), 30)
  assert.equal(ship(store, B, [{ material: 'soil', amount: 1 }]).ok, false, 'closed route')
  run(store, 5000)
  assert.equal(soil(store, B), 0, 'a returned shipment never arrives')
  assert.ok(Math.abs(store.getState().metrics.capital - money) < 1e-9)
})

test('LOG-T4: only the clock moves the train, and the same inputs give the same arrival tick', () => {
  const arrival = () => {
    const store = network()
    deposit(store, 'soil', 10)
    const sent = ship(store, B, [{ material: 'soil', amount: 10 }])
    assert.ok(sent.ok)
    return sent.value
  }
  const a = arrival(), b = arrival()
  assert.deepEqual(a, b)
  assert.equal(a.arriveTick - a.departTick, routeQuote(A, B).travelTicks)
  const store = network()
  deposit(store, 'soil', 10)
  ship(store, B, [{ material: 'soil', amount: 10 }])
  const tick = logisticsOf(store).getState().tick
  travelTo(store, B)
  travelTo(store, A)
  assert.equal(logisticsOf(store).getState().tick, tick, 'switching planets does not run the clock')
  assert.equal(planetState(store, B)!.inventory.soil, 0)
})

test('LOG: a shipment crosses two routes with the summed travel time and the smaller capacity', () => {
  const store = network(true)
  deposit(store, 'soil', 30)
  const sent = ship(store, C, [{ material: 'soil', amount: 10 }])
  assert.ok(sent.ok)
  assert.deepEqual(sent.value.routeIds, ['route-1', 'route-2'])
  assert.equal(sent.value.arriveTick - sent.value.departTick, routeQuote(A, B).travelTicks + routeQuote(B, C).travelTicks)
  run(store, sent.value.arriveTick)
  assert.equal(soil(store, C), 10)
  assert.equal(registryFor(store).logistics.getState().shipments.length, 1)
})

test('LOG-09: a train is drawn along its legs and stops being drawn once delivered', () => {
  const store = network(true)
  deposit(store, 'soil', 10)
  const sent = ship(store, C, [{ material: 'soil', amount: 10 }])
  assert.ok(sent.ok)
  const { routes } = logisticsOf(store).getState()
  const at: Record<string, [number, number, number]> = { [A]: [0, 0, 0], [B]: [10, 0, 0], [C]: [10, 10, 0] }
  const first = routeQuote(A, B).travelTicks
  assert.deepEqual(shipmentPoint(sent.value, routes, at, sent.value.departTick), [0, 0, 0])
  assert.deepEqual(shipmentPoint(sent.value, routes, at, sent.value.departTick + first), [10, 0, 0])
  const mid = shipmentPoint(sent.value, routes, at, sent.value.departTick + first + routeQuote(B, C).travelTicks / 2)!
  assert.ok(Math.abs(mid[0] - 10) < 1e-9 && Math.abs(mid[1] - 5) < 0.01)
  assert.equal(shipmentPoint({ ...sent.value, status: 'delivered' }, routes, at, 0), null)
})
