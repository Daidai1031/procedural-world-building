import { useEffect } from 'react'
import type { SystemPlanet } from '../systems/system'
import { describePlanet } from '../systems/system'
import { tuning } from '../config/tuning'
import { closeSystem, endArrival, pickWorld, useSystemView } from '../state/systemView'

// SYS-06: plain text over the canvas, no card. The live region lets a screen reader hear what is hovered or focused.
export function SystemCaption({ planets }: { planets: SystemPlanet[] }) {
  const phase = useSystemView(state => state.phase)
  const hover = useSystemView(state => state.hover)
  const focus = useSystemView(state => state.focus)
  const arrival = useSystemView(state => state.arrival)
  const shown = phase === 'system' ? planets.find(({ seed }) => seed === (hover ?? focus)) : undefined
  const focused = shown && shown.seed === focus && !shown.active

  // SYS-12: a transient line after travelling; it outlives the remount that a new planet causes.
  useEffect(() => {
    if (!arrival) return
    const timer = window.setTimeout(endArrival, tuning.signal.pulseSeconds * 1000)
    return () => window.clearTimeout(timer)
  }, [arrival])

  return <div className="system-caption" aria-live="polite">
    {arrival && phase !== 'diving' ? <p>Arrived at {arrival.name}{arrival.first ? ' · first visit' : ''} · {arrival.previous} pauses until you return</p>
      : phase === 'system' && (shown
        ? <>
          <p>{shown.name} — {describePlanet(shown)}</p>
          {focused && <p>{shown.visited ? 'As you left it.' : 'A new site.'} Your current planet pauses until you return. Funds travel with you.</p>}
        </>
        : <p>Drag to turn · wheel to zoom · click a world to focus it</p>)}
  </div>
}

// Where the pull-back button goes once the right sidebar has slid away.
export function SystemReturn() {
  const phase = useSystemView(state => state.phase)
  const open = phase === 'pulling' || phase === 'system'
  return <button className="system-return" data-open={open} tabIndex={open ? 0 : -1} onClick={closeSystem}>Return to orbit ↓</button>
}

// SYS-14: what the old side list gave screen-reader and keyboard users: every known world, each one a button that focuses it.
export function SystemWorldList({ planets }: { planets: SystemPlanet[] }) {
  const phase = useSystemView(state => state.phase)
  if (phase !== 'system') return null
  return <ul className="sr-only" aria-label="Known worlds">
    {planets.map(planet => <li key={planet.seed}>
      {planet.active ? <span>{planet.name}, you are here. {describePlanet(planet)}</span>
        : <button onClick={() => pickWorld(planet.seed)}>{planet.name}. {describePlanet(planet)}</button>}
    </li>)}
  </ul>
}

// Covers the screen while the camera dives into a world and while the new planet settles in.
export function SystemVeil() {
  const phase = useSystemView(state => state.phase)
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const seconds = reduce ? 0.2 : phase === 'diving' ? tuning.system.diveSeconds : tuning.system.arriveSeconds
  return <div className="system-veil" data-phase={phase} style={{ animationDuration: `${seconds}s` }} aria-hidden="true" />
}
