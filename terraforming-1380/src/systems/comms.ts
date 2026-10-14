import type { AutoRobot, RunState } from '../state/runState'
import { nextJob } from './gardener'
import { tuning } from '../config/tuning'

export type CommsAction = { kind: 'robot'; robot: AutoRobot; label: string } | { kind: 'sell'; label: string }

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
  const miner = state.robots[0], gardener = state.gardeners[0], builder = state.builders[0]
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
  if (gardener.stopReason === 'no-sites') {
    const plants = state.structures.filter(s => s.kind === 'plant').length
    const antennas = state.structures.filter(s => s.kind === 'antenna').length
    out.push(nextJob(gardener.placed, plants, antennas) === null
      ? { id: 'gardener-full', from: 'Gardener 01', level: 'info', text: 'Plant and antenna capacity reached.' }
      : { id: 'gardener-no-sites', from: 'Gardener 01', level: 'info',
        text: 'Waiting for suitable ground. Builder work inside this area will trigger a new survey.',
        action: { kind: 'robot', robot: 'builder', label: 'Open the Builder' } })
  }
  if (gardener.stopReason === 'blocked') out.push({ id: 'gardener-blocked', from: 'Gardener 01', level: 'warn',
    text: 'The Gardener could not reach its site and stopped.', action: { kind: 'robot', robot: 'gardener', label: 'Place the Gardener' } })
  const capital = state.metrics.capital
  if (capital <= 0 && !state.economy.bankrupt) {
    const stock = state.economy.mineralStock
    const worth = stock * tuning.economy.mineralPrice
    const warning = `Close to bankruptcy. Funds are ₡${capital.toFixed(2)}; the run ends at ${tuning.economy.bankruptcyLimit < 0 ? '−' : ''}₡${Math.abs(tuning.economy.bankruptcyLimit)}.`
    out.push({ id: 'funds-low', from: 'Accounts', level: 'alert',
      text: stock > 0 ? `${warning} You still hold ${stock} unsold mineral${stock === 1 ? '' : 's'} worth ₡${worth}. Sell them first.` : warning,
      action: stock > 0 ? { kind: 'sell', label: `Sell ${stock} mineral${stock === 1 ? '' : 's'} · +₡${worth}` } : { kind: 'robot', robot: 'miner', label: 'Open the Miner' } })
  }
  return out
}
