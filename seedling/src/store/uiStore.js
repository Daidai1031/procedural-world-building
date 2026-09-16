import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const CARD_MIN_WIDTH = 360
export const CARD_MAX_WIDTH = 760
const CARD_DEFAULT_WIDTH = 440

const PERSISTED_FIELDS = ['cardWidth', 'cardCollapsed', 'railPinned']

export function clampCardWidth(width) {
  if (!Number.isFinite(width)) return CARD_DEFAULT_WIDTH
  return Math.min(CARD_MAX_WIDTH, Math.max(CARD_MIN_WIDTH, Math.round(width)))
}

// One localStorage key per field — seedling.ui.cardWidth and friends — so the
// stored values stay readable in devtools and one unparseable field cannot take
// the others down with it. persist wraps these calls, so a browser that refuses
// storage degrades to session-only state rather than throwing.
const perFieldStorage = {
  getItem: (name) => {
    const state = {}

    for (const field of PERSISTED_FIELDS) {
      const raw = localStorage.getItem(`${name}.${field}`)
      if (raw !== null) state[field] = JSON.parse(raw)
    }

    if (Object.keys(state).length === 0) return null

    return JSON.stringify({ state, version: 0 })
  },
  setItem: (name, value) => {
    const { state } = JSON.parse(value)

    for (const field of PERSISTED_FIELDS) {
      localStorage.setItem(`${name}.${field}`, JSON.stringify(state[field]))
    }
  },
  removeItem: (name) => {
    for (const field of PERSISTED_FIELDS) {
      localStorage.removeItem(`${name}.${field}`)
    }
  },
}

export const useUiStore = create(
  persist(
    (set) => ({
      cardWidth: CARD_DEFAULT_WIDTH,
      cardCollapsed: false,
      railPinned: false,

      setCardWidth: (width) => set({ cardWidth: clampCardWidth(width) }),
      toggleCardCollapsed: () => set((state) => ({ cardCollapsed: !state.cardCollapsed })),
      toggleRailPinned: () => set((state) => ({ railPinned: !state.railPinned })),
      unpinRail: () => set({ railPinned: false }),
    }),
    {
      name: 'seedling.ui',
      storage: createJSONStorage(() => perFieldStorage),
      partialize: (state) =>
        Object.fromEntries(PERSISTED_FIELDS.map((field) => [field, state[field]])),
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        cardWidth: clampCardWidth(persisted?.cardWidth ?? current.cardWidth),
      }),
    },
  ),
)
