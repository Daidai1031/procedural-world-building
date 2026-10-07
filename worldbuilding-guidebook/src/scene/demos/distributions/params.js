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
}

export function scatterSettingsFromParams(params) {
  return {
    candidateCount: params.scatterCandidateCount,
    assetScale: params.scatterAssetScale,
    showAssets: params.scatterShowAssets,
    seed: params.scatterSeed,
  }
}
