import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Matrix4, Mesh, Object3D, PerspectiveCamera, Quaternion, Raycaster, Vector2, Vector3, type Material } from 'three'
import type { PlanetWorld } from '../world/planet'
import type { Vec3 } from '../systems/geometry'
import { eyeHeight, groundRadius, surfaceBasis, walkingStep } from '../systems/exploration'
import { createDrifter } from '../render/models/drifter'
import { drifterGestureKeys, restingMind, stepDrifterMind, uprightDirection, type DrifterGesture } from '../systems/drifter'
import { surfaceNormal } from '../systems/structures'
import { tuning } from '../config/tuning'
import { directionAhead, type VisitPose } from '../systems/fieldVisit'

export type SurfaceView = 'third' | 'first'

function revealDrifter(root: Object3D, amount: number) {
  root.visible = amount > 0.02
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const list = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of list) {
      material.opacity = amount
      material.transparent = true
      material.depthWrite = amount > 0.9
    }
  })
}

// D-029 surface walking. Landing opens in first person: the view arrives, then the Drifter fades in ahead of it and
// walks with the view. V returns to the third-person follow camera. A click that is not a drag inspects whatever it hits.
export function SurfaceCamera({ world, start, positionRef, movement, onExit, view = 'third', onToggleView, onInspect, poseRef }: {
  world: PlanetWorld; start: Vec3; positionRef: MutableRefObject<Vec3 | null>;
  movement: MutableRefObject<Set<string>>; onExit: () => void; view?: SurfaceView; onToggleView?: () => void
  onInspect?: (ray: { origin: Vec3; direction: Vec3 }) => void
  poseRef?: MutableRefObject<VisitPose | null>
}) {
  const { camera, gl } = useThree()
  const direction = useRef<Vec3>(start)
  const forward = useRef(surfaceBasis(start).north)
  const heading = useRef(surfaceBasis(start).north)
  const pitch = useRef(view === 'third' ? -0.32 : 0.08)
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
  const bodyDir = useRef<Vec3 | null>(null)
  const appeared = useRef(0)
  const inspectRef = useRef(onInspect)
  useEffect(() => { toggleRef.current = onToggleView }, [onToggleView])
  useEffect(() => { inspectRef.current = onInspect }, [onInspect])
  useEffect(() => {
    // Each view keeps a comfortable default tilt when switched. The first-person lead is recomputed from scratch.
    if (viewRef.current !== view) {
      pitch.current = view === 'third' ? -0.32 : 0.08
      bodyDir.current = null
    }
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
    let pointer: number | null = null, lastX = 0, lastY = 0, dragged = 0
    const down = (event: PointerEvent) => {
      canvas.focus({ preventScroll: true })
      pointer = event.pointerId; lastX = event.clientX; lastY = event.clientY; dragged = 0
      canvas.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return
      dragged += Math.hypot(event.clientX - lastX, event.clientY - lastY)
      forward.current.applyAxisAngle(new Vector3(...direction.current), -(event.clientX - lastX) * 0.005)
      const [low, high] = viewRef.current === 'third' ? [-1.1, 0.3] : [-1.25, 1.25]
      pitch.current = Math.max(low, Math.min(high, pitch.current - (event.clientY - lastY) * 0.005))
      lastX = event.clientX; lastY = event.clientY
    }
    const up = (event: PointerEvent) => {
      const inspect = pointer === event.pointerId && dragged < 6 && event.button === 0
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      pointer = null
      if (!inspect) return
      const rect = canvas.getBoundingClientRect()
      const raycaster = new Raycaster()
      raycaster.setFromCamera(new Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      ), camera)
      inspectRef.current?.({
        origin: raycaster.ray.origin.toArray() as Vec3,
        direction: raycaster.ray.direction.toArray() as Vec3,
      })
    }
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
      } else if (key === ' ' && !event.repeat) {
        event.preventDefault(); asked.current = 'jump'
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
      if (poseRef) poseRef.current = null
    }
  }, [camera, gl, movement, onExit, positionRef, poseRef])

  // Scratch values reused every frame.
  const scratch = useMemo(() => ({ basis: new Matrix4(), side: new Vector3(), goal: new Vector3(), up: new Vector3() }), [])
  const planted = useRef(new Vector3())
  const hasPlant = useRef(false)

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
    const viewRadius = groundRadius(world, direction.current)
    if (viewRadius < 0.5) { onExit(); return }
    const viewUp = new Vector3(...direction.current).normalize()
    let gait = travelled
    if (viewRef.current === 'first') {
      const { lead, catchUp } = tuning.drifter.visit
      const ahead = directionAhead(direction.current, forward.current.toArray() as Vec3, lead, viewRadius)
      const goal = groundRadius(world, ahead) >= 0.5 ? ahead : direction.current
      if (!bodyDir.current) {
        bodyDir.current = goal
        gait = 0
      } else {
        const from = new Vector3(...bodyDir.current).normalize()
        const to = new Vector3(...goal).normalize()
        const angle = from.angleTo(to)
        const speed = (hurry.current ? tuning.drifter.hurrySpeed : tuning.drifter.walkSpeed) * catchUp
        const maxAngle = step * speed / viewRadius
        const take = angle < 1e-5 ? 1 : Math.min(1, maxAngle / angle)
        if (take < 1) {
          const deltaQ = new Quaternion().setFromUnitVectors(from, to)
          from.applyQuaternion(new Quaternion().slerp(deltaQ, take))
        } else from.copy(to)
        bodyDir.current = from.toArray() as Vec3
        gait = Math.min(angle, maxAngle) * viewRadius
      }
      // Face the view, so the camera sees his back as he walks ahead of it.
      const flat = forward.current.clone().addScaledVector(viewUp, -forward.current.dot(viewUp))
      if (flat.lengthSq() > 1e-6) heading.current.copy(flat.normalize())
    }
    const stand = viewRef.current === 'first' && bodyDir.current ? bodyDir.current : direction.current
    const radial = new Vector3(...stand).normalize()
    const radius = groundRadius(world, stand)
    if (radius < 0.5) { onExit(); return }
    const feet = radial.clone().multiplyScalar(radius)
    // Stand square to the ground under the boots, not to the planet's radius, and ease so a noisy slope does not twitch.
    scratch.up.set(...uprightDirection(radial.toArray() as Vec3, surfaceNormal(world, feet.toArray() as Vec3)))
    if (!hasPlant.current) { planted.current.copy(scratch.up); hasPlant.current = true }
    else planted.current.lerp(scratch.up, 1 - Math.exp(-step * 14)).normalize()
    const normal = planted.current

    // The body: feet on the ground, spine along the ground's normal, facing the heading.
    const scale = tuning.drifter.height / drifter.height
    const result = stepDrifterMind(mind.current, gait > 0.0004, step, asked.current)
    mind.current = result.mind
    asked.current = null
    drifter.play(result.clip)
    drifter.update(step, { speed: gait / Math.max(step, 1e-4) / scale })
    const front = heading.current.clone().addScaledVector(normal, -heading.current.dot(normal)).normalize()
    scratch.side.crossVectors(normal, front)
    scratch.basis.makeBasis(scratch.side, normal, front)
    drifter.object.quaternion.setFromRotationMatrix(scratch.basis)
    drifter.object.position.copy(feet)
    drifter.object.scale.setScalar(scale)
    appeared.current += step
    const { appearAfter, fade } = tuning.drifter.visit
    const reveal = viewRef.current === 'third' ? 1 : Math.min(1, Math.max(0, (appeared.current - appearAfter) / Math.max(fade, 1e-3)))
    revealDrifter(drifter.object, reveal)
    if (poseRef) {
      poseRef.current = reveal > 0.6
        ? { feet: feet.toArray() as Vec3, heading: front.toArray() as Vec3, shown: true }
        : null
    }

    const look = forward.current.clone().multiplyScalar(Math.cos(pitch.current)).addScaledVector(viewUp, Math.sin(pitch.current))
    if (viewRef.current === 'first') {
      camera.position.copy(viewUp).multiplyScalar(viewRadius + eyeHeight)
      camera.up.copy(viewUp)
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
