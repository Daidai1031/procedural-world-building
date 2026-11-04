import type { RunState } from '../state/runState'
import type { ResidentKind } from '../content/residents'
import { surfaces, type SurfaceKind } from '../content/surfaces'
import { speciesHabitat } from '../content/species'
import { tuning } from '../config/tuning'
import type { MaterialId } from '../content/materials'
import { planetConfig } from '../world/planet'
import type { Vec3 } from './geometry'
import { patchAt, surfaceOfMaterial } from './patches'

// D-068/D-069: what a creature counts as home. Kept apart from residents.ts and migration.ts because both need it.

// D-071: a species' home surface and how well it does elsewhere come from the species table (content/species.ts).
export const homeSurface = (species: ResidentKind): SurfaceKind => speciesHabitat[species].home

/** 0..1: how well a species does on a surface. 1 on its home surface, its `kin` value elsewhere, else `foreignFit`. */
export function fitOn(species: ResidentKind, surface: SurfaceKind) {
  const habitat = speciesHabitat[species]
  return surface === habitat.home ? 1 : habitat.kin?.[surface] ?? tuning.migration.foreignFit
}

/** The material whose presence would make a species feel at home. */
export const wantedMaterial = (species: ResidentKind): MaterialId => surfaces[homeSurface(species)].material

// What lies under a point: the newest patch of shipped material over it (D-069), else the planet's own surface.
export function surfaceUnder(state: Pick<RunState, 'seed' | 'patches'>, point: Vec3): SurfaceKind {
  const patch = patchAt(state.patches, point)
  return patch ? surfaceOfMaterial(patch.material) : planetConfig(state.seed).surface
}

export const suits = (state: Pick<RunState, 'seed' | 'patches'>, species: ResidentKind, point: Vec3) => surfaceUnder(state, point) === homeSurface(species)
