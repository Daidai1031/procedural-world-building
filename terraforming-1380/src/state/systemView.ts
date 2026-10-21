import { create } from 'zustand'

// D-049: the camera pull-back. `phase`, `focus` and `hover` change rarely and drive the DOM; everything that
// changes every frame lives in `systemViewFrame`, which components read inside useFrame without re-rendering.
export type SystemPhase = 'orbit' | 'pulling' | 'system' | 'returning' | 'diving' | 'arriving'

// Shown for a few seconds after travelling; it survives the remount that a new planet causes.
export interface Arrival { name: string; previous: string; first: boolean }

interface SystemViewState {
  phase: SystemPhase
  focus: string | null
  hover: string | null
  arrival: Arrival | null
}

export const useSystemView = create<SystemViewState>()(() => ({ phase: 'orbit', focus: null, hover: null, arrival: null }))

// Azimuth and polar are shared by the orbit and system cameras so switching between them never turns the view.
export const systemViewFrame = {
  progress: 0, // linear 0..1 along the pull; the eased value is `pull`
  pull: 0,
  azimuth: 0,
  polar: Math.PI / 2,
  zoom: null as number | null, // the player's wheel distance, null until the wheel is used
  wheel: 0, // wheel ticks not yet applied to `zoom`
  pendingFocus: null as string | null,
  ticks: new Set<() => void>(), // DOM overlays that follow the camera, called once per frame after it moves
  dive: 0, // 0..1 along the dive
  traveled: false, // travelTo has been called for this dive
}

const set = (patch: Partial<SystemViewState>) => useSystemView.setState(patch)

export function openSystem(focus: string | null = null) {
  const { phase } = useSystemView.getState()
  if (phase !== 'orbit' && phase !== 'returning') return
  systemViewFrame.pendingFocus = focus
  set({ phase: 'pulling', hover: null })
}

export function closeSystem() {
  const { phase } = useSystemView.getState()
  if (phase !== 'pulling' && phase !== 'system') return
  systemViewFrame.pendingFocus = null
  set({ phase: 'returning', focus: null, hover: null })
}

// O toggles; Esc first clears the focus and only then leaves.
export function toggleSystem() {
  if (useSystemView.getState().phase === 'orbit' || useSystemView.getState().phase === 'returning') openSystem()
  else closeSystem()
}
export function escapeSystem() {
  const { phase, focus } = useSystemView.getState()
  if (phase === 'diving' || phase === 'arriving') return
  if (focus && phase === 'system') set({ focus: null })
  else closeSystem()
}

// Used when something (surface exploration, bankruptcy) takes over the screen: no animation.
export function resetSystem() {
  Object.assign(systemViewFrame, { progress: 0, pull: 0, zoom: null, wheel: 0, pendingFocus: null, dive: 0, traveled: false })
  set({ phase: 'orbit', focus: null, hover: null })
}

export function setHover(seed: string | null) { if (useSystemView.getState().hover !== seed) set({ hover: seed }) }
// Clicking the focused world again, or empty space, clears the focus.
export function pickWorld(seed: string) { set({ focus: useSystemView.getState().focus === seed ? null : seed }) }
export function clearFocus() { const { phase, focus } = useSystemView.getState(); if (focus && phase === 'system') set({ focus: null }) }

// SYS-11: a completed hold on the focused world starts the dive; the camera calls travelTo once the veil is opaque.
export function startDive() {
  const { phase, focus } = useSystemView.getState()
  if (phase !== 'system' || !focus) return
  Object.assign(systemViewFrame, { dive: 0, traveled: false })
  set({ phase: 'diving', hover: null })
}
export function arrive(arrival: Arrival) { set({ arrival }) }
export function endArrival() { set({ arrival: null }) }
