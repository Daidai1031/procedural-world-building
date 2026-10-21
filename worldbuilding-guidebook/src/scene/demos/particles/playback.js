import { create } from 'zustand'
import { createSimulation } from './simulations.js'

const prefersStill = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// The running simulation and what the panel shows about it. The scene clock
// steps the simulation; readouts are copied here at most ten times a second so
// the panel does not redraw on every frame.
export const useParticlePlayback = create((set, get) => ({
  simulation: null,
  demo: null,
  running: false,
  readout: null,
  time: 0,
  publishedAt: 0,
  restart: (demo, values) => {
    const simulation = createSimulation(demo, values)
    set({
      simulation, demo,
      running: Boolean(simulation) && !simulation.startsPaused && !prefersStill(),
      readout: simulation?.readout(values) ?? null,
      time: 0, publishedAt: 0,
    })
  },
  toggle: () => set((state) => ({ running: !state.running && !state.simulation?.finished })),
  pause: () => set({ running: false }),
  stepOnce: (values) => {
    const { simulation } = get()
    if (!simulation || simulation.finished) return
    simulation.step(values)
    get().publish(values, true)
  },
  publish: (values, force = false) => {
    const { simulation, publishedAt } = get()
    if (!simulation) return
    const now = typeof performance === 'undefined' ? Date.now() : performance.now()
    if (!force && now - publishedAt < 100 && !simulation.finished) return
    set({
      readout: simulation.readout(values), time: simulation.time, publishedAt: now,
      running: get().running && !simulation.finished,
    })
  },
}))
