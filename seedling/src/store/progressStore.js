import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Bump the key on any schema change rather than migrating corrupted old data.
export const useProgressStore = create(
  persist(
    (set, get) => ({
      completedStepIds: [],
      lastStepId: null,
      notes: {},
      practiceResults: {},

      setLastStepId: (stepId) => set({ lastStepId: stepId }),
      markStepComplete: (stepId) => {
        if (get().completedStepIds.includes(stepId)) return
        set((state) => ({ completedStepIds: [...state.completedStepIds, stepId] }))
      },
    }),
    { name: 'seedling.progress.v1' },
  ),
)
