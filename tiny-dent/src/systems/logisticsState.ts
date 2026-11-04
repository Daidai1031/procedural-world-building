import type { MaterialId } from '../content/materials'
import type { Resident } from '../state/runState'

// D-067: state that belongs to no single planet. It lives beside the planet registry, not in any RunState.
export type RouteStatus = 'open' | 'closed'
export interface Route {
  id: string
  a: string
  b: string
  cost: number
  capacity: number
  travelTicks: number
  status: RouteStatus
}
export interface CargoLine { material: MaterialId; amount: number }
export type ShipmentStatus = 'transit' | 'delivered' | 'returned'
export interface Shipment {
  id: string
  from: string
  to: string
  routeIds: string[]
  cargo: CargoLine[]
  /** D-068: the creatures themselves. In a train a creature exists nowhere else, so its whole record travels in the manifest. */
  passengers: Resident[]
  fee: number
  departTick: number
  arriveTick: number
  status: ShipmentStatus
}
export interface LogisticsState {
  tick: number
  routes: Route[]
  shipments: Shipment[]
  counter: number
}

export const emptyLogistics = (): LogisticsState => ({ tick: 0, routes: [], shipments: [], counter: 0 })
