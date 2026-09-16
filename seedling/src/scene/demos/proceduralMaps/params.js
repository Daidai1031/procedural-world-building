import { DEFAULT_MAP_SETTINGS } from './noiseMath.js'
import { DEFAULT_SIMULATION_SETTINGS } from './simulationMath.js'

function range(label, min, max, step, value) {
  return { type: 'float', label, min, max, step, default: value }
}

function options(values) {
  return values.map(([value, label]) => ({ value, label }))
}

export const noiseParams = {
  mapNoiseType: {
    type: 'select', label: 'Noise function', default: DEFAULT_MAP_SETTINGS.noiseType,
    options: options([['white', 'White'], ['value', 'Value'], ['perlin', 'Perlin'], ['worley', 'Worley']]),
  },
  mapShaping: {
    type: 'select', label: 'Shaping', default: DEFAULT_MAP_SETTINGS.shaping,
    options: options([['normal', 'Normal'], ['ridged', 'Ridged'], ['billow', 'Billow'], ['turbulence', 'Turbulence'], ['terracing', 'Terracing'], ['power', 'Power curve'], ['domainWarp', 'Domain warping']]),
  },
  mapSeed: range('Seed', 1, 999, 1, DEFAULT_MAP_SETTINGS.seed),
  mapFrequency: range('Frequency', 0.08, 1.2, 0.01, DEFAULT_MAP_SETTINGS.frequency),
  mapOctaves: range('Octaves', 1, 6, 1, DEFAULT_MAP_SETTINGS.octaves),
  mapPersistence: range('Persistence', 0.2, 0.8, 0.01, DEFAULT_MAP_SETTINGS.persistence),
  mapAmplitude: range('Height amplitude', 0.5, 5, 0.1, DEFAULT_MAP_SETTINGS.amplitude),
  mapResolution: range('Mesh resolution', 24, 128, 8, DEFAULT_MAP_SETTINGS.resolution),
  mapWarpStrength: range('Warp strength', 0, 6, 0.1, DEFAULT_MAP_SETTINGS.warpStrength),
  mapWireframe: { type: 'boolean', label: 'Wireframe', default: false },
}

export const erosionParams = {
  erosionResolution: range('Simulation resolution', 24, 72, 8, DEFAULT_SIMULATION_SETTINGS.resolution),
  erosionWorldSize: range('World size', 6, 18, 1, DEFAULT_SIMULATION_SETTINGS.worldSize),
  erosionStepsPerSecond: range('Updates per second', 2, 20, 1, DEFAULT_SIMULATION_SETTINGS.stepsPerSecond),
  erosionRainfall: range('Rainfall per step', 0.001, 0.015, 0.001, DEFAULT_SIMULATION_SETTINGS.rainfall),
  erosionFlowRate: range('Flow rate', 0.05, 0.9, 0.05, DEFAULT_SIMULATION_SETTINGS.flowRate),
  erosionStrength: range('Erosion strength', 0.05, 0.7, 0.01, DEFAULT_SIMULATION_SETTINGS.erosionStrength),
  erosionDepositionRate: range('Deposition rate', 0.02, 0.5, 0.01, DEFAULT_SIMULATION_SETTINGS.depositionRate),
  erosionEvaporation: range('Evaporation', 0.02, 0.35, 0.01, DEFAULT_SIMULATION_SETTINGS.evaporation),
  erosionSedimentCapacity: range('Sediment capacity', 1, 16, 1, DEFAULT_SIMULATION_SETTINGS.sedimentCapacity),
}

export function mapSettingsFromParams(params) {
  return {
    noiseType: params.mapNoiseType, shaping: params.mapShaping, seed: params.mapSeed,
    frequency: params.mapFrequency, octaves: params.mapOctaves, persistence: params.mapPersistence,
    amplitude: params.mapAmplitude, resolution: params.mapResolution, warpStrength: params.mapWarpStrength,
  }
}

export function simulationSettingsFromParams(params) {
  return {
    resolution: params.erosionResolution, worldSize: params.erosionWorldSize,
    stepsPerSecond: params.erosionStepsPerSecond, rainfall: params.erosionRainfall,
    flowRate: params.erosionFlowRate, erosionStrength: params.erosionStrength,
    depositionRate: params.erosionDepositionRate, evaporation: params.erosionEvaporation,
    sedimentCapacity: params.erosionSedimentCapacity,
  }
}
