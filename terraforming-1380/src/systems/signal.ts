import { createInitialRunState, type RunState, type createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { hashSeed, planetConfig } from '../world/planet'
import { registryFor } from '../state/planets'

type Store = ReturnType<typeof createRunStore>

export const antennaCount = (state: RunState) => state.structures.filter(s => s.kind === 'antenna').length

// Design §9: a broadcast is an explicit player choice. Exposure grows with the number of antennas sending it.
export function broadcast(store: Store) {
  const state = store.getState()
  const antennas = antennaCount(state)
  if (!antennas || state.economy.bankrupt) return false
  const exposureScore = state.signal.exposureScore + antennas
  store.setState({
    signal: { hasBroadcast: true, broadcastCount: state.signal.broadcastCount + 1, exposureScore },
    hidden: { ...state.hidden, cosmicExposure: exposureScore },
  })
  return true
}

export function visiblePlanetCount(broadcastCount: number) {
  const { planetsAfter, maxPlanets } = tuning.signal
  return broadcastCount < planetsAfter ? 0 : Math.min(maxPlanets, broadcastCount - planetsAfter + 1)
}

export interface DistantPlanet {
  seed: string
  name: string
  // Screen position in normalized device coordinates and radius as a fraction of the half view height.
  ndc: [number, number]
  size: number
  color: string
}

// Corners and sides of the canvas, clear of the home planet at the default orbit view.
const SLOTS: [number, number][] = [[-0.82, 0.8], [0.82, -0.8], [0.84, 0.74], [-0.84, -0.76], [-0.9, 0.05]]
const TINTS = ['#a29d93', '#8f9a9e', '#b4a48c', '#95a08a', '#a8968f']

export function distantPlanets(seed: string): DistantPlanet[] {
  return SLOTS.slice(0, tuning.signal.maxPlanets).map((slot, index) => {
    const childSeed = `${seed}/signal-${index + 1}`
    const hash = hashSeed(childSeed)
    const jitter = (shift: number) => ((hash >>> shift) % 100) / 100 - 0.5
    return {
      seed: childSeed,
      name: `KX-${100 + (hash % 900)}`,
      ndc: [slot[0] + jitter(4) * 0.06, slot[1] + jitter(12) * 0.06],
      // PLN-02: the drawn size follows the planet's real radius, not a decorative choice.
      size: 0.04 + (planetConfig(childSeed).radius - tuning.planets.radius[0]) / (tuning.planets.radius[1] - tuning.planets.radius[0]) * 0.07,
      color: TINTS[hash % TINTS.length],
    }
  })
}

// PLN-03/04: leave the current planet exactly as it is and arrive at the target, new or revisited.
// Only the operating account and the player's tool selection travel with the contractor; D-040 freezes the planet left behind.
export function travelTo(store: Store, seed: string) {
  const current = store.getState()
  if (current.seed === seed) return
  const registry = registryFor(store)
  registry.world(current.seed).remeshDirty(Infinity)
  registry.save(current)
  const next = registry.snapshot(seed) ?? createInitialRunState(seed)
  registry.discover(seed)
  store.setState({ ...next, metrics: { ...next.metrics, capital: current.metrics.capital }, loadout: current.loadout,
    economy: { ...next.economy, bankrupt: current.economy.bankrupt } })
}
