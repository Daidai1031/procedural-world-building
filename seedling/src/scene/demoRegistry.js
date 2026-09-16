import { demoParams } from './demoParams.js'
import SceneAnatomyDemo from './demos/sceneAnatomy/SceneAnatomyDemo.jsx'
import NoiseTerrainDemo from './demos/proceduralMaps/NoiseTerrainDemo.jsx'
import SimulationTerrainDemo from './demos/proceduralMaps/SimulationTerrainDemo.jsx'

export const demoRegistry = {
  'noise-terrain': { component: NoiseTerrainDemo, params: demoParams['noise-terrain'] },
  'simulation-terrain': { component: SimulationTerrainDemo, params: demoParams['simulation-terrain'] },
  'scene-anatomy': {
    component: SceneAnatomyDemo,
    params: demoParams['scene-anatomy'],
  },
}
