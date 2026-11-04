import type { createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { hashSeed, type PlanetWorld } from '../world/planet'
import { randomStream } from '../world/resourceClusters'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { add, dot, distance, HALF, scale, surfaceRadius, unit, type Vec3 } from './geometry'
import { standsDry, type WaterWorld } from './water'
import type { Patch } from './patches'

type RunStore = ReturnType<typeof createRunStore>
const rules = tuning.structures

export type StructureKind = 'plant' | 'antenna'
// AUT-15/16: things the Gardener leaves on the surface. `position` is the anchor on the ground, `normal` points away from it.
export interface Structure {
  id: string
  kind: StructureKind
  position: Vec3
  normal: Vec3
  bornTick: number
}

const gradientStep = (VOXEL_WORLD_SIZE / (tuning.grid.resolution - 1)) * 1.5

// Outward surface direction from the density gradient (negative inside, so the gradient points into the air).
export function surfaceNormal(world: Pick<PlanetWorld, 'densityAt'>, p: Vec3): Vec3 {
  const d = (x: number, y: number, z: number) => world.densityAt(p[0] + x, p[1] + HALF + y, p[2] + z)
  const e = gradientStep
  return unit([d(e, 0, 0) - d(-e, 0, 0), d(0, e, 0) - d(0, -e, 0), d(0, 0, e) - d(0, 0, -e)])
}

// Angle between the ground and a sphere about the planet center, in radians.
export function slopeAt(normal: Vec3, anchor: Vec3) {
  return Math.acos(Math.max(-1, Math.min(1, dot(normal, unit(anchor)))))
}

// A structure stands only while its ground is solid and the space above it is air. Digging the ground away, or
// burying it under new terrain, ends it.
export function isAnchored(world: Pick<PlanetWorld, 'densityAt'>, anchor: Vec3, normal: Vec3) {
  const above = add(anchor, scale(normal, rules.anchorLift))
  return world.densityAt(anchor[0], anchor[1] + HALF, anchor[2]) < 0
    && world.densityAt(above[0], above[1] + HALF, above[2]) >= 0
}

export function groundPoint(world: Pick<PlanetWorld, 'densityAt'>, direction: Vec3): Vec3 {
  return scale(direction, surfaceRadius(world.densityAt, direction))
}

function clearance(a: StructureKind, b: StructureKind) {
  if (a === 'plant' && b === 'plant') return rules.plantSpacing
  if (a === 'antenna' && b === 'antenna') return rules.antennaSpacing
  // D-063: a new mast clears the plants under it (addStructure), so vegetation never shuts the Rigger out.
  return a === 'antenna' ? 0 : rules.mixedClearance
}

// Terrain suitability and spacing for a new structure; the caller decides whether the place is inside a work area.
export function isSuitable(world: Pick<PlanetWorld, 'densityAt'> & Partial<Pick<WaterWorld, 'waterRadius'>>, existing: Structure[], kind: StructureKind,
  anchor: Vec3, normal: Vec3, patches?: readonly Patch[]) {
  // D-073: on an ocean only dry, anchored ground will do.
  if (!standsDry(world, patches, anchor)) return false
  const maxSlope = kind === 'plant' ? tuning.gardener.plantMaxSlope : tuning.gardener.antennaMaxSlope
  if (slopeAt(normal, anchor) > maxSlope || !isAnchored(world, anchor, normal)) return false
  return existing.every((other) => distance(other.position, anchor) >= clearance(kind, other.kind))
}

// D-063: a robot leaves room between plants; only a plant's own seeds land closer.
export function isSowable(world: Pick<PlanetWorld, 'densityAt'> & Partial<Pick<WaterWorld, 'waterRadius'>>, existing: Structure[], kind: StructureKind,
  anchor: Vec3, normal: Vec3, patches?: readonly Patch[]) {
  return isSuitable(world, existing, kind, anchor, normal, patches) && (kind !== 'plant'
    || existing.every((other) => other.kind !== 'plant' || distance(other.position, anchor) >= rules.sowSpacing))
}

export function plantStage(structure: Structure, tick: number) {
  return Math.min(rules.stages - 1, Math.floor((tick - structure.bornTick) / rules.growTicks))
}

export function addStructure(store: RunStore, kind: StructureKind, position: Vec3, normal: Vec3) {
  store.setState((state) => ({
    structures: [...state.structures.filter((other) => kind !== 'antenna' || other.kind !== 'plant' || distance(other.position, position) >= rules.mixedClearance),
      { id: `${kind}-${state.structureCounter}`, kind, position, normal, bornTick: state.simTick }],
    structureCounter: state.structureCounter + 1,
  }))
}

// Remove every structure whose ground is gone. Called after any terrain edit (the Miner's tunnel, or the player's tools).
export function pruneStructures(world: PlanetWorld, store: RunStore) {
  const { structures } = store.getState()
  const standing = structures.filter(({ position, normal }) => isAnchored(world, position, normal))
  if (standing.length !== structures.length) store.setState({ structures: standing })
  return structures.length - standing.length
}

// AUT-16, D-063: plants grow by age and, once mature, seed a neighbour on a regular rhythm until the cap.
export function stepStructures(world: PlanetWorld, store: RunStore) {
  const { structures, simTick, seed } = store.getState()
  const mature = (rules.stages - 1) * rules.growTicks
  let current = structures
  let plants = current.filter(({ kind }) => kind === 'plant').length
  for (const parent of structures) {
    if (parent.kind !== 'plant' || plants >= rules.maxPlants) continue
    const age = simTick - parent.bornTick
    if (age <= mature || (age - mature) % rules.spreadTicks !== 0) continue
    const random = randomStream(hashSeed(`${seed}:spread:${parent.id}:${age}`))
    for (let attempt = 0; attempt < rules.spreadAttempts; attempt += 1) {
      const raw: Vec3 = [random() * 2 - 1, random() * 2 - 1, random() * 2 - 1]
      const along = dot(raw, parent.normal)
      const tangent = unit([raw[0] - parent.normal[0] * along, raw[1] - parent.normal[1] * along, raw[2] - parent.normal[2] * along])
      const reach = rules.plantSpacing + random() * (rules.spreadRadius - rules.plantSpacing)
      const anchor = groundPoint(world, unit(add(parent.position, scale(tangent, reach))))
      const normal = surfaceNormal(world, anchor)
      if (!isSuitable(world, current, 'plant', anchor, normal)) continue
      current = [...current, { id: `plant-${store.getState().structureCounter + current.length - structures.length}`,
        kind: 'plant', position: anchor, normal, bornTick: simTick }]
      plants += 1
      break
    }
  }
  if (current !== structures) {
    store.setState((state) => ({ structures: current, structureCounter: state.structureCounter + current.length - structures.length }))
  }
}
