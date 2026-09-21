import { useMemo } from 'react'
import { useSceneStore } from '../../../store/sceneStore.js'
import { CHUNK_BORDER, buildEditedChunks } from './chunks.js'
import { editSettingsFromParams } from './params.js'
import { dentAt, dentDensity, groundDensity } from './voxelMath.js'
import { ChunkOutlines } from './VoxelChunksDemo.jsx'
import { SurfaceMesh } from './VoxelMeshDemo.jsx'
import { SphereOutline } from './VoxelCsgDemo.jsx'
import { VoxelVolume } from './VoxelTerrainDemo.jsx'

// The words that explain each view live in the step's scene.legend. This
// component only draws.
export default function VoxelEditDemo() {
  const params = useSceneStore((state) => state.params)
  const { resolution, chunksPerSide, dentX, dentZ, reuse } = editSettingsFromParams(params)

  // The meshes of the chunks the dent has not reached, kept for the next edit. A
  // new resolution or chunk count makes them different meshes, so it starts empty.
  const { meshes: cache } = useMemo(() => ({ resolution, chunksPerSide, meshes: new Map() }), [resolution, chunksPerSide])
  const dent = useMemo(() => dentAt(dentX, dentZ), [dentX, dentZ])

  const chunks = useMemo(
    () => buildEditedChunks({
      baseField: groundDensity,
      editedField: dentDensity(dent),
      edit: dent,
      resolution,
      chunksPerSide,
      border: CHUNK_BORDER,
      cache,
      reuse,
    }),
    [dent, resolution, chunksPerSide, cache, reuse],
  )

  return (
    <VoxelVolume shape="ground" resolution={resolution} showCubes={false}>
      {chunks.map((chunk) =>
        chunk.mesh.positions.length > 0 ? <SurfaceMesh key={chunk.key} mesh={chunk.mesh} /> : null,
      )}
      <ChunkOutlines chunks={chunks.filter((chunk) => chunk.isRebuilt)} colorToken="--ink" />
      <ChunkOutlines chunks={chunks.filter((chunk) => !chunk.isRebuilt)} colorToken="--terrain-grid" />
      <SphereOutline sphere={dent} colorToken="--clay" />
    </VoxelVolume>
  )
}
