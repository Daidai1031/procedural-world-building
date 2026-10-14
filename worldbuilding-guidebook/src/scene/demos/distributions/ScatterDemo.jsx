import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide } from 'three'
import { readToken } from '../../../styles/readToken.js'
import { useSceneStore } from '../../../store/sceneStore.js'
import TerrainWorld from '../proceduralMaps/TerrainWorld.jsx'
import { INSTANCE_CAPACITY, useInstancePlacement } from './instancing.js'
import { scatterSettingsFromParams } from './params.js'
import { useScatterLayout } from './useScatterLayout.js'
import { buildRockGeometry } from './rock.js'
import { CandidateDots, TerrainMesh } from './ScenePieces.jsx'
import { SCATTER_WORLD_SIZE, buildTerrainSurface, buildTerrainWalls } from './terrain.js'

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
  const { assetScale, showAssets } = scatterSettingsFromParams(params)
  const { candidates, accepted } = useScatterLayout()
  const acceptedCandidates = useMemo(() => candidates.filter((_, index) => accepted[index]), [candidates, accepted])

  return (
    <TerrainWorld worldSize={SCATTER_WORLD_SIZE}>
      <TerrainMesh build={buildTerrainSurface} />
      <TerrainMesh build={buildTerrainWalls} side={DoubleSide} />
      <CandidateDots candidates={candidates} />
      {showAssets && <Rocks candidates={acceptedCandidates} scale={assetScale} />}
    </TerrainWorld>
  )
}
