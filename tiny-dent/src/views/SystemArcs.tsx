import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, CanvasTexture, Color, Line, LineDashedMaterial, Points, PointsMaterial, QuadraticBezierCurve3, Vector3 } from 'three'
import type { createRunStore } from '../state/runState'
import type { SystemPlanet } from '../systems/system'
import { systemArcs, type SystemLayout } from '../systems/systemView'
import { palette } from '../config/palette'
import { tuning } from '../config/tuning'
import { systemViewFrame } from '../state/systemView'

const POINTS = 80
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const base = new Color(palette.system.arc)
const lamp = new Color(palette.antenna.lamp)

let dot: CanvasTexture | null = null
function softDot() {
  if (dot) return dot
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 32, 32)
  dot = new CanvasTexture(canvas)
  return dot
}
function marker(size: number) {
  const geometry = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(3), 3))
  const points = new Points(geometry, new PointsMaterial({ color: palette.antenna.lamp, size, sizeAttenuation: false, map: softDot(), transparent: true, depthWrite: false }))
  points.frustumCulled = false
  points.raycast = () => {}
  return points
}

// SYS-10: a dashed arc joins each planet to the planets its signals found, an idle dot drifts along it, and a
// broadcast on the active planet sends a bright pulse along the arcs that start there. Descriptive only.
export function SystemArcs({ planets, layout, store }: { planets: SystemPlanet[]; layout: SystemLayout; store: ReturnType<typeof createRunStore> }) {
  const activeSeed = planets.find(({ active }) => active)?.seed
  const key = planets.map(({ seed }) => seed).join()
  const arcs = useMemo(() => systemArcs(planets).filter(({ from, to }) => layout.positions[from] && layout.positions[to]).map(arc => {
    const from = new Vector3(...layout.positions[arc.from]), to = new Vector3(...layout.positions[arc.to])
    const curve = new QuadraticBezierCurve3(from, from.clone().add(to).multiplyScalar(0.5).add(new Vector3(0, tuning.system.arcLift, 0)), to)
    const line = new Line(new BufferGeometry().setFromPoints(curve.getPoints(POINTS - 1)),
      new LineDashedMaterial({ color: palette.system.arc, dashSize: 0.22, gapSize: 0.2, transparent: true, opacity: 0 }))
    line.computeLineDistances()
    line.frustumCulled = false
    line.raycast = () => {}
    return { ...arc, curve, line, idle: marker(5), pulse: marker(13), pulseStart: -1 }
  }), [key, layout]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => arcs.forEach(({ line, idle, pulse }) => {
    for (const object of [line, idle, pulse]) { object.geometry.dispose(); (object.material as LineDashedMaterial | PointsMaterial).dispose() }
  }), [arcs])
  const seen = useRef(store.getState().signal.broadcastCount)
  const point = useMemo(() => new Vector3(), [])

  useFrame(({ clock }) => {
    const fade = smoothstep(tuning.system.fade.marks[0], tuning.system.fade.marks[1], systemViewFrame.pull)
    const count = store.getState().signal.broadcastCount
    const broadcast = count !== seen.current
    seen.current = count
    arcs.forEach((arc, index) => {
      const shown = fade > 0.001
      arc.line.visible = arc.idle.visible = shown
      if (!shown) { arc.pulse.visible = false; return }
      // The arc draws in from its parent toward the child as the camera pulls back.
      arc.line.geometry.setDrawRange(0, Math.max(2, Math.round(POINTS * fade)))
      if (broadcast && arc.from === activeSeed && systemViewFrame.pull > 0.5) arc.pulseStart = clock.elapsedTime
      const along = (clock.elapsedTime - arc.pulseStart) / tuning.signal.pulseSeconds
      const pulsing = arc.pulseStart >= 0 && along >= 0 && along < 1
      arc.pulse.visible = pulsing
      ;(arc.line.material as LineDashedMaterial).opacity = tuning.system.arcOpacity * fade
      ;(arc.line.material as LineDashedMaterial).color.copy(base).lerp(lamp, pulsing ? Math.sin(along * Math.PI) : 0)
      if (pulsing) arc.pulse.geometry.getAttribute('position').setXYZ(0, ...arc.curve.getPoint(along).toArray() as [number, number, number])
      ;(arc.pulse.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true
      arc.curve.getPoint((clock.elapsedTime * 0.06 + index * 0.37) % 1, point)
      ;(arc.idle.geometry.getAttribute('position') as BufferAttribute).setXYZ(0, point.x, point.y, point.z).needsUpdate = true
      ;(arc.idle.material as PointsMaterial).opacity = fade * 0.9
    })
  })

  return <>{arcs.map(({ from, to, line, idle, pulse }) => <group key={`${from}>${to}`}>
    <primitive object={line} /><primitive object={idle} /><primitive object={pulse} />
  </group>)}</>
}
