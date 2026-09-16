import { entities } from './entities.js'

// Each param carries everything a control needs to render itself. A step's
// scene.unlock only ever names keys from here.
export const sceneAnatomyParams = {
  selectedEntity: {
    type: 'select',
    label: 'Selected entity',
    default: entities[0].id,
    options: entities.map((entity) => ({ value: entity.id, label: entity.name })),
  },
}
