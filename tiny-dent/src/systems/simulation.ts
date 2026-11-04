import { billElectricity, updateSiteIndicators } from './economy'
import type { createRunStore } from '../state/runState'
import type { PlanetWorld } from '../world/planet'
import { stepAutopilot } from './autopilot'
import { stepBuilders } from './builder'
import { stepGardeners } from './gardener'
import { stepRiggers } from './rigger'
import { stepMiners } from './miner'
import { stepStructures } from './structures'
import { stepResidents } from './residents'
import { meltUnderRobots } from './surface'
import { stepLogistics } from './logistics'
import { stepMigration } from './migration'
import { stepTraffic } from './traffic'
import { stepWater } from './water'

// AUT-11 / RES: one fixed simulation step in a stable order. Residents hear terrain work from this same tick.
// Returns the resources collected during the step.
export function stepSimulation(world: PlanetWorld, store: ReturnType<typeof createRunStore>) {
  stepAutopilot(world, store)
  billElectricity(store)
  const collected = stepMiners(world, store)
  stepGardeners(world, store)
  stepRiggers(world, store)
  stepBuilders(world, store)
  meltUnderRobots(world, store)
  stepStructures(world, store)
  stepResidents(world, store)
  stepMigration(store)
  stepTraffic(world, store)
  stepWater(world, store)
  stepLogistics(store)
  store.setState((state) => ({ simTick: state.simTick + 1 }))
  updateSiteIndicators(store)
  return collected
}
