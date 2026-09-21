import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, EdgesGeometry, Object3D } from 'three'
import { readToken } from '../../../styles/readToken.js'
import { useSceneStore } from '../../../store/sceneStore.js'
import { elevationColors, heightColor } from '../proceduralMaps/worldPalette.js'
import TerrainWorld from '../proceduralMaps/TerrainWorld.jsx'
import { voxelSettingsFromParams } from './params.js'
import {
  VOXEL_WORLD_SIZE,
  findSurfaceVoxels,
  sampleDensityGrid,
  samplePosition,
  sampleSpacing,
} from './voxelMath.js'

// Height at which the elevation colours reach their top band, kept relative to
// the volume so the palette follows the size.
export const COLOR_TOP_HEIGHT = 0.7 * VOXEL_WORLD_SIZE

function VoxelCubes({ shape, resolution }) {
  const meshRef = useRef(null)
  const spacing = sampleSpacing(resolution)
  // The mesh is rebuilt whenever the instance count changes, so it has to read
  // the viewport's wireframe switch itself rather than wait for a toggle.
  const wireframe = useSceneStore((state) => state.wireframe)
  const grayscale = useSceneStore((state) => state.grayscale)

  const surfaceVoxels = useMemo(
    () => findSurfaceVoxels(sampleDensityGrid(shape, resolution), resolution),
    [shape, resolution],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const colors = elevationColors(grayscale)
    const color = new Color()
    const placeholder = new Object3D()

    surfaceVoxels.forEach((flatIndex, instanceIndex) => {
      const sampleX = flatIndex % resolution
      const sampleY = Math.floor(flatIndex / resolution) % resolution
      const sampleZ = Math.floor(flatIndex / (resolution * resolution))
      const [x, y, z] = samplePosition(resolution, sampleX, sampleY, sampleZ)

      placeholder.position.set(x, y, z)
      placeholder.updateMatrix()
      mesh.setMatrixAt(instanceIndex, placeholder.matrix)
      mesh.setColorAt(instanceIndex, heightColor(Math.min(1, y / COLOR_TOP_HEIGHT), color, colors))
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [surfaceVoxels, resolution, grayscale])

  // The instance count is fixed when the mesh is created, so a new count needs
  // a new mesh.
  return (
    <instancedMesh
      key={`${shape}-${resolution}-${surfaceVoxels.length}`}
      ref={meshRef}
      args={[null, null, surfaceVoxels.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[spacing, spacing, spacing]} />
      <meshStandardMaterial roughness={0.9} wireframe={wireframe} />
    </instancedMesh>
  )
}

// The outer faces of the sample cubes, so the whole volume reads as one block
// even where the terrain leaves most of it empty.
function VolumeBounds({ resolution }) {
  const edges = useMemo(() => {
    const size = VOXEL_WORLD_SIZE + sampleSpacing(resolution)
    return new EdgesGeometry(new BoxGeometry(size, size, size))
  }, [resolution])

  useEffect(() => () => edges.dispose(), [edges])

  return (
    <lineSegments geometry={edges} position={[0, VOXEL_WORLD_SIZE / 2, 0]}>
      <lineBasicMaterial color={readToken('--terrain-grid-section')} />
    </lineSegments>
  )
}

// The voxel volume for one density shape. Other voxel demos draw extra things
// inside it as children, and can turn the cubes off to show something else.
export function VoxelVolume({ shape, resolution, showCubes = true, children }) {
  return (
    <TerrainWorld worldSize={VOXEL_WORLD_SIZE}>
      {showCubes && <VoxelCubes shape={shape} resolution={resolution} />}
      <VolumeBounds resolution={resolution} />
      {children}
    </TerrainWorld>
  )
}

export default function VoxelTerrainDemo() {
  const params = useSceneStore((state) => state.params)
  const { shape, resolution } = voxelSettingsFromParams(params)

  return <VoxelVolume shape={shape} resolution={resolution} />
}
