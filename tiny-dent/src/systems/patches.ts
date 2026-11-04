import type { createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { surfaceOfMaterial } from '../content/surfaces'
import type { MaterialId } from '../content/materials'
import type { PlanetWorld } from '../world/planet'
import { distance, scale, unit, type Vec3 } from './geometry'
import { groundPoint } from './structures'

type Store = ReturnType<typeof createRunStore>
const rules = tuning.patches

// D-069: a patch is a record on the planet, not terrain. The voxel field and the planet's base material do not change;
// a patch only changes which surface a creature standing on it counts as being on, and how the ground is drawn there.
export interface Patch {
  id: string
  /** A point on the ground when it was laid. */
  centre: Vec3
  radius: number
  material: MaterialId
  /** D-073: a platform, which anchors ground built in open water. */
  anchor?: boolean
}

export { surfaceOfMaterial }

// A point is covered by a patch when the ground straight above or below it is within the patch's radius. That way a
// creature sunk in a burrow under a patch still counts as being on it.
export function covered(patch: Patch, point: Vec3) {
  return distance(scale(unit(point), Math.hypot(...patch.centre)), patch.centre) <= patch.radius
}
/** The newest patch over a point, or undefined. */
export const patchAt = (patches: readonly Patch[], point: Vec3) => [...patches].reverse().find(patch => covered(patch, point))
export const hasPatch = (patches: readonly Patch[], point: Vec3, material: MaterialId) => patches.some(patch => patch.material === material && covered(patch, point))

export function addPatch(store: Store, centre: Vec3, material: MaterialId) {
  const state = store.getState()
  const n = state.patches.reduce((max, patch) => Math.max(max, Number(patch.id.slice(6))), 0) + 1
  const patch: Patch = { id: `patch-${n}`, centre, radius: rules.radius, material }
  store.setState({ patches: [...state.patches, patch] })
  return patch
}

// PAT-04: after an edit near a patch, one whose ground is no longer where it was is gone. Its material is not refunded.
export function prunePatches(world: PlanetWorld, store: Store, center?: Vec3, reach = 0) {
  const { patches } = store.getState()
  if (patches.length === 0) return 0
  const kept = patches.filter(patch => {
    if (center && distance(patch.centre, center) > patch.radius + reach + rules.tolerance) return true
    return Math.abs(Math.hypot(...groundPoint(world, unit(patch.centre))) - Math.hypot(...patch.centre)) <= rules.tolerance
  })
  if (kept.length !== patches.length) store.setState({ patches: kept })
  return patches.length - kept.length
}
