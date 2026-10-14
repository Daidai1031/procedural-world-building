import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D, Quaternion, Vector3, type BufferGeometry, type Material } from 'three'
import type { createRunStore } from '../state/runState'
import { plantStage, type Structure } from '../systems/structures'
import { tuning } from '../config/tuning'
import { palette } from '../config/palette'
import { hashSeed } from '../world/planet'
import { modelMaterial } from '../render/models/voxel'
import { antennaColors, antennaGeometries, branchGeometries, lichenGeometries, type AntennaPart } from '../render/models/surfaceModels'

const MAX_PLANTS = tuning.structures.maxPlants
const MAX_ANTENNAS = tuning.structures.maxAntennas
// D-027 vegetation A + D: every plant is a lichen patch with an L-system branch growing out of it.
// Three branch shapes, chosen per plant from its id; each growth stage shows more branch levels.
const VARIANTS = 3
const PLANT_HEIGHT = 0.24
const stageGrowth = [0.4, 0.7, 1]
const lichenScale = [0.45, 0.72, 1]
const SINK = 0.01
const up = new Vector3(0, 1, 0)
const scratch = new Object3D()
const normal = new Vector3()
const turn = new Quaternion()
const spin = new Quaternion()

function instanced(geometry: BufferGeometry, material: Material, count: number) {
  const mesh = new InstancedMesh(geometry, material, count)
  mesh.count = 0
  mesh.frustumCulled = false
  mesh.raycast = () => {}
  return mesh
}

// Place one instance standing on its anchor, turned about its normal by a per-structure angle.
function stand(mesh: InstancedMesh, index: number, structure: Structure, scale: number) {
  normal.set(...structure.normal)
  spin.setFromAxisAngle(up, (hashSeed(structure.id) % 628) / 100)
  scratch.quaternion.copy(turn.setFromUnitVectors(up, normal)).multiply(spin)
  scratch.position.set(...structure.position).addScaledVector(normal, -SINK)
  scratch.scale.setScalar(scale)
  scratch.updateMatrix()
  mesh.setMatrixAt(index, scratch.matrix)
}

// AUT-15/16: plants and antennas, visible in both modes because they are part of the planet, not of the robot.
export function StructuresView({ store }: { store: ReturnType<typeof createRunStore> }) {
  const parts = useMemo(() => {
    const dish = new MeshStandardMaterial({ color: palette.antenna.dish, roughness: 0.5, side: DoubleSide })
    const lamp = new MeshStandardMaterial({ color: palette.antenna.lamp, emissive: palette.antenna.lamp, emissiveIntensity: 1 })
    const branches = Array.from({ length: VARIANTS }, (_, variant) => stageGrowth.map((growth) =>
      branchGeometries(`plant-${variant}`, PLANT_HEIGHT, growth).map(({ color, geometry }) =>
        instanced(geometry, modelMaterial(color), MAX_PLANTS))))
    const lichen = lichenGeometries('plant').map(({ color, geometry }) => instanced(geometry, modelMaterial(color), MAX_PLANTS))
    const antenna = Object.entries(antennaGeometries()).map(([part, geometry]) => instanced(geometry,
      part === 'dish' ? dish : part === 'lamp' ? lamp : modelMaterial(antennaColors[part as AntennaPart]), MAX_ANTENNAS))
    return { branches, lichen, antenna, lamp, dish, all: [...branches.flat(2), ...lichen, ...antenna] }
  }, [])
  useEffect(() => () => {
    parts.all.forEach((mesh) => mesh.geometry.dispose())
    parts.lamp.dispose()
    parts.dish.dispose()
  }, [parts])
  const drawn = useRef<{ structures: Structure[] | null; tick: number }>({ structures: null, tick: -1 })

  useFrame(({ clock }) => {
    parts.lamp.emissiveIntensity = Math.floor(clock.elapsedTime * 1.5) % 2 ? 1.4 : 0.1
    const { structures, simTick } = store.getState()
    if (drawn.current.structures === structures && drawn.current.tick === simTick) return
    drawn.current = { structures, tick: simTick }
    const counts = new Map<InstancedMesh, number>()
    const place = (mesh: InstancedMesh, structure: Structure, scale: number) => {
      const index = counts.get(mesh) ?? 0
      stand(mesh, index, structure, scale)
      counts.set(mesh, index + 1)
    }
    let plantCount = 0
    let antennaCount = 0
    for (const structure of structures) {
      if (structure.kind === 'plant' && plantCount < MAX_PLANTS) {
        const stage = plantStage(structure, simTick)
        parts.branches[hashSeed(structure.id) % VARIANTS][stage].forEach((mesh) => place(mesh, structure, 1))
        parts.lichen.forEach((mesh) => place(mesh, structure, lichenScale[stage]))
        plantCount += 1
      } else if (structure.kind === 'antenna' && antennaCount < MAX_ANTENNAS) {
        parts.antenna.forEach((mesh) => place(mesh, structure, 1))
        antennaCount += 1
      }
    }
    for (const mesh of parts.all) {
      mesh.count = counts.get(mesh) ?? 0
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  return <>{parts.all.map((mesh) => <primitive key={mesh.uuid} object={mesh} />)}</>
}
