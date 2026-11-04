import { Vector3 } from 'three'
import { HALF, scale, unit, type Vec3 } from './geometry'
import type { PlanetWorld } from '../world/planet'

export type SurfaceWorld = Pick<PlanetWorld, 'densityAt'>
export interface LandingSite { id: string; name: string; direction: Vec3; position: Vec3; available: boolean }
export const eyeHeight = 0.16

export function mapPoint(position: Vec3): [number, number] {
  const [x, y, z] = unit(position)
  return [(Math.atan2(x, z) / (2 * Math.PI) + 0.5) * 800, (0.5 - Math.asin(Math.max(-1, Math.min(1, y))) / Math.PI) * 400]
}
export function mapDirection(x: number, y: number): Vec3 {
  const longitude = (x / 800 - 0.5) * 2 * Math.PI
  const latitude = (0.5 - y / 400) * Math.PI
  return [Math.sin(longitude) * Math.cos(latitude), Math.sin(latitude), Math.cos(longitude) * Math.cos(latitude)]
}

// March from outside to find the outer surface, including edited terrain and caves.
export function groundRadius(world: SurfaceWorld, direction: Vec3) {
  const step = 0.04
  for (let radius = HALF - 0.15; radius > 0.15; radius -= step) {
    if (world.densityAt(direction[0] * radius, direction[1] * radius + HALF, direction[2] * radius) < 0) {
      let low = radius, high = radius + step
      for (let i = 0; i < 7; i++) {
        const mid = (low + high) / 2
        if (world.densityAt(direction[0] * mid, direction[1] * mid + HALF, direction[2] * mid) < 0) low = mid
        else high = mid
      }
      return high
    }
  }
  return 0
}

export function surfaceBasis(direction: Vec3) {
  const up = new Vector3(...direction).normalize()
  const north = new Vector3(0, 1, 0).addScaledVector(up, -up.y)
  if (north.lengthSq() < 0.001) north.set(0, 0, 1).addScaledVector(up, -up.z)
  north.normalize()
  const east = new Vector3().crossVectors(north, up).normalize()
  return { up, north, east }
}

export function landingQuality(world: SurfaceWorld, direction: Vec3) {
  const radius = groundRadius(world, direction)
  if (radius < 0.5) return Infinity
  const { up, north, east } = surfaceBasis(direction)
  let variation = 0
  for (const axis of [north, east]) for (const sign of [-1, 1]) {
    const next = up.clone().addScaledVector(axis, sign * 0.09 / radius).normalize().toArray() as Vec3
    const neighbour = groundRadius(world, next)
    if (neighbour < 0.5) return Infinity
    variation = Math.max(variation, Math.abs(neighbour - radius))
  }
  const eye = scale(direction, radius + eyeHeight)
  if (!(world.densityAt(eye[0], eye[1] + HALF, eye[2]) >= 0)) return Infinity
  return variation
}

export function findLandingSites(world: SurfaceWorld): LandingSite[] {
  return Array.from({ length: 8 }, (_, index) => {
    const x = 100 + (index % 4) * 200
    const y = index < 4 ? 140 : 260
    let direction = mapDirection(x, y), best = Infinity
    for (const dx of [-22, 0, 22]) for (const dy of [-18, 0, 18]) {
      const candidate = mapDirection(x + dx, y + dy)
      const quality = landingQuality(world, candidate)
      if (quality < best) { best = quality; direction = candidate }
    }
    return { id: 'landing-' + index, name: 'LZ ' + String(index + 1).padStart(2, '0'), direction,
      position: scale(direction, groundRadius(world, direction) + 0.035), available: best <= 0.13 }
  })
}

export function walkingStep(world: SurfaceWorld, direction: Vec3, tangent: Vec3, distance: number): Vec3 {
  const radius = groundRadius(world, direction)
  if (radius < 0.5) return direction
  const next = new Vector3(...direction).addScaledVector(new Vector3(...tangent), distance / radius).normalize().toArray() as Vec3
  const nextRadius = groundRadius(world, next)
  if (nextRadius < 0.5 || Math.abs(nextRadius - radius) > 0.085) return direction
  const eye = scale(next, nextRadius + eyeHeight)
  if (!(world.densityAt(eye[0], eye[1] + HALF, eye[2]) >= 0)) return direction
  return next
}
