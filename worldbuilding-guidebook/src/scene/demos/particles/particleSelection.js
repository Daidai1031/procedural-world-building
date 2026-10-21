import { create } from 'zustand'

export const useParticleSelection = create((set) => ({
  selected: 0,
  select: (selected) => set({ selected }),
}))
