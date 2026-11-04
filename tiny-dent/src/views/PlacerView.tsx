import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial, Quaternion, Vector3, type Group } from 'three'
import type { createRunStore } from '../state/runState'
import type { PlacerState } from '../systems/placer'
import { palette } from '../config/palette'
import { createRobot, type RobotLight } from '../render/models/robots'
import { showWorkArea } from '../render/terrainMaterial'

const up = new Vector3(0, 1, 0)
const normal = new Vector3()

function light(robot: PlacerState): RobotLight {
  if (robot.phase === 'scanning') return 'scan'
  if (robot.phase === 'moving') return 'move'
  if (robot.phase === 'working') return robot.site?.kind === 'plant' ? 'plant' : 'work'
  if (robot.phase === 'stopped') return 'blocked'
  return 'idle'
}

// D-025, D-057: a Gardener or Rigger, a line down to the ground it chose, and its work area while it is being set up.
export function PlacerView({ store, role, robotId, active, selected }: {
  store: ReturnType<typeof createRunStore>; role: 'gardener' | 'rigger'; robotId: string; active: boolean; selected: boolean
}) {
  const list = role === 'gardener' ? 'gardeners' : 'riggers'
  const body = useRef<Group>(null)
  const model = useMemo(() => createRobot[role](), [role])
  useEffect(() => () => model.dispose(), [model])
  const path = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(6), 3))
    const line = new Line(geometry, new LineBasicMaterial({ color: palette.robot.band[role], transparent: true, opacity: 0.75, depthTest: false }))
    line.frustumCulled = false
    line.renderOrder = 2
    return line
  }, [role])
  useEffect(() => () => { path.geometry.dispose(); (path.material as LineBasicMaterial).dispose() }, [path])

  useFrame((frame) => {
    const robot = store.getState()[list].find(({ id }) => id === robotId)
    if (body.current) body.current.visible = active && !!robot
    if (!active || !robot) {
      path.visible = false
      if (selected) showWorkArea(null)
      return
    }
    model.setState(light(robot))
    model.update(frame.clock.elapsedTime)
    const [x, y, z] = robot.position
    if (body.current) {
      body.current.position.set(x, y, z)
      body.current.quaternion.copy(new Quaternion().setFromUnitVectors(up, normal.set(x, y, z).normalize()))
    }
    // D-027 work area D, shown only while the area is being set up.
    if (selected) showWorkArea(robot.area && ['idle', 'paused', 'stopped'].includes(robot.phase) ? robot.area : null)
    const positions = path.geometry.getAttribute('position') as BufferAttribute
    if (robot.site) {
      positions.setXYZ(0, x, y, z)
      positions.setXYZ(1, ...robot.site.anchor)
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
