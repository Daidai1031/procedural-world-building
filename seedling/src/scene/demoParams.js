import { sceneAnatomyParams } from './demos/sceneAnatomy/params.js'

// Params are kept apart from the demo components so the scene store can read
// defaults without importing components, which import the store back.
export const demoParams = {
  'scene-anatomy': sceneAnatomyParams,
}

export function getDemoParams(demoKey) {
  return demoParams[demoKey] ?? {}
}

export function getDefaultParams() {
  const defaults = {}

  for (const params of Object.values(demoParams)) {
    for (const [key, param] of Object.entries(params)) {
      defaults[key] = param.default
    }
  }

  return defaults
}
