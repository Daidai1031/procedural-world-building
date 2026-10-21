import { create } from 'zustand'

const SECONDS_PER_INSTRUCTION = 0.8

// State the panel and the canvas share. The canvas owns the structures; this
// only holds where a playback is up to and what the canvas last measured.
export const useBranchingPlayback = create((set, get) => ({
  // Instruction playback (Steps 1 and 3): how many instructions the pen has carried out.
  cursor: 0,
  playing: false,
  elapsed: 0,
  // Depth inspector (Step 4): the segment the learner clicked.
  selected: null,
  select: (selected) => set({ selected }),
  next: (total) => set((state) => ({ cursor: Math.min(total, state.cursor + 1), playing: false })),
  replay: () => set({ cursor: 0, playing: true, elapsed: 0 }),
  tick: (delta, total) => {
    const { playing, elapsed, cursor } = get()
    if (!playing) return
    const nextElapsed = elapsed + delta
    if (nextElapsed < SECONDS_PER_INSTRUCTION) { set({ elapsed: nextElapsed }); return }
    const nextCursor = Math.min(total, cursor + 1)
    set({ cursor: nextCursor, elapsed: 0, playing: nextCursor < total })
  },
  // Growth timeline (Step 6): 0 to 1, never random, and scrubbable.
  growthTime: 0,
  growthPlaying: false,
  setGrowthTime: (growthTime) => set({ growthTime, growthPlaying: false }),
  playGrowth: () => set((state) => ({ growthPlaying: true, growthTime: state.growthTime >= 1 ? 0 : state.growthTime })),
  pauseGrowth: () => set({ growthPlaying: false }),
  replayGrowth: () => set({ growthTime: 0, growthPlaying: true }),
  tickGrowth: (step) => {
    const { growthPlaying, growthTime } = get()
    if (!growthPlaying) return
    const next = Math.min(1, growthTime + step)
    set({ growthTime: next, growthPlaying: next < 1 })
  },
  // Camera distance and the level drawn at it (Step 7).
  distance: 10.6,
  distanceRequest: null,
  lodReadout: null,
  setDistance: (distance) => set({ distance }),
  // The slider shows the requested distance at once; the canvas then corrects it
  // to what it measures.
  requestDistance: (value) => set({ distanceRequest: { value }, distance: value }),
  setLodReadout: (lodReadout) => set({ lodReadout }),
  reset: () => set({
    cursor: 0, playing: false, elapsed: 0, selected: null,
    growthTime: 0, growthPlaying: false, lodReadout: null, distanceRequest: null,
  }),
}))
