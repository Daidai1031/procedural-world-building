import { useEffect, useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { readToken } from '../../../styles/readToken.js'
import { useSceneStore } from '../../../store/sceneStore.js'
import { CHUNK_BORDER, buildChunks } from './chunks.js'
import { chunkSettingsFromParams } from './params.js'
import { shapeField } from './voxelMath.js'
import { VoxelVolume } from './VoxelTerrainDemo.jsx'
import { SurfaceMesh } from './VoxelMeshDemo.jsx'

// The twelve edges of every chunk's box, as pairs of points in one geometry.
function chunkOutlineGeometry(chunks) {
  const points = []
  const edgeCorners = [
    [0, 0, 0, 1, 0, 0], [0, 1, 0, 1, 1, 0], [0, 0, 1, 1, 0, 1], [0, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1, 0], [1, 0, 0, 1, 1, 0], [0, 0, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 1], [1, 0, 0, 1, 0, 1], [0, 1, 0, 0, 1, 1], [1, 1, 0, 1, 1, 1],
  ]

  for (const { bounds } of chunks) {
    for (const edge of edgeCorners) {
      for (const end of [0, 3]) {
        for (let axis = 0; axis < 3; axis += 1) points.push(edge[end + axis] ? bounds.max[axis] : bounds.min[axis])
      }
    }
  }

  const outline = new BufferGeometry()
  outline.setAttribute('position', new Float32BufferAttribute(points, 3))
  return outline
}

// The boxes of some chunks, in one colour. The edit demo draws two sets.
export function ChunkOutlines({ chunks, colorToken }) {
  const outline = useMemo(() => chunkOutlineGeometry(chunks), [chunks])

  useEffect(() => () => outline.dispose(), [outline])

  return (
    <lineSegments geometry={outline}>
      <lineBasicMaterial color={readToken(colorToken)} />
    </lineSegments>
  )
}

// The words that explain each view live in the step's scene.legend. This
// component only draws.
export default function VoxelChunksDemo() {
  const params = useSceneStore((state) => state.params)
  const { shape, resolution, chunksPerSide, hasBorder } = chunkSettingsFromParams(params)

  const chunks = useMemo(
    () => buildChunks(shapeField(shape), resolution, chunksPerSide, hasBorder ? CHUNK_BORDER : 0),
    [shape, resolution, chunksPerSide, hasBorder],
  )

  return (
    <VoxelVolume shape={shape} resolution={resolution} showCubes={false}>
      {chunks.map((chunk) =>
        // A chunk the terrain never touches has no triangles to draw.
        chunk.mesh.positions.length > 0 ? <SurfaceMesh key={chunk.key} mesh={chunk.mesh} /> : null,
      )}
      <ChunkOutlines chunks={chunks} colorToken="--terrain-grid-section" />
    </VoxelVolume>
  )
}
