import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute, BufferGeometry, Line, LineBasicMaterial, Object3D,
  Quaternion, Vector3, type Group, type InstancedMesh,
} from 'three'
import type { createRunStore } from '../state/runState'
import type { PlanetWorld } from '../world/planet'
import { surfaceRadius, type RobotPhase, type Vec3 } from '../systems/miner'
import { tuning } from '../config/tuning'
import { palette } from '../config/palette'
import { createMiner, type RobotLight } from '../render/models/robots'
import { showWorkArea } from '../render/terrainMaterial'

const DEBRIS = 40
const DEBRIS_SECONDS = 0.9
const up = new Vector3(0, 1, 0)
const scratch = new Object3D()
const light: Record<RobotPhase, RobotLight> = {
  idle: 'idle', paused: 'idle', scanning: 'scan', moving: 'move', digging: 'work', collecting: 'collect', stopped: 'blocked',
}

// AUT-10: the robot, its intended path, and the area it works in. Reads the store every frame instead of
// subscribing, so 30 Hz simulation never re-renders React.
export function MinerView({ world, store, active, selected }: {
  world: PlanetWorld; store: ReturnType<typeof createRunStore>; active: boolean; selected: boolean
}) {
  const body = useRef<Group>(null)
  const model = useMemo(() => createMiner(), [])
  useEffect(() => () => model.dispose(), [model])
  const debris = useRef<InstancedMesh>(null)
  const pool = useMemo(() => Array.from({ length: DEBRIS }, () => ({ age: DEBRIS_SECONDS, p: new Vector3(), v: new Vector3() })), [])
  const emitted = useRef({ tick: -1, next: 0 })
  const path = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(9), 3))
    const material = new LineBasicMaterial({ color: palette.robot.band.miner, transparent: true, opacity: 0.7, depthTest: false })
    const line = new Line(geometry, material)
    line.frustumCulled = false
    line.renderOrder = 2
    return line
  }, [])
  useEffect(() => () => { path.geometry.dispose(); (path.material as LineBasicMaterial).dispose() }, [path])

  useFrame(({ clock }, delta) => {
    // The robot, its path, debris and area exist only in Auto mode.
    if (body.current) body.current.visible = active
    path.visible = path.visible && active
    if (debris.current) debris.current.visible = active
    if (!active) {
      if (selected) showWorkArea(null)
      return
    }
    const { robots, resourceClusters, simTick } = store.getState()
    const robot = robots[0]
    if (!robot) return
    model.setState(light[robot.phase])
    model.update(clock.elapsedTime)
    const [x, y, z] = robot.position
    if (body.current) {
      body.current.position.set(x, y, z)
      body.current.quaternion.copy(new Quaternion().setFromUnitVectors(up, new Vector3(x, y, z).normalize()))
    }
    // The area is only drawn while it is being set up; once the Miner works it would just clutter the view.
    // D-027 work area D: it shows as denser contours on the terrain itself.
    if (selected) showWorkArea(robot.area && ['idle', 'paused', 'stopped'].includes(robot.phase) ? robot.area : null)

    // Path: robot -> hover point above the target -> target (only while there is a target).
    const target = robot.targetId ? resourceClusters.find(({ id }) => id === robot.targetId) : undefined
    const positions = path.geometry.getAttribute('position') as BufferAttribute
    if (target) {
      const length = Math.hypot(...target.position) || 1
      const direction = target.position.map((component) => component / length) as Vec3
      const hover = direction.map((component) => component * (surfaceRadius(world.densityAt, direction) + tuning.miner.hoverHeight)) as Vec3
      positions.setXYZ(0, x, y, z)
      positions.setXYZ(1, ...(robot.phase === 'moving' ? hover : robot.position))
      positions.setXYZ(2, ...target.position)
      positions.needsUpdate = true
      path.visible = true
    } else path.visible = false
    if (debris.current) debris.current.visible = true

    // Debris: purely visual, never read by the simulation.
    if (robot.phase === 'digging' && simTick !== emitted.current.tick) {
      emitted.current.tick = simTick
      for (let i = 0; i < 2; i += 1) {
        const piece = pool[emitted.current.next++ % DEBRIS]
        piece.age = 0
        piece.p.set(x, y, z)
        piece.v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.4)
          .addScaledVector(new Vector3(x, y, z).normalize(), 0.5)
      }
    }
    if (debris.current) {
      pool.forEach((piece, index) => {
        piece.age += delta
        const life = Math.max(0, 1 - piece.age / DEBRIS_SECONDS)
        piece.p.addScaledVector(piece.v, delta)
        scratch.position.copy(piece.p)
        scratch.scale.setScalar(0.035 * life)
        scratch.updateMatrix()
        debris.current!.setMatrixAt(index, scratch.matrix)
      })
      debris.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <group ref={body}><primitive object={model.object} /></group>
      <primitive object={path} />
      <instancedMesh ref={debris} args={[undefined, undefined, DEBRIS]} frustumCulled={false}>
        {/* D-027: debris is small voxel cubes, like the robots that throw it up. */}
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={palette.robot.debris} roughness={0.95} />
      </instancedMesh>
    </>
  )
}

