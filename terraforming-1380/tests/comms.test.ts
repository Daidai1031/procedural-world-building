import test from 'node:test'
import assert from 'node:assert/strict'
import { createRunStore } from '../src/state/runState'
import { commsMessages } from '../src/systems/comms'

test('comms messages follow robot and account state and clear when resolved', () => {
  const store = createRunStore('comms')
  store.setState(s => ({ metrics: { ...s.metrics, capital: 100 } }))
  assert.deepEqual(commsMessages(store.getState()), [])
  store.setState(s => ({ robots: s.robots.map(r => ({ ...r, phase: 'stopped', stopReason: 'no-targets' })) }))
  const [message] = commsMessages(store.getState())
  assert.equal(message.id, 'miner-no-targets')
  assert.deepEqual(message.action, { kind: 'robot', robot: 'miner', label: 'Place the Miner' })
  store.setState(s => ({ robots: s.robots.map(r => ({ ...r, phase: 'idle', stopReason: null })) }))
  assert.deepEqual(commsMessages(store.getState()), [])
})

test('low funds point at the Miner, and stop once bankrupt', () => {
  const store = createRunStore('funds')
  assert.deepEqual(commsMessages(store.getState())[0].action, { kind: 'robot', robot: 'miner', label: 'Open the Miner' })
  store.setState(s => ({ economy: { ...s.economy, bankrupt: true } }))
  assert.deepEqual(commsMessages(store.getState()), [])
})
