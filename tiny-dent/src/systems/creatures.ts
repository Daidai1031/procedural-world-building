import type { PassportKind, Resident, RunState } from '../state/runState'
import { tuning } from '../config/tuning'
import { arrivalSpot, temperamentOf } from './residents'
import type { PlanetWorld } from '../world/planet'

// D-068: moving a creature between a planet and a train. A passport is only ever appended to.
export const withPassport = (resident: Resident, kind: PassportKind, planet: string, tick: number): Resident =>
  ({ ...resident, passport: [...resident.passport, { kind, planet, tick }] })

// The record that goes into a shipment. From this moment the creature is on no planet.
export const boardCreature = (resident: Resident, planet: string, tick: number): Resident =>
  withPassport({ ...resident, life: 'traveling', request: null, home: null, burrowId: null, peek: null, path: [] }, 'departed', planet, tick)

// Every tick below is the planet's own `habitat.tick`, which runs in Manual and Auto alike (simTick only runs in Auto).
// A creature stepping off a train onto `state`'s planet: a native coming home, or a visitor with a trial ahead of it.
// It stands at a seeded spot and searches for a home like any resident that has lost one.
export function landCreature(world: Pick<PlanetWorld, 'densityAt'>, state: Pick<RunState, 'seed' | 'habitat'>, creature: Resident): Resident {
  const home = creature.origin === state.seed
  const arrivals = creature.passport.filter(entry => entry.kind === 'arrived' || entry.kind === 'returned').length
  return withPassport({
    ...creature,
    id: creature.creatureId,
    life: home ? 'native' : 'exploring',
    comfort: home ? 0.9 : 0.5,
    belonging: home ? 1 : tuning.migration.startBelonging,
    arrivedTick: state.habitat.tick, lifeTick: state.habitat.tick, request: null,
    home: null, burrowId: null, homeValid: false, peek: null, path: [],
    position: arrivalSpot(world, creature.creatureId, arrivals),
    state: 'searching', quietTicks: 0, disturbedTicks: 0, lastMoveTick: -Infinity,
    nextCheck: state.habitat.tick, nextWander: state.habitat.tick + temperamentOf(creature.species).wanderEvery, searchRetries: 0,
  }, home ? 'returned' : 'arrived', state.seed, state.habitat.tick)
}
