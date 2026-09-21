import { useSceneStore } from '../../../store/sceneStore.js'
import { csgOrderSettingsFromParams } from './params.js'
import { CSG_ROCK, CSG_SPHERE } from './voxelMath.js'
import { SphereOutline } from './VoxelCsgDemo.jsx'
import { VoxelVolume } from './VoxelTerrainDemo.jsx'

export default function VoxelCsgOrderDemo() {
  const params = useSceneStore((state) => state.params)
  const { shape, resolution } = csgOrderSettingsFromParams(params)

  return (
    <VoxelVolume shape={shape} resolution={resolution}>
      <SphereOutline sphere={CSG_SPHERE} colorToken="--clay" />
      <SphereOutline sphere={CSG_ROCK} colorToken="--summit" />
    </VoxelVolume>
  )
}
