import { useCallback } from 'react'
import { RobotPreview } from './RobotPreview'
import { RobotHelp } from './RobotHelp'
import type { AutoRobot, createRunStore } from '../state/runState'
import { GardenerPanel } from './GardenerPanel'
import { BuilderPanel } from './BuilderPanel'
import { pauseRobot, setWorkArea, startRobot, type RobotPhase, type StopReason } from '../systems/miner'
import { tuning } from '../config/tuning'

const phaseText: Record<RobotPhase, string> = {
  idle: 'Ready', scanning: 'Scanning', moving: 'Flying to site',
  digging: 'Digging', collecting: 'Collecting', paused: 'Paused', stopped: 'Stopped',
}
const track: { phase: RobotPhase; label: string }[] = [
  { phase: 'scanning', label: 'Scan' }, { phase: 'moving', label: 'Fly' },
  { phase: 'digging', label: 'Dig' }, { phase: 'collecting', label: 'Collect' },
]
const running = ['scanning', 'moving', 'digging', 'collecting']
const names: Record<AutoRobot, string> = { miner: 'Miner', gardener: 'Gardener', builder: 'Builder' }

// D-025: Auto mode holds one panel per robot; the selected robot is the one a planet click places.
export function AutoPanel({ useRunStore, onMessage }: {
  useRunStore: ReturnType<typeof createRunStore>
  onMessage: (message: string) => void
}) {
  const selected = useRunStore((state) => state.loadout.autoRobot)
  const choose = (robot: AutoRobot) => {
    useRunStore.setState((state) => ({ loadout: { ...state.loadout, autoRobot: robot } }))
    onMessage(`Left click the surface to place the ${names[robot]}`)
  }
  return <>
    <p className="kicker">Auto · crew stations / 03</p>
    <div className="crew-stations">
      {(['miner', 'gardener', 'builder'] as const).map((robot) => <section className="crew-station" data-selected={selected === robot} key={robot} aria-label={names[robot] + ' controls'} tabIndex={0}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('button, input, label, select, textarea, a, .robot-help')) return
          choose(robot)
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return
          event.preventDefault()
          choose(robot)
        }}>

        <button type="button" className="crew-model" aria-label={'Place ' + names[robot]} title={'Click to place ' + names[robot]}
          aria-pressed={selected === robot} onClick={() => choose(robot)}>
          <RobotPreview role={robot} />
        </button>
        <div className="crew-controls">
          {robot === 'gardener' ? <GardenerPanel useRunStore={useRunStore} onMessage={onMessage} />
            : robot === 'builder' ? <BuilderPanel useRunStore={useRunStore} onMessage={onMessage} />
            : <MinerPanel useRunStore={useRunStore} onMessage={onMessage} />}
        </div>
      </section>)}
    </div>
  </>
}

// AUT-01/10: place the Miner, size its area, start or pause, and read what it is doing and why it stopped.
function MinerPanel({ useRunStore, onMessage }: {
  useRunStore: ReturnType<typeof createRunStore>
  onMessage: (message: string) => void
}) {
  const id = useRunStore((state) => state.robots[0].id)
  const phase = useRunStore((state) => state.robots[0].phase)
  const resumePhase = useRunStore((state) => state.robots[0].resumePhase)
  const radius = useRunStore((state) => state.robots[0].area?.radius ?? tuning.miner.area.default)
  const targetId = useRunStore((state) => state.robots[0].targetId)
  const collected = useRunStore((state) => state.robots[0].collectedMinerals)
  const isRunning = running.includes(phase)
  const current = phase === 'paused' ? resumePhase : phase
  const resize = useCallback((value: number) => {
    const area = useRunStore.getState().robots[0].area
    if (area) setWorkArea(useRunStore, id, { ...area, radius: value })
  }, [useRunStore, id])
  const toggle = () => {
    if (isRunning) pauseRobot(useRunStore, id)
    else if (!startRobot(useRunStore, id)) {
      useRunStore.setState((state) => ({ loadout: { ...state.loadout, autoRobot: 'miner' } }))
      onMessage('Click the planet to place the Miner first')
    }
  }

  return <>
    <div className="panel-title">
      <h2>Miner 01</h2>
      <RobotHelp name="Miner" action="Press Start to mine and collect" />
      <span className="status" data-stopped={phase === 'stopped'}>{phaseText[phase]}</span>
    </div>

    <label className="slider">Work area <output>{radius.toFixed(1)}</output>
      <input type="range" min={tuning.miner.area.min} max={tuning.miner.area.max} step={tuning.miner.area.step}
        value={radius} onChange={(event) => resize(Number(event.currentTarget.value))} />
    </label>
    <button type="button" className="btn btn-primary" data-running={isRunning}
      onClick={(event) => { toggle(); event.currentTarget.blur() }}>
      {isRunning ? 'Pause' : phase === 'paused' ? 'Resume' : 'Start'}
    </button>
    <ol className="phase-track" aria-label="Work cycle">
      {track.map((item) => <li key={item.phase} aria-current={current === item.phase ? 'step' : undefined}
        data-active={current === item.phase}>{item.label}</li>)}
    </ol>
    <dl className="facts">
      <dt>Target</dt><dd>{targetId ?? '—'}</dd>
      <dt>Minerals mined</dt><dd>{collected}</dd>
    </dl>
  </>
}
