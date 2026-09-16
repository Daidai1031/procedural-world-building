import { tokenizer } from 'acorn'
import { withFunctionOverrides } from '../scene/demos/proceduralMaps/functionOverrides.js'
import { DEFAULT_MAP_SETTINGS, sampleProceduralMap } from '../scene/demos/proceduralMaps/noiseMath.js'

export function normalizeWhitespace(value) {
  return Array.from(tokenizer(value, { ecmaVersion: 'latest' })).map((token) => value.slice(token.start, token.end)).join(' ')
}

export function meanAbsoluteDifference(a, b) {
  if (!a.length || a.length !== b.length) throw new Error('Grids must have equal, nonzero lengths')
  let total = 0
  for (let i = 0; i < a.length; i += 1) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) return Infinity
    total += Math.abs(a[i] - b[i])
  }
  return total / a.length
}

export function mapGrid(settings, sample = sampleProceduralMap) {
  return Array.from({ length: 4096 }, (_, i) => sample((i % 64 / 63 - 0.5) * 10, (Math.floor(i / 64) / 63 - 0.5) * 10, settings))
}

export function matchDistance(target, learner, compare) {
  const reference = { ...DEFAULT_MAP_SETTINGS, ...target }
  const settings = { ...reference }
  for (const key of compare) settings[key] = learner[key] ?? reference[key]
  return withFunctionOverrides({}, () => meanAbsoluteDifference(mapGrid(reference), mapGrid(settings)))
}

export function withinTolerance(actual, expected, tolerance) {
  if (typeof expected === 'number') return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance
  if (Array.isArray(expected) || ArrayBuffer.isView(expected)) return actual?.length === expected.length && Array.from(expected).every((value, i) => withinTolerance(actual[i], value, tolerance))
  if (expected && typeof expected === 'object') return actual && Object.keys(expected).every((key) => withinTolerance(actual[key], expected[key], tolerance))
  return actual === expected
}
