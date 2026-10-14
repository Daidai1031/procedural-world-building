import { useCallback } from 'react'
import type { createRunStore } from '../state/runState'
import {
  nextJob, pauseGardener, setGardenerArea, startGardener, type GardenerPhase, type GardenerStopReason,
} from '../systems/gardener'
import { tuning } from '../config/tuning'

const phaseText: Record<GardenerPhase, string> = {
  idle: 'Ready', scanning: 'Surveying', moving: 'Flying to site', working: 'Working',
  paused: 'Paused', stopped: 'Stopped',
}
const stopText: Record<GardenerStopReason, string> = {
  'no-sites': 'No suitable ground left in this area. Place the Gardener somewhere new.',
  blocked: 'The Gardener could not reach its site and stopped.',
}
const track: { phase: GardenerPhase; label: string }[] = [
  { phase: 'scanning', label: 'Survey' }, { phase: 'moving', label: 'Fly' }, { phase: 'working', label: 'Work' },
]
const running = ['scanning', 'moving', 'working']

// AUT-15: place the Gardener, size its area, start or pause, and see which job comes next.
export function GardenerPanel({ useRunStore, onMessage }: {
  useRunStore: ReturnType<typeof createRunStore>
  onMessage: (message: string) => void
}) {
  const id = useRunStore((state) => state.gardeners[0].id)
  const phase = useRunStore((state) => state.gardeners[0].phase)
  const resumePhase = useRunStore((state) => state.gardeners[0].resumePhase)
  const radius = useRunStore((state) => state.gardeners[0].area?.radius ?? tuning.gardener.area.default)
  const siteKind = useRunStore((state) => state.gardeners[0].site?.kind ?? null)
  const placed = useRunStore((state) => state.gardeners[0].placed)
  const stopReason = useRunStore((state) => state.gardeners[0].stopReason)
  const plants = useRunStore((state) => state.structures.filter(({ kind }) => kind === 'plant').length)
  const antennas = useRunStore((state) => state.structures.filter(({ kind }) => kind === 'antenna').length)
  const isRunning = running.includes(phase)
  const current = phase === 'paused' ? resumePhase : phase
  const job = siteKind ?? nextJob(placed, plants, antennas)
  const resize = useCallback((value: number) => {
    const area = useRunStore.getState().gardeners[0].area
    if (area) setGardenerArea(useRunStore, id, { ...area, radius: value })
  }, [useRunStore, id])
  const toggle = () => {
    if (isRunning) pauseGardener(useRunStore, id)
    else if (!startGardener(useRunStore, id)) onMessage('Click the planet to place the Gardener first')
  }

  return <>
    <div className="panel-title">
      <h2>Gardener 01</h2>
      <span className="status" data-stopped={phase === 'stopped'}>
        {phase === 'working' && siteKind ? (siteKind === 'plant' ? 'Planting' : 'Raising antenna') : phaseText[phase]}
      </span>
    </div>
    <ol className="steps">
      <li><b>1</b>Click the planet to place the Gardener</li>
      <li><b>2</b>Size its work area</li>
      <li><b>3</b>Start: plants on flat ground, antennas up high</li>
    </ol>
    <label className="slider">Work area <output>{radius.toFixed(1)}</output>
      <input type="range" min={tuning.gardener.area.min} max={tuning.gardener.area.max} step={tuning.gardener.area.step}
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
      <dt>Next job</dt><dd>{job === 'plant' ? 'Plant' : job === 'antenna' ? 'Antenna' : '—'}</dd>
      <dt>Placed by Gardener</dt><dd>{placed}</dd>
    </dl>
    {stopReason && <p className="notice" role="status">{stopText[stopReason]}</p>}
  </>
}
