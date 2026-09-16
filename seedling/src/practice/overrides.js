import { runSandbox } from './sandbox.js'
import { sourceWithMath, sourceWithOverrides } from './mathSource.js'
import { useSceneStore } from '../store/sceneStore.js'
import { useSimulationState } from '../scene/demos/proceduralMaps/simulationState.js'
import { validateSimulation } from './validateSimulation.js'
import { mapSettingsFromParams, simulationSettingsFromParams } from '../scene/demos/proceduralMaps/params.js'

const supported = new Set(['shapeValue', 'fractalNoise', 'valueNoise2D', 'perlin2d', 'sampleProceduralMap'])

function coordinateKey(x, y) { return `${x.toFixed(5)},${y.toFixed(5)}` }
function settingsKey(settings) {
  return JSON.stringify([settings.noiseType, settings.shaping, settings.seed, settings.frequency, settings.octaves, settings.persistence, settings.warpStrength])
}

export async function evaluateOverride(name, source, signal) {
  if (name === 'stepHydraulicErosion') {
    const state = useSceneStore.getState()
    const simulation = useSimulationState.getState().simulation
    const [value] = await runSandbox({ source: sourceWithMath(source, name), name: 'evaluate', inputs: [[simulation, simulationSettingsFromParams(state.params)]] }, { signal })
    validateSimulation(value, simulation)
    if (signal?.aborted || useSceneStore.getState().stepId !== state.stepId) return false
    state.publishOverrides({ ...state.overrides, [name]: { source, previous: state.overrides[name] } })
    return true
  }
  if (!supported.has(name)) throw new Error(`Live map editing does not support ${name}`)
  const state = useSceneStore.getState()
  const overrides = { ...state.overrides, [name]: { source } }
  const settings = mapSettingsFromParams(state.params)
  const variants = [settings]
  if (state.compare) {
    for (const side of ['a', 'b']) variants.push(mapSettingsFromParams({ ...state.params, ...state.compare[side].params }))
  }
  const fields = new Map()
  const inputs = []
  for (const variant of variants) {
    const key = settingsKey(variant)
    if (fields.has(key)) continue
    const points = new Map()
    function addGrid(size, span, float = false) {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          let px = (x / (size - 1) - 0.5) * span
          let py = (y / (size - 1) - 0.5) * span
          if (float) { px = Math.fround(px); py = Math.fround(py) }
          points.set(coordinateKey(px, py), [px, py, variant])
        }
      }
    }
    addGrid(220, 10)
    addGrid(variant.resolution + 1, 10, true)
    addGrid(state.params.erosionResolution, state.params.erosionWorldSize)
    fields.set(key, { keys: [...points.keys()], offset: inputs.length })
    for (const args of points.values()) inputs.push(args)
  }
  const values = await runSandbox({ source: sourceWithOverrides(overrides), name: 'evaluateMap', inputs }, { signal })
  if (values.some((value) => !Number.isFinite(value))) throw new Error('The function must return finite numbers')
  if (signal?.aborted || useSceneStore.getState().stepId !== state.stepId || useSceneStore.getState().params !== state.params) return false
  for (const [key, field] of fields) fields.set(key, new Map(field.keys.map((point, i) => [point, values[field.offset + i]])))
  const previousField = fields.get(settingsKey(settings))
  function sample(x, y, currentSettings) {
    const samples = fields.get(settingsKey(currentSettings)) ?? previousField
    const value = samples.get(coordinateKey(x, y))
    if (value !== undefined) return value
    // Keep the last published field visible while a changed mesh is evaluated.
    const column = Math.max(0, Math.min(219, Math.round((x / 10 + 0.5) * 219)))
    const row = Math.max(0, Math.min(219, Math.round((y / 10 + 0.5) * 219)))
    return samples.get(coordinateKey((column / 219 - 0.5) * 10, (row / 219 - 0.5) * 10))
  }
  state.publishOverrides(overrides, sample)
  return true
}

let refresh = null

useSceneStore.subscribe((state, previous) => {
  if (state.stepId !== previous.stepId || !Object.keys(state.overrides).length) {
    refresh?.abort()
    refresh = null
    return
  }
  if (state.params === previous.params) return
  refresh?.abort()
  const controller = new AbortController()
  refresh = controller
  const [name, entry] = Object.entries(state.overrides).find(([key]) => supported.has(key)) ?? []
  if (!entry) return
  evaluateOverride(name, entry.source, controller.signal).catch((error) => {
    if (!controller.signal.aborted) useSceneStore.setState({ overrideError: error.message })
  }).finally(() => { if (refresh === controller) refresh = null })
})
