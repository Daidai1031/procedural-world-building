import { useEffect, useMemo } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { useSceneStore } from '../../../store/sceneStore.js'
import TerrainWorld from '../proceduralMaps/TerrainWorld.jsx'
import { buildMarchingMesh } from '../voxels/marchingCubes.js'
import { voxelSettingsFromParams } from '../voxels/params.js'
import { sampleDensityGrid, VOXEL_WORLD_SIZE } from '../voxels/voxelMath.js'

// Study 1: the vertex stage only projects the existing mesh. No terrain data
// changes when the material switches.
export const flatVertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Every fragment receives the same uniform colour. Unlike the baseline, this
// deliberately does not evaluate scene lighting.
export const flatFragmentShader = `
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, 1.0);
  }
`

export default function ShaderLabDemo() {
  const params = useSceneStore((state) => state.params)
  const wireframe = useSceneStore((state) => state.wireframe)
  const { shape, resolution } = voxelSettingsFromParams(params)
  const geometry = useMemo(() => {
    const mesh = buildMarchingMesh(sampleDensityGrid(shape, resolution), resolution)
    const surface = new BufferGeometry()
    surface.setAttribute('position', new Float32BufferAttribute(mesh.positions, 3))
    surface.setAttribute('normal', new Float32BufferAttribute(mesh.normals, 3))
    return surface
  }, [shape, resolution])
  const uniforms = useMemo(() => ({ uColor: { value: new Color('#84a493') } }), [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <TerrainWorld worldSize={VOXEL_WORLD_SIZE}>
      <mesh geometry={geometry} castShadow receiveShadow>
        {params.shaderMode === 'flat' ? (
          <shaderMaterial
            key="flat"
            uniforms={uniforms}
            vertexShader={flatVertexShader}
            fragmentShader={flatFragmentShader}
            wireframe={wireframe}
          />
        ) : (
          <meshStandardMaterial key="standard" color="#84a493" roughness={0.9} wireframe={wireframe} />
        )}
      </mesh>
    </TerrainWorld>
  )
}
