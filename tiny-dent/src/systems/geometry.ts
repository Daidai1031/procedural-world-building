import { tuning } from '../config/tuning'
import type { PlanetWorld } from '../world/planet'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'

// Shared by every robot. Positions are centered world coordinates (planet center at the origin), the same space as
// ResourceCluster.position and the rendered scene. Density reads and terrain edits add VOXEL_WORLD_SIZE / 2 to y.
export type Vec3 = [number, number, number]
type DensityAt = (x: number, y: number, z: number) => number

export const HALF = VOXEL_WORLD_SIZE / 2

export const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
export const scale = (v: Vec3, factor: number): Vec3 => [v[0] * factor, v[1] * factor, v[2] * factor]
export const unit = (v: Vec3): Vec3 => scale(v, 1 / (Math.hypot(v[0], v[1], v[2]) || 1))
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

// Radius of the outermost solid sample along a unit direction; walking inward from outside ignores overhangs.
export function surfaceRadius(densityAt: DensityAt, direction: Vec3) {
  const spacing = VOXEL_WORLD_SIZE / (tuning.grid.resolution - 1)
  for (let r = HALF - 2 * spacing; r > 0; r -= spacing / 2) {
    if (densityAt(direction[0] * r, direction[1] * r + HALF, direction[2] * r) < 0) return r
  }
  return 0
}

// A point is empty air when the nearest density sample is non-negative (negative inside, D-014).
export function isEmptyAt(world: Pick<PlanetWorld, 'densityAt'>, p: Vec3) {
  return world.densityAt(p[0], p[1] + HALF, p[2]) >= 0
}

function glide(from: Vec3, to: Vec3, maxAngle: number): Vec3 {
  const cos = Math.max(-1, Math.min(1, dot(from, to)))
  if (Math.acos(cos) <= maxAngle) return to
  let side: Vec3 = [to[0] - from[0] * cos, to[1] - from[1] * cos, to[2] - from[2] * cos]
  if (Math.hypot(...side) < 1e-6) {
    side = [-from[1], from[0], 0]
    if (Math.hypot(...side) < 1e-6) side = [0, -from[2], from[1]]
  }
  const along = unit(side)
  return unit([0, 1, 2].map((axis) => from[axis] * Math.cos(maxAngle) + along[axis] * Math.sin(maxAngle)) as Vec3)
}

// Hover point above the outermost solid sample on a direction.
export function hoverGoal(densityAt: DensityAt, direction: Vec3, hover: number) {
  return scale(direction, surfaceRadius(densityAt, direction) + hover)
}

// AUT-04: climb any tunnel to the hover shell, then glide along it. The shell sits above the outermost solid
// sample of every ray, so travel never enters intact terrain.
export function hoverStep(densityAt: DensityAt, position: Vec3, direction: Vec3, speed: number, hover: number): Vec3 {
  const here = unit(position)
  const height = Math.hypot(...position)
  const shell = surfaceRadius(densityAt, here) + hover
  if (height < shell - 0.02) return scale(here, Math.min(shell, height + speed))
  const next = glide(here, direction, speed / height)
  return scale(next, surfaceRadius(densityAt, next) + hover)
}
