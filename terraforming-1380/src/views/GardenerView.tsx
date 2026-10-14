import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial, Quaternion, Vector3, type Group, type Mesh } from 'three'
import type { createRunStore } from '../state/runState'
import type { PlanetWorld } from '../world/planet'

const up = new Vector3(0, 1, 0)
const normal = new Vector3()

// D-025: the Gardener, a line down to the ground it chose, and its work area while it is being set up.
export function GardenerView({ store, active, selected }: {
  world: PlanetWorld; store: ReturnType<typeof createRunStore>; active: boolean; selected: boolean
}) {
  const body = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const area = useRef<Group>(null)
  const path = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(6), 3))
    const line = new Line(geometry, new LineBasicMaterial({ color: '#5d7a5a', transparent: true, opacity: 0.75, depthTest: false }))
    line.frustumCulled = false
    line.renderOrder = 2
    return line
  }, [])
  useEffect(() => () => { path.geometry.dispose(); (path.material as LineBasicMaterial).dispose() }, [path])

  useFrame((frame) => {
    const robot = store.getState().gardeners[0]
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
    // The ring turns while the Gardener plants or builds.
    if (ring.current) ring.current.rotation.y = robot.phase === 'working' ? frame.clock.elapsedTime * 4 : 0
    if (area.current) {
      area.current.visible = selected && robot.area !== null && ['idle', 'paused', 'stopped'].includes(robot.phase)
      if (robot.area) {
        area.current.position.set(...robot.area.center)
        area.current.scale.setScalar(robot.area.radius)
      }
    }
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
      <group ref={body}>
        <mesh><sphereGeometry args={[0.08, 20, 14]} /><meshStandardMaterial color="#6d7b67" roughness={0.85} /></mesh>
        <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.012, 8, 32]} />
          <meshStandardMaterial color="#4b4a45" roughness={0.7} />
        </mesh>
      </group>
      <primitive object={path} />
      <group ref={area} visible={false}>
        <mesh raycast={() => null}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color="#4f7a55" transparent opacity={0.18} wireframe depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}
