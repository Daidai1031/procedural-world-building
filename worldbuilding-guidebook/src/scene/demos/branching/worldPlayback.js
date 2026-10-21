import { create } from 'zustand'
import { advanceFixed, createWorld, stepWorld, TIME_STEP, WORLD_A_SPOT, WORK_SPOTS } from './worldExperiment.js'

const prefersStill = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// The two runs of the experiment. The canvas reads the worlds themselves every
// frame; the panel reads `revision`, which is bumped at most ten times a second,
// so it does not redraw on every step.
export const useWorldPlayback = create((set, get) => ({
  worlds: null,
  running: false,
  revision: 0,
  publishedAt: 0,
  // Pause leaves everything where it is. Sync Reset starts both runs again from
  // the same initial description and keeps the chosen work spots.
  restart: ({ workB, shelter, working }) => {
    const worlds = [
      createWorld({ workSpot: WORLD_A_SPOT, shelter, working }),
      createWorld({ workSpot: workB, shelter, working }),
    ]
    set((state) => ({ worlds, running: false, revision: state.revision + 1, publishedAt: 0 }))
  },
  toggle: () => set((state) => ({ running: !state.running })),
  pause: () => set({ running: false }),
  stepOnce: () => {
    for (const world of get().worlds ?? []) stepWorld(world, TIME_STEP)
    get().publish(true)
  },
  // Only world B's marker moves while the run is going.
  setWorkB: (workB) => {
    const worlds = get().worlds
    if (worlds) worlds[1].work = WORK_SPOTS[workB]
    get().publish(true)
  },
  setWorking: (working) => {
    for (const world of get().worlds ?? []) world.working = working
    get().publish(true)
  },
  advance: (clock, delta) => {
    const { worlds } = get()
    if (!worlds) return
    if (advanceFixed(worlds, clock, delta) > 0) get().publish()
  },
  publish: (force = false) => {
    const now = typeof performance === 'undefined' ? Date.now() : performance.now()
    if (!force && now - get().publishedAt < 100) return
    set((state) => ({ revision: state.revision + 1, publishedAt: now }))
  },
  prefersStill,
}))
