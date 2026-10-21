import { useEffect } from 'react'
import { useSceneStore } from '../store/sceneStore.js'
import { particleParams, PARTICLE_PRESETS, PARTICLE_PRIMARY_KEYS } from '../scene/demos/particles/params.js'
import { useParticlePlayback } from '../scene/demos/particles/playback.js'
import { useParticleSelection } from '../scene/demos/particles/particleSelection.js'
import { describeParticle, getParticleCloud } from '../scene/demos/particles/particleSystem.js'
import './ParticlePanel.css'

function applyPreset(name) {
  const { setParam } = useSceneStore.getState()
  setParam('particlePreset', name)
  for (const [key, value] of Object.entries(PARTICLE_PRESETS[name])) setParam(key, value)
}

function Parameter({ name }) {
  const value = useSceneStore((s) => s.params[name])
  const setParam = useSceneStore((s) => s.setParam)
  const definition = particleParams[name]
  const id = `particle-control-${name}`
  const change = (next) => (name === 'particlePreset' ? applyPreset(next) : setParam(name, next))
  if (definition.type === 'boolean') {
    return <label className="particle-parameter particle-parameter--toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={value} onChange={(e) => change(e.target.checked)} />
      <span>{definition.label}</span>
    </label>
  }
  return <div className="particle-parameter">
    <span><label htmlFor={id}>{definition.label}</label>{definition.type === 'float' && <output htmlFor={id}>{value}</output>}</span>
    {definition.type === 'select'
      ? <select id={id} value={value} onChange={(e) => change(e.target.value)}>{definition.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      : <input id={id} type="range" min={definition.min} max={definition.max} step={definition.step} value={value} onChange={(e) => change(Number(e.target.value))} />}
  </div>
}

const vector = (values) => values.map((value) => value.toFixed(2)).join(', ')

// The notebook page of the selected speck. Nothing here reads the Look setting,
// so switching Look cannot change a number on the page.
function NotebookPage() {
  const selected = useParticleSelection((s) => s.selected)
  const select = useParticleSelection((s) => s.select)
  const state = getParticleCloud()
  const page = describeParticle(state, selected)
  const move = (step) => select((selected + step + state.count) % state.count)
  return <div className="particle-page" role="group" aria-label="Notebook page of the selected speck">
    <div className="particle-page__head">
      <strong>Speck {selected + 1} of {state.count}</strong>
      <span>
        <button type="button" onClick={() => move(-1)} aria-label="Previous speck">‹</button>
        <button type="button" onClick={() => move(1)} aria-label="Next speck">›</button>
      </span>
    </div>
    <dl>
      <dt>Position</dt><dd>{vector(page.position)}</dd>
      <dt>Velocity</dt><dd>{vector(page.velocity)}</dd>
      <dt>Age</dt><dd>{page.age.toFixed(2)} s</dd>
      <dt>Lifetime</dt><dd>{page.lifetime.toFixed(2)} s</dd>
    </dl>
  </div>
}

function Playback({ demo, children }) {
  const running = useParticlePlayback((s) => s.running)
  const finished = useParticlePlayback((s) => s.simulation?.finished ?? false)
  const time = useParticlePlayback((s) => s.time)
  const { toggle, stepOnce, restart, publish } = useParticlePlayback.getState()
  const params = () => useSceneStore.getState().params
  // Pausing shows the exact state at that moment, not the last throttled readout.
  const playOrPause = () => { toggle(); publish(params(), true) }
  return <div className="particle-playback">
    <div className="particle-buttons">
      <button type="button" className="particle-primary" onClick={playOrPause} disabled={finished}>{running ? 'Pause' : 'Play'}</button>
      <button type="button" onClick={() => stepOnce(params())} disabled={running || finished}>Step forward</button>
      <button type="button" onClick={() => restart(demo, params())}>Restart</button>
      {children}
    </div>
    <output className="particle-clock">{time.toFixed(2)} s</output>
  </div>
}

// A horizontal level: the fill is the live count, the tick is where it should
// settle (rate × lifetime), and the right end is the most the system holds.
function LevelBar({ live, expected, capacity }) {
  const share = (value) => `${Math.min(100, (value / capacity) * 100)}%`
  return <div className="particle-level">
    <div className="particle-level__track" role="meter" aria-label="Live specks" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={live}>
      <span className="particle-level__fill" style={{ width: share(live) }} />
      {expected !== undefined && <span className="particle-level__tick" style={{ left: share(expected) }} />}
    </div>
  </div>
}

function Readout({ demo, readout }) {
  const params = useSceneStore((s) => s.params)
  if (!readout) return null
  if (demo === 'particle-lifecycle') {
    const full = readout.live >= readout.capacity
    return <>
      <LevelBar live={readout.live} expected={readout.expected} capacity={readout.capacity} />
      <output className="particle-status" aria-live="polite">
        Live {readout.live} · average {Math.round(readout.average)} · settles near {Math.round(readout.expected)} · room holds {readout.capacity}{full ? ' · Room full' : ''}
      </output>
    </>
  }
  if (demo === 'particle-time') {
    return <output className="particle-status" aria-live="polite">
      {readout.frames} frames · speed × dt runner {readout.speedRunner.toFixed(2)} m · fixed-step runner {readout.frameRunner.toFixed(2)} m
    </output>
  }
  if (demo === 'particle-forces') {
    return <output className="particle-status" aria-live="polite">
      {readout.speed === null ? 'The ringed piece has landed · press Burst' : `Ringed piece speed ${readout.speed.toFixed(2)} m/s`} · gravity {params.particleGravity} · sideways {params.particleSideways}
    </output>
  }
  if (demo === 'particle-field') {
    return <output className="particle-status" aria-live="polite">
      Leaves {readout.live} · arrows mean {params.particleArrowMeans === 'Speed' ? 'speed (they carry the leaf)' : 'push (they change its speed)'}
    </output>
  }
  if (demo === 'particle-layers') {
    const layers = [['Breeze', params.particleBreeze], ['Whirlpool', params.particleWhirlpool], ['Gusts', params.particleGusts]]
    const on = layers.filter(([, enabled]) => enabled).map(([label]) => label)
    return <output className="particle-status" aria-live="polite">Leaves {readout.live} · layers added: {on.length ? on.join(' + ') : 'none, the air is calm'}</output>
  }
  if (demo === 'particle-trails') {
    return <output className="particle-status" aria-live="polite">
      Specks {readout.live} · {params.particleClearTrail ? 'trails cleared on respawn' : 'trails kept on respawn: watch for stray lines'}
    </output>
  }
  if (demo === 'particle-recipe') return <RecipeCard readout={readout} params={params} />
  return null
}

function RecipeCard({ readout, params }) {
  const moved = [
    ['breeze', params.particleBreezeStrength], ['whirlpool', params.particleWhirlStrength],
    ['gusts', params.particleGustStrength], ['gravity', params.particleGravity],
  ].filter(([, value]) => value > 0).map(([label, value]) => `${label} ${value}`)
  const look = `${params.particleView}${params.particleFade ? ', fading with age' : ''}${params.particleSpeedColour ? ', coloured by speed' : ''}`
  return <div className="particle-recipe" role="group" aria-label="Your recipe">
    <strong>{params.particlePreset} recipe</strong>
    <dl>
      <dt>Born</dt><dd>{params.particleEmitter.toLowerCase()} · {params.particleRate} per second</dd>
      <dt>Lives</dt><dd>about {params.particleLifetime} s</dd>
      <dt>Moved by</dt><dd>{moved.length ? moved.join(' + ') : 'nothing: it hangs still'}</dd>
      <dt>Drawn as</dt><dd>{look}</dd>
      <dt>Ground</dt><dd>{params.particleGround ? 'removed when it sinks in' : 'passes through'} · edge: {params.particleEdge.toLowerCase()}</dd>
    </dl>
    <output className="particle-status" aria-live="polite">Live {readout.live} of {readout.capacity}</output>
  </div>
}

function Extras({ demo }) {
  const simulation = useParticlePlayback((s) => s.simulation)
  const publish = () => useParticlePlayback.getState().publish(useSceneStore.getState().params, true)
  if (!simulation) return null
  if (demo === 'particle-lifecycle') return <button type="button" onClick={() => { simulation.burst(useSceneStore.getState().params); publish() }}>Burst</button>
  if (demo === 'particle-forces') {
    return <>
      <button type="button" onClick={() => { simulation.burst(); publish() }}>Burst</button>
      <button type="button" onClick={() => { const { setParam } = useSceneStore.getState(); setParam('particleGravity', 0); setParam('particleSideways', 0) }}>Forces off</button>
    </>
  }
  if (demo === 'particle-field') return <button type="button" onClick={() => { simulation.dropRow(); publish() }}>Drop leaves</button>
  return null
}

export default function ParticlePanel() {
  const demo = useSceneStore((s) => s.demoKey)
  const readout = useParticlePlayback((s) => (s.demo === demo ? s.readout : null))
  useEffect(() => () => useParticleSelection.getState().select(0), [])
  useEffect(() => {
    if (demo === 'particle-recipe') applyPreset(useSceneStore.getState().params.particlePreset)
  }, [demo])

  const look = useSceneStore((s) => s.params.particleLook)
  const moving = demo !== 'particle-state'
  return <section className="particle-panel" data-demo={demo} aria-label="Particle scene controls">
    <div className="particle-parameters">{PARTICLE_PRIMARY_KEYS[demo].map((name) => <Parameter key={name} name={name} />)}</div>
    <div className="particle-side">
      {moving ? <>
        <Playback demo={demo}><Extras demo={demo} /></Playback>
        <Readout demo={demo} readout={readout} />
      </> : <>
        <NotebookPage />
        <output className="particle-status" aria-live="polite">Drawn as a {look.toLowerCase()} · motion starts in Step 3</output>
      </>}
    </div>
  </section>
}
