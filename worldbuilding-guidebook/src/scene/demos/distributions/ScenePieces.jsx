import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { readToken } from '../../../styles/readToken.js'
import { useSceneStore } from '../../../store/sceneStore.js'
import { elevationColors, heightColor } from '../proceduralMaps/worldPalette.js'
import { COLOR_TOP_HEIGHT } from '../voxels/VoxelTerrainDemo.jsx'
import { INSTANCE_CAPACITY, useInstancePlacement } from './instancing.js'

const CANDIDATE_DOT_RADIUS = 0.035

function useTerrainGeometry(build) {
  const geometry = useMemo(() => {
    const { positions, indices } = build()
    const surface = new BufferGeometry()
    surface.setAttribute('position', new Float32BufferAttribute(positions, 3))
    surface.setAttribute('color', new Float32BufferAttribute(new Float32Array(positions.length), 3))
    surface.setIndex(indices)
    surface.computeVertexNormals()
    return surface
  }, [build])

  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

// The ground coloured by height, with the same ramp as the voxel lessons. A
// scene can paint the surface another way with overlayColor(x, y, z, color).
export function TerrainMesh({ build, side, overlayColor }) {
  const wireframe = useSceneStore((state) => state.wireframe)
  const grayscale = useSceneStore((state) => state.grayscale)
  const geometry = useTerrainGeometry(build)

  useLayoutEffect(() => {
    const colors = elevationColors(grayscale)
    const color = new Color()
    const positions = geometry.getAttribute('position')
    const colorAttribute = geometry.getAttribute('color')

    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      const x = positions.getX(vertex)
      const y = positions.getY(vertex)
      const z = positions.getZ(vertex)
      if (overlayColor) overlayColor(x, y, z, color)
      else heightColor(Math.min(1, y / COLOR_TOP_HEIGHT), color, colors)
      colorAttribute.setXYZ(vertex, color.r, color.g, color.b)
    }
    colorAttribute.needsUpdate = true
  }, [geometry, grayscale, overlayColor])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.9} side={side} wireframe={wireframe} />
    </mesh>
  )
}

export function CandidateDots({ candidates }) {
  const meshRef = useRef(null)
  useInstancePlacement(meshRef, candidates, 1)

  return (
    <instancedMesh ref={meshRef} args={[null, null, INSTANCE_CAPACITY]} frustumCulled={false}>
      <sphereGeometry args={[CANDIDATE_DOT_RADIUS, 12, 8]} />
      <meshBasicMaterial color={readToken('--clay-deep')} />
    </instancedMesh>
  )
}
