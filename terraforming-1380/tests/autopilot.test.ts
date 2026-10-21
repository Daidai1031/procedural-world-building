import assert from 'node:assert/strict'
import test from 'node:test'
import { tuning } from '../src/config/tuning'
import { createRunStore } from '../src/state/runState'
import { cancelAutopilot, sectorArea, sectorDirection, startAutopilot } from '../src/systems/autopilot'
import { addStructure, groundPoint } from '../src/systems/structures'
import { commsMessages } from '../src/systems/comms'
import { stepSimulation } from '../src/systems/simulation'
import { unit } from '../src/systems/geometry'
import { PlanetWorld } from '../src/world/planet'

type Store = ReturnType<typeof createRunStore>
const crew = { miner: 2, gardener: 2, builder: 1 }

function setup(seed = '1380', counts = crew) {
  const world = new PlanetWorld(seed)
  const store = createRunStore(seed)
  assert.equal(startAutopilot(store, world, counts), true)
  return { world, store }
}

function run(world: PlanetWorld, store: Store, ticks: number, until: () => boolean = () => false) {
  for (let i = 0; i < ticks && !until(); i += 1) stepSimulation(world, store)
}

test('AUTO-01: starting deploys the chosen crew, switches to Auto and starts every robot in its own sector', () => {
  const { store } = setup()
  const state = store.getState()
  assert.equal(state.autopilot.enabled, true)
  assert.equal(state.loadout.activeTool, 'auto')
  assert.deepEqual([state.robots.length, state.gardeners.length, state.builders.length], [2, 2, 1])
  assert.deepEqual(state.robots.map(r => r.id), ['miner-0', 'miner-1'])
  for (const robot of [...state.robots, ...state.gardeners, ...state.builders]) assert.equal(robot.phase, 'scanning')
  const centers = state.robots.map(r => r.area!.center.join())
  assert.equal(new Set(centers).size, 2, 'two Miners are sent to different sectors')
  assert.equal(state.robots[0].area!.radius, tuning.autopilot.miner.radius)
})

test('AUTO-02: an empty crew cannot start, and counts are clamped to the maximum', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  assert.equal(startAutopilot(store, world, { miner: 0, gardener: 0, builder: 0 }), false)
  assert.equal(store.getState().autopilot.enabled, false)
  startAutopilot(store, world, { miner: 99, gardener: 0, builder: 0 })
  assert.equal(store.getState().robots.length, tuning.autopilot.maxPerKind)
  assert.equal(store.getState().gardeners.length, 0)
})

test('AUTO-03: sectors cover the whole planet', () => {
  const world = new PlanetWorld('1380')
  for (const kind of ['miner', 'gardener', 'builder'] as const) {
    const { sectors, radius } = tuning.autopilot[kind]
    const areas = Array.from({ length: sectors }, (_, k) => sectorArea(world, kind, k))
    // Sample directions over the sphere; each must be within a sector's radius of some sector center.
    let uncovered = 0
    const samples = 400
    for (let i = 0; i < samples; i += 1) {
      const point = sectorDirection(i, samples)
      const ground = unit(point).map(c => c * Math.hypot(...areas[0].center)) as [number, number, number]
      if (!areas.some(a => Math.hypot(ground[0] - a.center[0], ground[1] - a.center[1], ground[2] - a.center[2]) <= radius * 1.05)) uncovered += 1
    }
    assert.ok(uncovered / samples < 0.02, `${kind}: ${uncovered}/${samples} directions uncovered`)
  }
})

test('AUTO-04: the crew works unattended — minerals are mined and sold, ground is shaped', () => {
  const { world, store } = setup('1380', { miner: 2, gardener: 1, builder: 1 })
  run(world, store, 12000, () => store.getState().economy.mineralsSold >= 3)
  const state = store.getState()
  assert.ok(state.economy.mineralsSold >= 3, `sold ${state.economy.mineralsSold}`)
  assert.ok(state.metrics.capital > 0 || state.economy.revenue > 0)
  run(world, store, 6000)
  assert.ok(store.getState().builders[0].done > 0 || store.getState().structures.length > 0, 'Builder or Gardener produced something')
})

test('AUTO-05: a stopped robot moves on to the next sector, and rests after a fruitless lap', () => {
  const { world, store } = setup('1380', { miner: 1, gardener: 0, builder: 0 })
  // Take every mineral off the planet: the Miner has nothing to find anywhere.
  store.setState(s => ({ collectedIds: s.resourceClusters.map(c => c.id) }))
  store.setState(s => ({ robots: s.robots.map(r => ({ ...r, phase: 'stopped', stopReason: 'no-targets' })) }))
  const before = store.getState().robots[0].area!.center.join()
  run(world, store, 3)
  // No mineral left on the planet, so it stays put instead of lapping forever.
  assert.equal(store.getState().robots[0].phase, 'stopped')
  assert.equal(store.getState().robots[0].area!.center.join(), before)
  // With a mineral back on the planet it relocates.
  store.setState({ collectedIds: [] })
  run(world, store, 2)
  assert.notEqual(store.getState().robots[0].area!.center.join(), before)
  assert.equal(store.getState().autopilot.crew['miner-0'].cursor !== undefined, true)
})

test('AUTO-06: Gardeners and Builders wait while funds are low and resume when they recover; Miners keep working', () => {
  const { world, store } = setup()
  store.setState(s => ({ metrics: { ...s.metrics, capital: tuning.autopilot.holdBelow - 1 } }))
  run(world, store, 2)
  const held = store.getState()
  assert.equal(held.autopilot.holding, true)
  assert.ok(held.gardeners.every(g => g.phase === 'paused') && held.builders.every(b => b.phase === 'paused'))
  assert.ok(held.robots.every(r => r.phase !== 'paused'))
  assert.equal(commsMessages(held)[0].id, 'autopilot-holding')
  // Between the two thresholds the hold stays on.
  store.setState(s => ({ metrics: { ...s.metrics, capital: (tuning.autopilot.holdBelow + tuning.autopilot.resumeAbove) / 2 } }))
  run(world, store, 1)
  assert.equal(store.getState().autopilot.holding, true)
  store.setState(s => ({ metrics: { ...s.metrics, capital: tuning.autopilot.resumeAbove + 1 } }))
  run(world, store, 2)
  assert.equal(store.getState().autopilot.holding, false)
  assert.ok(store.getState().gardeners.every(g => g.phase !== 'paused'))
})

test('AUTO-07: broadcasts go out by themselves once an antenna stands, spaced apart, until every planet answered', () => {
  const { world, store } = setup('1380', { miner: 1, gardener: 0, builder: 0 })
  run(world, store, 5)
  assert.equal(store.getState().signal.broadcastCount, 0, 'no antenna, no signal')
  const anchor = groundPoint(world, [0, 0, 1])
  addStructure(store, 'antenna', anchor, unit(anchor))
  run(world, store, 2)
  assert.equal(store.getState().signal.broadcastCount, 1)
  run(world, store, tuning.autopilot.broadcastEvery - 10)
  assert.equal(store.getState().signal.broadcastCount, 1, 'too soon for the next one')
  run(world, store, 20)
  assert.equal(store.getState().signal.broadcastCount, 2)
  // Switching it off stops the signals.
  store.setState(s => ({ autopilot: { ...s.autopilot, autoBroadcast: false } }))
  run(world, store, tuning.autopilot.broadcastEvery + 5)
  assert.equal(store.getState().signal.broadcastCount, 2)
  // Once every distant planet is visible there is nothing more to call.
  store.setState(s => ({ autopilot: { ...s.autopilot, autoBroadcast: true }, signal: { ...s.signal, broadcastCount: tuning.signal.planetsAfter + tuning.signal.maxPlanets } }))
  run(world, store, tuning.autopilot.broadcastEvery + 5)
  assert.equal(store.getState().signal.broadcastCount, tuning.signal.planetsAfter + tuning.signal.maxPlanets)
})

test('AUTO-08: cancelling returns to Auto with one paused robot of each kind and normal work areas', () => {
  const { world, store } = setup()
  run(world, store, 60)
  cancelAutopilot(store)
  const state = store.getState()
  assert.equal(state.autopilot.enabled, false)
  assert.deepEqual([state.robots.length, state.gardeners.length, state.builders.length], [1, 1, 1])
  assert.equal(state.loadout.activeTool, 'auto')
  for (const robot of [state.robots[0], state.gardeners[0], state.builders[0]]) assert.equal(robot.phase, 'paused')
  assert.equal(state.robots[0].area!.radius, tuning.miner.area.default)
  assert.equal(state.builders[0].area!.radius, tuning.builder.area.default)
  // The controller no longer touches anything.
  const snapshot = JSON.stringify([state.robots, state.gardeners, state.builders])
  store.setState(s => ({ simTick: s.simTick }))
  const paused = JSON.stringify([store.getState().robots, store.getState().gardeners, store.getState().builders])
  assert.equal(paused, snapshot)
})

test('AUTO-09: cancelling works with an empty kind, and the crew sizes are remembered for next time', () => {
  const { store } = setup('1380', { miner: 1, gardener: 0, builder: 0 })
  assert.equal(store.getState().gardeners.length, 0)
  cancelAutopilot(store)
  assert.equal(store.getState().gardeners.length, 1)
  assert.equal(store.getState().gardeners[0].id, 'gardener-0')
  assert.deepEqual(store.getState().autopilot.counts, { miner: 1, gardener: 0, builder: 0 })
})

test('AUTO-10: Auto-mode robots keep their old spawn positions', () => {
  const store = createRunStore('1380')
  assert.equal(store.getState().robots[0].id, 'miner-0')
  assert.notDeepEqual(store.getState().robots[0].position, store.getState().gardeners[0].position)
})

test('AUTO-11: Builders share one pass over the planet, take different sectors, and retire when none are left', () => {
  const { world, store } = setup('1380', { miner: 0, gardener: 0, builder: 2 })
  // No Miner means no income, so give the Builders enough funds to finish without the low-funds hold.
  store.setState(s => ({ metrics: { ...s.metrics, capital: 1000 } }))
  const { sectors } = tuning.autopilot.builder
  assert.equal(store.getState().autopilot.claimed, 2)
  assert.equal(new Set(store.getState().builders.map(b => b.area!.center.join())).size, 2)
  assert.ok(store.getState().builders.every(b => b.level === store.getState().autopilot.level), 'one level for the whole planet')
  run(world, store, 60000, () => store.getState().autopilot.claimed === sectors
    && store.getState().builders.every(b => b.phase === 'stopped'))
  const done = store.getState()
  assert.ok(done.builders.every(b => b.phase === 'stopped'), 'the pass finished')
  assert.equal(done.autopilot.claimed, sectors)
  const jobs = done.builders.reduce((sum, b) => sum + b.done, 0)
  assert.ok(jobs <= tuning.autopilot.builderJobsPerSector * sectors, `${jobs} jobs within the budget`)
  run(world, store, 3000)
  assert.equal(store.getState().builders.reduce((sum, b) => sum + b.done, 0), jobs, 'retired Builders stay put')
  assert.equal(commsMessages(store.getState()).some(m => m.id === 'autopilot-resting'), true)
})
