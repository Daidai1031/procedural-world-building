const select = (label, values, initial = values[0]) => ({
  type: 'select', label, default: initial,
  options: values.map((value) => ({ value, label: value })),
})
const range = (label, min, max, step, initial) => ({ type: 'float', label, min, max, step, default: initial })

export const pathParams = {
  pathOrder: select('Waypoint order', ['A → B → C', 'A → C → B']),
  pathShape: select('Route shape', ['Straight', 'Curve'], 'Curve'),
  pathBend: range('Bend offset', 0, 2, 0.05, 1.2),
  pathSampling: select('Sampling', ['Parameter', 'Distance']),
  pathSpacing: range('Sample spacing', 0.1, 2.5, 0.1, 1.8),
  pathProjection: select('Projection view', ['Map', 'Ground'], 'Ground'),
  pathRadius: range('Body radius', 0.1, 0.65, 0.05, 0.25),
  pathPassage: select('Passage state', ['Original', 'Block passage', 'Open passage']),
  pathEffect: select('Terrain effect', ['Before', 'After']),
  pathWidth: range('Corridor width', 0.2, 1.5, 0.1, 0.7),
  pathExperiment: { type: 'boolean', label: 'Show terrain experiment', default: false },
  pathDisturbance: range('Disturbance', 0, 1, 0.05, 0),
  pathGates: select('Passage state', ['Open', 'A blocked', 'Both blocked']),
  pathSeed: range('Seed', 1, 999, 1, 138),
}

export const PATH_DEMOS = ['path-order', 'path-turn', 'path-motion', 'path-ground', 'path-clearance', 'path-choice']
export const PRIMARY_KEYS = {
  'path-order': ['pathOrder'],
  'path-turn': ['pathShape', 'pathBend'],
  'path-motion': ['pathSampling'],
  'path-ground': ['pathSpacing', 'pathProjection'],
  'path-clearance': ['pathRadius', 'pathPassage'],
  'path-choice': ['pathDisturbance', 'pathGates'],
}
