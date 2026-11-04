import { tuning } from '../config/tuning'
import type { DrifterClip } from '../render/models/drifter'

// D-064: what the Drifter does on the surface. Walking always wins. Standing still, it idles, then looks around,
// then sits down to watch the sky. A gesture the player asks for holds until the next step; a wave ends by itself.
export type DrifterGesture = 'wave' | 'kneel' | 'sit'
export const drifterGestureKeys: Record<string, DrifterGesture> = { '1': 'wave', '2': 'kneel', '3': 'sit' }
export interface DrifterMind { still: number; gesture: DrifterGesture | null; gestureTime: number }

export const restingMind = (): DrifterMind => ({ still: 0, gesture: null, gestureTime: 0 })
const waveLength = 4

export function stepDrifterMind(mind: DrifterMind, moving: boolean, delta: number, asked: DrifterGesture | null = null): { mind: DrifterMind; clip: DrifterClip } {
  if (moving) return { mind: restingMind(), clip: 'walk' }
  if (asked) return { mind: { still: 0, gesture: asked, gestureTime: 0 }, clip: asked }
  if (mind.gesture) {
    const gestureTime = mind.gestureTime + delta
    if (mind.gesture === 'wave' && gestureTime > waveLength) return { mind: restingMind(), clip: 'idle' }
    return { mind: { ...mind, gestureTime }, clip: mind.gesture }
  }
  const still = mind.still + delta
  const clip: DrifterClip = still >= tuning.drifter.sitAfter ? 'sit' : still >= tuning.drifter.lookAfter ? 'look' : 'idle'
  return { mind: { ...mind, still }, clip }
}
