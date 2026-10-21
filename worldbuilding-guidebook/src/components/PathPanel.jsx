import { useEffect, useMemo } from 'react'
import { useSceneStore } from '../store/sceneStore.js'
import { pathParams, PRIMARY_KEYS } from '../scene/demos/paths/params.js'
import { buildPathModel } from '../scene/demos/paths/pathModel.js'
import { arcDistance, STEP_SECONDS } from '../scene/demos/paths/pathMath.js'
import { travelLimit, usePathPlayback } from '../scene/demos/paths/playback.js'
import ViewportToolbar from './ViewportToolbar.jsx'
import './PathPanel.css'

function Parameter({ name }) {
  const value = useSceneStore((s) => s.params[name])
  const setParam = useSceneStore((s) => s.setParam)
  const definition = pathParams[name]
  const id = `path-control-${name}`
  return <div className="path-parameter">
    <span><label htmlFor={id}>{definition.label}</label>{definition.type === 'float' && <output htmlFor={id}>{value}</output>}</span>
    {definition.type === 'select'
      ? <select id={id} value={value} onChange={(e) => setParam(name, e.target.value)}>{definition.options.map((option) => <option key={option.value}>{option.value}</option>)}</select>
      : definition.type === 'boolean'
        ? <input id={id} type="checkbox" checked={value} onChange={(e) => setParam(name, e.target.checked)} />
        : <input id={id} type="range" min={definition.min} max={definition.max} step={definition.step} value={value} onChange={(e) => setParam(name, Number(e.target.value))} />}
  </div>
}

function Playback({ model, demo, params }) {
  const { time, running, toggle, advance, reset } = usePathPlayback()
  const limit = travelLimit(model, demo)
  const done = time >= limit
  const tickDistance = demo === 'path-motion'
    ? arcDistance(model.curve, Math.max(0, time - STEP_SECONDS) / 8, time / 8, params.pathSampling)
    : Math.min(STEP_SECONDS, time) * 0.75
  return <div className="path-playback">
    <div className="path-buttons">
      <button type="button" className="path-primary" onClick={toggle} disabled={done}>{running ? 'Pause' : 'Play'}</button>
      <button type="button" onClick={() => advance(limit)} disabled={running || done}>Step forward</button>
      <button type="button" onClick={reset}>Restart</button>
    </div>
    <output className="path-tick">{time.toFixed(1)} s · {tickDistance.toFixed(3)} m / tick{done ? (model.validation?.valid || demo === 'path-motion' ? ' · Arrived' : ' · Waiting') : ''}</output>
  </div>
}

export default function PathPanel() {
  const demo = useSceneStore((s) => s.demoKey)
  const params = useSceneStore((s) => s.params)
  const setParam = useSceneStore((s) => s.setParam)
  const model = useMemo(() => buildPathModel(demo, params), [demo, params])
  useEffect(() => { usePathPlayback.getState().reset() }, [model])
  useEffect(() => () => usePathPlayback.getState().reset(), [])
  const moving = ['path-motion', 'path-clearance', 'path-choice'].includes(demo)
  return <section className="path-panel" aria-label="Path scene controls">
    <div className="path-panel__main">
      <div className="path-parameters">{PRIMARY_KEYS[demo].map((name) => <Parameter key={name} name={name} />)}</div>
      {moving && <Playback model={model} demo={demo} params={params} />}
    </div>
    <output className="path-status" aria-live="polite">{model.status}</output>
    {demo === 'path-choice' && <div className="path-candidates" aria-label="Candidate routes">
      {['A', 'B'].map((shelter) => {
        const candidates = model.candidates.filter((c) => c.shelter === shelter)
        const best = [...candidates].sort((a, b) => Number(b.validation.valid) - Number(a.validation.valid) || a.cost - b.cost)[0]
        return <div key={shelter} data-selected={model.selected?.shelter === shelter}>
          <strong>Shelter {shelter}{model.selected?.shelter === shelter ? ' · selected' : ''}</strong>
          <span>{best.validation.valid ? '✓ Passable' : `× ${best.validation.reason}`} · {best.id}</span>
          <span>{best.validation.length.toFixed(2)} m · disturbance {best.disturbance.toFixed(2)}</span>
        </div>
      })}
    </div>}
    <details className="path-inspect" key={demo}>
      <summary>Inspect</summary>
      <div className="path-inspect__body">
        <ViewportToolbar />
        {demo === 'path-clearance' && <>
          <Parameter name="pathExperiment" />
          {params.pathExperiment && <><Parameter name="pathWidth" /><Parameter name="pathEffect" /><p>The player edits a copy of the height field. The resident does not dig. Recheck support after cut/fill.</p></>}
        </>}
        {demo === 'path-choice' && <>
          <Parameter name="pathSeed" />
          <div className="path-buttons">
            <button type="button" onClick={() => setParam('pathSeed', params.pathSeed % 999 + 1)}>New candidates</button>
            <button type="button" onClick={() => { setParam('pathSeed', 138); setParam('pathDisturbance', 0); setParam('pathGates', 'Open') }}>Restore example</button>
          </div>
          <p>3 seeded bends per shelter. Reject blocked, unsupported or steep routes first. Cost = length / 8 + integrated disturbance / 2. Solid = selected; dashed = alternatives. No valid candidate does not mean no possible route.</p>
        </>}
        <p>Changing a setting pauses and restarts the experiment. Crosses show contact through rock or ground. Arches mark authored endpoints, not detected caves. Distances use scene metres.</p>
      </div>
    </details>
  </section>
}
