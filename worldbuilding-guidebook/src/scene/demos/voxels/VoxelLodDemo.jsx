import { useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSceneStore } from '../../../store/sceneStore.js'
import { LOD_MAX_LEVELS, LOD_RESOLUTION, buildLodChunks, columnLevels } from './lodChunks.js'
import { lodSettingsFromParams } from './params.js'
import { groundDensity } from './voxelMath.js'
import { ChunkOutlines } from './VoxelChunksDemo.jsx'
import { SurfaceMesh } from './VoxelMeshDemo.jsx'
import { VoxelVolume } from './VoxelTerrainDemo.jsx'

// One outline colour for each level, finest first.
const LEVEL_COLOR_TOKENS = ['--ink', '--terrain-grid-section', '--terrain-grid']

// The words that explain each view live in the step's scene.legend. This
// component only draws.
export default function VoxelLodDemo() {
  const params = useSceneStore((state) => state.params)
  const { levelCount, hasSnapping } = lodSettingsFromParams(params)
  const camera = useThree((state) => state.camera)

  // The level of every column follows the learner's own camera. It is kept as
  // text so that the scene only draws again when a column changes level, not on
  // every frame the camera moves.
  const [levelText, setLevelText] = useState(() => columnLevels(camera.position, levelCount).join(''))
  useFrame(() => {
    const next = columnLevels(camera.position, levelCount).join('')
    if (next !== levelText) setLevelText(next)
  })

  // The mesh of every chunk at every level it has been at, so moving the camera
  // only builds the chunks that change level.
  const cache = useMemo(() => new Map(), [])

  const chunks = useMemo(
    () => buildLodChunks({ field: groundDensity, levels: Array.from(levelText, Number), hasSnapping, cache }),
    [levelText, hasSnapping, cache],
  )

  return (
    <VoxelVolume shape="ground" resolution={LOD_RESOLUTION} showCubes={false}>
      {chunks.map((chunk) =>
        chunk.mesh.positions.length > 0 ? <SurfaceMesh key={chunk.key} mesh={chunk.mesh} /> : null,
      )}
      {Array.from({ length: LOD_MAX_LEVELS }, (_, level) => {
        const atLevel = chunks.filter((chunk) => chunk.level === level)
        return atLevel.length > 0 ? <ChunkOutlines key={level} chunks={atLevel} colorToken={LEVEL_COLOR_TOKENS[level]} /> : null
      })}
    </VoxelVolume>
  )
}
