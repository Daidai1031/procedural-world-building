import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import type { createRunStore } from '../state/runState'
import { travelTo } from '../systems/signal'
import type { SystemPlanet } from '../systems/system'
import { cameraPose, systemDistance, systemLayout, type SystemLayout } from '../systems/systemView'
import { planetConfig } from '../world/planet'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { tuning } from '../config/tuning'
import { arrive, systemViewFrame, useSystemView } from '../state/systemView'
import { showWorkArea } from '../render/terrainMaterial'
import type { Vec3 } from '../systems/geometry'

const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
// The veil is fully opaque at this share of the dive; the planet switches at that moment.
const VEIL_FULL = 0.8

export function useSystemLayout(planets: SystemPlanet[], activeSeed: string): SystemLayout {
  const key = planets.map(({ seed }) => seed).join()
  // The layout only changes when a world is added or the active planet changes, not when a description does.
  return useMemo(() => systemLayout(planets, activeSeed), [key, activeSeed]) // eslint-disable-line react-hooks/exhaustive-deps
}

// D-049: places the camera while the view is pulled back and runs the pull, return, dive and arrival timelines.
// In orbit view OrbitCamera places the camera itself; both read the same azimuth and polar.
export function SystemCamera({ layout, planets, store }: { layout: SystemLayout; planets: SystemPlanet[]; store: ReturnType<typeof createRunStore> }) {
  const glide = useRef({ amount: 0, position: [0, 0, 0] as Vec3, distance: 8 })
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useFrame(({ camera, gl }, delta) => {
    const dt = Math.min(delta, 0.1)
    const { phase, focus } = useSystemView.getState()
    const frame = systemViewFrame
    if (phase === 'orbit' && frame.progress === 0) return
    const seconds = still ? 0.2 : tuning.system.pullSeconds

    if (phase === 'pulling') {
      if (frame.progress === 0) showWorkArea(null)
      frame.progress = Math.min(1, frame.progress + dt / seconds)
      if (frame.progress === 1) {
        useSystemView.setState({ phase: 'system', focus: frame.pendingFocus })
        frame.pendingFocus = null
      }
    } else if (phase === 'returning') {
      frame.progress = Math.max(0, frame.progress - dt / seconds)
      if (frame.progress === 0) { frame.zoom = null; gl.domElement.style.cursor = 'crosshair'; useSystemView.setState({ phase: 'orbit' }) }
    }
    frame.pull = easeInOutCubic(frame.progress)

    if (phase === 'arriving') {
      // A new App (and camera) was mounted for the new planet: settle into the normal orbit pose.
      frame.dive = Math.min(1, frame.dive + dt / (still ? 0.2 : tuning.system.arriveSeconds))
      const pose = cameraPose({ pull: 0, azimuth: frame.azimuth, polar: frame.polar, center: [0, 0, 0], distance: 8 })
      camera.position.set(...pose.position)
      camera.lookAt(...pose.target)
      camera.updateMatrixWorld()
      if (frame.dive === 1) { frame.dive = 0; useSystemView.setState({ phase: 'orbit', focus: null, hover: null }) }
      return
    }

    const fit = systemDistance(layout.extent, (camera as PerspectiveCamera).fov)
    if (frame.wheel !== 0) {
      const { min, max, step } = tuning.system.zoom
      frame.zoom = Math.max(min, Math.min(max, (frame.zoom ?? fit) * (1 + Math.sign(frame.wheel) * step * Math.abs(frame.wheel))))
      frame.wheel = 0
    }
    const world = focus ? planets.find(({ seed }) => seed === focus) : undefined
    const g = glide.current
    const radius = world ? planetConfig(world.seed).radius * VOXEL_WORLD_SIZE : 0
    if (world && layout.positions[world.seed]) {
      const target = layout.positions[world.seed]
      const distance = tuning.system.focusDistanceFactor * radius
      // The first frame of a focus snaps the position, so the camera does not slide in from the previous world's offset.
      const k = g.amount < 0.01 ? 1 : damp(6, dt)
      g.position = g.position.map((v, i) => v + (target[i] - v) * k) as Vec3
      g.distance += (distance - g.distance) * k
    }
    g.amount += ((world ? 1 : 0) - g.amount) * damp(5, dt)
    if (!world && g.amount < 0.001) g.amount = 0

    let focusPose = g.amount > 0 ? { position: g.position, distance: g.distance, amount: g.amount * frame.pull } : undefined
    if (phase === 'diving' && world) {
      // The camera flies into the focused world while the veil (CSS) fades in.
      frame.dive = Math.min(1, frame.dive + dt / (still ? 0.2 : tuning.system.diveSeconds))
      const t = easeInOutCubic(frame.dive)
      focusPose = { position: g.position, distance: lerp(g.distance, radius * 1.15, t), amount: Math.max(g.amount, t) }
      if (frame.dive >= VEIL_FULL && !frame.traveled) {
        frame.traveled = true
        const from = planets.find(({ active }) => active)
        arrive({ name: world.name, previous: from?.name ?? '', first: !world.visited })
        // Reset before the switch: the new App starts from the orbit pose with nothing focused.
        Object.assign(frame, { progress: 0, pull: 0, zoom: null, wheel: 0, dive: 0 })
        useSystemView.setState({ phase: 'arriving', focus: null, hover: null })
        travelTo(store, world.seed)
        return
      }
    }

    const pose = cameraPose({ pull: frame.pull, azimuth: frame.azimuth, polar: frame.polar, center: layout.center, distance: frame.zoom ?? fit, focus: focusPose })
    camera.position.set(...pose.position)
    camera.lookAt(...pose.target)
    camera.updateMatrixWorld()
    frame.ticks.forEach(tick => tick())
  })
  return null
}
