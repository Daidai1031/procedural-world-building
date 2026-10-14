import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, Quaternion, Vector3, type InstancedMesh } from 'three'
import type { createRunStore } from '../state/runState'
import { plantStage, type Structure } from '../systems/structures'
import { tuning } from '../config/tuning'

const MAX_PLANTS = tuning.structures.maxPlants
const MAX_ANTENNAS = tuning.structures.maxAntennas
const PLANT_HEIGHT = 0.26
const MAST_HEIGHT = 0.42
const plantScale = [0.45, 0.72, 1]
const up = new Vector3(0, 1, 0)
const scratch = new Object3D()
const normal = new Vector3()
const turn = new Quaternion()

// Place one instance standing on its anchor, lifted along the surface normal by `lift`.
function stand(mesh: InstancedMesh, index: number, structure: Structure, lift: number, size: [number, number, number]) {
  normal.set(...structure.normal)
  scratch.quaternion.copy(turn.setFromUnitVectors(up, normal))
  scratch.position.set(...structure.position).addScaledVector(normal, lift)
  scratch.scale.set(...size)
  scratch.updateMatrix()
  mesh.setMatrixAt(index, scratch.matrix)
}

// AUT-15/16: plants and antennas, visible in both modes because they are part of the planet, not of the robot.
export function StructuresView({ store }: { store: ReturnType<typeof createRunStore> }) {
  const plants = useRef<InstancedMesh>(null)
  const masts = useRef<InstancedMesh>(null)
  const tips = useRef<InstancedMesh>(null)
  const drawn = useRef<{ structures: Structure[] | null; tick: number }>({ structures: null, tick: -1 })

  useFrame(() => {
    const { structures, simTick } = store.getState()
    if (!plants.current || !masts.current || !tips.current) return
    if (drawn.current.structures === structures && drawn.current.tick === simTick) return
    drawn.current = { structures, tick: simTick }
    let plantCount = 0
    let antennaCount = 0
    for (const structure of structures) {
      if (structure.kind === 'plant' && plantCount < MAX_PLANTS) {
        const s = plantScale[plantStage(structure, simTick)]
        stand(plants.current, plantCount, structure, (PLANT_HEIGHT * s) / 2 - 0.02, [s, s, s])
        plantCount += 1
      } else if (structure.kind === 'antenna' && antennaCount < MAX_ANTENNAS) {
        stand(masts.current, antennaCount, structure, MAST_HEIGHT / 2 - 0.02, [1, 1, 1])
        stand(tips.current, antennaCount, structure, MAST_HEIGHT - 0.02, [1, 1, 1])
        antennaCount += 1
      }
    }
    plants.current.count = plantCount
    masts.current.count = antennaCount
    tips.current.count = antennaCount
    plants.current.instanceMatrix.needsUpdate = true
    masts.current.instanceMatrix.needsUpdate = true
    tips.current.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={plants} args={[undefined, undefined, MAX_PLANTS]} frustumCulled={false} raycast={() => null}>
        <coneGeometry args={[0.075, PLANT_HEIGHT, 7]} />
        <meshStandardMaterial color="#6a9a68" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={masts} args={[undefined, undefined, MAX_ANTENNAS]} frustumCulled={false} raycast={() => null}>
        <cylinderGeometry args={[0.01, 0.016, MAST_HEIGHT, 6]} />
        <meshStandardMaterial color="#4b4a45" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={tips} args={[undefined, undefined, MAX_ANTENNAS]} frustumCulled={false} raycast={() => null}>
        <sphereGeometry args={[0.032, 12, 8]} />
        <meshStandardMaterial color="#c4a55a" roughness={0.5} />
      </instancedMesh>
    </>
  )
}
