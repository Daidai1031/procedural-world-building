import { WATER_LEVEL_RANGE } from './terrain.js'

export const SCATTER_REFERENCE_SEED = 42

export const scatterParams = {
  scatterCandidateCount: {
    type: 'float', label: 'Candidate count', min: 0, max: 400, step: 10, default: 50,
  },
  scatterAssetScale: {
    type: 'float', label: 'Asset scale', min: 0.5, max: 2, step: 0.1, default: 1,
  },
  scatterShowAssets: {
    type: 'boolean', label: 'Show rocks', default: true,
  },
  scatterSeed: {
    type: 'float', label: 'Scatter seed', min: 1, max: 100, step: 1, default: SCATTER_REFERENCE_SEED,
  },
  scatterDensity: {
    type: 'float', label: 'Density', min: 0, max: 1, step: 0.05, default: 1,
  },
  scatterNoiseFrequency: {
    type: 'float', label: 'Noise frequency', min: 0.2, max: 1.2, step: 0.1, default: 0.5,
  },
  // Whether acceptance reads the noise map. The step's compare toggle flips it,
  // so it never needs a control of its own in the strip.
  scatterPlacementMode: {
    type: 'select', label: 'Placement', default: 'uniform', hideFromStrip: true,
    options: [
      { value: 'uniform', label: 'Uniform' },
      { value: 'noise', label: 'Noise map' },
    ],
  },
}

export function scatterSettingsFromParams(params) {
  return {
    candidateCount: params.scatterCandidateCount,
    assetScale: params.scatterAssetScale,
    showAssets: params.scatterShowAssets,
    seed: params.scatterSeed,
    density: params.scatterDensity,
    noiseFrequency: params.scatterNoiseFrequency,
    placementMode: params.scatterPlacementMode,
  }
}

// The farmland scene shares the scatter seed with the other scenes, so a random
// layout is the same layout everywhere.
export const FARM_CELL_SIZE = 0.6

export const farmParams = {
  scatterIrrigationBand: {
    type: 'float', label: 'Irrigation band', min: 0.2, max: 2, step: 0.1, default: 0.6,
  },
  scatterWaterLevel: {
    type: 'float', label: 'Water level', min: WATER_LEVEL_RANGE.min, max: WATER_LEVEL_RANGE.max, step: 0.1, default: 1.7,
  },
  scatterOverlay: {
    type: 'select', label: 'Ground overlay', default: 'height',
    options: [
      { value: 'height', label: 'Height' },
      { value: 'moisture', label: 'Moisture' },
      { value: 'distance', label: 'Distance to water' },
    ],
  },
  // Where the candidates come from. The step's compare toggle flips it, so it
  // never needs a control of its own in the strip.
  scatterCandidateSource: {
    type: 'select', label: 'Candidates', default: 'random', hideFromStrip: true,
    options: [
      { value: 'random', label: 'Random points' },
      { value: 'lattice', label: 'Lattice' },
    ],
  },
}

export function farmSettingsFromParams(params) {
  return {
    cellSize: FARM_CELL_SIZE,
    seed: params.scatterSeed,
    irrigationBand: params.scatterIrrigationBand,
    waterLevel: params.scatterWaterLevel,
    candidateSource: params.scatterCandidateSource,
    overlay: params.scatterOverlay,
  }
}
