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
import { registryFor } from '../state/planets'
import { stepSurface } from './surface'
import { tuning } from '../config/tuning'

// AUT-11 / RES: one fixed simulation step in a stable order. Residents hear terrain work from this same tick.
// Returns the resources collected during the step.
export function stepSimulation(world: PlanetWorld, store: ReturnType<typeof createRunStore>, advanceLogistics = true) {
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
  if (advanceLogistics) stepLogistics(store)
  store.setState((state) => ({ simTick: state.simTick + 1 }))
  updateSiteIndicators(store)
  return collected
}

// The visible planet's runners own the global transport clock. Other crews keep
// their own state and terrain, but settle each tick against the shared account.
export function stepBackgroundPlanets(store: ReturnType<typeof createRunStore>) {
  const registry = registryFor(store)
  for (const { seed } of registry.list.getState().planets) {
    const active = store.getState()
    if (active.economy.bankrupt) return
    if (seed === active.seed) continue
    const background = registry.backgroundStore(seed)
    if (!background) continue
    background.setState(state => ({
      metrics: { ...state.metrics, capital: active.metrics.capital },
      economy: { ...state.economy, bankrupt: active.economy.bankrupt },
    }))
    const world = registry.world(seed)
    stepSurface(world, background, 1 / tuning.miner.tickRate)
    stepSimulation(world, background, false)
    const next = background.getState()
    registry.save(next)
    store.setState(state => ({
      metrics: { ...state.metrics, capital: next.metrics.capital },
      economy: { ...state.economy, bankrupt: next.economy.bankrupt },
    }))
  }
}
