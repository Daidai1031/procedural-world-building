import { setFunctionOverrides } from '../scene/demos/proceduralMaps/functionOverrides.js'
import { create } from 'zustand'
import { getDefaultParams } from '../scene/demoParams.js'

// Every param always holds a value. scene.unlock decides what is visible, never
// what exists, so a value set on step 3 is still set on step 9.
export const useSceneStore = create((set) => ({
  stepId: null,
  overrides: {},
  overrideError: '',
  overrideRevision: 0,
  setStep: (stepId) => {
    setFunctionOverrides({})
    set((state) => ({ stepId, overrides: {}, overrideError: '', overrideRevision: state.overrideRevision + (Object.keys(state.overrides).length ? 1 : 0) }))
  },
  publishOverrides: (overrides, sampler) => {
    if (sampler !== undefined) setFunctionOverrides(sampler ? { sampleProceduralMap: sampler } : {})
    set((state) => ({ overrides, overrideError: '', overrideRevision: state.overrideRevision + 1 }))
  },
  demoKey: null,
  insetKey: null,
  insetSwapped: false,
  params: getDefaultParams(),
  unlocked: [],
  compare: null,
  compareSide: 'a',
  compareRevision: 0,
  isRunning: false,
  cameraResetToken: 0,

  setDemoKey: (demoKey) => set({ demoKey }),
  setInsetKey: (insetKey) => set({ insetKey }),
  setInsetSwapped: (insetSwapped) => set({ insetSwapped }),
  toggleInsetSwapped: () => set((state) => ({ insetSwapped: !state.insetSwapped })),
  setUnlocked: (unlocked) => set({ unlocked }),
  setCompare: (compare) => set((state) => ({
    compare,
    compareSide: 'a',
    params: compare ? { ...state.params, ...compare.a.params } : state.params,
    compareRevision: state.compareRevision + (compare ? 1 : 0),
  })),
  selectCompare: (compareSide) => set((state) => {
    if (!state.compare?.[compareSide] || state.compareSide === compareSide) return state
    return {
      compareSide,
      params: { ...state.params, ...state.compare[compareSide].params },
      compareRevision: state.compareRevision + 1,
    }
  }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setParam: (key, value) =>
    set((state) => ({ params: { ...state.params, [key]: value } })),
  requestCameraReset: () =>
    set((state) => ({ cameraResetToken: state.cameraResetToken + 1 })),
}))
