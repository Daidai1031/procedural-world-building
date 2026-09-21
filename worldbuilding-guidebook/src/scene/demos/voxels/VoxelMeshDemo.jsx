import { useEffect, useLayoutEffect, useMemo } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { useSceneStore } from '../../../store/sceneStore.js'
import { elevationColors, heightColor } from '../proceduralMaps/worldPalette.js'
import { buildCulledMesh, buildGreedyMesh } from './greedyMeshing.js'
import { buildMarchingMesh } from './marchingCubes.js'
import { meshSettingsFromParams } from './params.js'
import { buildSurfaceNetsMesh } from './surfaceNets.js'
import { sampleDensityGrid } from './voxelMath.js'
import { COLOR_TOP_HEIGHT, VoxelVolume } from './VoxelTerrainDemo.jsx'

// Each way of turning the density grid into a surface, by the view that shows it.
const SURFACE_BUILDERS = {
  surface: buildMarchingMesh,
  nets: buildSurfaceNetsMesh,
  culled: buildCulledMesh,
  greedy: buildGreedyMesh,
}

// Draws a finished mesh, coloured by height. Also used by the chunk demo, one
// per chunk.
export function SurfaceMesh({ mesh }) {
  // The mesh is rebuilt whenever the volume changes, so it reads the viewport's
  // switches itself rather than wait for a toggle.
  const wireframe = useSceneStore((state) => state.wireframe)
  const grayscale = useSceneStore((state) => state.grayscale)

  const geometry = useMemo(() => {
    const surface = new BufferGeometry()
    surface.setAttribute('position', new Float32BufferAttribute(mesh.positions, 3))
    surface.setAttribute('normal', new Float32BufferAttribute(mesh.normals, 3))
    surface.setAttribute('color', new Float32BufferAttribute(new Float32Array(mesh.positions.length), 3))
    return surface
  }, [mesh])

  useLayoutEffect(() => {
    const colors = elevationColors(grayscale)
    const color = new Color()
    const colorAttribute = geometry.getAttribute('color')

    for (let vertex = 0; vertex < colorAttribute.count; vertex += 1) {
      const y = mesh.positions[vertex * 3 + 1]
      heightColor(Math.min(1, y / COLOR_TOP_HEIGHT), color, colors)
      colorAttribute.setXYZ(vertex, color.r, color.g, color.b)
    }
    colorAttribute.needsUpdate = true
  }, [geometry, mesh, grayscale])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.9} wireframe={wireframe} />
    </mesh>
  )
}

function MeshSurface({ shape, resolution, buildMesh }) {
  const mesh = useMemo(
    () => buildMesh(sampleDensityGrid(shape, resolution), resolution),
    [shape, resolution, buildMesh],
  )

  return <SurfaceMesh mesh={mesh} />
}

// The words that explain each view live in the step's scene.legend. This
// component only draws.
export default function VoxelMeshDemo() {
  const params = useSceneStore((state) => state.params)
  const { shape, resolution, mode } = meshSettingsFromParams(params)

  const buildMesh = SURFACE_BUILDERS[mode]
  if (buildMesh) {
    return (
      <VoxelVolume shape={shape} resolution={resolution} showCubes={false}>
        <MeshSurface shape={shape} resolution={resolution} buildMesh={buildMesh} />
      </VoxelVolume>
    )
  }

  return <VoxelVolume shape={shape} resolution={resolution} />
}
