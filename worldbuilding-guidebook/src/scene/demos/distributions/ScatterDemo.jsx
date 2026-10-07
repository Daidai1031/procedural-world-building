import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Matrix4 } from 'three'
import { readToken } from '../../../styles/readToken.js'
import { useSceneStore } from '../../../store/sceneStore.js'
import TerrainWorld from '../proceduralMaps/TerrainWorld.jsx'
import { elevationColors, heightColor } from '../proceduralMaps/worldPalette.js'
import { COLOR_TOP_HEIGHT } from '../voxels/VoxelTerrainDemo.jsx'
import { scatterParams, scatterSettingsFromParams } from './params.js'
import { buildRockGeometry } from './rock.js'
import { generateCandidates, instanceMatrix } from './scatter.js'
import { SCATTER_WORLD_SIZE, buildTerrainSurface, buildTerrainWalls } from './terrain.js'

// Every instanced mesh is created once at the largest count and then told how
// many instances to draw, so moving Candidate count never rebuilds a mesh.
const INSTANCE_CAPACITY = scatterParams.scatterCandidateCount.max
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

// The ground coloured by height, with the same ramp as the voxel lessons.
function TerrainMesh({ build, side }) {
  const wireframe = useSceneStore((state) => state.wireframe)
  const grayscale = useSceneStore((state) => state.grayscale)
  const geometry = useTerrainGeometry(build)

  useLayoutEffect(() => {
    const colors = elevationColors(grayscale)
    const color = new Color()
    const positions = geometry.getAttribute('position')
    const colorAttribute = geometry.getAttribute('color')

    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      heightColor(Math.min(1, positions.getY(vertex) / COLOR_TOP_HEIGHT), color, colors)
      colorAttribute.setXYZ(vertex, color.r, color.g, color.b)
    }
    colorAttribute.needsUpdate = true
  }, [geometry, grayscale])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.9} side={side} wireframe={wireframe} />
    </mesh>
  )
}

// Places one instance at every candidate. The scale is the same for all of them
// and never depends on how many candidates there are.
function useInstancePlacement(meshRef, candidates, scale) {
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const matrix = new Matrix4()
    candidates.forEach((candidate, index) => mesh.setMatrixAt(index, instanceMatrix(candidate, scale, matrix)))
    mesh.count = candidates.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [meshRef, candidates, scale])
}

function CandidateDots({ candidates }) {
  const meshRef = useRef(null)
  useInstancePlacement(meshRef, candidates, 1)

  return (
    <instancedMesh ref={meshRef} args={[null, null, INSTANCE_CAPACITY]} frustumCulled={false}>
      <sphereGeometry args={[CANDIDATE_DOT_RADIUS, 12, 8]} />
      <meshBasicMaterial color={readToken('--clay-deep')} />
    </instancedMesh>
  )
}

function Rocks({ candidates, scale }) {
  const meshRef = useRef(null)
  const wireframe = useSceneStore((state) => state.wireframe)
  const geometry = useMemo(() => buildRockGeometry(), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useInstancePlacement(meshRef, candidates, scale)

  return (
    <instancedMesh ref={meshRef} args={[geometry, null, INSTANCE_CAPACITY]} frustumCulled={false} castShadow receiveShadow>
      <meshStandardMaterial color={readToken('--scatter-rock')} roughness={0.95} flatShading wireframe={wireframe} />
    </instancedMesh>
  )
}

// The words that explain the scene live in the step's scene.legend. This
// component only draws.
export default function ScatterDemo() {
  const params = useSceneStore((state) => state.params)
  const { candidateCount, assetScale, showAssets, seed } = scatterSettingsFromParams(params)

  // Random values are drawn only when the seed or the count changes, never per
  // frame, so the layout holds still.
  const candidates = useMemo(() => generateCandidates(candidateCount, seed), [candidateCount, seed])

  return (
    <TerrainWorld worldSize={SCATTER_WORLD_SIZE}>
      <TerrainMesh build={buildTerrainSurface} />
      <TerrainMesh build={buildTerrainWalls} side={DoubleSide} />
      <CandidateDots candidates={candidates} />
      {showAssets && <Rocks candidates={candidates} scale={assetScale} />}
    </TerrainWorld>
  )
}
