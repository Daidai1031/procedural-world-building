import { useEffect, useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { DoubleSide, Vector3, type Group, type Mesh } from 'three'
import { createTerrainMaterial, setResourceGlowActive } from '../render/terrainMaterial'
import { modeForClick } from '../config/controls'
import type { PlanetWorld } from '../world/planet'
import type { ResourceCluster } from '../world/resourceClusters'
import type { TerrainMode } from '../state/runState'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { flattenNormal, type FlattenOrientation } from '../world/flattenPlane'

const discNormal = new Vector3(0, 0, 1)

export function PlanetView({ world, clusters, collectedIds, radius, detectorRadius, activeTool, selectedMode, flattenOrientation, onTarget }: {
  world: PlanetWorld
  clusters: ResourceCluster[]
  collectedIds: string[]
  radius: number
  detectorRadius: number
  activeTool: 'terrain' | 'detector'
  selectedMode: TerrainMode
  flattenOrientation: FlattenOrientation
  onTarget: (point: { x: number; y: number; z: number }, alt: boolean, ctrl: boolean) => void
}) {
  const spherePreview = useRef<Mesh>(null)
  const detectorPreview = useRef<Mesh>(null)
  const planePreview = useRef<Group>(null)
  const previewNormal = useRef(new Vector3())
  const material = useMemo(() => createTerrainMaterial(clusters), [clusters])
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => {
    setResourceGlowActive(material, clusters.map(({ id }) => !collectedIds.includes(id)))
  }, [material, clusters, collectedIds])

  const showPreview = (event: ThreeEvent<PointerEvent>) => {
    const mode = modeForClick(selectedMode, event.altKey, event.ctrlKey)
    if (spherePreview.current) {
      spherePreview.current.visible = activeTool === 'terrain' && mode !== null && mode !== 'flatten'
      spherePreview.current.position.copy(event.point)
    }
    if (planePreview.current) {
      planePreview.current.visible = activeTool === 'terrain' && mode === 'flatten'
      planePreview.current.position.copy(event.point)
      if (planePreview.current.visible) {
        const [x, y, z] = flattenNormal({ x: event.point.x,
          y: event.point.y + VOXEL_WORLD_SIZE / 2, z: event.point.z }, flattenOrientation)
        planePreview.current.quaternion.setFromUnitVectors(discNormal, previewNormal.current.set(x, y, z))
      }
    }
    if (detectorPreview.current) {
      detectorPreview.current.visible = activeTool === 'detector'
      detectorPreview.current.position.copy(event.point)
    }
  }
  const hidePreview = () => {
    if (spherePreview.current) spherePreview.current.visible = false
    if (planePreview.current) planePreview.current.visible = false
    if (detectorPreview.current) detectorPreview.current.visible = false
  }
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.button !== 0 || event.delta > 5) return
    event.stopPropagation()
    onTarget({
      x: event.point.x,
      y: event.point.y + VOXEL_WORLD_SIZE / 2,
      z: event.point.z,
    }, event.altKey, event.ctrlKey)
  }

  return (
    <>
      <group position={[0, -VOXEL_WORLD_SIZE / 2, 0]}>
        {world.chunks.filter(({ mesh }) => mesh.positions.length > 0).map(({ key, version, mesh }) => (
          <mesh key={`${key}-${version}`} material={material} onClick={handleClick}
            onPointerMove={showPreview}
            onPointerOut={hidePreview}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[mesh.positions, 3]} />
              <bufferAttribute attach="attributes-normal" args={[mesh.normals, 3]} />
            </bufferGeometry>
          </mesh>
        ))}
      </group>
      <mesh ref={spherePreview} visible={false} scale={radius} raycast={() => null}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#55544e" transparent opacity={0.25} wireframe depthWrite={false} />
      </mesh>
      <mesh ref={detectorPreview} visible={false} scale={detectorRadius} raycast={() => null}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#66645f" transparent opacity={0.3} wireframe depthTest={false} depthWrite={false} />
      </mesh>
      <group ref={planePreview} visible={false} scale={radius}>
        <mesh raycast={() => null}>
          <circleGeometry args={[1, 48]} />
          <meshBasicMaterial color="#55544e" transparent opacity={0.12} side={DoubleSide} depthTest={false} depthWrite={false} />
        </mesh>
        <mesh raycast={() => null}>
          <ringGeometry args={[0.94, 1, 48]} />
          <meshBasicMaterial color="#55544e" transparent opacity={0.65} side={DoubleSide} depthTest={false} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}
