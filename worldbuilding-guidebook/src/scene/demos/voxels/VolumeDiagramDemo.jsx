import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three'
import { readToken } from '../../../styles/readToken.js'
import { useSceneStore } from '../../../store/sceneStore.js'
import TerrainWorld from '../proceduralMaps/TerrainWorld.jsx'
import {
  DIAGRAM_COLUMNS,
  DIAGRAM_DEPTH,
  buildDiagramCells,
  columnHeight,
} from './volumeDiagram.js'

const CELL_SIZE = 0.6
const CELL_GAP = 0.9
// Shifts the slice right so the step card does not cover its left edge.
const DIAGRAM_OFFSET_X = 1.1
// Higher settles faster. About 0.4s to arrive, matching the compare morph.
const MORPH_RATE = 9

const cells = buildDiagramCells()

function cellPosition(column, row, depth) {
  return [
    (column - (DIAGRAM_COLUMNS - 1) / 2) * CELL_SIZE,
    (row + 0.5) * CELL_SIZE,
    (depth - (DIAGRAM_DEPTH - 1) / 2) * CELL_SIZE,
  ]
}

// Grows an element in and shrinks it out rather than cutting, so the learner
// sees what changed between the two views.
function Morph({ visible, position, children }) {
  const groupRef = useRef(null)
  const scaleRef = useRef(visible ? 1 : 0)

  // Scale and visibility are driven from the frame loop only. Passing them as
  // props would apply every change at once and cut the animation short.
  useLayoutEffect(() => {
    groupRef.current.visible = scaleRef.current > 0.01
    groupRef.current.scale.setScalar(Math.max(scaleRef.current, 0.0001))
  }, [])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const target = visible ? 1 : 0
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    scaleRef.current = reducedMotion ? target : MathUtils.damp(scaleRef.current, target, MORPH_RATE, delta)
    group.visible = scaleRef.current > 0.01
    group.scale.setScalar(Math.max(scaleRef.current, 0.0001))
  })

  return (
    <group ref={groupRef} position={position}>
      {children}
    </group>
  )
}

function useDiagramAssets() {
  const assets = useMemo(() => ({
    cube: new BoxGeometry(CELL_SIZE * CELL_GAP, CELL_SIZE * CELL_GAP, CELL_SIZE * CELL_GAP),
    dot: new SphereGeometry(0.04, 12, 8),
    cavityDot: new SphereGeometry(0.09, 16, 12),
    marker: new SphereGeometry(0.1, 16, 12),
    solid: new MeshStandardMaterial({ color: readToken('--moss'), roughness: 0.9 }),
    cavity: new MeshStandardMaterial({ color: readToken('--clay'), roughness: 0.9 }),
    // Unlit, so the dots keep the token's grey instead of shading to near black.
    air: new MeshBasicMaterial({ color: readToken('--ink-faint') }),
    height: new MeshStandardMaterial({ color: readToken('--summit'), roughness: 0.6 }),
  }), [])

  useEffect(() => () => {
    for (const asset of Object.values(assets)) asset.dispose()
  }, [assets])

  return assets
}

// The words that explain each colour live in the step's scene.legend, shown by
// SceneLegend. This component only draws.
export default function VolumeDiagramDemo() {
  const mode = useSceneStore((state) => state.params.voxelDiagramMode)
  const assets = useDiagramAssets()
  const isVolume = mode === 'volume'

  const markerPositions = useMemo(() => {
    const positions = []
    for (let depth = 0; depth < DIAGRAM_DEPTH; depth += 1) {
      for (let column = 0; column < DIAGRAM_COLUMNS; column += 1) {
        const [x, , z] = cellPosition(column, 0, depth)
        positions.push({ key: `${column}-${depth}`, position: [x, columnHeight(column) * CELL_SIZE, z] })
      }
    }
    return positions
  }, [])

  return (
    <TerrainWorld worldSize={8}>
      <group position={[DIAGRAM_OFFSET_X, 0, 0]}>
        {cells.map((cell) => {
          const position = cellPosition(cell.column, cell.row, cell.depth)
          const isSolidNow = isVolume ? cell.inVolume : cell.inHeightField

          return (
            <group key={cell.key}>
              {(cell.inHeightField || cell.inVolume) && (
                <Morph visible={isSolidNow} position={position}>
                  <mesh geometry={assets.cube} material={assets.solid} castShadow receiveShadow />
                </Morph>
              )}
              {!cell.inVolume && (
                <Morph visible={isVolume} position={position}>
                  {cell.isCavity
                    ? <mesh geometry={assets.cavityDot} material={assets.cavity} />
                    : <mesh geometry={assets.dot} material={assets.air} />}
                </Morph>
              )}
            </group>
          )
        })}

        {markerPositions.map((marker) => (
          <Morph key={marker.key} visible={!isVolume} position={marker.position}>
            <mesh geometry={assets.marker} material={assets.height} />
          </Morph>
        ))}
      </group>
    </TerrainWorld>
  )
}
