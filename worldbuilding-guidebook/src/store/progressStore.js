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

      savePractice: (stepId, patch) => set((state) => ({
        practiceResults: { ...state.practiceResults, [stepId]: { ...state.practiceResults[stepId], ...patch } },
      })),
      // An empty note removes the entry, so a step never holds a blank quote.
      saveNote: (stepId, text) => set((state) => {
        const notes = { ...state.notes }
        const trimmed = text.trim()
        if (trimmed) notes[stepId] = trimmed
        else delete notes[stepId]
        return { notes }
      }),
      setLastStepId: (stepId) => set({ lastStepId: stepId }),
      markStepComplete: (stepId) => {
        if (get().completedStepIds.includes(stepId)) return
        set((state) => ({ completedStepIds: [...state.completedStepIds, stepId] }))
      },
    }),
    { name: 'worldbuilding-guidebook.progress.v2' },
  ),
)
