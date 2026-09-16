import assert from 'node:assert/strict'
import { test } from 'node:test'
import { demoParams, getDefaultParams } from '../src/scene/demoParams.js'
import { useSceneStore } from '../src/store/sceneStore.js'
import { useSimulationState } from '../src/scene/demos/proceduralMaps/simulationState.js'
import { mapSettingsFromParams, simulationSettingsFromParams } from '../src/scene/demos/proceduralMaps/params.js'
import { DEFAULT_MAP_SETTINGS } from '../src/scene/demos/proceduralMaps/noiseMath.js'
import { DEFAULT_SIMULATION_SETTINGS } from '../src/scene/demos/proceduralMaps/simulationMath.js'

test('namespaced params retain the original defaults and reject accidental collisions', () => {
  const defaults = getDefaultParams()
  assert.deepEqual(mapSettingsFromParams(defaults), DEFAULT_MAP_SETTINGS)
  assert.deepEqual(simulationSettingsFromParams(defaults), DEFAULT_SIMULATION_SETTINGS)
  demoParams.collision = { mapSeed: { default: 12 } }
  try {
    assert.throws(getDefaultParams, /Conflicting definition.*mapSeed/)
  } finally {
    delete demoParams.collision
  }
})

test('compare swaps only its declared keys and preserves unrelated learner settings', () => {
  useSceneStore.getState().setParam('mapSeed', 37)
  useSceneStore.getState().setCompare({ label: 'Noise', a: { params: { mapNoiseType: 'perlin' } }, b: { params: { mapNoiseType: 'worley' } } })
  const before = useSceneStore.getState().compareRevision
  useSceneStore.getState().selectCompare('b')
  assert.equal(useSceneStore.getState().params.mapNoiseType, 'worley')
  assert.equal(useSceneStore.getState().params.mapSeed, 37)
  assert.equal(useSceneStore.getState().compareRevision, before + 1)
  useSceneStore.getState().setCompare(null)
  assert.equal(useSceneStore.getState().params.mapNoiseType, 'worley')
})

test('simulation survives step navigation; display edits preserve state, source edits reset it', () => {
  useSceneStore.getState().setDemoKey('simulation-terrain')
  useSimulationState.getState().step()
  const evolved = useSimulationState.getState().simulation
  useSceneStore.getState().setIsRunning(true)
  useSceneStore.getState().setUnlocked(['erosionRainfall'])
  useSceneStore.getState().setDemoKey('simulation-terrain')
  useSceneStore.getState().setCompare(null)
  assert.equal(useSceneStore.getState().isRunning, true)
  assert.equal(useSimulationState.getState().simulation, evolved)
  useSceneStore.getState().setParam('mapResolution', 96)
  useSceneStore.getState().setParam('mapAmplitude', 3)
  assert.equal(useSimulationState.getState().simulation, evolved)
  useSceneStore.getState().setParam('mapSeed', 38)
  assert.equal(useSimulationState.getState().simulation.iteration, 0)
  assert.equal(useSceneStore.getState().isRunning, false)
})
