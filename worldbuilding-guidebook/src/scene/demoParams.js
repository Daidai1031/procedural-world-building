import { distributionParams, farmParams, scatterParams } from './demos/distributions/params.js'
import { particleParams, PARTICLE_DEMOS } from './demos/particles/params.js'
import { pathParams, PATH_DEMOS } from './demos/paths/params.js'
import { sceneAnatomyParams } from './demos/sceneAnatomy/params.js'
import { coordinateSpaceParams, shaderLabParams } from './demos/shaders/params.js'
import { noiseParams, erosionParams } from './demos/proceduralMaps/params.js'
import { cellParams, chunkParams, csgOrderParams, csgParams, editParams, lodParams, meshParams, voxelParams, volumeDiagramParams } from './demos/voxels/params.js'

// Params are kept apart from the demo components so the scene store can read
// defaults without importing components, which import the store back.
export const demoParams = {
  ...Object.fromEntries(PARTICLE_DEMOS.map((key) => [key, particleParams])),
  ...Object.fromEntries(PATH_DEMOS.map((key) => [key, pathParams])),
  'scene-anatomy': sceneAnatomyParams,
  'shader-lab': shaderLabParams,
  'coordinate-space': coordinateSpaceParams,
  'noise-terrain': noiseParams,
  'simulation-terrain': { ...noiseParams, ...erosionParams },
  'voxel-terrain': voxelParams,
  'voxel-csg': csgParams,
  'voxel-csg-order': csgOrderParams,
  'voxel-cell': cellParams,
  'voxel-mesh': meshParams,
  'voxel-chunks': chunkParams,
  'voxel-edit': editParams,
  'voxel-lod': lodParams,
  'volume-diagram': volumeDiagramParams,
  'scatter-terrain': scatterParams,
  'scatter-farmland': farmParams,
  'scatter-orientation': { ...scatterParams, ...distributionParams },
  'scatter-slope': { ...scatterParams, ...distributionParams },
  'scatter-population': { ...scatterParams, ...farmParams, ...distributionParams },
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
