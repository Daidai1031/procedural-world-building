import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, Group, Mesh, MeshBasicMaterial, Quaternion, RingGeometry, SphereGeometry, Vector3 } from 'three'
import type { createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { palette } from '../config/palette'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'

const RINGS_PER_ANTENNA = 3
const RING_STAGGER = 0.22
const RING_TRAVEL = 3.2
const PLANET_RADIUS = VOXEL_WORLD_SIZE * 0.34
const z = new Vector3(0, 0, 1)
const normal = new Vector3()

interface Pulse { start: number; antennas: { position: Vector3; turn: Quaternion }[] }

// Each broadcast sends staggered rings out along every antenna's normal, plus one faint shell around the planet.
export function SignalView({ store }: { store: ReturnType<typeof createRunStore> }) {
  const group = useRef<Group>(null)
  const pulses = useRef<Pulse[]>([])
  const seen = useRef(store.getState().signal.broadcastCount)
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const parts = useMemo(() => ({
    ring: new RingGeometry(0.86, 1, 48),
    shell: new SphereGeometry(1, 48, 24),
  }), [])
  useEffect(() => () => { parts.ring.dispose(); parts.shell.dispose() }, [parts])

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
    const needed = pulses.current.reduce((n, p) => n + p.antennas.length * RINGS_PER_ANTENNA + 1, 0)
    while (root.children.length < needed) {
      root.add(new Mesh(parts.ring, new MeshBasicMaterial({ color: palette.antenna.lamp, transparent: true,
        depthWrite: false, side: DoubleSide })))
    }
    let used = 0
    for (const pulse of pulses.current) {
      const age = (now - pulse.start) / duration
      const shell = root.children[used++] as Mesh
      shell.geometry = parts.shell
      shell.quaternion.identity()
      shell.position.set(0, 0, 0)
      shell.scale.setScalar(PLANET_RADIUS * (1.05 + Math.min(age, 1) * 1.6))
      ;(shell.material as MeshBasicMaterial).opacity = 0.07 * Math.max(0, 1 - age)
      for (const antenna of pulse.antennas) {
        for (let k = 0; k < RINGS_PER_ANTENNA; k++) {
          const t = Math.max(0, Math.min(1, age - k * RING_STAGGER))
          const ring = root.children[used++] as Mesh
          ring.geometry = parts.ring
          normal.set(0, 0, 1).applyQuaternion(antenna.turn)
          ring.position.copy(antenna.position).addScaledVector(normal, 0.45 + t * RING_TRAVEL)
          ring.quaternion.copy(antenna.turn)
          ring.scale.setScalar(0.08 + t * 0.9)
          const material = ring.material as MeshBasicMaterial
          material.opacity = t > 0 && t < 1 ? 0.95 * (1 - t) ** 1.4 : 0
        }
      }
    }
    root.children.forEach((child, index) => { child.visible = index < used })
  })

  return <group ref={group} raycast={() => null} />
}
