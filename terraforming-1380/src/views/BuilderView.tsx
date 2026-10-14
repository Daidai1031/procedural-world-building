import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial, Quaternion, Vector3, type Group } from 'three'
import type { createRunStore } from '../state/runState'

const up = new Vector3(0, 1, 0)
const normal = new Vector3()

// D-026: the Builder, a line down to the ground it is shaping, and its work area while it is being set up.
export function BuilderView({ store, active, selected }: {
  store: ReturnType<typeof createRunStore>; active: boolean; selected: boolean
}) {
  const body = useRef<Group>(null)
  const blade = useRef<Group>(null)
  const area = useRef<Group>(null)
  const path = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(6), 3))
    const line = new Line(geometry, new LineBasicMaterial({ color: '#7a6a55', transparent: true, opacity: 0.75, depthTest: false }))
    line.frustumCulled = false
    line.renderOrder = 2
    return line
  }, [])
  useEffect(() => () => { path.geometry.dispose(); (path.material as LineBasicMaterial).dispose() }, [path])

  useFrame((frame) => {
    const robot = store.getState().builders[0]
    if (body.current) body.current.visible = active && !!robot
    if (!active || !robot) {
      path.visible = false
      if (area.current) area.current.visible = false
      return
    }
    const [x, y, z] = robot.position
    if (body.current) {
      body.current.position.set(x, y, z)
      body.current.quaternion.copy(new Quaternion().setFromUnitVectors(up, normal.set(x, y, z).normalize()))
    }
    // The blade taps the ground while the Builder works.
    if (blade.current) blade.current.position.y = robot.phase === 'working' ? -0.1 - Math.abs(Math.sin(frame.clock.elapsedTime * 9)) * 0.06 : -0.1
    if (area.current) {
      area.current.visible = selected && robot.area !== null && ['idle', 'paused', 'stopped'].includes(robot.phase)
      if (robot.area) {
        area.current.position.set(...robot.area.center)
        area.current.scale.setScalar(robot.area.radius)
      }
    }
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
      <group ref={body}>
        <mesh><boxGeometry args={[0.15, 0.1, 0.15]} /><meshStandardMaterial color="#8a7f6e" roughness={0.85} /></mesh>
        <group ref={blade} position={[0, -0.1, 0]}>
          <mesh><boxGeometry args={[0.2, 0.03, 0.06]} /><meshStandardMaterial color="#4b4a45" roughness={0.6} /></mesh>
        </group>
      </group>
      <primitive object={path} />
      <group ref={area} visible={false}>
        <mesh raycast={() => null}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color="#7a6a55" transparent opacity={0.2} wireframe depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}
