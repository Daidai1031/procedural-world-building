import { useRef, useState } from 'react'

export default function CompareInset({ component: InsetView, compare }) {
  const [split, setSplit] = useState(50)
  const frame = useRef(null)
  const dragging = useRef(false)

  function moveDivider(event) {
    const bounds = frame.current.getBoundingClientRect()
    setSplit(Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)))
  }

  function handleKeyDown(event) {
    const value = { ArrowLeft: split - 5, ArrowRight: split + 5, Home: 0, End: 100 }[event.key]
    if (value === undefined) return
    event.preventDefault()
    event.stopPropagation()
    setSplit(Math.max(0, Math.min(100, value)))
  }

  return (
    <div className="compare-inset" ref={frame}>
      <div className="compare-inset__layer" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        <InsetView params={compare.a.params} />
      </div>
      <div className="compare-inset__layer" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
        <InsetView params={compare.b.params} />
      </div>
      <span className="compare-inset__caption compare-inset__caption--a">{compare.a.caption}</span>
      <span className="compare-inset__caption compare-inset__caption--b">{compare.b.caption}</span>
      <div
        className="compare-inset__divider"
        style={{ left: `${split}%` }}
        role="slider"
        tabIndex={0}
        aria-label={`${compare.label} map divider`}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(split)}
        aria-valuetext={`${Math.round(split)} percent ${compare.a.caption}`}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          dragging.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          moveDivider(event)
        }}
        onPointerMove={(event) => { if (dragging.current) moveDivider(event) }}
        onPointerUp={(event) => {
          dragging.current = false
          event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => { dragging.current = false }}
      />
    </div>
  )
}
