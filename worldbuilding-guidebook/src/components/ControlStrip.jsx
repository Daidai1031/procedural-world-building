import { useEffect, useRef, useState } from 'react'
import { getDemoParams } from '../scene/demoParams.js'
import { useSceneStore } from '../store/sceneStore.js'
import CompareToggle from './CompareToggle.jsx'
import SimulationControls from './SimulationControls.jsx'
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

function clampStripPosition(strip, left, top) {
  if (!strip) return { left, top }

  const bounds = strip.getBoundingClientRect()
  const styles = getComputedStyle(document.documentElement)
  const gutter = Number.parseFloat(styles.getPropertyValue('--space-3'))
  const maximumLeft = Math.max(gutter, window.innerWidth - bounds.width - gutter)
  const maximumTop = Math.max(gutter, window.innerHeight - bounds.height - gutter)

  return {
    left: Math.min(Math.max(left, gutter), maximumLeft),
    top: Math.min(Math.max(top, gutter), maximumTop),
  }
}

export default function ControlStrip() {
  const stripRef = useRef(null)
  const dragOrigin = useRef(null)
  const [position, setPosition] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const stepId = useSceneStore((state) => state.stepId)
  const demoKey = useSceneStore((state) => state.demoKey)
  const unlocked = useSceneStore((state) => state.unlocked)
  const params = useSceneStore((state) => state.params)
  const setParam = useSceneStore((state) => state.setParam)
  const compare = useSceneStore((state) => state.compare)

  const demoParams = getDemoParams(demoKey)
  const visible = unlocked.filter((key) => demoParams[key] && !demoParams[key].hideFromStrip)
  const pulsingKeys = useJustUnlocked(visible)
  const hasComparison = Boolean(compare)
  const hasDemoControls = visible.length > 0 || hasComparison || demoKey === 'simulation-terrain'
  const isScaleCalibration = stepId === 'procedural-maps/calibrate-the-scales'
  const visibleSignature = visible.join(',')

  function beginDrag(event) {
    if (event.button !== 0) return

    const bounds = stripRef.current.getBoundingClientRect()
    dragOrigin.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      left: bounds.left,
      top: bounds.top,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
    event.preventDefault()
  }

  function moveDrag(event) {
    const origin = dragOrigin.current
    if (!origin || origin.pointerId !== event.pointerId) return

    setPosition(clampStripPosition(
      stripRef.current,
      origin.left + event.clientX - origin.pointerX,
      origin.top + event.clientY - origin.pointerY,
    ))
  }

  function endDrag(event) {
    if (dragOrigin.current?.pointerId !== event.pointerId) return
    dragOrigin.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsDragging(false)
  }

  function moveWithKeyboard(event) {
    if (event.key === 'Home') {
      event.preventDefault()
      setPosition(null)
      return
    }

    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key]
    if (!direction) return

    event.preventDefault()
    const bounds = stripRef.current.getBoundingClientRect()
    const distance = event.shiftKey ? 1 : 10
    setPosition(clampStripPosition(
      stripRef.current,
      bounds.left + direction[0] * distance,
      bounds.top + direction[1] * distance,
    ))
  }

  useEffect(() => {
    function keepStripInView() {
      setPosition((current) => current && clampStripPosition(stripRef.current, current.left, current.top))
    }

    window.addEventListener('resize', keepStripInView)
    return () => window.removeEventListener('resize', keepStripInView)
  }, [])

  useEffect(() => {
    setPosition((current) => current && clampStripPosition(stripRef.current, current.left, current.top))
  }, [demoKey, visibleSignature, hasComparison])

  return (
    <div
      className="control-strip"
      data-dragging={isDragging}
      data-layout={isScaleCalibration ? 'calibration' : undefined}
      data-positioned={Boolean(position)}
      ref={stripRef}
      style={position ? { left: position.left, top: position.top } : undefined}
    >
      <button
        className="control-strip__drag-handle"
        type="button"
        aria-label="Move scene controls"
        title="Drag to move controls"
        onKeyDown={moveWithKeyboard}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <svg viewBox="0 0 12 18" aria-hidden="true" focusable="false">
          <circle cx="3" cy="3" r="1.25" />
          <circle cx="9" cy="3" r="1.25" />
          <circle cx="3" cy="9" r="1.25" />
          <circle cx="9" cy="9" r="1.25" />
          <circle cx="3" cy="15" r="1.25" />
          <circle cx="9" cy="15" r="1.25" />
        </svg>
      </button>
      <div className="control-strip__panel" role="group" aria-label="Scene controls">
        <ViewportToolbar />
        {hasDemoControls && <div className="control-strip__divider" aria-hidden="true" />}
        {compare && <CompareToggle />}
        {demoKey === 'simulation-terrain' && <SimulationControls />}
        {visible.length > 0 && (
          <div className="control-strip__parameters" role="group" aria-label="Scene parameters">
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
        )}
      </div>
    </div>
  )
}
