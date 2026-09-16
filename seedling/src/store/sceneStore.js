import { create } from 'zustand'
import { getDefaultParams } from '../scene/demoParams.js'

// Every param always holds a value. scene.unlock decides what is visible, never
// what exists, so a value set on step 3 is still set on step 9.
export const useSceneStore = create((set) => ({
  demoKey: null,
  insetKey: null,
  insetSwapped: false,
  params: getDefaultParams(),
  unlocked: [],
  compare: null,
  isRunning: false,
  cameraResetToken: 0,

  setDemoKey: (demoKey) => set({ demoKey }),
  setInsetKey: (insetKey) => set({ insetKey }),
  setInsetSwapped: (insetSwapped) => set({ insetSwapped }),
  toggleInsetSwapped: () => set((state) => ({ insetSwapped: !state.insetSwapped })),
  setUnlocked: (unlocked) => set({ unlocked }),
  setCompare: (compare) => set({ compare }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setParam: (key, value) =>
    set((state) => ({ params: { ...state.params, [key]: value } })),
  requestCameraReset: () =>
    set((state) => ({ cameraResetToken: state.cameraResetToken + 1 })),
}))
