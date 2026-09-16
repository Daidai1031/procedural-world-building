import SceneAnatomyPlan from './insets/SceneAnatomyPlan.jsx'

// A step's scene.inset names a key here. Insets are plain 2D canvases showing
// the same numbers as the 3D scene from a different place, which is the whole
// reason clicking one swaps it with the background.
export const insetRegistry = {
  'scene-plan': {
    component: SceneAnatomyPlan,
    caption: 'The same scene from above',
  },
}

export function getInset(insetKey) {
  return insetKey ? (insetRegistry[insetKey] ?? null) : null
}
