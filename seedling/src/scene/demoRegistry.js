import { demoParams } from './demoParams.js'
import SceneAnatomyDemo from './demos/sceneAnatomy/SceneAnatomyDemo.jsx'

export const demoRegistry = {
  'scene-anatomy': {
    component: SceneAnatomyDemo,
    params: demoParams['scene-anatomy'],
  },
}
