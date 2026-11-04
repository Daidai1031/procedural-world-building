import { tuning } from '../config/tuning'
import { residentSpecies } from '../content/residents'
import { planetSpecies } from './residents'
import { creatureLines } from './migration'
import type { Resident } from '../state/runState'
import { plantStage, type Structure } from './structures'
import { hashSeed } from '../world/planet'
import { add, distance, dot, scale, unit, type Vec3 } from './geometry'

const visit = tuning.drifter.visit

export interface VisitPose {
  feet: Vec3
  heading: Vec3
  shown: boolean
}

export type AudienceManner = 'follow' | 'watch'
export interface AudiencePlace {
  id: string
  manner: AudienceManner
  /** Unit direction from the planet center through the spot where this resident should stand. */
  direction: Vec3
}

export interface FieldCard {
  id: string
  kicker: string
  title: string
  body: string
}

export type FieldKind = 'resident' | 'plant' | 'antenna'
export interface FieldTarget {
  id: string
  kind: FieldKind
  position: Vec3
  manner?: AudienceManner | 'home'
  stage?: number
  /** D-068: the whole creature, so a visitor's card can say where it is from and how it feels. */
  creature?: Resident
}

// A point `arc` world units ahead of `direction` along `tangent`, on the same sphere.
export function directionAhead(direction: Vec3, tangent: Vec3, arc: number, radius: number): Vec3 {
  const up = unit(direction)
  const drop = dot(up, tangent)
  const flat: Vec3 = [tangent[0] - up[0] * drop, tangent[1] - up[1] * drop, tangent[2] - up[2] * drop]
  const span = Math.hypot(flat[0], flat[1], flat[2])
  if (span < 1e-6 || radius < 1e-4) return up
  const side = scale(flat, 1 / span)
  const theta = arc / radius
  return unit(add(scale(up, Math.cos(theta)), scale(side, Math.sin(theta))))
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

// Nearest residents come to the Drifter. A stable third of them walk behind him; the rest stand in a ring and watch.
// Membership uses each resident's simulated position, so they drift home again once he walks out of `notice`.
export function audiencePlaces(residents: readonly { id: string; position: Vec3 }[], pose: VisitPose): AudiencePlace[] {
  const up = unit(pose.feet)
  const along = dot(pose.heading, up)
  const forward = unit([pose.heading[0] - up[0] * along, pose.heading[1] - up[1] * along, pose.heading[2] - up[2] * along])
  if (Math.hypot(...forward) < 1e-6) return []
  const right = unit(cross(up, forward))
  const near = residents
    .map((resident) => ({ ...resident, gap: distance(resident.position, pose.feet) }))
    .filter((resident) => resident.gap <= visit.notice)
    .sort((a, b) => a.gap - b.gap || (a.id < b.id ? -1 : 1))
    .slice(0, visit.audience)
  const followers = near.filter((resident) => hashRole(resident.id) === 'follow').slice(0, visit.follow.length)
  const following = new Set(followers.map((resident) => resident.id))
  const watchers = near.filter((resident) => !following.has(resident.id))
  const place = (rightN: number, forwardN: number): Vec3 =>
    unit(add(pose.feet, add(scale(right, rightN), scale(forward, forwardN))))
  return [
    ...followers.map((resident, index) => {
      const [x, z] = visit.follow[index]
      return { id: resident.id, manner: 'follow' as const, direction: place(x, z) }
    }),
    ...watchers.map((resident, index) => {
      // Centered on straight behind (−forward). The arc stays in the rear, so nobody walks up to his face.
      const span = Math.PI * 0.9
      const angle = -Math.PI / 2 + (index - (watchers.length - 1) / 2) * (span / Math.max(watchers.length, 1))
      return {
        id: resident.id, manner: 'watch' as const,
        direction: place(Math.cos(angle) * visit.watchRadius, Math.sin(angle) * visit.watchRadius),
      }
    }),
  ]
}

const hashRole = (id: string): AudienceManner => hashSeed(`${id}:visit`) % 3 === 0 ? 'follow' : 'watch'

// Distance along a unit ray to a sphere, or null when the sphere is missed or behind the origin.
export function rayDistance(origin: Vec3, direction: Vec3, center: Vec3, radius: number): number | null {
  const dir = unit(direction)
  const w: Vec3 = [origin[0] - center[0], origin[1] - center[1], origin[2] - center[2]]
  const b = dot(w, dir)
  const c = dot(w, w) - radius * radius
  const disc = b * b - c
  if (disc < 0) return null
  const root = Math.sqrt(disc)
  if (-b - root > 1e-3) return -b - root
  if (-b + root > 1e-3) return -b + root
  return null
}

export function pickFieldTarget(origin: Vec3, direction: Vec3, targets: readonly FieldTarget[], range: number,
  occluder?: { position: Vec3; radius: number } | null): FieldTarget | null {
  const block = occluder ? rayDistance(origin, direction, occluder.position, occluder.radius) : null
  let best: FieldTarget | null = null
  let bestT = range
  for (const target of targets) {
    const t = rayDistance(origin, direction, target.position, visit.pickRadius[target.kind])
    if (t == null || t >= bestT || (block != null && t > block)) continue
    best = target
    bestT = t
  }
  return best
}

const plantNames = ['Sprout', 'Young growth', 'Mature stand']

export function fieldCardFor(target: FieldTarget, seed: string, nameOf: (seed: string) => string = id => id): FieldCard {
  if (target.kind === 'plant') {
    return {
      id: target.id, kicker: 'Vegetation', title: plantNames[target.stage ?? 0] ?? plantNames[2],
      body: 'A lichen patch with a branching stem. A Gardener sows the first ones; after that they seed the ground themselves.',
    }
  }
  if (target.kind === 'antenna') {
    return {
      id: target.id, kicker: 'Signal tower', title: 'Lattice mast',
      body: 'Three legs, a dish and a blinking lamp. Broadcasts leave the planet from towers like this.',
    }
  }
  const species = residentSpecies[target.creature?.species ?? planetSpecies(seed)]
  const kicker = target.manner === 'follow' ? 'Following the Drifter'
    : target.manner === 'watch' ? 'Watching the Drifter' : 'Native life'
  // A native's card stays as it was; a visitor's adds its story.
  const story = target.creature && target.creature.life !== 'native' ? ` ${creatureLines(target.creature, nameOf).join(' · ')}` : ''
  return { id: target.id, kicker, title: species.name, body: species.nature + story }
}

function structureCenter(structure: Structure): Vec3 {
  return add(structure.position, scale(structure.normal, structure.kind === 'antenna' ? 0.2 : 0.06))
}

// What a click can land on: residents where they are drawn, plants and towers on their anchors, and the Drifter's
// chest as an occluder so a click on him does not open whoever is standing behind.
export function inspectVisit(origin: Vec3, direction: Vec3, input: {
  seed: string
  residents: readonly ({ id: string; position: Vec3 } & Partial<Resident>)[]
  nameOf?: (seed: string) => string
  shown: ReadonlyMap<string, Vec3>
  structures: readonly Structure[]
  tick: number
  pose: VisitPose | null
}): FieldCard | null {
  const manners = new Map((input.pose?.shown ? audiencePlaces(input.residents, input.pose) : []).map((place) => [place.id, place.manner]))
  const targets: FieldTarget[] = [
    ...input.residents.map((resident) => ({
      id: resident.id, kind: 'resident' as const,
      position: input.shown.get(resident.id) ?? resident.position,
      manner: manners.get(resident.id) ?? 'home' as const,
      creature: resident.creatureId ? resident as Resident : undefined,
    })),
    ...input.structures.map((structure) => ({
      id: structure.id, kind: structure.kind, position: structureCenter(structure),
      stage: structure.kind === 'plant' ? plantStage(structure, input.tick) : undefined,
    })),
  ]
  const occluder = input.pose?.shown
    ? { position: add(input.pose.feet, scale(unit(input.pose.feet), visit.chest)), radius: visit.bodyRadius }
    : null
  const hit = pickFieldTarget(origin, direction, targets, visit.pickRange, occluder)
  return hit ? fieldCardFor(hit, input.seed, input.nameOf) : null
}
