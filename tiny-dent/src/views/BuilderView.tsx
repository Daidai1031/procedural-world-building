import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial, Quaternion, Vector3, type Group } from 'three'
import type { createRunStore } from '../state/runState'
import type { BuilderPhase } from '../systems/builder'
import { palette } from '../config/palette'
import { createBuilder, type RobotLight } from '../render/models/robots'
import { showWorkArea } from '../render/terrainMaterial'

const up = new Vector3(0, 1, 0)
const normal = new Vector3()
const light: Record<BuilderPhase, RobotLight> = {
  idle: 'idle', paused: 'idle', scanning: 'scan', moving: 'move', working: 'work', stopped: 'blocked',
}

// D-026: the Builder, a line down to the ground it is shaping, and its work area while it is being set up.
export function BuilderView({ store, robotId, active, selected }: {
  store: ReturnType<typeof createRunStore>; robotId: string; active: boolean; selected: boolean
}) {
  const body = useRef<Group>(null)
  const model = useMemo(() => createBuilder(), [])
  useEffect(() => () => model.dispose(), [model])
  const path = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(6), 3))
    const line = new Line(geometry, new LineBasicMaterial({ color: palette.robot.band.builder, transparent: true, opacity: 0.75, depthTest: false }))
    line.frustumCulled = false
    line.renderOrder = 2
    return line
  }, [])
  useEffect(() => () => { path.geometry.dispose(); (path.material as LineBasicMaterial).dispose() }, [path])

  useFrame((frame) => {
    const robot = store.getState().builders.find(({ id }) => id === robotId)
    if (body.current) body.current.visible = active && !!robot
    if (!active || !robot) {
      path.visible = false
      if (selected) showWorkArea(null)
      return
    }
    // D-027 Builder B1: the roller turns while it moves or shapes the ground.
    model.setState(light[robot.phase])
    model.update(frame.clock.elapsedTime)
    const [x, y, z] = robot.position
    if (body.current) {
      body.current.position.set(x, y, z)
      body.current.quaternion.copy(new Quaternion().setFromUnitVectors(up, normal.set(x, y, z).normalize()))
    }
    // D-027 work area D, shown only while the area is being set up.
    if (selected) showWorkArea(robot.area && ['idle', 'paused', 'stopped'].includes(robot.phase) ? robot.area : null)
    const positions = path.geometry.getAttribute('position') as BufferAttribute
    if (robot.job) {
      positions.setXYZ(0, x, y, z)
      positions.setXYZ(1, ...robot.job.ground)
      positions.needsUpdate = true
      path.visible = true
    } else path.visible = false
  })

  return (
    <>
      <group ref={body}><primitive object={model.object} /></group>
      <primitive object={path} />
    </>
  )
}
