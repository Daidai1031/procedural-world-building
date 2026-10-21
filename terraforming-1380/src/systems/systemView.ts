import type { Vec3 } from './geometry'
import type { RunState } from '../state/runState'
import { planetConfig } from '../world/planet'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { tuning } from '../config/tuning'

// D-049: pure helpers for the pulled-back system view. No React and no three.js, so they can be tested in node.

// 'home/signal-2' was found by 'home'; the home planet has no parent.
export function parentSeed(seed: string): string | null {
  const match = /^(.*)\/signal-\d+$/.exec(seed)
  return match ? match[1] : null
}

export interface LayoutPlanet { seed: string; position: Vec3 }
export interface SystemLayout { positions: Record<string, Vec3>; center: Vec3; extent: number }

const worldRadius = (seed: string) => planetConfig(seed).radius * VOXEL_WORLD_SIZE

// SYS-05: every position is relative to the active planet, which stays at the scene origin.
export function systemLayout(planets: LayoutPlanet[], activeSeed: string): SystemLayout {
  const origin = planets.find(({ seed }) => seed === activeSeed)?.position ?? [0, 0, 0]
  const positions: Record<string, Vec3> = {}
  for (const { seed, position } of planets) {
    positions[seed] = seed === activeSeed ? [0, 0, 0] : [position[0] - origin[0], position[1] - origin[1], position[2] - origin[2]]
  }
  const list = planets.map(({ seed }) => positions[seed])
  const center = (list.length === 0 ? [0, 0, 0] : [0, 1, 2].map(axis => list.reduce((sum, p) => sum + p[axis], 0) / list.length)) as Vec3
  const extent = Math.max(0, ...planets.map(({ seed }) => Math.hypot(...positions[seed].map((v, i) => v - center[i])) + worldRadius(seed)))
  return { positions, center, extent }
}

export interface Arc { from: string; to: string }
// One arc per known world whose parent is also known: descriptive only, never a "best" route.
export function systemArcs(planets: { seed: string }[]): Arc[] {
  const known = new Set(planets.map(({ seed }) => seed))
  return planets.flatMap(({ seed }) => {
    const parent = parentSeed(seed)
    return parent && known.has(parent) ? [{ from: parent, to: seed }] : []
  })
}

// Camera distance in orbit view; the pull-back starts exactly here.
export const ORBIT_DISTANCE = 8

export function systemDistance(extent: number, fovDegrees: number): number {
  const { min, max, margin } = tuning.system.distance
  const fit = (extent + margin) / Math.tan(fovDegrees * Math.PI / 360)
  return Math.max(min, Math.min(max, fit))
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export interface CameraPoseInput {
  pull: number; azimuth: number; polar: number
  center: Vec3; distance: number
  focus?: { position: Vec3; distance: number; amount: number }
}
// pull 0 is today's orbit pose (distance 8, target at the active planet); pull 1 looks at the layout center from `distance`.
// Azimuth and polar are the player's and never change here, so switching views does not turn the camera.
export function cameraPose({ pull, azimuth, polar, center, distance, focus }: CameraPoseInput) {
  let target = center.map(v => v * pull) as Vec3
  let range = lerp(ORBIT_DISTANCE, distance, pull)
  if (focus) {
    target = target.map((v, i) => lerp(v, focus.position[i], focus.amount)) as Vec3
    range = lerp(range, focus.distance, focus.amount)
  }
  const position: Vec3 = [
    target[0] + range * Math.sin(polar) * Math.sin(azimuth),
    target[1] + range * Math.cos(polar),
    target[2] + range * Math.sin(polar) * Math.cos(azimuth),
  ]
  return { position, target, distance: range }
}

// SYS-11: how far a press-and-hold has come, clamped to 0..1.
export function holdProgress(elapsedMs: number, holdMs: number): number {
  return Math.max(0, Math.min(1, elapsedMs / holdMs))
}

export interface PlanetMarks {
  plants: Vec3[]
  antennas: [position: Vec3, normal: Vec3][]
  residents: Vec3[]
  robots: { position: Vec3; phase: string }[]
}

// An evenly spaced subset, so a capped list still covers the whole planet and is the same every time.
function sample<T>(items: T[], cap: number): T[] {
  if (items.length <= cap) return items
  return Array.from({ length: cap }, (_, i) => items[Math.floor(i * items.length / cap)])
}

// SYS-09: what is drawn on a world instead of a list. Planet-local coordinates, taken straight from the state and capped.
export function planetMarks(state: RunState, caps: { plants: number; antennas: number; residents: number; robots: number } = tuning.system.marks): PlanetMarks {
  const crew = [...state.robots, ...state.gardeners, ...state.riggers, ...state.builders].map(({ position, phase }) => ({ position, phase: phase as string }))
  return {
    plants: sample(state.structures.filter(({ kind }) => kind === 'plant').map(({ position }) => position), caps.plants),
    antennas: sample(state.structures.filter(({ kind }) => kind === 'antenna').map(({ position, normal }): [Vec3, Vec3] => [position, normal]), caps.antennas),
    residents: sample(state.residents.map(({ position }) => position), caps.residents),
    robots: sample(crew, caps.robots),
  }
}
