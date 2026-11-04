import type { RunState, createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { surfaceOf } from '../world/planet'

type Store = ReturnType<typeof createRunStore>
const active = (phase: string) => !['idle', 'paused', 'stopped'].includes(phase)
export function powerDemand(state: RunState) {
  const { power } = tuning.economy
  // D-060: a material can make one robot's work cost more.
  const crew: { power?: Partial<Record<keyof typeof power, number>> } = surfaceOf(state.seed).crew
  const load = (robots: { phase: string }[], role: keyof typeof power) =>
    robots.filter(r => active(r.phase)).length * power[role] * (crew.power?.[role] ?? 1)
  return load(state.robots, 'miner') + load(state.gardeners, 'gardener') + load(state.riggers, 'rigger') + load(state.builders, 'builder')
}

// D-039: minerals are sold the moment they are delivered. Stock only builds up while the run is bankrupt.
export function sellMinerals(store: Store) {
  const state = store.getState()
  const amount = state.economy.mineralStock
  if (amount === 0 || state.economy.bankrupt) return 0
  const revenue = amount * tuning.economy.mineralPrice * surfaceOf(state.seed).price
  store.setState({ metrics: { ...state.metrics, capital: state.metrics.capital + revenue },
    economy: { ...state.economy, mineralStock: 0, mineralsSold: state.economy.mineralsSold + amount, revenue: state.economy.revenue + revenue } })
  return revenue
}

// Funds may go negative; at or below 0 the UI warns, and reaching the bankruptcy limit ends the run.
export function billElectricity(store: Store) {
  const state = store.getState()
  if (state.economy.bankrupt) return
  const cost = powerDemand(state) * tuning.economy.electricityRate / (60 * tuning.miner.tickRate)
  if (!cost) return
  const capital = state.metrics.capital - cost
  store.setState({ metrics: { ...state.metrics, capital },
    economy: { ...state.economy, electricitySpent: state.economy.electricitySpent + cost,
      bankrupt: capital <= tuning.economy.bankruptcyLimit } })
}

// Manual terrain edits cost credits per voxel sample changed (removed plus added), so cost follows volume.
// D-060: harder ground costs more per sample and gives fewer samples per click.
export function manualTerrainCost(samples: number, hardness = 1) {
  return samples * tuning.economy.manualTerrainRate * hardness
}
export function billManualTerrain(store: Store, samples: number) {
  const state = store.getState()
  const cost = manualTerrainCost(samples, surfaceOf(state.seed).hardness)
  if (!cost) return
  const capital = state.metrics.capital - cost
  store.setState({ metrics: { ...state.metrics, capital },
    economy: { ...state.economy, terrainSpent: state.economy.terrainSpent + cost,
      bankrupt: capital <= tuning.economy.bankruptcyLimit } })
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))
// Lightweight estimates until habitat and structural connectivity are simulated.
export function siteIndicators(state: RunState) {
  const plants = state.structures.filter(s => s.kind === 'plant').length
  const remaining = Math.max(0, Math.min(1, state.planetRemaining))
  return {
    biosphere: clamp(tuning.ecology.baseline - (1 - remaining) * tuning.ecology.terrainLoss
      + plants * tuning.ecology.plantValue),
    stability: remaining * 100,
    developmentReadiness: clamp(state.economy.preparedSamples / tuning.ecology.preparedSamples * 100) * remaining,
  }
}
export function updateSiteIndicators(store: Store) {
  const state = store.getState()
  const indicators = siteIndicators(state)
  if (Object.entries(indicators).some(([key, value]) => state.metrics[key as keyof typeof indicators] !== value)) {
    store.setState({ metrics: { ...state.metrics, ...indicators } })
  }
}
