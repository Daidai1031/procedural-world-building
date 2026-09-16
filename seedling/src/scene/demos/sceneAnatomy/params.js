import { entities } from './entities.js'

// Each param carries everything a control needs to render itself. A step's
// scene.unlock only ever names keys from here.
export const sceneAnatomyParams = {
  // Rendered by EntityPanel, not the control strip — see ControlStrip.jsx's
  // hideFromStrip filter. Kept here so getDefaultParams() still seeds it.
  selectedEntity: {
    default: entities[0].id,
    hideFromStrip: true,
  },
}
