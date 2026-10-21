import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute, BufferGeometry, CanvasTexture, Color, Group, IcosahedronGeometry, LineBasicMaterial, LineSegments, Points, PointsMaterial, WireframeGeometry,
} from 'three'
import type { RunState } from '../state/runState'
import { planetMarks } from '../systems/systemView'
import { planetConfig } from '../world/planet'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { palette } from '../config/palette'
import { tuning } from '../config/tuning'
import { systemViewFrame, useSystemView } from '../state/systemView'

const ANTENNA_LENGTH = 0.6
const SIZES = { plant: 4.6, antenna: 5.5, resident: 10, robot: 7 }
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

let sprite: CanvasTexture | null = null
// A soft round dot, shared by every readout.
function softDot() {
  if (sprite) return sprite
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)
  sprite = new CanvasTexture(canvas)
  return sprite
}

function dots(capacity: number, size: number, color: string, rgba = false) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(capacity * 3), 3))
  if (rgba) geometry.setAttribute('color', new BufferAttribute(new Float32Array(capacity * 4), 4))
  geometry.setDrawRange(0, 0)
  const material = new PointsMaterial({ color, size, sizeAttenuation: false, map: softDot(), transparent: true, depthWrite: false, vertexColors: rgba, opacity: 0 })
  const points = new Points(geometry, material)
  points.frustumCulled = false
  points.raycast = () => {}
  return points
}

function fill(points: Points, list: number[][]) {
  const attribute = points.geometry.getAttribute('position') as BufferAttribute
  list.forEach((p, i) => attribute.setXYZ(i, p[0], p[1], p[2]))
  attribute.needsUpdate = true
  points.geometry.setDrawRange(0, list.length)
}

const idle = ['idle', 'paused', 'stopped']
const amber = new Color(palette.state.work)

// SYS-09: the state of one world drawn on the world itself: a ghost shell at the original radius, plant and antenna
// marks, resident glows and robot lights. The active planet reads live state; others read their frozen snapshot.
export function PlanetReadouts({ seed, source, live }: { seed: string; source: () => RunState | undefined; live: boolean }) {
  const marks = tuning.system.marks
  const parts = useMemo(() => {
    const radius = planetConfig(seed).radius * VOXEL_WORLD_SIZE
    const ghost = new LineSegments(new WireframeGeometry(new IcosahedronGeometry(radius, 3)),
      new LineBasicMaterial({ color: palette.system.ghost, transparent: true, opacity: 0, depthWrite: false }))
    ghost.raycast = () => {}
    const antennaLines = new LineSegments(new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(marks.antennas * 6), 3)),
      new LineBasicMaterial({ color: palette.antenna.lamp, transparent: true, opacity: 0, depthWrite: false }))
    antennaLines.geometry.setDrawRange(0, 0)
    antennaLines.frustumCulled = false
    antennaLines.raycast = () => {}
    return {
      ghost, antennaLines,
      plants: dots(marks.plants, SIZES.plant, palette.state.plant),
      tips: dots(marks.antennas, SIZES.antenna, palette.antenna.lamp),
      residents: dots(marks.residents, SIZES.resident, palette.system.residentGlow),
      robots: dots(marks.robots, SIZES.robot, '#ffffff', true),
    }
  }, [seed, marks.antennas, marks.plants, marks.residents, marks.robots])
  const group = useRef<Group>(null)
  const last = useRef<RunState | undefined>(undefined)

  useEffect(() => () => {
    for (const part of Object.values(parts)) { part.geometry.dispose(); (part.material as PointsMaterial | LineBasicMaterial).dispose() }
  }, [parts])

  useFrame(({ clock }) => {
    const root = group.current
    if (!root) return
    const fade = smoothstep(tuning.system.fade.marks[0], tuning.system.fade.marks[1], systemViewFrame.pull)
    root.visible = fade > 0.001
    if (!root.visible) return
    const { hover, focus } = useSystemView.getState()
    const k = fade * (hover === seed || focus === seed ? 1 : 0.7)
    parts.ghost.material.opacity = tuning.system.ghostOpacity * k
    parts.antennaLines.material.opacity = k
    for (const dot of [parts.plants, parts.tips, parts.residents]) (dot.material as PointsMaterial).opacity = k
    ;(parts.robots.material as PointsMaterial).opacity = k
    ;(parts.residents.material as PointsMaterial).size = SIZES.resident * (1 + 0.12 * Math.sin(clock.elapsedTime * 2))

    const state = source()
    if (!state || (!live && state === last.current)) return
    last.current = state
    const found = planetMarks(state)
    fill(parts.plants, found.plants)
    fill(parts.residents, found.residents)
    fill(parts.tips, found.antennas.map(([p, n]) => [p[0] + n[0] * ANTENNA_LENGTH, p[1] + n[1] * ANTENNA_LENGTH, p[2] + n[2] * ANTENNA_LENGTH]))
    const lines = parts.antennaLines.geometry.getAttribute('position') as BufferAttribute
    found.antennas.forEach(([p, n], i) => {
      lines.setXYZ(i * 2, p[0], p[1], p[2])
      lines.setXYZ(i * 2 + 1, p[0] + n[0] * ANTENNA_LENGTH, p[1] + n[1] * ANTENNA_LENGTH, p[2] + n[2] * ANTENNA_LENGTH)
    })
    lines.needsUpdate = true
    parts.antennaLines.geometry.setDrawRange(0, found.antennas.length * 2)
    fill(parts.robots, found.robots.map(({ position }) => position))
    const colors = parts.robots.geometry.getAttribute('color') as BufferAttribute
    found.robots.forEach(({ phase }, i) => {
      // Moving robots stay lit, working ones blink fast, idle or paused ones go dark. Frozen worlds are dim and steady.
      const alpha = !live ? 0.45 : idle.includes(phase) ? 0.12 : phase === 'moving' || phase === 'scanning' ? 1 : 0.55 + 0.45 * Math.sin(clock.elapsedTime * 14)
      colors.setXYZW(i, amber.r, amber.g, amber.b, alpha)
    })
    colors.needsUpdate = true
  })

  return <group ref={group} visible={false}>
    <primitive object={parts.ghost} />
    <primitive object={parts.antennaLines} />
    <primitive object={parts.plants} />
    <primitive object={parts.tips} />
    <primitive object={parts.residents} />
    <primitive object={parts.robots} />
  </group>
}
