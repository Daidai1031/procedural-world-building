import { useEffect, useMemo } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  WireframeGeometry,
} from 'three'
import { readToken } from '../../../styles/readToken.js'
import { useSceneStore } from '../../../store/sceneStore.js'
import TerrainWorld from '../proceduralMaps/TerrainWorld.jsx'
import {
  CELL_CASES,
  CELL_CORNER_COUNT,
  ISOVALUE,
  cellCornerOffset,
  cellCornerValues,
  findCrossingPoints,
  findSurfaceTriangles,
} from './voxelMath.js'

const CELL_SIZE = 3
const CELL_CENTER = [1.1, 2, 0]
const INSIDE_CORNER_SIZE = 0.3
const OUTSIDE_CORNER_RADIUS = 0.09
const SURFACE_POINT_RADIUS = 0.15

// The cell is drawn at CELL_SIZE, with its own 0 to 1 coordinates centred on
// CELL_CENTER. The step card covers the left of the canvas, so the cell sits
// right of the middle.
function cellToWorld([x, y, z]) {
  return [
    CELL_CENTER[0] + (x - 0.5) * CELL_SIZE,
    CELL_CENTER[1] + (y - 0.5) * CELL_SIZE,
    CELL_CENTER[2] + (z - 0.5) * CELL_SIZE,
  ]
}

// The triangles as one geometry, in the cell's own 0 to 1 coordinates mapped to
// the world. Flat normals, so each triangle reads as its own facet.
function buildSurfaceGeometry(triangles) {
  const positions = triangles.flat().flatMap(cellToWorld)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

function useCellAssets() {
  const assets = useMemo(() => ({
    edges: new EdgesGeometry(new BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE)),
    insideCorner: new BoxGeometry(INSIDE_CORNER_SIZE, INSIDE_CORNER_SIZE, INSIDE_CORNER_SIZE),
    outsideCorner: new SphereGeometry(OUTSIDE_CORNER_RADIUS, 12, 8),
    surfacePoint: new SphereGeometry(SURFACE_POINT_RADIUS, 16, 12),
    edgeLine: new LineBasicMaterial({ color: readToken('--terrain-grid-section') }),
    solid: new MeshStandardMaterial({ color: readToken('--moss'), roughness: 0.9 }),
    // Unlit, so the dots keep the token's grey instead of shading to near black.
    air: new MeshBasicMaterial({ color: readToken('--ink-faint') }),
    triangleEdge: new LineBasicMaterial({ color: readToken('--ink-dim') }),
    surfacePointMaterial: new MeshStandardMaterial({ color: readToken('--clay'), roughness: 0.6 }),
    skin: new MeshStandardMaterial({
      color: readToken('--summit'), roughness: 0.7, transparent: true, opacity: 0.7, side: DoubleSide, flatShading: true,
    }),
  }), [])

  useEffect(() => () => {
    for (const asset of Object.values(assets)) asset.dispose()
  }, [assets])

  return assets
}

// The words that explain each colour live in the step's scene.legend, shown by
// SceneLegend. This component only draws.
export default function VoxelCellDemo() {
  const cellCase = useSceneStore((state) => state.params.voxelCellCase)
  const cellView = useSceneStore((state) => state.params.voxelCellView)
  const assets = useCellAssets()

  const cornerValues = useMemo(() => cellCornerValues(CELL_CASES[cellCase] ?? []), [cellCase])
  const surfacePoints = useMemo(() => findCrossingPoints(cornerValues), [cornerValues])
  const surfaceGeometry = useMemo(() => buildSurfaceGeometry(findSurfaceTriangles(cornerValues)), [cornerValues])

  // Every triangle's edges, so triangles that lie in one plane still read as
  // separate triangles.
  const triangleEdges = useMemo(() => new WireframeGeometry(surfaceGeometry), [surfaceGeometry])

  useEffect(() => () => {
    surfaceGeometry.dispose()
    triangleEdges.dispose()
  }, [surfaceGeometry, triangleEdges])

  return (
    <TerrainWorld worldSize={8}>
      <lineSegments geometry={assets.edges} material={assets.edgeLine} position={CELL_CENTER} />

      {Array.from({ length: CELL_CORNER_COUNT }, (_, corner) => {
        const position = cellToWorld(cellCornerOffset(corner))
        return cornerValues[corner] < ISOVALUE
          ? <mesh key={corner} geometry={assets.insideCorner} material={assets.solid} position={position} castShadow />
          : <mesh key={corner} geometry={assets.outsideCorner} material={assets.air} position={position} />
      })}

      {surfacePoints.map((point, index) => (
        <mesh key={index} geometry={assets.surfacePoint} material={assets.surfacePointMaterial} position={cellToWorld(point)} castShadow />
      ))}
      {cellView === 'surface' && (
        <>
          <mesh geometry={surfaceGeometry} material={assets.skin} />
          <lineSegments geometry={triangleEdges} material={assets.triangleEdge} />
        </>
      )}
    </TerrainWorld>
  )
}
