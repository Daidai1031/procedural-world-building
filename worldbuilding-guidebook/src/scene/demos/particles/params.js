const select = (label, values, initial = values[0], labels = values) => ({
  type: 'select', label, default: initial,
  options: values.map((value, index) => ({ value, label: labels[index] })),
})
const range = (label, min, max, step, initial) => ({ type: 'float', label, min, max, step, default: initial })
const toggle = (label, initial) => ({ type: 'boolean', label, default: initial })

export const particleParams = {
  particleLook: select('Look', ['Dot', 'Puff']),
  particleSize: range('Size', 0.5, 3, 0.1, 1),
  particleRate: range('Rate (per second)', 2, 100, 1, 20),
  particleLifetime: range('Lifetime (seconds)', 0.5, 10, 0.5, 3),
  particleScreen: select('Screen speed', ['30', '144'], '30', ['30 frames per second', '144 frames per second']),
  particleGravity: range('Gravity', 0, 10, 0.1, 3),
  particleSideways: range('Sideways push', -3, 3, 0.1, 0),
  particleFieldShape: select('Field', ['Uniform', 'Varying'], 'Varying'),
  particleFlow: range('Flow strength', 0.2, 1.5, 0.05, 0.7),
  particleArrowMeans: select('Arrow means', ['Speed', 'Push']),
  particleBreeze: toggle('Breeze', true),
  particleBreezeStrength: range('Breeze strength', 0, 1.5, 0.05, 0.5),
  particleWhirlpool: toggle('Whirlpool', true),
  particleWhirlStrength: range('Whirlpool strength', 0, 2, 0.05, 1.2),
  particleWhirlRadius: range('Whirlpool radius', 0.3, 2, 0.05, 0.9),
  particleWhirlX: range('Whirlpool centre X', -2.5, 2.5, 0.05, 0.6),
  particleWhirlZ: range('Whirlpool centre Z', -2.5, 2.5, 0.05, 0.2),
  particleGusts: toggle('Gusts', false),
  particleGustStrength: range('Gust strength', 0, 1, 0.05, 0.4),
  particleView: select('Look', ['Dots', 'Puffs', 'Trails'], 'Trails'),
  particleHistory: range('History points', 4, 40, 1, 16),
  particleSpeedColour: toggle('Colour by speed', false),
  particleFade: toggle('Fade with age', false),
  particleClearTrail: toggle('Clear trail on respawn', true),
  particlePreset: select('Preset', ['Dust', 'Mist', 'Rain', 'Spores']),
  particleEmitter: select('Born at', ['Pit', 'Wide low', 'Sky']),
  particleGround: toggle('Remove at ground', true),
  particleEdge: select('At the edge', ['Remove', 'Wrap']),
}

export const PARTICLE_DEMOS = [
  'particle-state', 'particle-lifecycle', 'particle-time', 'particle-forces',
  'particle-field', 'particle-layers', 'particle-trails', 'particle-recipe',
]

export const PARTICLE_PRIMARY_KEYS = {
  'particle-state': ['particleLook', 'particleSize'],
  'particle-lifecycle': ['particleRate', 'particleLifetime'],
  'particle-time': ['particleScreen'],
  'particle-forces': ['particleGravity', 'particleSideways'],
  'particle-field': ['particleFieldShape', 'particleFlow', 'particleArrowMeans'],
  'particle-layers': [
    'particleBreeze', 'particleBreezeStrength', 'particleWhirlpool', 'particleWhirlStrength',
    'particleWhirlRadius', 'particleWhirlX', 'particleWhirlZ', 'particleGusts', 'particleGustStrength',
  ],
  'particle-trails': ['particleView', 'particleHistory', 'particleSpeedColour', 'particleFade', 'particleClearTrail'],
  'particle-recipe': [
    'particlePreset', 'particleEmitter', 'particleRate', 'particleLifetime', 'particleView', 'particleSize',
    'particleBreezeStrength', 'particleWhirlStrength', 'particleGustStrength', 'particleGravity',
    'particleFade', 'particleSpeedColour', 'particleGround', 'particleEdge',
  ],
}

// Step 8 starting points. Choosing one writes every value below; the learner
// then adjusts from there.
export const PARTICLE_PRESETS = {
  Dust: {
    particleEmitter: 'Pit', particleRate: 30, particleLifetime: 4, particleView: 'Puffs', particleSize: 1,
    particleBreezeStrength: 0.5, particleWhirlStrength: 0.5, particleGustStrength: 0.3, particleGravity: 0,
    particleFade: true, particleSpeedColour: false, particleGround: true, particleEdge: 'Remove', particleHistory: 16,
  },
  Mist: {
    particleEmitter: 'Wide low', particleRate: 40, particleLifetime: 9, particleView: 'Puffs', particleSize: 2.2,
    particleBreezeStrength: 0.15, particleWhirlStrength: 0, particleGustStrength: 0.25, particleGravity: 0,
    particleFade: true, particleSpeedColour: false, particleGround: true, particleEdge: 'Wrap', particleHistory: 16,
  },
  Rain: {
    particleEmitter: 'Sky', particleRate: 100, particleLifetime: 3, particleView: 'Trails', particleSize: 0.6,
    particleBreezeStrength: 0.3, particleWhirlStrength: 0, particleGustStrength: 0.1, particleGravity: 6,
    particleFade: false, particleSpeedColour: false, particleGround: true, particleEdge: 'Remove', particleHistory: 6,
  },
  Spores: {
    particleEmitter: 'Pit', particleRate: 15, particleLifetime: 7, particleView: 'Dots', particleSize: 0.8,
    particleBreezeStrength: 0.2, particleWhirlStrength: 0.4, particleGustStrength: 0.6, particleGravity: 0,
    particleFade: true, particleSpeedColour: false, particleGround: true, particleEdge: 'Remove', particleHistory: 16,
  },
}
