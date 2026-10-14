import test from 'node:test'
import assert from 'node:assert/strict'
import { createRunStore } from '../src/state/runState'
import { broadcast, distantPlanets, travelTo, visiblePlanetCount } from '../src/systems/signal'
import { tuning } from '../src/config/tuning'

const antenna = (id: string) => ({ id, kind: 'antenna' as const, position: [0, 2, 0] as [number, number, number], normal: [0, 1, 0] as [number, number, number], bornTick: 0 })

test('broadcasting needs an antenna and adds exposure per antenna', () => {
  const store = createRunStore('signal')
  assert.equal(broadcast(store), false)
  store.setState({ structures: [antenna('a'), antenna('b')] })
  assert.equal(broadcast(store), true)
  assert.deepEqual(store.getState().signal, { hasBroadcast: true, broadcastCount: 1, exposureScore: 2 })
  assert.equal(store.getState().hidden.cosmicExposure, 2)
})

test('distant planets appear only after enough broadcasts, up to a limit', () => {
  const { planetsAfter, maxPlanets } = tuning.signal
  assert.equal(visiblePlanetCount(planetsAfter - 1), 0)
  assert.equal(visiblePlanetCount(planetsAfter), 1)
  assert.equal(visiblePlanetCount(planetsAfter + 100), maxPlanets)
  const planets = distantPlanets('home')
  assert.equal(planets.length, maxPlanets)
  assert.deepEqual(planets, distantPlanets('home'))
  assert.equal(new Set(planets.map(p => p.seed)).size, maxPlanets)
})

test('travelling starts a fresh planet and keeps only the funds', () => {
  const store = createRunStore('home')
  store.setState(s => ({ metrics: { ...s.metrics, capital: 37 }, structures: [antenna('a')], economy: { ...s.economy, mineralStock: 4 } }))
  broadcast(store)
  travelTo(store, 'home/signal-1')
  const state = store.getState()
  assert.equal(state.seed, 'home/signal-1')
  assert.equal(state.metrics.capital, 37)
  assert.equal(state.structures.length, 0)
  assert.equal(state.economy.mineralStock, 0)
  assert.equal(state.signal.broadcastCount, 0)
})
