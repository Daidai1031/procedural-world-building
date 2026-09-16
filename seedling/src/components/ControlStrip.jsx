import { useEffect, useRef, useState } from 'react'
import { getDemoParams } from '../scene/demoParams.js'
import { useSceneStore } from '../store/sceneStore.js'
import CompareToggle from './CompareToggle.jsx'
import SimulationControls from './SimulationControls.jsx'
import TerrainLegend from './TerrainLegend.jsx'
import ViewportToolbar from './ViewportToolbar.jsx'
import './ControlStrip.css'

// §5 Long enough for the label to pulse --summit once and settle.
const PULSE_MS = 600

// A select already shows its value, so only a range needs the readout beside
// the label. Two copies of "Box" is noise, not a design system.
function SelectControl({ paramKey, param, value, onChange }) {
  const controlId = `control-${paramKey}`

  return (
    <div className="control">
      <label className="control__label" htmlFor={controlId}>
        {param.label}
      </label>
      <div className="control__select">
        <select
          id={controlId}
          value={value}
          onChange={(event) => onChange(paramKey, event.target.value)}
        >
          {param.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg className="control__chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <polyline points="4,6.5 8,10.5 12,6.5" />
        </svg>
      </div>
    </div>
  )
}

function RangeControl({ paramKey, param, value, onChange }) {
  const controlId = `control-${paramKey}`

  return (
    <div className="control">
      <div className="control__head">
        <label className="control__label" htmlFor={controlId}>
          {param.label}
        </label>
        <output className="control__value" htmlFor={controlId}>
          {value}
        </output>
      </div>
      <input
        className="control__range"
        id={controlId}
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={(event) => onChange(paramKey, Number(event.target.value))}
      />
    </div>
  )
}

function BooleanControl({ paramKey, param, value, onChange }) {
  return (
    <label className="control control--boolean">
      <span className="control__label">{param.label}</span>
      <input type="checkbox" checked={value} onChange={(event) => onChange(paramKey, event.target.checked)} />
    </label>
  )
}

// §5 A control the previous step did not offer fades in and pulses --summit
// once. This is the only attention-seeking motion in the app.
function splitSignature(signature) {
  return signature === '' ? [] : signature.split(',')
}

// The comparison runs on the joined signature rather than the array, because
// the array is rebuilt every render and would cancel the timer mid-pulse.
function useJustUnlocked(visibleKeys) {
  const [pulsingKeys, setPulsingKeys] = useState([])
  const previousSignature = useRef(null)
  const signature = visibleKeys.join(',')

  useEffect(() => {
    const previous = previousSignature.current
    previousSignature.current = signature
    if (previous === null) return

    const previousKeys = splitSignature(previous)
    const fresh = splitSignature(signature).filter((key) => !previousKeys.includes(key))
    if (fresh.length === 0) return

    setPulsingKeys(fresh)
    const timer = setTimeout(() => setPulsingKeys([]), PULSE_MS)
    return () => clearTimeout(timer)
  }, [signature])

  return pulsingKeys
}

export default function ControlStrip() {
  const demoKey = useSceneStore((state) => state.demoKey)
  const unlocked = useSceneStore((state) => state.unlocked)
  const params = useSceneStore((state) => state.params)
  const setParam = useSceneStore((state) => state.setParam)
  const compare = useSceneStore((state) => state.compare)

  const demoParams = getDemoParams(demoKey)
  const visible = unlocked.filter((key) => demoParams[key] && !demoParams[key].hideFromStrip)
  const pulsingKeys = useJustUnlocked(visible)
  const hasDemoControls = visible.length > 0 || Boolean(compare) || demoKey === 'simulation-terrain'

  return (
    <div className="control-strip">
      <div className="control-strip__panel" role="group" aria-label="Scene controls">
        <ViewportToolbar />
        {hasDemoControls && <div className="control-strip__divider" aria-hidden="true" />}
        {compare && <CompareToggle />}
        {demoKey === 'simulation-terrain' && <SimulationControls />}
        {['noise-terrain', 'simulation-terrain'].includes(demoKey) && <TerrainLegend simulation={demoKey === 'simulation-terrain'} />}
        {visible.map((key) => {
          const param = demoParams[key]
          const Control = param.type === 'select' ? SelectControl : param.type === 'boolean' ? BooleanControl : RangeControl

          return (
            <div className="control-strip__slot" key={key} data-unlocked={pulsingKeys.includes(key)}>
              <Control paramKey={key} param={param} value={params[key]} onChange={setParam} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
