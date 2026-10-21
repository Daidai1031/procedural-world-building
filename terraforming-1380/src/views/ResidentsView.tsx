import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { IcosahedronGeometry, Matrix4, MeshStandardMaterial, SphereGeometry, Vector3, type Group } from 'three'
import type { createRunStore } from '../state/runState'
import type { PlanetWorld } from '../world/planet'
import { stepResidents } from '../systems/residents'
import { tuning } from '../config/tuning'

type Store = ReturnType<typeof createRunStore>
const rules = tuning.residents

// D-042: residents react whatever the play mode, because they are not crew. They never bill electricity.
export function ResidentRunner({ world, store, active }: { world: PlanetWorld; store: Store; active: boolean }) {
  const accumulator = useRef(0)
  useFrame((_, delta) => {
    if (!active) { accumulator.current = 0; return }
    const step = 1 / rules.tickRate
    accumulator.current = Math.min(accumulator.current + delta, step * 3)
    while (accumulator.current >= step) {
      accumulator.current -= step
      stepResidents(world, store)
    }
  })
  return null
}

// One coarse rock body; a little vertex noise per vertex keeps it from reading as a ball.
function bodyGeometry() {
  const geometry = new IcosahedronGeometry(1, 1)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i)
    const k = 1 + 0.12 * Math.sin(x * 5.1 + y * 2.3) * Math.cos(z * 4.7 - y * 1.9)
    position.setXYZ(i, x * k * 1.05, y * k * 0.9, z * k)
  }
  geometry.computeVertexNormals()
  return geometry
}

const up = new Vector3(), facing = new Vector3(), side = new Vector3(), target = new Vector3(), basis = new Matrix4()

// RES-08: peeking shows the head at the mouth facing out, hiding sinks it out of sight, moving and waiting bob.
export function ResidentsView({ store }: { store: Store }) {
  const group = useRef<Group>(null)
  const parts = useMemo(() => ({
    body: bodyGeometry(),
    eye: new SphereGeometry(0.16, 8, 6),
    skin: new MeshStandardMaterial({ color: '#efeadc', roughness: 1, flatShading: true }),
    pupil: new MeshStandardMaterial({ color: '#2f302c', roughness: 0.6 }),
  }), [])
  useEffect(() => () => { parts.body.dispose(); parts.eye.dispose(); parts.skin.dispose(); parts.pupil.dispose() }, [parts])
  const residents = store(state => state.residents.length)
  const shown = useRef<Vector3[]>([])
  const heading = useRef<Vector3[]>([])

  useFrame(({ clock }, delta) => {
    const root = group.current
    if (!root) return
    const list = store.getState().residents
    list.forEach((resident, index) => {
      const node = root.children[index] as Group | undefined
      if (!node) return
      const goal = target.set(...resident.position)
      const current = shown.current[index] ??= goal.clone()
      const previous = current.clone()
      current.lerp(goal, Math.min(1, delta * 12))
      up.copy(current).normalize()
      // Face out of the entrance while sheltered, along the walk while moving.
      const travel = previous.sub(current).negate()
      const wanted = heading.current[index] ??= new Vector3(1, 0, 0)
      if (resident.state === 'moving' && travel.lengthSq() > 1e-8) wanted.copy(travel).normalize()
      else if (resident.home && resident.peek) wanted.set(...resident.peek).sub(target.set(...resident.home)).normalize()
      facing.copy(wanted).addScaledVector(up, -wanted.dot(up))
      if (facing.lengthSq() < 1e-6) facing.set(1, 0, 0).addScaledVector(up, -up.x)
      facing.normalize()
      side.crossVectors(up, facing)
      basis.makeBasis(side, up, facing)
      node.quaternion.setFromRotationMatrix(basis)
      const bob = resident.state === 'moving' ? Math.abs(Math.sin(clock.elapsedTime * 14 + index)) * 0.025
        : resident.state === 'waiting' ? Math.abs(Math.sin(clock.elapsedTime * 3 + index)) * 0.02 : 0
      node.position.copy(current).addScaledVector(up, bob)
      node.scale.setScalar(rules.bodyRadius * resident.size)
    })
  })

  return <group ref={group}>
    {Array.from({ length: residents }, (_, index) => <group key={index}>
      <mesh geometry={parts.body} material={parts.skin} raycast={() => null} />
      <mesh geometry={parts.eye} material={parts.pupil} position={[-0.32, 0.25, 0.86]} raycast={() => null} />
      <mesh geometry={parts.eye} material={parts.pupil} position={[0.32, 0.25, 0.86]} raycast={() => null} />
    </group>)}
  </group>
}
