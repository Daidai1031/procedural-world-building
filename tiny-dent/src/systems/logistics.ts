import type { RunState, createRunStore } from '../state/runState'
import { registryFor } from '../state/planets'
import { shortestPath } from '../graph/graphCore'
import { tuning } from '../config/tuning'
import { materialIds, type MaterialId } from '../content/materials'
import { withdraw } from './inventory'
import { planetPosition } from './system'
import type { CargoLine, Route, Shipment } from './logisticsState'
import { boardCreature, landCreature } from './creatures'
import { whyNotThere } from './water'

type Store = ReturnType<typeof createRunStore>
export type Outcome<T> = { ok: true; value: T } | { ok: false; reason: string }
const fail = (reason: string): { ok: false; reason: string } => ({ ok: false, reason })
const rules = tuning.logistics

export const logisticsOf = (store: Store) => registryFor(store).logistics

// The saved state of any visited planet: the live store for the active one, the frozen snapshot for the rest.
export function planetState(store: Store, seed: string): RunState | undefined {
  const live = store.getState()
  return live.seed === seed ? live : registryFor(store).snapshot(seed)
}
const isVisited = (store: Store, seed: string) => registryFor(store).list.getState().planets.some(p => p.seed === seed)

function patchPlanet(store: Store, seed: string, change: (state: RunState) => Partial<RunState>) {
  if (store.getState().seed === seed) { store.setState(change(store.getState())); return true }
  return registryFor(store).patchSnapshot(seed, change)
}
// A shipment arriving on a planet: cargo into its inventory, creatures onto its ground (each at most once).
function receive(store: Store, state: RunState, shipment: Shipment) {
  const inventory = { ...state.inventory }
  for (const { material, amount } of shipment.cargo) inventory[material] += amount
  const present = new Set(state.residents.map(resident => resident.creatureId))
  const world = registryFor(store).world(state.seed)
  const arrivals = shipment.passengers.filter(creature => !present.has(creature.creatureId)).map(creature => landCreature(world, state, creature))
  // A Builder waiting on material starts looking again now that some has come.
  const builders = shipment.cargo.length ? state.builders.map(robot => robot.stopReason === 'no-material' ? { ...robot, phase: 'scanning' as const, stopReason: null, misses: 0, phaseTicks: 0 } : robot) : state.builders
  return arrivals.length ? { inventory, builders, residents: [...state.residents, ...arrivals] } : { inventory, builders }
}

// Credits are shared (D-040), so the active planet's account always pays. Rail spending is not itemised yet.
function charge(store: Store, amount: number) {
  const { metrics, economy } = store.getState()
  if (economy.bankrupt || metrics.capital < amount) return false
  store.setState({ metrics: { ...metrics, capital: metrics.capital - amount } })
  return true
}
const refund = (store: Store, amount: number) => store.setState(state => ({ metrics: { ...state.metrics, capital: state.metrics.capital + amount } }))

export function buildSpaceport(store: Store): Outcome<true> {
  const state = store.getState()
  if (state.spaceport) return fail('This planet already has a spaceport.')
  if (!charge(store, rules.spaceportCost)) return fail(`A spaceport costs ₡${rules.spaceportCost}.`)
  store.setState({ spaceport: true })
  return { ok: true, value: true }
}

export function routeQuote(a: string, b: string) {
  const [ax, ay, az] = planetPosition(a), [bx, by, bz] = planetPosition(b)
  const distance = Math.hypot(ax - bx, ay - by, az - bz)
  return { distance, cost: Math.round(rules.routeBase + rules.routePerUnit * distance), travelTicks: Math.max(1, Math.ceil(distance * rules.ticksPerUnit)), capacity: rules.capacity }
}

const joins = (route: Route, a: string, b: string) => (route.a === a && route.b === b) || (route.a === b && route.b === a)

// LOG-01/02/10: a route joins the active planet to another visited planet, and both ends need a spaceport.
export function buildRoute(store: Store, other: string): Outcome<Route> {
  const from = store.getState().seed
  const logistics = logisticsOf(store)
  if (other === from) return fail('A route needs two different planets.')
  if (!isVisited(store, other)) return fail('Only a planet you have visited can be a route end.')
  if (!store.getState().spaceport || !planetState(store, other)?.spaceport) return fail('Both ends need a spaceport.')
  if (logistics.getState().routes.some(route => route.status === 'open' && joins(route, from, other))) return fail('These planets are already joined.')
  const quote = routeQuote(from, other)
  if (!charge(store, quote.cost)) return fail(`This route costs ₡${quote.cost}.`)
  const state = logistics.getState()
  const route: Route = { id: `route-${state.counter + 1}`, a: from, b: other, cost: quote.cost, capacity: quote.capacity, travelTicks: quote.travelTicks, status: 'open' }
  logistics.setState({ counter: state.counter + 1, routes: [...state.routes, route] })
  return { ok: true, value: route }
}

export const openRoutes = (store: Store) => logisticsOf(store).getState().routes.filter(route => route.status === 'open')

// LOG-03/04: cargo leaves the active planet's inventory and the fee leaves the shared account, together or not at all.
export function ship(store: Store, to: string, cargo: readonly CargoLine[], passengerIds: readonly string[] = [], options: { free?: boolean } = {}): Outcome<Shipment> {
  const from = store.getState().seed
  const lines = cargo.filter(line => line.amount > 0)
  if (cargo.some(line => !Number.isInteger(line.amount) || line.amount < 0 || !materialIds.includes(line.material))) return fail('Cargo must be whole units of a known material.')
  if (lines.length === 0 && passengerIds.length === 0) return fail('Nothing to ship.')
  if (new Set(passengerIds).size !== passengerIds.length) return fail('A creature can only take one seat.')
  const seats = passengerIds.map(id => store.getState().residents.find(resident => resident.creatureId === id))
  if (seats.some(seat => !seat)) return fail('That creature is not on this planet.')
  // D-073: hard needs are vetoes. A swimmer needs water; a land creature needs dry ground on an ocean.
  const destination = planetState(store, to)
  for (const seat of seats) { const why = destination && whyNotThere(seat!.species, destination); if (why) return fail(why) }
  if (to === from || !isVisited(store, to)) return fail('That destination cannot receive a train.')
  const routes = openRoutes(store)
  const path = shortestPath(routes.map(route => ({ id: route.id, a: route.a, b: route.b, weight: route.travelTicks })), from, to)
  if (!path) return fail('No open route reaches that planet.')
  const used = path.edges.map(id => routes.find(route => route.id === id)!)
  const units = lines.reduce((sum, line) => sum + line.amount, 0) + seats.length
  if (units > Math.min(...used.map(route => route.capacity))) return fail('That is more than the route can carry.')
  const have = store.getState().inventory
  const wanted = new Map<MaterialId, number>()
  for (const { material, amount } of lines) wanted.set(material, (wanted.get(material) ?? 0) + amount)
  for (const [material, amount] of wanted) if (have[material] < amount) return fail('Not enough stock.')
  const fee = options.free ? 0 : lines.reduce((sum, line) => sum + line.amount, 0) * rules.feePerUnit + seats.length * tuning.migration.seatFee
  if (fee > 0 && !charge(store, fee)) return fail('Not enough funds for the fee.')
  for (const [material, amount] of wanted) withdraw(store, material, amount)
  const tick = store.getState().habitat.tick
  const boarded = seats.map(seat => boardCreature(seat!, from, tick))
  if (boarded.length) store.setState(state => ({ residents: state.residents.filter(resident => !passengerIds.includes(resident.creatureId)) }))
  const state = logisticsOf(store).getState()
  const shipment: Shipment = { id: `shipment-${state.counter + 1}`, from, to, routeIds: path.edges, cargo: [...wanted].map(([material, amount]) => ({ material, amount })),
    passengers: boarded, fee, departTick: state.tick, arriveTick: state.tick + used.reduce((sum, route) => sum + route.travelTicks, 0), status: 'transit' }
  logisticsOf(store).setState({ counter: state.counter + 1, shipments: [...state.shipments, shipment] })
  return { ok: true, value: shipment }
}

// LOG-05/06: a shipment leaves transit exactly once, either delivered or returned to the origin with its fee.
function settle(store: Store, id: string, status: 'delivered' | 'returned') {
  const logistics = logisticsOf(store)
  const shipment = logistics.getState().shipments.find(s => s.id === id)
  if (!shipment || shipment.status !== 'transit') return false
  const mark = (value: Shipment['status']) => logistics.setState(state => ({ shipments: state.shipments.map(s => s.id === id ? { ...s, status: value } : s) }))
  mark(status)
  if (status === 'delivered' && patchPlanet(store, shipment.to, state => receive(store, state, shipment))) return true
  // Returned on purpose, or the destination could not be found: the cargo goes home rather than being lost.
  patchPlanet(store, shipment.from, state => receive(store, state, shipment))
  mark('returned')
  refund(store, shipment.fee)
  return true
}

export const cancelShipment = (store: Store, id: string) => settle(store, id, 'returned')

export function closeRoute(store: Store, id: string) {
  const logistics = logisticsOf(store)
  const route = logistics.getState().routes.find(r => r.id === id)
  if (!route || route.status === 'closed') return false
  logistics.setState(state => ({ routes: state.routes.map(r => r.id === id ? { ...r, status: 'closed' } : r) }))
  for (const shipment of logistics.getState().shipments) if (shipment.status === 'transit' && shipment.routeIds.includes(id)) settle(store, shipment.id, 'returned')
  return true
}

// LOG-07: the clock moves with the planet being played and stops when there is nothing on rails. Frozen planets are never stepped.
export function stepLogistics(store: Store) {
  const logistics = logisticsOf(store)
  if (logistics.getState().routes.length === 0) return
  const tick = logistics.getState().tick + 1
  logistics.setState({ tick })
  for (const shipment of logistics.getState().shipments) if (shipment.status === 'transit' && shipment.arriveTick <= tick) settle(store, shipment.id, 'delivered')
}

// LOG-09: where a train is, as a point between planet positions. Pure, so it is tested without three.js.
export function shipmentPoint(shipment: Shipment, routes: readonly Route[], positions: Record<string, readonly [number, number, number]>, tick: number) {
  if (shipment.status !== 'transit') return null
  const legs: { from: string; to: string; ticks: number }[] = []
  let at = shipment.from
  for (const id of shipment.routeIds) {
    const route = routes.find(r => r.id === id)
    if (!route) return null
    const next = route.a === at ? route.b : route.a
    legs.push({ from: at, to: next, ticks: route.travelTicks })
    at = next
  }
  let left = Math.max(0, tick - shipment.departTick)
  for (const leg of legs) {
    const a = positions[leg.from], b = positions[leg.to]
    if (!a || !b) return null
    if (left <= leg.ticks) {
      const t = left / leg.ticks
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] as [number, number, number]
    }
    left -= leg.ticks
  }
  const end = positions[at]
  return end ? [end[0], end[1], end[2]] as [number, number, number] : null
}

// LOG-08: everything of one material that exists anywhere: every visited planet plus every train in transit.
export function materialTotal(store: Store, material: MaterialId) {
  const planets = registryFor(store).list.getState().planets
  let total = 0
  for (const { seed } of planets) total += planetState(store, seed)?.inventory[material] ?? 0
  for (const shipment of logisticsOf(store).getState().shipments) {
    if (shipment.status === 'transit') total += shipment.cargo.filter(line => line.material === material).reduce((sum, line) => sum + line.amount, 0)
  }
  return total
}

// MIG-06: a homesick creature's own request for a seat home. Free, on the shortest open route; false when no route reaches home.
export function sendHome(store: Store, creatureId: string) {
  const creature = store.getState().residents.find(resident => resident.creatureId === creatureId)
  if (!creature) return false
  return ship(store, creature.origin, [], [creatureId], { free: true }).ok
}

// MIG-03: every creature that exists, once: those on any visited planet and those riding a train.
export function creatureIds(store: Store) {
  const ids: string[] = []
  for (const { seed } of registryFor(store).list.getState().planets) for (const resident of planetState(store, seed)?.residents ?? []) ids.push(resident.creatureId)
  for (const shipment of logisticsOf(store).getState().shipments) if (shipment.status === 'transit') for (const creature of shipment.passengers) ids.push(creature.creatureId)
  return ids
}
