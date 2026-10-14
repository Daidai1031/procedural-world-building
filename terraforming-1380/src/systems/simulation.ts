import { billElectricity, updateSiteIndicators } from './economy'
import type { createRunStore } from '../state/runState'
import type { PlanetWorld } from '../world/planet'
import { stepBuilders } from './builder'
import { stepGardeners } from './gardener'
import { stepMiners } from './miner'
import { stepStructures } from './structures'

// AUT-11: one fixed simulation step in a stable order: Miners, Gardener, Builder, then plant growth.
// Returns the resources collected during the step.
export function stepSimulation(world: PlanetWorld, store: ReturnType<typeof createRunStore>) {
  billElectricity(store)
  const collected = stepMiners(world, store)
  stepGardeners(world, store)
  stepBuilders(world, store)
  stepStructures(world, store)
  store.setState((state) => ({ simTick: state.simTick + 1 }))
  updateSiteIndicators(store)
  return collected
}
