import { create } from 'zustand'
import { STEP_SECONDS, travelSample } from './pathMath.js'
import { polylineSample } from './pathModel.js'

export const usePathPlayback = create((set) => ({
  time: 0, running: false,
  reset: () => set({ time: 0, running: false }),
  toggle: () => set((state) => ({ running: !state.running })),
  pause: () => set({ running: false }),
  advance: (limit) => set((state) => {
    const time = Math.min(limit, state.time + STEP_SECONDS)
    return { time, running: state.running && time < limit }
  }),
}))

export function travelLimit(model, demo) {
  if (demo === 'path-motion') return 8
  return (model.validation?.safeDistance ?? 0) / 0.75
}

export function residentSample(model, demo, params, time) {
  if (demo === 'path-motion') return travelSample(model.curve, time, params.pathSampling)
  return polylineSample(model.points, Math.min(time, travelLimit(model, demo)) * 0.75)
}
