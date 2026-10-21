import { RobotHelp } from './RobotHelp'
import { useCallback } from 'react'
import type { createRunStore } from '../state/runState'
import { pauseGardener, setGardenerArea, startGardener } from '../systems/gardener'
import { pauseRigger, setRiggerArea, startRigger } from '../systems/rigger'
import { placerFull, type PlacerPhase } from '../systems/placer'
import { tuning } from '../config/tuning'

const phaseText: Record<PlacerPhase, string> = {
  idle: 'Ready', scanning: 'Surveying', moving: 'Flying to site', working: 'Working',
  paused: 'Paused', stopped: 'Stopped',
}
const track: { phase: PlacerPhase; label: string }[] = [
  { phase: 'scanning', label: 'Survey' }, { phase: 'moving', label: 'Fly' }, { phase: 'working', label: 'Work' },
]
const running = ['scanning', 'moving', 'working']

const roles = {
  gardener: {
    list: 'gardeners', name: 'Gardener', title: 'Gardener 01', kind: 'plant', rules: tuning.gardener,
    help: 'Press Start: plants on the flattest ground', working: 'Planting', counted: 'Plants placed',
    setArea: setGardenerArea, start: startGardener, pause: pauseGardener,
  },
  rigger: {
    list: 'riggers', name: 'Rigger', title: 'Rigger 01', kind: 'antenna', rules: tuning.rigger,
    help: 'Press Start: raises antennas on the highest ground', working: 'Raising antenna', counted: 'Antennas raised',
    setArea: setRiggerArea, start: startRigger, pause: pauseRigger,
  },
} as const

// AUT-15, D-057: place a Gardener or Rigger, size its area, start or pause, and see what it is building.
export function PlacerPanel({ role, useRunStore, onMessage }: {
  role: 'gardener' | 'rigger'
  useRunStore: ReturnType<typeof createRunStore>
  onMessage: (message: string) => void
}) {
  const spec = roles[role]
  const robot = useRunStore((state) => state[spec.list][0])
  const full = useRunStore((state) => placerFull(state, spec.kind))
  const { id, phase, stopReason, placed } = robot
  const radius = robot.area?.radius ?? spec.rules.area.default
  const isRunning = running.includes(phase)
  const current = phase === 'paused' ? robot.resumePhase : phase
  const resize = useCallback((value: number) => {
    const area = useRunStore.getState()[spec.list][0].area
    if (area) spec.setArea(useRunStore, id, { ...area, radius: value })
  }, [useRunStore, spec, id])
  const isWaiting = phase === 'stopped' && stopReason === 'no-sites' && !full
  const toggle = () => {
    if (isRunning || isWaiting) spec.pause(useRunStore, id)
    else if (!spec.start(useRunStore, id)) {
      useRunStore.setState((state) => ({ loadout: { ...state.loadout, autoRobot: role } }))
      onMessage(`Click the planet to place the ${spec.name} first`)
    }
  }

  return <>
    <div className="panel-title">
      <h2>{spec.title}</h2>
      <RobotHelp name={spec.name} action={spec.help} />
      <span className="status" data-stopped={phase === 'stopped'}>
        {phase === 'working' ? spec.working : isWaiting ? 'Waiting for ground' : full && phase === 'stopped' ? 'Capacity reached' : phaseText[phase]}
      </span>
    </div>

    <label className="slider">Work area <output>{radius.toFixed(1)}</output>
      <input type="range" min={spec.rules.area.min} max={spec.rules.area.max} step={spec.rules.area.step}
        value={radius} onChange={(event) => resize(Number(event.currentTarget.value))} />
    </label>
    <button type="button" className="btn btn-primary" data-running={isRunning || isWaiting}
      onClick={(event) => { toggle(); event.currentTarget.blur() }}>
      {isRunning || isWaiting ? 'Pause' : phase === 'paused' ? 'Resume' : 'Start'}
    </button>
    <ol className="phase-track phase-track-3" aria-label="Work cycle">
      {track.map((item) => <li key={item.phase} aria-current={current === item.phase ? 'step' : undefined}
        data-active={current === item.phase}>{item.label}</li>)}
    </ol>
    <dl className="facts">
      <dt>{spec.counted}</dt><dd>{placed}</dd>
    </dl>
  </>
}
