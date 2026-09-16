import test from 'node:test'
import assert from 'node:assert/strict'
import { setFunctionOverrides, resolveFunction } from '../src/scene/demos/proceduralMaps/functionOverrides.js'
import { sampleProceduralMap, DEFAULT_MAP_SETTINGS } from '../src/scene/demos/proceduralMaps/noiseMath.js'
import { matchDistance, meanAbsoluteDifference, normalizeWhitespace, withinTolerance } from '../src/practice/scoring.js'
import { useSceneStore } from '../src/store/sceneStore.js'

test('resolver keeps original behavior, resolves nested functions, and clears on step change', () => {
  const original = sampleProceduralMap(1, 2, DEFAULT_MAP_SETTINGS)
  const fallback = () => 7
  assert.equal(resolveFunction('missing', fallback), fallback)
  setFunctionOverrides({ shapeValue: () => 0.25 })
  assert.equal(sampleProceduralMap(1, 2, DEFAULT_MAP_SETTINGS), 0.25)
  useSceneStore.getState().setStep('next')
  assert.equal(sampleProceduralMap(1, 2, DEFAULT_MAP_SETTINGS), original)
  assert.deepEqual(useSceneStore.getState().overrides, {})
})

test('match uses only compare parameters and ignores live overrides', () => {
  assert.equal(matchDistance({ frequency: 0.5 }, { frequency: 0.5, seed: 999 }, ['frequency']), 0)
  assert.ok(matchDistance({ frequency: 0.5 }, { frequency: 0.1 }, ['frequency']) > 0.01)
  setFunctionOverrides({ sampleProceduralMap: () => 0 })
  assert.ok(matchDistance({ frequency: 0.5 }, { frequency: 0.1 }, ['frequency']) > 0.01)
  setFunctionOverrides({})
  assert.equal(meanAbsoluteDifference([0, 1], [1, 0]), 1)
  assert.equal(meanAbsoluteDifference([NaN], [1]), Infinity)
  assert.throws(() => meanAbsoluteDifference([], []))
})

test('fill normalizes whitespace, and implementation checks reject invalid numbers', () => {
  assert.equal(normalizeWhitespace('  x  +\n y\t '), 'x + y')
  assert.equal(normalizeWhitespace('x+y'), normalizeWhitespace(' x + y '))
  assert.notEqual(normalizeWhitespace("'a b'"), normalizeWhitespace("'ab'"))
  assert.notEqual(normalizeWhitespace('x - y'), normalizeWhitespace('x + y'))
  assert.equal(withinTolerance([1, 2], [1, 2.000001], 0.00001), true)
  assert.equal(withinTolerance(NaN, 1, 1), false)
  assert.equal(withinTolerance(Infinity, 1, 1), false)
})
