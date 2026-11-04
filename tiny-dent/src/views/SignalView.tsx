import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Texture, Vector3 } from 'three'
import type { createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { palette } from '../config/palette'

const RINGS_PER_ANTENNA = 3
const RING_STAGGER = 0.22
const RING_TRAVEL = 3.2
const z = new Vector3(0, 0, 1)
const normal = new Vector3()
const spin = new Quaternion()
const TEX = 512

function paint(draw: (c: CanvasRenderingContext2D, r: number) => void): Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = TEX
  const c = canvas.getContext('2d')!
  c.translate(TEX / 2, TEX / 2)
  c.strokeStyle = c.fillStyle = '#fff'
  draw(c, TEX / 2)
  return new CanvasTexture(canvas)
}

function setMap(material: MeshBasicMaterial, map: Texture | null) {
  if ((material.map === null) !== (map === null)) material.needsUpdate = true
  material.map = map
}

function circle(c: CanvasRenderingContext2D, radius: number, width: number, alpha: number) {
  c.globalAlpha = alpha
  c.lineWidth = width
  c.beginPath()
  c.arc(0, 0, radius, 0, Math.PI * 2)
  c.stroke()
}

// A wavefront: crisp bright leading edge, a soft wake behind it and fine echo lines inside.
const drawWave = (c: CanvasRenderingContext2D, r: number) => {
  const wake = c.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 0.94)
  wake.addColorStop(0, 'rgba(255,255,255,0)')
  wake.addColorStop(1, 'rgba(255,255,255,0.22)')
  c.fillStyle = wake
  c.beginPath(); c.arc(0, 0, r * 0.94, 0, Math.PI * 2); c.fill()
  circle(c, r * 0.97, 9, 0.18)
  circle(c, r * 0.95, 3, 1)
  circle(c, r * 0.84, 1.5, 0.55)
  circle(c, r * 0.72, 1.2, 0.3)
  circle(c, r * 0.6, 1, 0.16)
}

// A data ring: a hairline circle carrying fine ticks and a few bright arc segments, spun while it travels.
const drawTicks = (c: CanvasRenderingContext2D, r: number) => {
  circle(c, r * 0.8, 1.5, 0.5)
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2
    const long = i % 5 === 0
    c.globalAlpha = long ? 0.9 : 0.45
    c.lineWidth = long ? 2.5 : 1.5
    c.beginPath()
    c.moveTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86)
    c.lineTo(Math.cos(a) * r * (long ? 0.97 : 0.92), Math.sin(a) * r * (long ? 0.97 : 0.92))
    c.stroke()
  }
  c.globalAlpha = 1
  c.lineWidth = 6
  c.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.3
    c.beginPath(); c.arc(0, 0, r * 0.72, a, a + 0.5); c.stroke()
  }
}

const drawFlash = (c: CanvasRenderingContext2D, r: number) => {
  const glow = c.createRadialGradient(0, 0, 0, 0, 0, r)
  glow.addColorStop(0, 'rgba(255,255,255,1)')
  glow.addColorStop(0.18, 'rgba(255,255,255,0.55)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = glow
  c.fillRect(-r, -r, r * 2, r * 2)
}

interface Pulse { start: number; antennas: { position: Vector3; turn: Quaternion }[] }

// Each broadcast flashes every antenna, then sends a wavefront, a spinning tick ring and a trailing echo along its normal.
export function SignalView({ store }: { store: ReturnType<typeof createRunStore> }) {
  const group = useRef<Group>(null)
  const pulses = useRef<Pulse[]>([])
  const seen = useRef(store.getState().signal.broadcastCount)
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const parts = useMemo(() => ({
    ring: new PlaneGeometry(2, 2),
    wave: paint(drawWave),
    ticks: paint(drawTicks),
    flash: paint(drawFlash),
  }), [])
  useEffect(() => () => {
    parts.ring.dispose(); parts.wave.dispose(); parts.ticks.dispose(); parts.flash.dispose()
  }, [parts])

  useFrame(({ clock }) => {
    const root = group.current
    if (!root) return
    const now = clock.elapsedTime
    const state = store.getState()
    if (state.signal.broadcastCount !== seen.current) {
      seen.current = state.signal.broadcastCount
      pulses.current.push({ start: now, antennas: state.structures.filter(s => s.kind === 'antenna').map(s => {
        normal.set(...s.normal).normalize()
        return { position: new Vector3(...s.position), turn: new Quaternion().setFromUnitVectors(z, normal) }
      }) })
    }
    const duration = still ? 1 : tuning.signal.pulseSeconds
    pulses.current = pulses.current.filter(p => now - p.start < duration * (1 + RING_STAGGER * RINGS_PER_ANTENNA))
    const needed = pulses.current.reduce((n, p) => n + p.antennas.length * (RINGS_PER_ANTENNA + 1), 0)
    while (root.children.length < needed) {
      root.add(new Mesh(parts.ring, new MeshBasicMaterial({ color: palette.antenna.lamp, transparent: true,
        depthWrite: false, side: DoubleSide, blending: AdditiveBlending })))
    }
    let used = 0
    for (const pulse of pulses.current) {
      const age = (now - pulse.start) / duration
      for (const antenna of pulse.antennas) {
        normal.set(0, 0, 1).applyQuaternion(antenna.turn)
        const flash = root.children[used++] as Mesh
        const f = Math.min(1, age * 4)
        flash.geometry = parts.ring
        flash.position.copy(antenna.position).addScaledVector(normal, 0.45)
        flash.quaternion.copy(antenna.turn)
        flash.scale.setScalar(0.1 + f * 0.5)
        const flashMaterial = flash.material as MeshBasicMaterial
        setMap(flashMaterial, parts.flash)
        flashMaterial.opacity = f < 1 ? 0.9 * (1 - f) : 0
        for (let k = 0; k < RINGS_PER_ANTENNA; k++) {
          const t = Math.max(0, Math.min(1, age - k * RING_STAGGER))
          const ring = root.children[used++] as Mesh
          ring.geometry = parts.ring
          ring.position.copy(antenna.position).addScaledVector(normal, 0.45 + t * RING_TRAVEL)
          const data = k === 1
          spin.setFromAxisAngle(z, data ? t * 2.4 : 0)
          ring.quaternion.copy(antenna.turn).multiply(spin)
          ring.scale.setScalar(0.08 + t * (data ? 0.75 : 0.9 - k * 0.12))
          const material = ring.material as MeshBasicMaterial
          setMap(material, data ? parts.ticks : parts.wave)
          material.opacity = t > 0 && t < 1 ? (k === 0 ? 0.95 : 0.7) * (1 - t) ** 1.4 : 0
        }
      }
    }
    root.children.forEach((child, index) => { child.visible = index < used })
  })

  return <group ref={group} raycast={() => null} />
}
