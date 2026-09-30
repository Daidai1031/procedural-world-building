import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

// VIEW-01: right drag orbits the camera. The planet itself never auto-rotates.
export function OrbitCamera({ onWheel }: { onWheel: (direction: number) => void }) {
  const { camera, gl } = useThree()

  useEffect(() => {
    const canvas = gl.domElement
    let dragging = false
    let azimuth = 0
    let polar = Math.PI / 2
    let lastX = 0
    let lastY = 0

    const updateCamera = () => {
      camera.position.set(
        8 * Math.sin(polar) * Math.sin(azimuth),
        8 * Math.cos(polar),
        8 * Math.sin(polar) * Math.cos(azimuth),
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
      azimuth -= (event.clientX - lastX) * 0.006
      polar = Math.max(0.12, Math.min(Math.PI - 0.12, polar + (event.clientY - lastY) * 0.006))
      lastX = event.clientX
      lastY = event.clientY
      updateCamera()
    }
    const pointerUp = (event: PointerEvent) => {
      if (!dragging) return
      dragging = false
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      canvas.style.cursor = 'crosshair'
    }
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      onWheel(Math.sign(event.deltaY))
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
