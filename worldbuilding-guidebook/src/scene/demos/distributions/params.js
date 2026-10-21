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

export const distributionParams = {
  scatterAssetType: {
    type: 'select', label: 'Asset', default: 'rock',
    options: [
      { value: 'rock', label: 'Rock' },
      { value: 'tree', label: 'Tree' },
      { value: 'farmland', label: 'Farmland' },
      { value: 'antenna', label: 'Antenna' },
    ],
  },
  scatterAlignment: {
    type: 'select', label: 'Orientation', default: 'surface',
    options: [
      { value: 'surface', label: 'Surface aligned' },
      { value: 'upright', label: 'Upright' },
    ],
  },
  scatterYawRange: {
    type: 'float', label: 'Yaw range', min: 0, max: 180, step: 15, default: 90,
  },
  scatterShowNormals: {
    type: 'boolean', label: 'Show normals', default: true,
  },
  scatterMaxSlope: {
    type: 'float', label: 'Max slope', min: 0, max: 90, step: 1, default: 33,
  },
  scatterShowRejected: {
    type: 'boolean', label: 'Rejected points', default: true,
  },
  scatterTreesVisible: {
    type: 'boolean', label: 'Trees', default: true,
  },
  scatterRocksVisible: {
    type: 'boolean', label: 'Rocks', default: true,
  },
  scatterFarmlandVisible: {
    type: 'boolean', label: 'Farmland', default: true,
  },
  scatterAntennasVisible: {
    type: 'boolean', label: 'Antennas', default: true,
  },
  scatterBaseVisible: {
    type: 'boolean', label: 'Base', default: true,
  },
  scatterExclusionRadius: {
    type: 'float', label: 'Base clearance', min: 0.4, max: 2, step: 0.1, default: 0.9,
  },
  scatterAntennaSpacing: {
    type: 'float', label: 'Antenna spacing', min: 0, max: 2.5, step: 0.1, default: 1.2,
  },
  scatterPopulationOverlay: {
    type: 'select', label: 'Ground overlay', default: 'height',
    options: [
      { value: 'height', label: 'Height' },
      { value: 'moisture', label: 'Moisture' },
      { value: 'slope', label: 'Slope' },
    ],
  },
  scatterVariationSource: {
    type: 'select', label: 'Variation', default: 'random', hideFromStrip: true,
    options: [
      { value: 'random', label: 'Random only' },
      { value: 'terrain', label: 'Terrain driven' },
    ],
  },
}

export function distributionSettingsFromParams(params) {
  return {
    assetType: params.scatterAssetType,
    alignment: params.scatterAlignment,
    yawRange: params.scatterYawRange,
    showNormals: params.scatterShowNormals,
    maxSlope: params.scatterMaxSlope,
    showRejected: params.scatterShowRejected,
    exclusionRadius: params.scatterExclusionRadius,
    antennaSpacing: params.scatterAntennaSpacing,
    overlay: params.scatterPopulationOverlay,
    variationSource: params.scatterVariationSource,
    visible: {
      tree: params.scatterTreesVisible,
      rock: params.scatterRocksVisible,
      farmland: params.scatterFarmlandVisible,
      antenna: params.scatterAntennasVisible,
      base: params.scatterBaseVisible,
    },
  }
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
