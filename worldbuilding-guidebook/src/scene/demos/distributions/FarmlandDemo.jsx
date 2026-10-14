import { useCallback, useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Color, DoubleSide, BoxGeometry, SRGBColorSpace } from 'three'
import { readToken } from '../../../styles/readToken.js'
import { useSceneStore } from '../../../store/sceneStore.js'
import TerrainWorld from '../proceduralMaps/TerrainWorld.jsx'
import { INSTANCE_CAPACITY, useInstanceMatrices } from './instancing.js'
import { farmSettingsFromParams } from './params.js'
import { CandidateDots, TerrainMesh } from './ScenePieces.jsx'
import { buildFarmLayout, tileMatrix } from './scatter.js'
import { SCATTER_WORLD_SIZE, buildTerrainSurface, buildTerrainWalls, distanceToWaterAt, moistureAt } from './terrain.js'

// Fraction of the lattice cell a tile covers. The rest is the path between
// neighbouring fields.
const TILE_FILL = 0.92
const TILE_THICKNESS = 0.06
// How far the tile top sits above the ground point, so the stripes read.
const TILE_LIFT = 0.02
// Distances at or beyond this look like dry ground in the overlay.
const OVERLAY_DISTANCE_RANGE = 3
const STRIPE_COUNT = 3

function buildTileGeometry() {
  const geometry = new BoxGeometry(1, TILE_THICKNESS, 1)
  geometry.translate(0, TILE_LIFT - TILE_THICKNESS / 2, 0)
  return geometry
}

// Furrows: alternating light and dark stripes along the tile.
function buildStripeTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  for (let stripe = 0; stripe < STRIPE_COUNT * 2; stripe += 1) {
    context.fillStyle = readToken(stripe % 2 === 0 ? '--summit' : '--summit-deep')
    context.fillRect(0, (stripe * size) / (STRIPE_COUNT * 2), size, size / (STRIPE_COUNT * 2) + 1)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function FieldTiles({ candidates, tileSize }) {
  const meshRef = useRef(null)
  const wireframe = useSceneStore((state) => state.wireframe)
  const geometry = useMemo(() => buildTileGeometry(), [])
  const texture = useMemo(() => buildStripeTexture(), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => texture.dispose(), [texture])
  const matrixFor = useCallback((candidate, matrix) => tileMatrix(candidate, tileSize, matrix), [tileSize])
  useInstanceMatrices(meshRef, candidates, matrixFor)

  return (
    <instancedMesh ref={meshRef} args={[geometry, null, INSTANCE_CAPACITY]} frustumCulled={false} castShadow receiveShadow>
      <meshStandardMaterial map={texture} roughness={0.95} wireframe={wireframe} />
    </instancedMesh>
  )
}

// A translucent sheet at the water level. Ground below it shows through as
// lake bed; ground above it hides it.
function WaterSurface({ waterLevel }) {
  return (
    <mesh position={[0, waterLevel, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[SCATTER_WORLD_SIZE, SCATTER_WORLD_SIZE]} />
      <meshStandardMaterial color={readToken('--erosion-water')} transparent opacity={0.72} roughness={0.35} side={DoubleSide} depthWrite={false} />
    </mesh>
  )
}

function useOverlayColor(overlay, grid) {
  return useMemo(() => {
    if (overlay === 'height') return undefined

    const dry = new Color(readToken('--paper'))
    const wet = new Color(readToken('--water-deep'))
    if (overlay === 'moisture') {
      return (x, y, z, color) => color.lerpColors(dry, wet, moistureAt(x, z))
    }
    return (x, y, z, color) => {
      const nearness = 1 - Math.min(1, distanceToWaterAt(grid, x, z) / OVERLAY_DISTANCE_RANGE)
      return color.lerpColors(dry, wet, nearness)
    }
  }, [overlay, grid])
}

// The words that explain the scene live in the step's scene.legend. This
// component only draws.
export default function FarmlandDemo() {
  const params = useSceneStore((state) => state.params)
  const { cellSize, seed, irrigationBand, waterLevel, candidateSource, overlay } = farmSettingsFromParams(params)

  const { candidates, accepted, grid } = useMemo(
    () => buildFarmLayout({ cellSize, seed, irrigationBand, waterLevel, candidateSource }),
    [cellSize, seed, irrigationBand, waterLevel, candidateSource],
  )
  const acceptedCandidates = useMemo(() => candidates.filter((_, index) => accepted[index]), [candidates, accepted])
  const rejectedCandidates = useMemo(() => candidates.filter((_, index) => !accepted[index]), [candidates, accepted])
  const overlayColor = useOverlayColor(overlay, grid)

  return (
    <TerrainWorld worldSize={SCATTER_WORLD_SIZE}>
      <TerrainMesh build={buildTerrainSurface} overlayColor={overlayColor} />
      <TerrainMesh build={buildTerrainWalls} side={DoubleSide} />
      <WaterSurface waterLevel={waterLevel} />
      <CandidateDots candidates={rejectedCandidates} />
      <FieldTiles candidates={acceptedCandidates} tileSize={cellSize * TILE_FILL} />
    </TerrainWorld>
  )
}
