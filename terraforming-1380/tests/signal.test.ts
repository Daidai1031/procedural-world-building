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

test('PLN-T1: edits, stock and structures survive a visit elsewhere, and funds are shared', async () => {
  const { registryFor } = await import('../src/state/planets')
  const store = createRunStore('home')
  const registry = registryFor(store)
  const home = registry.world('home')
  const density = home.densityAt(0, 5, 0)
  const point = { x: 0, y: 5, z: 0 }
  home.edit('dig', point, 1.5, 'radial')
  const edited = home.densityAt(0, 5, 0)
  assert.notEqual(edited, density)
  store.setState(s => ({ structures: [antenna('a')], soil: 7, metrics: { ...s.metrics, capital: 11 }, collectedIds: ['x'], simTick: 99 }))
  travelTo(store, 'home/signal-1')
  assert.equal(store.getState().structures.length, 0)
  store.setState(s => ({ metrics: { ...s.metrics, capital: 25 } }))
  travelTo(store, 'home')
  const back = store.getState()
  assert.equal(registry.world('home'), home)
  assert.equal(home.densityAt(0, 5, 0), edited)
  assert.equal(back.structures.length, 1)
  assert.equal(back.soil, 7)
  assert.deepEqual(back.collectedIds, ['x'])
  assert.equal(back.simTick, 99)
  assert.equal(back.metrics.capital, 25)
  travelTo(store, 'home/signal-1')
  travelTo(store, 'home')
  assert.equal(store.getState().soil, 7)
  assert.deepEqual(registry.list.getState().planets.map(p => p.seed), ['home', 'home/signal-1'])
})

test('PLN-T2: home keeps its values; signal planets vary size, relief and abundance independently', async () => {
  const { planetConfig } = await import('../src/world/planet')
  const { generateResourceClusters } = await import('../src/world/resourceClusters')
  assert.deepEqual(planetConfig('home'), tuning.planets.home)
  const configs = Array.from({ length: 40 }, (_, i) => planetConfig(`home/signal-${i + 1}`))
  for (const key of ['radius', 'relief', 'minerals', 'life'] as const) {
    const values = configs.map(c => c[key])
    const [min, max] = tuning.planets[key]
    assert.ok(values.every(v => v >= min && v <= max), key)
    assert.ok(Math.max(...values) - Math.min(...values) > (max - min) * 0.5, `${key} spreads across its range`)
  }
  // Independence: a large planet is not automatically rich, and vice versa.
  assert.ok(configs.some(c => c.radius > 0.3 && c.minerals < 1) && configs.some(c => c.radius < 0.28 && c.minerals > 1.2))
  const rich = configs.findIndex(c => c.minerals > 1.5), poor = configs.findIndex(c => c.minerals < 0.7)
  const minerals = (i: number) => generateResourceClusters(`home/signal-${i + 1}`).filter(c => c.category === 'mineral').length
  assert.ok(minerals(rich) > minerals(poor))
  assert.deepEqual(planetConfig('home/signal-3'), planetConfig('home/signal-3'))
})

test('SYS: the overview lists visited planets and unvisited signal planets once, near their sender', async () => {
  const { systemPlanets, planetPosition } = await import('../src/systems/system')
  const store = createRunStore('home')
  store.setState({ signal: { hasBroadcast: true, broadcastCount: 50, exposureScore: 50 } })
  let planets = systemPlanets(store)
  assert.equal(planets.filter(p => p.visited).length, 1)
  assert.equal(planets.length, 1 + tuning.signal.maxPlanets)
  travelTo(store, 'home/signal-1')
  planets = systemPlanets(store)
  assert.equal(new Set(planets.map(p => p.seed)).size, planets.length)
  assert.equal(planets.find(p => p.active)?.seed, 'home/signal-1')
  assert.equal(planets.filter(p => p.visited).length, 2)
  const [x, y, z] = planetPosition('home/signal-1')
  assert.ok(Math.hypot(x, y, z) > 5 && Math.hypot(x, y, z) < 9)
})
