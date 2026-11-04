import type { Resident, RunState, createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { speciesHabitat } from '../content/species'
import type { ResidentKind } from '../content/residents'
import type { MaterialId } from '../content/materials'
import { hashSeed, planetConfig, type PlanetWorld } from '../world/planet'
import { HALF, add, distance, scale, surfaceRadius, unit, type Vec3 } from './geometry'
import { covered, type Patch } from './patches'
import { disturbanceAt, temperamentOf } from './residents'
import { withdraw } from './inventory'
import { pruneStructures } from './structures'
import { notifyGroundChanged } from './workSites'

type Store = ReturnType<typeof createRunStore>
// What the water code needs of a world: the density and, for an ocean, the radius of its water.
export type WaterWorld = { densityAt: PlanetWorld['densityAt']; waterRadius?: number }
const rules = tuning.water

// D-073: the water is the volume inside `waterRadius` that is not solid. Nothing here is painted; every answer reads the terrain.
export const waterRadiusOf = (seed: string) => planetConfig(seed).water
export const isWater = (world: WaterWorld, p: Vec3) =>
  (world.waterRadius ?? 0) > 0 && Math.hypot(...p) <= world.waterRadius! && world.densityAt(p[0], p[1] + HALF, p[2]) >= 0
/** Metres of water over a point: the distance below the surface, or 0 out of water. */
export const depthAt = (world: WaterWorld, p: Vec3) => isWater(world, p) ? world.waterRadius! - Math.hypot(...p) : 0
/** The seabed (outermost solid) and the depth of the water over it, along one direction. */
export function columnAt(world: WaterWorld, direction: Vec3) {
  const seabed = surfaceRadius(world.densityAt, unit(direction))
  return { seabed, depth: Math.max(0, (world.waterRadius ?? 0) - seabed) }
}

export const isAquatic = (species: ResidentKind) => !!speciesHabitat[species].aquatic

// ─── swimmers ───

// A seeded point in the water at the depth the species likes, or null if that column is too shallow.
export function territoryAt(world: WaterWorld, species: ResidentKind, key: string): Vec3 | null {
  const need = speciesHabitat[species].aquatic!
  const h = hashSeed(key)
  const y = ((h % 2001) / 1000) - 1
  const angle = ((h >>> 11) % 6283) / 1000
  const ring = Math.sqrt(1 - y * y)
  const direction: Vec3 = [Math.cos(angle) * ring, y, Math.sin(angle) * ring]
  const { seabed, depth } = columnAt(world, direction)
  if (depth < need.minDepth) return null
  const liked = need.best[0] + ((h >>> 5) % 100) / 100 * (need.best[1] - need.best[0])
  const down = Math.min(liked, depth - rules.surfaceGap)
  return scale(direction, Math.max(seabed + rules.seabedGap, world.waterRadius! - down))
}

/** A swimmer's first territory point, the first of a seeded sequence that is deep enough. */
export function firstTerritory(world: WaterWorld, species: ResidentKind, creatureId: string, avoid: readonly Vec3[] = []): Vec3 | null {
  for (let i = 0; i < 40; i += 1) {
    const point = territoryAt(world, species, `${creatureId}:territory:${i}`)
    if (point && avoid.every(other => distance(other, point) >= tuning.residents.minHomeSpacing)) return point
  }
  return null
}

// MIG-style hard need: the water over a territory must be deep enough.
export const deepEnough = (world: WaterWorld, species: ResidentKind, p: Vec3) => depthAt(world, p) >= speciesHabitat[species].aquatic!.minDepth

// WAT-05/06/07: one tick of a swimmer. It drifts around its territory point in a slow seeded loop that moves in depth as well,
// never leaves the water, never enters the seabed or the surface band, dives under noise and takes a new territory when the
// noise lasts or the water over its territory has become too shallow. All the numbers of fright come from its temperament.
export function stepSwimmer(world: WaterWorld, state: RunState, resident: Resident): Resident {
  const r: Resident = { ...resident, path: [] }
  const tick = state.habitat.tick
  const nature = temperamentOf(r.species)
  const level = disturbanceAt(state.habitat, r.position)
  const rest = tuning.residents
  r.disturbedTicks = level > nature.retreatLevel ? r.disturbedTicks + 1 : Math.max(0, r.disturbedTicks - 2)
  r.quietTicks = level < rest.quietLevel ? r.quietTicks + 1 : 0
  if (level > nature.retreatLevel) r.state = 'hiding'
  else if (r.state === 'hiding' && r.quietTicks >= nature.quietTicks) r.state = 'peeking'

  const due = tick >= r.nextCheck
  if (due) {
    r.nextCheck = tick + rest.checkEvery
    r.homeValid = !!r.home && deepEnough(world, r.species, r.home)
  }
  const flee = r.disturbedTicks >= nature.fleeTicks && tick - r.lastMoveTick >= rest.cooldownTicks
  if (!r.home || !r.homeValid || flee) {
    // A new territory, away from the noise and from other swimmers; keep the old one if none is deep enough.
    const others = state.residents.filter(o => o.creatureId !== r.creatureId && o.home).map(o => o.home!)
    for (let i = 0; i < 24; i += 1) {
      const point = territoryAt(world, r.species, `${r.creatureId}:move:${tick}:${i}`)
      if (!point || !others.every(o => distance(o, point) >= rest.minHomeSpacing) || disturbanceAt(state.habitat, point) >= rest.quietLevel) continue
      if (r.home && distance(point, r.home) < rest.minHomeSpacing) continue
      r.home = point; r.homeValid = true; r.lastMoveTick = tick; r.disturbedTicks = 0
      break
    }
  }
  if (!r.home) return { ...r, state: 'searching', homeValid: false }
  // Drift around the territory, and go down to the seabed while frightened.
  const phase = (hashSeed(r.creatureId) % 628) / 100
  const up = unit(r.home)
  const side = unit([-up[2], 0, up[0]] as Vec3)
  const high = unit([up[1] * side[2] - up[2] * side[1], up[2] * side[0] - up[0] * side[2], up[0] * side[1] - up[1] * side[0]] as Vec3)
  const t = tick * 0.012 + phase
  let target = add(r.home, add(scale(side, Math.cos(t) * rules.drift), scale(high, Math.sin(t * 0.8) * rules.drift)))
  target = add(target, scale(up, Math.sin(t * 0.6) * rules.drift * 0.5))
  const here = unit(r.position)
  const { seabed } = columnAt(world, here)
  const floor = seabed + rules.seabedGap
  const ceiling = world.waterRadius! - rules.surfaceGap
  if (r.state === 'hiding') target = scale(unit(target), floor)
  const gap = distance(r.position, target)
  const speed = rules.swimSpeed * nature.speed
  let next = gap <= speed ? target : add(r.position, scale(add(target, scale(r.position, -1)), speed / gap))
  // Stay inside the water: above the seabed under the new position, under the surface band.
  const column = columnAt(world, unit(next))
  const radius = Math.min(ceiling, Math.max(column.seabed + rules.seabedGap, Math.hypot(...next)))
  next = scale(unit(next), radius)
  if (!isWater(world, next)) next = scale(here, Math.min(ceiling, Math.max(floor, Math.hypot(...r.position))))
  return { ...r, position: next, peek: null, burrowId: null }
}

// ─── mounds and platforms ───

/** Ground built up on a water planet, until a platform anchors it or the water takes it back. */
export interface Mound { id: string; centre: Vec3; radius: number; born: number }

export const anchoredAt = (patches: readonly Patch[], p: Vec3) => patches.some(patch => patch.anchor && covered(patch, p))

// WAT-12: a plant or an antenna on an ocean stands only on dry ground inside an anchored platform. Dry planets have no rule.
export function standsDry(world: WaterWorld, patches: readonly Patch[] | undefined, anchor: Vec3) {
  if (!(world.waterRadius && world.waterRadius > 0)) return true
  return Math.hypot(...anchor) > world.waterRadius + rules.dry && !!patches && anchoredAt(patches, anchor)
}

// WAT-10: every addition to the seabed is written down, merged into a mound already there if it overlaps one.
export function recordMound(store: Store, centre: Vec3, radius: number) {
  const state = store.getState()
  if (waterRadiusOf(state.seed) <= 0) return
  const tick = state.habitat.tick
  const near = state.mounds.findIndex(m => distance(m.centre, centre) <= m.radius)
  if (near >= 0) {
    store.setState({ mounds: state.mounds.map((m, i) => i === near ? { ...m, radius: Math.max(m.radius, distance(m.centre, centre) + radius) } : m) })
    return
  }
  const n = state.mounds.reduce((max, m) => Math.max(max, Number(m.id.slice(6))), 0) + 1
  store.setState({ mounds: [...state.mounds, { id: `mound-${n}`, centre, radius, born: tick }] })
}

// WAT-10: an unanchored mound older than `erodeAfter` is returned to the original seabed, sample by sample, creating and
// refunding nothing. Returns the mounds that went, so a caller can tell the rest of the planet.
export function erodeMounds(world: PlanetWorld, store: Store) {
  const state = store.getState()
  const tick = state.habitat.tick
  if (state.mounds.length === 0 || tick % rules.erodeEvery !== 0) return []
  const gone = state.mounds.filter(m => tick - m.born >= rules.erodeAfter && !anchoredAt(state.patches, m.centre))
  for (const m of gone) world.washAway({ x: m.centre[0], y: m.centre[1] + HALF, z: m.centre[2] }, m.radius + 0.1)
  if (gone.length) store.setState({ mounds: state.mounds.filter(m => !gone.includes(m)), planetRemaining: world.planetRemaining })
  return gone
}

// WAT-11: the first unanchored mound in the Builder's area and whether the stock can pay for its platform: 30 of a structural
// material (plastic chips or scrap metal) and 12 of soil.
export const structuralMaterials: readonly MaterialId[] = ['plastic', 'scrap']
export function platformDemand(store: Store, area: { center: Vec3; radius: number }) {
  const state = store.getState()
  if (state.patches.length >= tuning.patches.max) return null
  const mound = [...state.mounds].sort((a, b) => a.id < b.id ? -1 : 1).find(m => distance(m.centre, area.center) <= area.radius + m.radius && !anchoredAt(state.patches, m.centre))
  if (!mound) return null
  const material = structuralMaterials.find(id => state.inventory[id] >= rules.platformCost)
  return { mound, material: material ?? structuralMaterials[0], enough: !!material && state.inventory.soil >= rules.platformSoil }
}

// Both materials are taken together, once, after the mound is looked at again. A platform that cannot be paid for costs nothing.
export function buildPlatform(world: WaterWorld, store: Store, id: string, material: MaterialId) {
  const state = store.getState()
  const mound = state.mounds.find(m => m.id === id)
  if (!mound || anchoredAt(state.patches, mound.centre) || state.patches.length >= tuning.patches.max) return false
  if (Math.abs(surfaceRadius(world.densityAt, unit(mound.centre)) - Math.hypot(...mound.centre)) > tuning.patches.tolerance + mound.radius) return false
  if (state.inventory[material] < rules.platformCost || state.inventory.soil < rules.platformSoil) return false
  withdraw(store, material, rules.platformCost)
  withdraw(store, 'soil', rules.platformSoil)
  const n = store.getState().patches.reduce((max, p) => Math.max(max, Number(p.id.slice(6))), 0) + 1
  store.setState(s => ({ patches: [...s.patches, { id: `patch-${n}`, centre: mound.centre, radius: Math.max(tuning.patches.radius, mound.radius + 0.1), material, anchor: true }] }))
  return true
}

// WAT-08: who may be shipped where. A swimmer needs a Water planet; a land creature needs an anchored platform on one.
export function whyNotThere(species: ResidentKind, to: Pick<RunState, 'seed' | 'patches'>): string | null {
  const ocean = waterRadiusOf(to.seed) > 0
  if (isAquatic(species)) return ocean ? null : 'A swimmer needs water. That planet is dry.'
  if (ocean && !to.patches.some(p => p.anchor)) return 'That planet is all water. Land creatures need an anchored platform there first.'
  return null
}

/** 0..1: how well the water over a point suits a swimmer. Shallower than it likes is worse, a veto below its minimum. */
export function waterFit(species: ResidentKind, seed: string, p: Vec3) {
  const need = speciesHabitat[species].aquatic
  if (!need) return 0
  const depth = waterRadiusOf(seed) - Math.hypot(...p)
  if (depth < need.minDepth) return 0
  if (depth < need.best[0]) return 0.6 + 0.4 * (depth - need.minDepth) / (need.best[0] - need.minDepth)
  return depth <= need.best[1] ? 1 : 0.85
}

// One tick of the sea: unanchored mounds that have waited long enough are washed away, and what stood on them goes with them.
export function stepWater(world: PlanetWorld, store: Store) {
  if (!(world.waterRadius > 0)) return
  for (const mound of erodeMounds(world, store)) {
    pruneStructures(world, store)
    notifyGroundChanged(store, mound.centre, mound.radius + 0.1, world)
  }
}
