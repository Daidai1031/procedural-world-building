import type { ResidentKind } from './residents'
import type { SurfaceKind } from './surfaces'

// D-071: how each species judges a place, as data. Migration (systems/migration.ts) reads only this table, so a new species
// or a new kind of ground is a new row, not new code. The role names are the brief's (Plastic, Metal, Fur, Jelly, Ice, Rock).

/** The comfort weights of one species. They sum to 1; a term it does not care about is 0. */
export interface ComfortWeights { fit: number; stable: number; quiet: number; company: number; plants: number }

export interface SpeciesHabitat {
  /** The surface it is native to: full fit, and the material it asks for when unhappy elsewhere. */
  home: SurfaceKind
  /** Fit (0..1) on other surfaces. A surface not listed counts as `migration.foreignFit`. */
  kin?: Partial<Record<SurfaceKind, number>>
  weights: ComfortWeights
  /** True: the company term rewards being alone instead of having neighbours of its species. */
  solitary?: boolean
  /** One line for the creature's card. */
  likes: string
  /** D-073: an aquatic species lives in water, not on a surface. `minDepth` is a hard need; `best` is the depth it likes. */
  aquatic?: { minDepth: number; best: readonly [number, number] }
}

const w = (fit: number, stable: number, quiet: number, company: number, plants = 0): ComfortWeights => ({ fit, stable, quiet, company, plants })

// Weights start from fit 0.7, stable 0.1, quiet 0.1, company 0.1 (the shared default) and move toward the species' character.
export const speciesHabitat: Record<ResidentKind, SpeciesHabitat> = {
  facet: { home: 'rock', kin: { metal: 0.45, fur: 0.4, plastic: 0.35, ice: 0.35, jelly: 0.3 }, weights: w(0.7, 0.1, 0.1, 0.1),
    likes: 'Plain rock, though it can make do with almost anything.' },
  moss: { home: 'fur', kin: { rock: 0.5, jelly: 0.35 }, weights: w(0.55, 0.1, 0.1, 0.1, 0.15),
    likes: 'Fur or soil, plants close by, and quiet.' },
  slab: { home: 'rock', kin: { metal: 0.5, ice: 0.4 }, weights: w(0.6, 0.2, 0.1, 0.1),
    likes: 'Stable rock. Hard to frighten and slow to settle.' },
  crystal: { home: 'ice', kin: { rock: 0.3, metal: 0.25 }, weights: w(0.6, 0.1, 0.25, 0.05),
    likes: 'Cold, stable ice and almost no noise.' },
  sentinel: { home: 'metal', kin: { rock: 0.4, ice: 0.3 }, weights: w(0.75, 0.1, 0.05, 0.1),
    likes: 'Metal ground. Machine noise does not bother it.' },
  hermit: { home: 'rock', weights: w(0.6, 0.1, 0.1, 0.2), solitary: true,
    likes: 'Rock, and nobody else of its kind nearby.' },
  cairn: { home: 'plastic', kin: { rock: 0.3 }, weights: w(0.7, 0.1, 0.1, 0.1),
    likes: 'Smooth, warm plastic, with company.' },
  periscope: { home: 'jelly', kin: { rock: 0.35, plastic: 0.3 }, weights: w(0.65, 0.1, 0.15, 0.1),
    likes: 'Soft, springy ground that it can bury itself in.' },
  // `home` is not used for a swimmer: its fit comes from the depth of the water, see systems/migration.ts.
  glassfin: { home: 'rock', weights: w(0.7, 0.1, 0.1, 0.1), aquatic: { minDepth: 0.35, best: [0.5, 1.4] },
    likes: 'Open water at least a third of a unit deep, best at about one, and a quiet sea.' },
  shard: { home: 'rock', kin: { metal: 0.5, ice: 0.45 }, weights: w(0.65, 0.15, 0.1, 0.1),
    likes: 'Hard ground that rings underfoot, rock, metal or ice.' },
}
