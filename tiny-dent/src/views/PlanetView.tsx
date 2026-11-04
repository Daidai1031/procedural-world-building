import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { DoubleSide, Vector3, type Group, type Mesh } from 'three'
import { createTerrainMaterial, setResourceGlowActive, setTerrainMotion } from '../render/terrainMaterial'
import { surfaceEnvironment } from '../render/surfaceEnvironment'
import { FurShells } from './FurShells'
import { surfaces } from '../content/surfaces'
import { tuning } from '../config/tuning'
import { modeForClick } from '../config/controls'
import type { PlanetWorld } from '../world/planet'
import type { ResourceCluster } from '../world/resourceClusters'
import type { TerrainMode } from '../state/runState'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { flattenNormal, type FlattenOrientation } from '../world/flattenPlane'

const discNormal = new Vector3(0, 0, 1)

export function PlanetView({ world, sources, baseRadius, clusters, collectedIds, radius, detectorRadius, activeTool, selectedMode, flattenOrientation, onTarget }: {
  world: PlanetWorld
  /** Disturbance sources in centered coordinates; jelly ripples read them. */
  sources: () => readonly { position: readonly number[]; level: number }[]
  baseRadius: number
  clusters: ResourceCluster[]
  collectedIds: string[]
  radius: number
  detectorRadius: number
  activeTool: 'terrain' | 'detector' | 'miner' | 'explore'
  selectedMode: TerrainMode
  flattenOrientation: FlattenOrientation
  onTarget: (point: { x: number; y: number; z: number }, alt: boolean, ctrl: boolean) => void
}) {
  const spherePreview = useRef<Mesh>(null)
  const detectorPreview = useRef<Mesh>(null)
  const planePreview = useRef<Group>(null)
  const previewNormal = useRef(new Vector3())
  const gl = useThree(state => state.gl)
  const { surface } = world
  const material = useMemo(() => createTerrainMaterial(clusters, baseRadius, surface, { env: surfaceEnvironment(gl) }), [clusters, baseRadius, surface, gl])
  const hair = useMemo(() => surface === 'fur' ? createTerrainMaterial(clusters, baseRadius, surface, { shell: true }) : null, [clusters, baseRadius, surface])
  useEffect(() => () => { material.dispose(); hair?.dispose() }, [material, hair])
  useEffect(() => {
    const active = clusters.map(({ id }) => !collectedIds.includes(id))
    setResourceGlowActive(material, active)
    if (hair) setResourceGlowActive(hair, active)
  }, [material, hair, clusters, collectedIds])
  // SUR-14: the transmission pass costs a full scene render; a smaller target hides that behind the refraction blur.
  useEffect(() => { gl.transmissionResolutionScale = 'transmission' in surfaces[surface].look ? tuning.surface.transmissionScale : 1 }, [gl, surface])
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  useFrame(({ clock }) => { setTerrainMotion(still ? 0 : clock.elapsedTime, sources()) })

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
  // A preview left over from the previous tool would otherwise stay on screen until the pointer moves.
  useEffect(() => hidePreview(), [activeTool])
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (activeTool === 'explore' || event.button !== 0 || event.delta > 5) return
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
              <bufferAttribute attach="attributes-aEdit" args={[mesh.edits, 3]} />
            </bufferGeometry>
          </mesh>
        ))}
        {hair && <FurShells world={world} material={hair} />}
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
