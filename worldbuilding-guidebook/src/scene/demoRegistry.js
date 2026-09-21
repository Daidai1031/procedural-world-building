import { demoParams } from './demoParams.js'
import SceneAnatomyDemo from './demos/sceneAnatomy/SceneAnatomyDemo.jsx'
import NoiseTerrainDemo from './demos/proceduralMaps/NoiseTerrainDemo.jsx'
import SimulationTerrainDemo from './demos/proceduralMaps/SimulationTerrainDemo.jsx'
import VolumeDiagramDemo from './demos/voxels/VolumeDiagramDemo.jsx'
import VoxelCellDemo from './demos/voxels/VoxelCellDemo.jsx'
import VoxelChunksDemo from './demos/voxels/VoxelChunksDemo.jsx'
import VoxelCsgDemo from './demos/voxels/VoxelCsgDemo.jsx'
import VoxelCsgOrderDemo from './demos/voxels/VoxelCsgOrderDemo.jsx'
import VoxelEditDemo from './demos/voxels/VoxelEditDemo.jsx'
import VoxelMeshDemo from './demos/voxels/VoxelMeshDemo.jsx'
import VoxelTerrainDemo from './demos/voxels/VoxelTerrainDemo.jsx'

export const demoRegistry = {
  'noise-terrain': { component: NoiseTerrainDemo, params: demoParams['noise-terrain'] },
  'simulation-terrain': { component: SimulationTerrainDemo, params: demoParams['simulation-terrain'] },
  'voxel-terrain': { component: VoxelTerrainDemo, params: demoParams['voxel-terrain'] },
  'voxel-csg': { component: VoxelCsgDemo, params: demoParams['voxel-csg'] },
  'voxel-csg-order': { component: VoxelCsgOrderDemo, params: demoParams['voxel-csg-order'] },
  'voxel-cell': { component: VoxelCellDemo, params: demoParams['voxel-cell'] },
  'voxel-mesh': { component: VoxelMeshDemo, params: demoParams['voxel-mesh'] },
  'voxel-chunks': { component: VoxelChunksDemo, params: demoParams['voxel-chunks'] },
  'voxel-edit': { component: VoxelEditDemo, params: demoParams['voxel-edit'] },
  'volume-diagram': { component: VolumeDiagramDemo, params: demoParams['volume-diagram'] },
  'scene-anatomy': {
    component: SceneAnatomyDemo,
    params: demoParams['scene-anatomy'],
  },
}
