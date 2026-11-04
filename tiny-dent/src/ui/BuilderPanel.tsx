import { RobotHelp } from './RobotHelp'
import { useCallback } from 'react'
import type { createRunStore } from '../state/runState'
import {
  pauseBuilder, setBuilderArea, startBuilder, type BuilderPhase, type BuilderStopReason,
} from '../systems/builder'
import { tuning } from '../config/tuning'

const phaseText: Record<BuilderPhase, string> = {
  idle: 'Ready', scanning: 'Surveying', moving: 'Flying to site', working: 'Working',
  paused: 'Paused', stopped: 'Stopped',
}
const track: { phase: BuilderPhase; label: string }[] = [
  { phase: 'scanning', label: 'Survey' }, { phase: 'moving', label: 'Fly' }, { phase: 'working', label: 'Work' },
]
const running = ['scanning', 'moving', 'working']

// D-026: place the Builder, size its area, start or pause, and see what it is shaping and how much soil is left.
export function BuilderPanel({ useRunStore, onMessage }: {
  useRunStore: ReturnType<typeof createRunStore>
  onMessage: (message: string) => void
}) {
  const id = useRunStore((state) => state.builders[0].id)
  const phase = useRunStore((state) => state.builders[0].phase)
  const resumePhase = useRunStore((state) => state.builders[0].resumePhase)
  const radius = useRunStore((state) => state.builders[0].area?.radius ?? tuning.builder.area.default)
  const job = useRunStore((state) => state.builders[0].job?.kind ?? null)
  const done = useRunStore((state) => state.builders[0].done)
  const soil = useRunStore((state) => state.soil)
  const isRunning = running.includes(phase)
  const current = phase === 'paused' ? resumePhase : phase
  const resize = useCallback((value: number) => {
    const area = useRunStore.getState().builders[0].area
    if (area) setBuilderArea(useRunStore, id, { ...area, radius: value })
  }, [useRunStore, id])
  const toggle = () => {
    if (isRunning) pauseBuilder(useRunStore, id)
    else if (!startBuilder(useRunStore, id)) {
      useRunStore.setState((state) => ({ loadout: { ...state.loadout, autoRobot: 'builder' } }))
      onMessage('Click the planet to place the Builder first')
    }
  }

  return <>
    <div className="panel-title">
      <h2>Builder 01</h2>
      <RobotHelp name="Builder" action="Press Start: fill local holes, then trim isolated bumps" />
      <span className="status" data-stopped={phase === 'stopped'}>
        {phase === 'working' && job ? (job === 'flatten' ? 'Flattening' : 'Filling') : phaseText[phase]}
      </span>
    </div>

    <label className="slider">Work area <output>{radius.toFixed(1)}</output>
      <input type="range" min={tuning.builder.area.min} max={tuning.builder.area.max} step={tuning.builder.area.step}
        value={radius} onChange={(event) => resize(Number(event.currentTarget.value))} />
    </label>
    <button type="button" className="btn btn-primary" data-running={isRunning}
      onClick={(event) => { toggle(); event.currentTarget.blur() }}>
      {isRunning ? 'Pause' : phase === 'paused' ? 'Resume' : 'Start'}
    </button>
    <ol className="phase-track phase-track-3" aria-label="Work cycle">
      {track.map((item) => <li key={item.phase} aria-current={current === item.phase ? 'step' : undefined}
        data-active={current === item.phase}>{item.label}</li>)}
    </ol>
    <dl className="facts">
      <dt>Current job</dt><dd>{job === 'flatten' ? 'Flatten' : job === 'fill' ? 'Fill' : '—'}</dd>
      <dt>Soil in stock</dt><dd>{soil}</dd>
      <dt>Jobs done</dt><dd>{done}</dd>
    </dl>
  </>
}
