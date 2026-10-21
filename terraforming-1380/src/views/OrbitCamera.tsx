import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { ORBIT_DISTANCE } from '../systems/systemView'
import { systemViewFrame, useSystemView } from '../state/systemView'

// VIEW-01: right drag orbits the camera. The planet itself never auto-rotates.
// D-049: the angles are shared with SystemCamera. In orbit view this component places the camera; while the
// view is pulled back SystemCamera does, and the wheel zooms the system instead of changing the brush.
export function OrbitCamera({ onWheel }: { onWheel: (direction: number) => void }) {
  const { camera, gl } = useThree()

  useEffect(() => {
    const canvas = gl.domElement
    let dragging = false
    const angles = systemViewFrame
    // After travelling the camera is brand new; the player's own angles carry over instead.
    if (useSystemView.getState().phase !== 'arriving') {
      angles.azimuth = Math.atan2(camera.position.x, camera.position.z)
      angles.polar = Math.acos(Math.max(-1, Math.min(1, camera.position.y / camera.position.length())))
    }
    let lastX = 0
    let lastY = 0

    camera.up.set(0, 1, 0)
    const updateCamera = () => {
      if (useSystemView.getState().phase !== 'orbit') return
      camera.position.set(
        ORBIT_DISTANCE * Math.sin(angles.polar) * Math.sin(angles.azimuth),
        ORBIT_DISTANCE * Math.cos(angles.polar),
        ORBIT_DISTANCE * Math.sin(angles.polar) * Math.cos(angles.azimuth),
      )
      camera.lookAt(0, 0, 0)
    }
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 2) return
      event.preventDefault()
      dragging = true
      lastX = event.clientX
      lastY = event.clientY
      canvas.setPointerCapture(event.pointerId)
      canvas.style.cursor = 'grabbing'
    }
    const pointerMove = (event: PointerEvent) => {
      if (!dragging) return
      angles.azimuth -= (event.clientX - lastX) * 0.006
      angles.polar = Math.max(0.12, Math.min(Math.PI - 0.12, angles.polar + (event.clientY - lastY) * 0.006))
      lastX = event.clientX
      lastY = event.clientY
      updateCamera()
    }
    const pointerUp = (event: PointerEvent) => {
      if (!dragging) return
      dragging = false
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      canvas.style.cursor = useSystemView.getState().phase === 'orbit' ? 'crosshair' : ''
    }
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      if (useSystemView.getState().phase === 'orbit') onWheel(Math.sign(event.deltaY))
      else if (useSystemView.getState().phase === 'system') systemViewFrame.wheel += Math.sign(event.deltaY)
    }
    const contextMenu = (event: MouseEvent) => event.preventDefault()

    canvas.addEventListener('pointerdown', pointerDown)
    canvas.addEventListener('pointermove', pointerMove)
    canvas.addEventListener('pointerup', pointerUp)
    canvas.addEventListener('pointercancel', pointerUp)
    canvas.addEventListener('wheel', wheel, { passive: false })
    canvas.addEventListener('contextmenu', contextMenu)
    canvas.style.cursor = 'crosshair'
    return () => {
      canvas.removeEventListener('pointerdown', pointerDown)
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerup', pointerUp)
      canvas.removeEventListener('pointercancel', pointerUp)
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('contextmenu', contextMenu)
      canvas.style.cursor = ''
    }
  }, [camera, gl, onWheel])

  return null
}
