import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { skyFrame } from '../state/skyFrame'

const look = new Vector3()

// Copies the camera's heading into `skyFrame` so the backdrop's layers slide at their own depths as the view turns:
// orbiting the planet, pulling back to the system, or walking across the surface.
export function SkySync() {
  const last = useRef<number | null>(null)
  useFrame(({ camera }) => {
    camera.getWorldDirection(look)
    const yaw = Math.atan2(look.x, look.z)
    const pitch = Math.asin(Math.max(-1, Math.min(1, look.y)))
    if (last.current !== null) {
      let turn = yaw - last.current
      if (turn > Math.PI) turn -= Math.PI * 2
      else if (turn < -Math.PI) turn += Math.PI * 2
      // Near the poles a small move swings the yaw wildly; the sky turns less there too.
      skyFrame.yaw += turn * Math.max(0.2, Math.cos(pitch))
    }
    last.current = yaw
    skyFrame.pitch = pitch
  })
  return null
}
