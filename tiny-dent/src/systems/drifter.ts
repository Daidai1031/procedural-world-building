import { tuning } from '../config/tuning'
import { dot, scale, unit, type Vec3 } from './geometry'
import { drifterClipInfo, type DrifterClip } from '../render/models/drifter'

// D-064: what the Drifter does on the surface. Walking wins over standing still, but a jump plays out even while
// moving. Standing still, it idles, then looks around, then sits down to watch the sky. A gesture the player asks
// for holds until the next step; a wave ends by itself, and a jump ends when its hop is over.
export type DrifterGesture = 'wave' | 'kneel' | 'sit' | 'jump'
export const drifterGestureKeys: Record<string, DrifterGesture> = { '1': 'wave', '2': 'kneel', '3': 'sit' }
export interface DrifterMind { still: number; gesture: DrifterGesture | null; gestureTime: number }

export const restingMind = (): DrifterMind => ({ still: 0, gesture: null, gestureTime: 0 })

// The body stands square to the ground it is on. `sampled` is the terrain gradient; a missing or inward reading
// falls back to the planet's radius, and a gradient that lies almost along the ground is ignored.
export function uprightDirection(radial: Vec3, sampled: Vec3): Vec3 {
  const up = unit(radial)
  const length = Math.hypot(sampled[0], sampled[1], sampled[2])
  if (length < 1e-6) return up
  const slope = scale(sampled, (dot(sampled, up) < 0 ? -1 : 1) / length)
  return dot(slope, up) < 0.2 ? up : slope
}
const waveLength = 4
const jumpLength = drifterClipInfo.jump.duration

export function stepDrifterMind(mind: DrifterMind, moving: boolean, delta: number, asked: DrifterGesture | null = null): { mind: DrifterMind; clip: DrifterClip } {
  if (asked && asked !== 'jump') return { mind: { still: 0, gesture: asked, gestureTime: 0 }, clip: asked }
  if (asked === 'jump' || mind.gesture === 'jump') {
    const gestureTime = asked === 'jump' ? 0 : mind.gestureTime + delta
    if (gestureTime < jumpLength) return { mind: { still: 0, gesture: 'jump', gestureTime }, clip: 'jump' }
    mind = restingMind()
  }
  if (moving) return { mind: restingMind(), clip: 'walk' }
  if (mind.gesture) {
    const gestureTime = mind.gestureTime + delta
    if (mind.gesture === 'wave' && gestureTime > waveLength) return { mind: restingMind(), clip: 'idle' }
    return { mind: { ...mind, gestureTime }, clip: mind.gesture }
  }
  const still = mind.still + delta
  const clip: DrifterClip = still >= tuning.drifter.sitAfter ? 'sit' : still >= tuning.drifter.lookAfter ? 'look' : 'idle'
  return { mind: { ...mind, still }, clip }
}
