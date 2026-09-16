import { create } from 'zustand'
import { useSceneStore } from '../../../store/sceneStore.js'
import { mapSettingsFromParams, simulationSettingsFromParams } from './params.js'
import { createErosionState, stepHydraulicErosion } from './simulationMath.js'

function initialState() {
  const { params } = useSceneStore.getState()
  return createErosionState(mapSettingsFromParams(params), simulationSettingsFromParams(params))
}

export const useSimulationState = create((set) => ({
  simulation: initialState(),
  step: () => set((state) => ({
    simulation: stepHydraulicErosion(state.simulation, simulationSettingsFromParams(useSceneStore.getState().params)),
  })),
  reset: () => {
    useSceneStore.getState().setIsRunning(false)
    set({ simulation: initialState() })
  },
}))

const sourceKeys = ['mapNoiseType', 'mapShaping', 'mapFrequency', 'mapOctaves', 'mapPersistence', 'mapSeed', 'mapWarpStrength', 'erosionResolution', 'erosionWorldSize']

useSceneStore.subscribe((state, previous) => {
  if (sourceKeys.some((key) => state.params[key] !== previous.params[key])) useSimulationState.getState().reset()
})
