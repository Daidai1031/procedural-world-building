import type { AutoRobot, RunState } from '../state/runState'
import { placerFull } from './placer'
import { tuning } from '../config/tuning'

export type CommsAction = { kind: 'robot'; robot: AutoRobot; label: string } | { kind: 'takeover'; label: string }

export interface CommsMessage {
  id: string
  from: string
  text: string
  level: 'info' | 'warn' | 'alert'
  action?: CommsAction
}

// Messages are derived from the run state, so one disappears by itself as soon as its cause is resolved.
export function commsMessages(state: RunState): CommsMessage[] {
  const out: CommsMessage[] = []
  if (state.autopilot.enabled) return autopilotMessages(state)
  const miner = state.robots[0], gardener = state.gardeners[0], rigger = state.riggers[0], builder = state.builders[0]
  if (miner.stopReason === 'no-targets') out.push({ id: 'miner-no-targets', from: 'Miner 01', level: 'warn',
    text: 'No sellable minerals in sight. Place the crew at a new site.', action: { kind: 'robot', robot: 'miner', label: 'Place the Miner' } })
  if (miner.stopReason === 'blocked') out.push({ id: 'miner-blocked', from: 'Miner 01', level: 'warn',
    text: 'The Miner could not make progress and stopped.', action: { kind: 'robot', robot: 'miner', label: 'Place the Miner' } })
  if (builder.stopReason === 'level') out.push({ id: 'builder-level', from: 'Builder 01', level: 'info',
    text: 'The area is level. Place the Builder somewhere new.', action: { kind: 'robot', robot: 'builder', label: 'Place the Builder' } })
  if (builder.stopReason === 'no-soil') out.push({ id: 'builder-no-soil', from: 'Builder 01', level: 'warn',
    text: 'Out of soil. Let the Miner dig to bring more.', action: { kind: 'robot', robot: 'miner', label: 'Open the Miner' } })
  if (builder.stopReason === 'blocked') out.push({ id: 'builder-blocked', from: 'Builder 01', level: 'warn',
    text: 'The Builder could not reach its site and stopped.', action: { kind: 'robot', robot: 'builder', label: 'Place the Builder' } })
  for (const [id, name, robot, kind, noun] of [['gardener', 'Gardener', gardener, 'plant', 'Plant'], ['rigger', 'Rigger', rigger, 'antenna', 'Antenna']] as const) {
    if (robot.stopReason === 'no-sites') {
      out.push(placerFull(state, kind)
        ? { id: id + '-full', from: name + ' 01', level: 'info', text: noun + ' capacity reached.' }
        : { id: id + '-no-sites', from: name + ' 01', level: 'info',
          text: 'Waiting for suitable ground. Builder work inside this area will trigger a new survey.',
          action: { kind: 'robot', robot: 'builder', label: 'Open the Builder' } })
    }
    if (robot.stopReason === 'blocked') out.push({ id: id + '-blocked', from: name + ' 01', level: 'warn',
      text: 'The ' + name + ' could not reach its site and stopped.', action: { kind: 'robot', robot: id, label: 'Place the ' + name } })
  }
  const capital = state.metrics.capital
  if (capital <= 0 && !state.economy.bankrupt) {
    const warning = `Close to bankruptcy. Funds are ₡${capital.toFixed(2)}; the run ends at ${tuning.economy.bankruptcyLimit < 0 ? '−' : ''}₡${Math.abs(tuning.economy.bankruptcyLimit)}.`
    out.push({ id: 'funds-low', from: 'Accounts', level: 'alert',
      text: warning, action: { kind: 'robot', robot: 'miner', label: 'Open the Miner' } })
  }
  return out
}

// D-043: under Autopilot the individual robots handle their own stops, so the crew reports as one voice.
function autopilotMessages(state: RunState): CommsMessage[] {
  const out: CommsMessage[] = []
  const takeover: CommsAction = { kind: 'takeover', label: 'Take over' }
  if (state.autopilot.holding) out.push({ id: 'autopilot-holding', from: 'Autopilot', level: 'warn', action: takeover,
    text: 'Funds are low. Gardeners, Riggers and Builders wait while the Miners earn.' })
  const crew = [...state.robots, ...state.gardeners, ...state.riggers, ...state.builders]
  if (crew.length > 0 && crew.every(robot => robot.phase === 'stopped')) out.push({ id: 'autopilot-resting', from: 'Autopilot', level: 'info', action: takeover,
    text: 'The crew is resting. Nothing is left to mine, build or plant for now.' })
  if (state.metrics.capital <= 0 && !state.economy.bankrupt) out.push({ id: 'funds-low', from: 'Accounts', level: 'alert', action: takeover,
    text: `Close to bankruptcy. Funds are ₡${state.metrics.capital.toFixed(2)}; the run ends at ${tuning.economy.bankruptcyLimit < 0 ? '−' : ''}₡${Math.abs(tuning.economy.bankruptcyLimit)}.` })
  return out
}
