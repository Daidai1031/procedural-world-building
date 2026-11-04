import { useEffect, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Quaternion, Vector3 } from 'three'
import type { PlanetWorld } from '../world/planet'
import type { Vec3 } from '../systems/geometry'
import { eyeHeight, groundRadius, surfaceBasis, walkingStep } from '../systems/exploration'

export function SurfaceCamera({ world, start, positionRef, movement, onExit }: {
  world: PlanetWorld; start: Vec3; positionRef: MutableRefObject<Vec3 | null>;
  movement: MutableRefObject<Set<string>>; onExit: () => void
}) {
  const { camera, gl } = useThree()
  const direction = useRef<Vec3>(start)
  const forward = useRef(surfaceBasis(start).north)
  const pitch = useRef(-0.12)
  useEffect(() => {
    const saved = { position: camera.position.clone(), rotation: camera.quaternion.clone(), up: camera.up.clone(),
      near: camera.near, fov: (camera as PerspectiveCamera).fov }
    camera.near = 0.015
    if (camera instanceof PerspectiveCamera) camera.fov = 68
    camera.updateProjectionMatrix()
    const canvas = gl.domElement
    const previousTabIndex = canvas.tabIndex
    canvas.tabIndex = 0
    canvas.focus({ preventScroll: true })
    let pointer: number | null = null, lastX = 0, lastY = 0
    const down = (event: PointerEvent) => {
      canvas.focus({ preventScroll: true })
      pointer = event.pointerId; lastX = event.clientX; lastY = event.clientY
      canvas.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return
      forward.current.applyAxisAngle(new Vector3(...direction.current), -(event.clientX - lastX) * 0.005)
      pitch.current = Math.max(-1.25, Math.min(1.25, pitch.current - (event.clientY - lastY) * 0.005))
      lastX = event.clientX; lastY = event.clientY
    }
    const up = (event: PointerEvent) => { if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); pointer = null }
    const keyDown = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]') || event.altKey || event.metaKey || event.ctrlKey) return
      if (event.key === 'Escape') { onExit(); return }
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(event.key.toLowerCase())) {
        event.preventDefault(); movement.current.add(event.key.toLowerCase())
      }
    }
    const keyUp = (event: KeyboardEvent) => movement.current.delete(event.key.toLowerCase())
    const clear = () => movement.current.clear()
    const context = (event: MouseEvent) => event.preventDefault()
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('contextmenu', context)
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', clear)
    return () => {
      canvas.tabIndex = previousTabIndex
      clear(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('contextmenu', context)
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', clear)
      camera.position.copy(saved.position); camera.quaternion.copy(saved.rotation); camera.up.copy(saved.up); camera.near = saved.near
      if (camera instanceof PerspectiveCamera) camera.fov = saved.fov
      camera.updateProjectionMatrix()
      positionRef.current = null
    }
  }, [camera, gl, movement, onExit, positionRef])

  useFrame((_, delta) => {
    const up = new Vector3(...direction.current)
    forward.current.addScaledVector(up, -forward.current.dot(up)).normalize()
    const right = new Vector3().crossVectors(forward.current, up).normalize()
    const keys = movement.current
    if (!document.querySelector('dialog[open]')) {
      const x = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
      const z = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'))
      if (x || z) {
        const tangent = forward.current.clone().multiplyScalar(z).addScaledVector(right, x).normalize().toArray() as Vec3
        const next = walkingStep(world, direction.current, tangent, Math.min(delta, 0.05) * 0.32)
        forward.current.applyQuaternion(new Quaternion().setFromUnitVectors(up, new Vector3(...next)))
        direction.current = next
      }
    }
    const normal = new Vector3(...direction.current)
    const radius = groundRadius(world, direction.current)
    if (radius < 0.5) { onExit(); return }
    camera.position.copy(normal).multiplyScalar(radius + eyeHeight)
    camera.up.copy(normal)
    const view = forward.current.clone().multiplyScalar(Math.cos(pitch.current)).addScaledVector(normal, Math.sin(pitch.current))
    camera.lookAt(camera.position.clone().add(view))
    positionRef.current = camera.position.toArray() as Vec3
  })
  return null
}
