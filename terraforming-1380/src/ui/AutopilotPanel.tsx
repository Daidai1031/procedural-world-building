import { useMemo } from 'react'
import { RobotPreview } from './RobotPreview'
import type { createRunStore } from '../state/runState'
import { crewKinds, setAutoBroadcast, setAutopilotCount, type CrewKind } from '../systems/autopilot'
import { antennaCount } from '../systems/signal'
import { palette } from '../config/palette'
import { tuning } from '../config/tuning'

type Store = ReturnType<typeof createRunStore>

const names: Record<CrewKind, string> = { miner: 'Miner', gardener: 'Gardener', builder: 'Builder' }
const jobs: Record<CrewKind, string> = {
  miner: 'Digs ore and sells it',
  gardener: 'Plants and raises antennas',
  builder: 'Repairs holes and trims obstructions',
}
const phaseText: Record<string, string> = {
  idle: 'Ready', scanning: 'Scanning', moving: 'Flying', digging: 'Digging', collecting: 'Collecting',
  working: 'Working', paused: 'Waiting for funds', stopped: 'Resting',
}
const BROADCAST_NOTE = `Sends a signal every ${tuning.autopilot.broadcastEvery / tuning.miner.tickRate} s while antennas stand, until every distant planet has answered.`

function BroadcastToggle({ useRunStore }: { useRunStore: Store }) {
  const on = useRunStore(s => s.autopilot.autoBroadcast)
  return <label className="autopilot-toggle">
    <input type="checkbox" checked={on} onChange={event => setAutoBroadcast(useRunStore, event.currentTarget.checked)} />
    <span>Broadcast automatically<small>{BROADCAST_NOTE}</small></span>
  </label>
}

function CrewRow({ useRunStore, kind }: { useRunStore: Store; kind: CrewKind }) {
  const count = useRunStore(s => s.autopilot.counts[kind])
  return <li className="autopilot-row">
    <RobotPreview role={kind} />
    <div><h3>{names[kind]}s</h3><p>{jobs[kind]}</p></div>
    <div className="stepper" role="group" aria-label={`${names[kind]} count`}>
      <button type="button" aria-label={`Fewer ${names[kind]}s`} disabled={count <= 0} onClick={() => setAutopilotCount(useRunStore, kind, count - 1)}>−</button>
      <output aria-live="polite">{count}</output>
      <button type="button" aria-label={`More ${names[kind]}s`} disabled={count >= tuning.autopilot.maxPerKind} onClick={() => setAutopilotCount(useRunStore, kind, count + 1)}>+</button>
    </div>
  </li>
}

// D-043: choose the crew, then hand the whole planet over. Starts from either Auto or Manual.
export function AutopilotSetup({ useRunStore, onStart }: { useRunStore: Store; onStart: () => void }) {
  const total = useRunStore(s => s.autopilot.counts.miner + s.autopilot.counts.gardener + s.autopilot.counts.builder)
  return <>
    <p className="kicker">Autopilot · whole planet</p>
    <p className="autopilot-intro">Hand the planet to the crew. Every robot works the entire surface by itself, sweeping it sector by sector. You can take over again at any time.</p>
    <ul className="autopilot-crew" aria-label="Crew to deploy">
      {crewKinds.map(kind => <CrewRow key={kind} useRunStore={useRunStore} kind={kind} />)}
    </ul>
    <BroadcastToggle useRunStore={useRunStore} />
    <button type="button" className="btn btn-primary" disabled={total === 0}
      onClick={event => { onStart(); event.currentTarget.blur() }}>Hand over to autopilot</button>
    <p className="autopilot-note">Electricity is billed as usual. If funds fall below ₡{tuning.autopilot.holdBelow}, Gardeners and Builders wait while the Miners earn.</p>
  </>
}

// What the crew is doing right now, and the one button that returns control to the player.
export function AutopilotRunning({ useRunStore, onCancel }: { useRunStore: Store; onCancel: () => void }) {
  const roster = useRunStore(s => crewKinds.map(kind => (kind === 'miner' ? s.robots : kind === 'gardener' ? s.gardeners : s.builders)
    .map(robot => `${kind}|${robot.id}|${robot.phase}`).join(';')).filter(Boolean).join(';'))
  const holding = useRunStore(s => s.autopilot.holding)
  const mined = useRunStore(s => s.robots.reduce((sum, robot) => sum + robot.collectedMinerals, 0))
  const jobsDone = useRunStore(s => s.builders.reduce((sum, robot) => sum + robot.done, 0))
  const plants = useRunStore(s => s.structures.filter(structure => structure.kind === 'plant').length)
  const antennas = useRunStore(antennaCount)
  const signals = useRunStore(s => s.signal.broadcastCount)
  const rows = useMemo(() => roster.split(';').map(entry => {
    const [kind, id, phase] = entry.split('|') as [CrewKind, string, string]
    const same = roster.split(';').filter(other => other.startsWith(kind + '|'))
    return { kind, id, phase, label: same.length > 1 ? `${names[kind]} ${Number(id.split('-')[1]) + 1}` : names[kind] }
  }), [roster])
  const busy = rows.filter(row => !['idle', 'paused', 'stopped'].includes(row.phase)).length
  return <>
    <p className="kicker">Autopilot · running</p>
    <div className="panel-title"><h2>Crew on duty</h2>
      <span className="status" data-stopped={busy === 0}>{holding ? 'Holding spenders' : busy === 0 ? 'All resting' : `${busy} of ${rows.length} working`}</span></div>
    <ul className="autopilot-roster" aria-label="Crew status">
      {rows.map(row => <li key={row.id}><i style={{ background: palette.robot.band[row.kind] }} aria-hidden="true" />
        <span>{row.label}</span><em data-resting={row.phase === 'stopped' || row.phase === 'paused'}>{phaseText[row.phase] ?? row.phase}</em></li>)}
    </ul>
    <dl className="facts">
      <dt>Minerals mined</dt><dd>{mined}</dd>
      <dt>Plants · antennas</dt><dd>{plants} · {antennas}</dd>
      <dt>Terrain jobs</dt><dd>{jobsDone}</dd>
      <dt>Signals sent</dt><dd>{signals}</dd>
    </dl>
    <BroadcastToggle useRunStore={useRunStore} />
    <button type="button" className="btn btn-quiet" onClick={event => { onCancel(); event.currentTarget.blur() }}>Cancel autopilot · back to Auto</button>
  </>
}
