import test from 'node:test'
import assert from 'node:assert/strict'
import { createRunStore } from '../src/state/runState'
import { billElectricity, powerDemand, sellMinerals, siteIndicators } from '../src/systems/economy'
import { tuning } from '../src/config/tuning'

test('selling transfers inventory to capital exactly once, leaving discoveries unchanged', () => {
  const store = createRunStore('economy')
  store.setState(s => ({ economy: { ...s.economy, mineralStock: 3 }, discoveries: { lifeClusterIds: ['life'], artifactIds: ['archive'] } }))
  assert.equal(sellMinerals(store), 3 * tuning.economy.mineralPrice)
  assert.equal(store.getState().metrics.capital, tuning.economy.startingCapital + 3 * tuning.economy.mineralPrice)
  assert.equal(store.getState().economy.mineralStock, 0)
  assert.equal(sellMinerals(store), 0)
  assert.deepEqual(store.getState().discoveries, { lifeClusterIds: ['life'], artifactIds: ['archive'] })
})

test('electricity is charged per simulated minute, only for running robots', () => {
  const store = createRunStore('electricity')
  billElectricity(store)
  assert.equal(store.getState().economy.electricitySpent, 0)
  store.setState(s => ({ robots: s.robots.map(r => ({ ...r, phase: 'digging' })), builders: s.builders.map(r => ({ ...r, phase: 'working' })) }))
  assert.equal(powerDemand(store.getState()), tuning.economy.power.miner + tuning.economy.power.builder)
  for (let i = 0; i < 60 * tuning.miner.tickRate; i++) billElectricity(store)
  const expected = powerDemand(store.getState()) * tuning.economy.electricityRate
  assert.ok(Math.abs(store.getState().economy.electricitySpent - expected) < 1e-8)
  assert.ok(Math.abs(store.getState().metrics.capital + expected - tuning.economy.startingCapital) < 1e-8)
})

test('funds go into debt while running and bankruptcy ends billing and sales at the limit', () => {
  const store = createRunStore('debt')
  store.setState(s => ({ metrics: { ...s.metrics, capital: 0 }, robots: s.robots.map(r => ({ ...r, phase: 'digging' })), economy: { ...s.economy, mineralStock: 1 } }))
  billElectricity(store)
  assert.ok(store.getState().metrics.capital < 0)
  assert.equal(store.getState().robots[0].phase, 'digging')
  assert.equal(store.getState().economy.bankrupt, false)
  store.setState(s => ({ metrics: { ...s.metrics, capital: tuning.economy.bankruptcyLimit + powerDemand(s) * tuning.economy.electricityRate / (120 * tuning.miner.tickRate) } }))
  billElectricity(store)
  assert.equal(store.getState().economy.bankrupt, true)
  const spent = store.getState().economy.electricitySpent
  billElectricity(store)
  assert.equal(store.getState().economy.electricitySpent, spent)
  assert.equal(sellMinerals(store), 0)
  assert.equal(store.getState().economy.mineralStock, 1)
})

test('plant loss, life disturbance and terrain loss reduce ecological estimates', () => {
  const store = createRunStore('ecology')
  const baseline = siteIndicators(store.getState())
  store.setState({ structures: [{ id: 'p', kind: 'plant', position: [0, 1, 0], normal: [0, 1, 0], bornTick: 0 }] })
  assert.ok(siteIndicators(store.getState()).biosphere > baseline.biosphere)
  store.setState(s => ({ structures: [], planetRemaining: 0.8, discoveries: { ...s.discoveries, lifeClusterIds: ['l'] }, economy: { ...s.economy, preparedSamples: 1000 } }))
  const result = siteIndicators(store.getState())
  assert.ok(result.biosphere < baseline.biosphere)
  assert.equal(result.stability, 80)
  assert.ok(result.developmentReadiness > 0 && result.developmentReadiness <= 100)
})
