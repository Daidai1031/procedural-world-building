import { runSandbox } from '../../../practice/sandbox.js'
import { validateSimulation } from '../../../practice/validateSimulation.js'
import { create } from 'zustand'
import { useSceneStore } from '../../../store/sceneStore.js'
import { mapSettingsFromParams, simulationSettingsFromParams } from './params.js'
import { createErosionState, stepHydraulicErosion } from './simulationMath.js'

function initialState() {
  const { params } = useSceneStore.getState()
  return createErosionState(mapSettingsFromParams(params), simulationSettingsFromParams(params))
}

let pendingStep = null

export const useSimulationState = create((set, get) => ({
  simulation: initialState(),
  step: () => {
    const scene = useSceneStore.getState()
    const override = scene.overrides.stepHydraulicErosion
    const simulation = get().simulation
    const settings = simulationSettingsFromParams(scene.params)
    if (!override) {
      set({ simulation: stepHydraulicErosion(simulation, settings) })
      return
    }
    if (pendingStep) return
    const controller = new AbortController()
    pendingStep = controller
    import('../../../practice/mathSource.js').then(({ sourceWithMath }) => runSandbox({ source: sourceWithMath(override.source, 'stepHydraulicErosion'), name: 'evaluate', inputs: [[simulation, settings]] }, { signal: controller.signal }))
      .then(([value]) => {
        validateSimulation(value, simulation)
        if (!controller.signal.aborted && get().simulation === simulation && useSceneStore.getState().overrides.stepHydraulicErosion === override) set({ simulation: value })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        const overrides = { ...useSceneStore.getState().overrides }
        if (override.previous) overrides.stepHydraulicErosion = override.previous
        else delete overrides.stepHydraulicErosion
        useSceneStore.setState({ overrides, overrideError: error.message, isRunning: false })
      })
      .finally(() => { if (pendingStep === controller) pendingStep = null })
  },
  reset: () => {
    pendingStep?.abort()
    pendingStep = null
    useSceneStore.getState().setIsRunning(false)
    set({ simulation: initialState() })
  },
}))

const sourceKeys = ['mapNoiseType', 'mapShaping', 'mapFrequency', 'mapOctaves', 'mapPersistence', 'mapSeed', 'mapWarpStrength', 'erosionResolution', 'erosionWorldSize']

useSceneStore.subscribe((state, previous) => {
  if (state.overrideRevision !== previous.overrideRevision || sourceKeys.some((key) => state.params[key] !== previous.params[key])) useSimulationState.getState().reset()
})
