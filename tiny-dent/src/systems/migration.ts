import type { CreatureLife, Resident, RunState, createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { residentSpecies, type ResidentKind } from '../content/residents'
import { materials } from '../content/materials'
import { distance, type Vec3 } from './geometry'
import { disturbanceAt, plantCoverAt } from './residents'
import { withPassport } from './creatures'
import { sendHome } from './logistics'
import { fitOn, homeSurface, wantedMaterial, surfaceUnder } from './habitat'
import { speciesHabitat } from '../content/species'
import { isAquatic, waterFit } from './water'
import { wakeBuilders } from './builder'

type Store = ReturnType<typeof createRunStore>
const rules = tuning.migration

export { homeSurface, wantedMaterial, surfaceUnder } from './habitat'

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

// MIG-04: how well one site suits one creature, 0..1. Material fit weighs most; a hard veto (no valid home) scores 0.
export function siteScore(state: Pick<RunState, 'seed' | 'habitat' | 'patches' | 'structures'>, resident: Resident, others: readonly Resident[]): number {
  if (!resident.home) return 0
  const { weights: w, solitary } = speciesHabitat[resident.species]
  // D-073: a swimmer's fit is the depth of the water over its territory, not a surface.
  const fit = isAquatic(resident.species) ? waterFit(resident.species, state.seed, resident.home) : fitOn(resident.species, surfaceUnder(state, resident.home))
  const stable = resident.homeValid ? 1 : 0
  const quiet = 1 - clamp01(disturbanceAt(state.habitat, resident.home) / tuning.residents.retreatLevel)
  const neighbours = others.filter(other => other.creatureId !== resident.creatureId && other.species === resident.species && other.home
    && distance(other.home, resident.home!) <= rules.companyRadius).length
  const company = solitary ? 1 - clamp01(neighbours / rules.companyFull) : clamp01(neighbours / rules.companyFull)
  const plants = plantCoverAt(state.structures, resident.home)
  return clamp01(w.fit * fit + w.stable * stable + w.quiet * quiet + w.company * company + w.plants * plants + resident.bias)
}

// MIG-05: one decision, with a trial first and a gap between "enter" and "leave" thresholds so a creature does not flip.
export function nextLife(resident: Resident, tick: number): CreatureLife {
  const b = resident.belonging
  if (tick - resident.arrivedTick < rules.trialTicks) return 'exploring'
  const waited = tick - resident.lifeTick >= rules.cooldownTicks
  const verdict = (): CreatureLife => b >= rules.establishAt ? 'established' : b <= rules.homesickAt ? 'homesick' : 'settling'
  switch (resident.life) {
    case 'exploring': return verdict()
    case 'settling': return waited ? verdict() : 'settling'
    case 'established': return !waited || b >= rules.keepAbove ? 'established' : b <= rules.homesickAt ? 'homesick' : 'settling'
    case 'homesick':
      if (b >= rules.recoverAt && waited) return 'settling'
      return tick - resident.lifeTick >= rules.returnAfterTicks ? 'returning' : 'homesick'
    case 'returning': return b >= rules.recoverAt && waited ? 'settling' : 'returning'
    default: return resident.life
  }
}

const unhappy = (life: CreatureLife) => life === 'homesick' || life === 'returning'

// MIG-02/05/06: every `checkEvery` ticks each resident re-reads its home. Natives only keep their comfort up to date;
// visitors also change how settled they are and, when homesick long enough, ask for a seat home.
export function stepMigration(store: Store) {
  const state = store.getState()
  const tick = state.habitat.tick
  if (tick % tuning.residents.checkEvery !== 0 || state.residents.length === 0) return
  const boarding: string[] = []
  const asking: Vec3[] = []
  const residents = state.residents.map(resident => {
    const score = siteScore(state, resident, state.residents)
    let next: Resident = { ...resident, comfort: resident.comfort + (score - resident.comfort) * 0.5 }
    if (resident.origin === state.seed) return next
    const homeless = !resident.home
    if (homeless && tick - resident.arrivedTick < rules.homelessGrace) return { ...next, comfort: resident.comfort }
    next.belonging = clamp01(resident.belonging + rules.rate * (next.comfort - 0.5))
    const life = nextLife(next, tick)
    if (life !== next.life) {
      next = { ...next, life, lifeTick: tick }
      if (life === 'settling' || life === 'established' || life === 'homesick') next = withPassport(next, life, state.seed, tick)
    }
    const foreign = !isAquatic(resident.species) && surfaceUnder(state, resident.home ?? [0, 0, 0]) !== homeSurface(resident.species)
    next.request = unhappy(next.life) && foreign ? wantedMaterial(resident.species) : null
    if (next.request && !resident.request && next.home) asking.push(next.home)
    if (next.life === 'returning') boarding.push(next.creatureId)
    return next
  })
  store.setState({ residents })
  // A Builder that gave up for want of a job has one now.
  for (const home of asking) wakeBuilders(store, home)
  for (const id of boarding) sendHome(store, id)
}

export interface Colony { species: ResidentKind; members: string[]; centre: Vec3 }

// MIG-07: neighbours of one species with homes within `colonyRadius` of each other, linked through chains. Derived, never stored.
export function coloniesOf(residents: readonly Resident[]): Colony[] {
  const homed = residents.filter(resident => resident.home)
  const seen = new Set<string>()
  const out: Colony[] = []
  for (const start of homed) {
    if (seen.has(start.creatureId)) continue
    const group = [start]
    seen.add(start.creatureId)
    for (let i = 0; i < group.length; i += 1) {
      for (const other of homed) {
        if (seen.has(other.creatureId) || other.species !== start.species || distance(other.home!, group[i].home!) > rules.colonyRadius) continue
        seen.add(other.creatureId)
        group.push(other)
      }
    }
    if (group.length < rules.colonyMin) continue
    const sum = group.reduce((a, r) => [a[0] + r.home![0], a[1] + r.home![1], a[2] + r.home![2]], [0, 0, 0])
    out.push({ species: start.species, members: group.map(r => r.creatureId).sort(), centre: [sum[0] / group.length, sum[1] / group.length, sum[2] / group.length] })
  }
  return out.sort((a, b) => a.members[0] < b.members[0] ? -1 : 1)
}

const lifeWords: Record<CreatureLife, string> = {
  native: 'At home', traveling: 'On a train', exploring: 'Looking around', settling: 'Settling in',
  established: 'Settled', homesick: 'Homesick', returning: 'Wants to go home',
}

// MIG-08: why the creature is where it is, in words. Shared by the surface card and the train panel.
export function creatureLines(resident: Resident, nameOf: (seed: string) => string): string[] {
  const lines = [resident.life === 'native' ? lifeWords.native : `${lifeWords[resident.life]} · from ${nameOf(resident.origin)}`,
    `Comfort ${Math.round(resident.comfort * 100)}% · belonging ${Math.round(resident.belonging * 100)}%`]
  if (resident.life !== 'native') lines.push(`Likes: ${speciesHabitat[resident.species].likes}`)
  if (resident.request) lines.push(`It would feel better with ${materials[resident.request].name.toLowerCase()} underfoot.`)
  const trips = resident.passport.filter(entry => entry.kind === 'arrived' || entry.kind === 'returned')
  if (trips.length) lines.push(`Travelled: ${trips.map(entry => `${entry.kind === 'returned' ? 'back to' : 'to'} ${nameOf(entry.planet)}`).join(', ')}`)
  return lines
}
export const speciesName = (species: ResidentKind) => residentSpecies[species].name
