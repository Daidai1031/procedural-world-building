import { useCallback, useEffect, useRef, type RefObject } from 'react'
import type { SystemPlanet } from '../systems/system'
import { holdProgress, type SystemLayout } from '../systems/systemView'
import type { ProjectSphere } from '../views/ScreenProjector'
import { planetConfig } from '../world/planet'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { tuning } from '../config/tuning'
import { startDive, systemViewFrame, useSystemView } from '../state/systemView'

const RING = 30
const STROKE = 3
const CIRCUMFERENCE = Math.PI * (RING - STROKE)

// SYS-11: traveling is one press-and-hold on the focused world. Releasing early cancels and resets the ring;
// nothing changes until the hold completes. The same hold works with Space or Enter while the button has focus.
export function HoldToTravel({ planets, layout, sphereRef }: { planets: SystemPlanet[]; layout: SystemLayout; sphereRef: RefObject<ProjectSphere | null> }) {
  const phase = useSystemView(state => state.phase)
  const focus = useSystemView(state => state.focus)
  const world = planets.find(({ seed }) => seed === focus && !active(planets, seed))
  const root = useRef<HTMLButtonElement>(null)
  const ring = useRef<SVGCircleElement>(null)
  const started = useRef<number | null>(null)
  const frame = useRef(0)

  const reset = useCallback(() => {
    started.current = null
    window.cancelAnimationFrame(frame.current)
    ring.current?.setAttribute('stroke-dashoffset', String(CIRCUMFERENCE))
  }, [])
  const step = useCallback(() => {
    if (started.current === null) return
    const progress = holdProgress(performance.now() - started.current, tuning.system.holdMs)
    ring.current?.setAttribute('stroke-dashoffset', String(CIRCUMFERENCE * (1 - progress)))
    if (progress >= 1) { reset(); startDive(); return }
    frame.current = window.requestAnimationFrame(step)
  }, [reset])
  const begin = useCallback(() => {
    if (started.current !== null) return
    started.current = performance.now()
    frame.current = window.requestAnimationFrame(step)
  }, [step])
  useEffect(() => reset, [reset])
  useEffect(() => { if (focus === null || phase !== 'system') reset() }, [focus, phase, reset])

  // The control sits just below the focused planet and follows the camera.
  useEffect(() => {
    if (!world) return
    const tick = () => {
      const el = root.current, project = sphereRef.current, at = layout.positions[world.seed]
      if (!el || !project || !at) return
      const { x, y, r } = project(at, planetConfig(world.seed).radius * VOXEL_WORLD_SIZE)
      el.style.transform = `translate(${x.toFixed(1)}px, ${(y + r + 14).toFixed(1)}px) translate(-50%, 0)`
      el.style.opacity = '1'
    }
    systemViewFrame.ticks.add(tick)
    return () => { systemViewFrame.ticks.delete(tick) }
  }, [world, layout, sphereRef])

  if (!world || phase !== 'system') return null
  return <button ref={root} className="hold-travel" style={{ opacity: 0 }} aria-label={`Hold to travel to ${world.name}`}
    onPointerDown={begin}
    onPointerUp={reset} onPointerCancel={reset} onPointerLeave={reset} onBlur={reset}
    onKeyDown={event => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); begin() } }}
    onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') reset() }}>
    <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`} aria-hidden="true">
      <circle className="hold-track" cx={RING / 2} cy={RING / 2} r={(RING - STROKE) / 2} />
      <circle ref={ring} className="hold-fill" cx={RING / 2} cy={RING / 2} r={(RING - STROKE) / 2} strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE}
        transform={`rotate(-90 ${RING / 2} ${RING / 2})`} />
    </svg>
    <span>Hold to travel</span>
  </button>
}

const active = (planets: SystemPlanet[], seed: string) => planets.some(planet => planet.seed === seed && planet.active)
