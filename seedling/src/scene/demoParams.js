import { sceneAnatomyParams } from './demos/sceneAnatomy/params.js'
import { noiseParams, erosionParams } from './demos/proceduralMaps/params.js'

// Params are kept apart from the demo components so the scene store can read
// defaults without importing components, which import the store back.
export const demoParams = {
  'scene-anatomy': sceneAnatomyParams,
  'noise-terrain': noiseParams,
  'simulation-terrain': { ...noiseParams, ...erosionParams },
}

export function getDemoParams(demoKey) {
  return demoParams[demoKey] ?? {}
}

export function getDefaultParams() {
  const defaults = {}
  const definitions = new Map()

  for (const params of Object.values(demoParams)) {
    for (const [key, param] of Object.entries(params)) {
      if (definitions.has(key) && definitions.get(key) !== param) throw new Error(`Conflicting definition for scene parameter "${key}"`)
      definitions.set(key, param)
      defaults[key] = param.default
    }
  }

  return defaults
}
