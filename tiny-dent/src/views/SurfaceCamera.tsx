import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Matrix4, Mesh, PerspectiveCamera, Quaternion, Vector3, type Material } from 'three'
import type { PlanetWorld } from '../world/planet'
import type { Vec3 } from '../systems/geometry'
import { eyeHeight, groundRadius, surfaceBasis, walkingStep } from '../systems/exploration'
import { createDrifter } from '../render/models/drifter'
import { drifterGestureKeys, restingMind, stepDrifterMind, type DrifterGesture } from '../systems/drifter'
import { tuning } from '../config/tuning'

export type SurfaceView = 'third' | 'first'

// D-029 surface walking. D-064: in the third-person view the player sees the Drifter walking, idling and gesturing,
// and the camera follows from behind; V switches to the original first-person view at the Drifter's eye height.
export function SurfaceCamera({ world, start, positionRef, movement, onExit, view = 'third', onToggleView }: {
  world: PlanetWorld; start: Vec3; positionRef: MutableRefObject<Vec3 | null>;
  movement: MutableRefObject<Set<string>>; onExit: () => void; view?: SurfaceView; onToggleView?: () => void
}) {
  const { camera, gl } = useThree()
  const direction = useRef<Vec3>(start)
  const forward = useRef(surfaceBasis(start).north)
  const heading = useRef(surfaceBasis(start).north)
  const pitch = useRef(view === 'third' ? -0.32 : -0.12)
  const drifter = useMemo(() => {
    const model = createDrifter()
    // The atmosphere's halo is a transparent shell the camera sits inside. Drawing the Drifter after it keeps the
    // traveller crisp instead of veiled; it is still depth-tested against the terrain.
    model.object.traverse((child) => {
      if (!(child instanceof Mesh)) return
      child.renderOrder = Math.max(child.renderOrder, 5)
      ;(child.material as Material).transparent = true
    })
    return model
  }, [])
  const mind = useRef(restingMind())
  const asked = useRef<DrifterGesture | null>(null)
  const viewRef = useRef(view)
  const toggleRef = useRef(onToggleView)
  const placed = useRef(false)
  const hurry = useRef(false)
  useEffect(() => { toggleRef.current = onToggleView }, [onToggleView])
  useEffect(() => {
    // Each view keeps a comfortable default tilt when switched.
    if (viewRef.current !== view) pitch.current = view === 'third' ? -0.32 : -0.12
    viewRef.current = view
    placed.current = false
  }, [view])
  useEffect(() => () => drifter.dispose(), [drifter])

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
      const [low, high] = viewRef.current === 'third' ? [-1.1, 0.3] : [-1.25, 1.25]
      pitch.current = Math.max(low, Math.min(high, pitch.current - (event.clientY - lastY) * 0.005))
      lastX = event.clientX; lastY = event.clientY
    }
    const up = (event: PointerEvent) => { if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); pointer = null }
    const keyDown = (event: KeyboardEvent) => {
      hurry.current = event.shiftKey
      if (document.querySelector('dialog[open]') || event.altKey || event.metaKey || event.ctrlKey) return
      if (event.key === 'Escape') { onExit(); return }
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return
      const key = event.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault(); movement.current.add(key)
      } else if (key === 'v' && !event.repeat) {
        event.preventDefault(); toggleRef.current?.()
      } else if (drifterGestureKeys[key] && !event.repeat) {
        event.preventDefault(); asked.current = drifterGestureKeys[key]
      }
    }
    const keyUp = (event: KeyboardEvent) => { hurry.current = event.shiftKey; movement.current.delete(event.key.toLowerCase()) }
    const clear = () => { hurry.current = false; movement.current.clear() }
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

  // Scratch values reused every frame.
  const scratch = useMemo(() => ({ basis: new Matrix4(), side: new Vector3(), goal: new Vector3() }), [])

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05)
    const up = new Vector3(...direction.current)
    forward.current.addScaledVector(up, -forward.current.dot(up)).normalize()
    heading.current.addScaledVector(up, -heading.current.dot(up))
    if (heading.current.lengthSq() < 1e-6) heading.current.copy(forward.current)
    heading.current.normalize()
    const right = new Vector3().crossVectors(forward.current, up).normalize()
    const keys = movement.current
    let travelled = 0
    if (!document.querySelector('dialog[open]')) {
      const x = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
      const z = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'))
      if (x || z) {
        const tangent = forward.current.clone().multiplyScalar(z).addScaledVector(right, x).normalize()
        const radius = groundRadius(world, direction.current)
        const next = walkingStep(world, direction.current, tangent.toArray() as Vec3, step * (hurry.current ? tuning.drifter.hurrySpeed : tuning.drifter.walkSpeed))
        const turn = new Quaternion().setFromUnitVectors(up, new Vector3(...next))
        forward.current.applyQuaternion(turn)
        heading.current.applyQuaternion(turn)
        travelled = up.angleTo(new Vector3(...next)) * radius
        direction.current = next
        // The Drifter turns to face where it is going.
        // Turning is a rotation about the local up, so walking straight back turns it around instead of stalling.
        if (travelled > 0) {
          const nextUp = new Vector3(...next)
          tangent.applyQuaternion(turn)
          const across = new Vector3().crossVectors(heading.current, tangent).dot(nextUp)
          let angle = Math.atan2(across, heading.current.dot(tangent))
          if (Math.abs(angle) > Math.PI - 0.01) angle = Math.PI - 0.01
          heading.current.applyAxisAngle(nextUp, angle * (1 - Math.exp(-step * tuning.drifter.turnRate))).normalize()
        }
      }
    }
    const normal = new Vector3(...direction.current)
    const radius = groundRadius(world, direction.current)
    if (radius < 0.5) { onExit(); return }
    const feet = normal.clone().multiplyScalar(radius)

    // The body: stand on the ground, up along the radius, facing the heading.
    const scale = tuning.drifter.height / drifter.height
    const result = stepDrifterMind(mind.current, travelled > 0, step, asked.current)
    mind.current = result.mind
    asked.current = null
    drifter.play(result.clip)
    drifter.update(step, { speed: travelled / Math.max(step, 1e-4) / scale })
    const front = heading.current.clone().addScaledVector(normal, -heading.current.dot(normal)).normalize()
    scratch.side.crossVectors(normal, front)
    scratch.basis.makeBasis(scratch.side, normal, front)
    drifter.object.quaternion.setFromRotationMatrix(scratch.basis)
    drifter.object.position.copy(feet)
    drifter.object.scale.setScalar(scale)
    drifter.object.visible = viewRef.current === 'third'

    const look = forward.current.clone().multiplyScalar(Math.cos(pitch.current)).addScaledVector(normal, Math.sin(pitch.current))
    if (viewRef.current === 'first') {
      camera.position.copy(normal).multiplyScalar(radius + eyeHeight)
      camera.up.copy(normal)
      camera.lookAt(camera.position.clone().add(look))
    } else {
      // Follow from behind and above, never inside the ground.
      const { distance, rise, aim, clearance, ease } = tuning.drifter.camera
      const target = feet.clone().addScaledVector(normal, aim)
      scratch.goal.copy(feet).addScaledVector(normal, rise).addScaledVector(look, -distance)
      const goalDirection = scratch.goal.clone().normalize().toArray() as Vec3
      const floor = groundRadius(world, goalDirection) + clearance
      if (scratch.goal.length() < floor) scratch.goal.setLength(floor)
      if (placed.current) camera.position.lerp(scratch.goal, 1 - Math.exp(-step * ease))
      else camera.position.copy(scratch.goal)
      placed.current = true
      camera.up.copy(normal)
      camera.lookAt(target)
    }
    positionRef.current = feet.clone().addScaledVector(normal, eyeHeight).toArray() as Vec3
  })
  return <primitive object={drifter.object} />
}
