// Native species and authored planet assignments.
// This is descriptive content, separate from the live habitat simulation in systems/residents.ts.

export type ResidentKind = 'facet' | 'moss' | 'slab' | 'crystal' | 'sentinel' | 'hermit' | 'cairn' | 'periscope' | 'shard'
export type ResidentRockFamily = 'gray' | 'sand' | 'rose' | 'slate' | 'basalt' | 'umber' | 'sage' | 'moss'
export type ShelterKind = 'sink' | 'cavity' | 'niche' | 'burrow'

export interface ResidentSpecies {
  name: string
  rockFamilies: readonly ResidentRockFamily[]
}

// The first family is the default. Tall Slabs use palette.resident.strata for their banded bodies.
export const residentSpecies = {
  facet: { name: 'Facet Pebble', rockFamilies: ['gray', 'slate', 'sand'] },
  moss: { name: 'Moss Cap', rockFamilies: ['umber', 'sage', 'gray'] },
  slab: { name: 'Tall Slab', rockFamilies: ['rose', 'sand', 'slate'] },
  crystal: { name: 'Crystal Crown', rockFamilies: ['slate', 'basalt', 'gray'] },
  sentinel: { name: 'Cyclops Sentinel', rockFamilies: ['basalt', 'gray', 'umber'] },
  hermit: { name: 'Hermit Shell', rockFamilies: ['gray', 'sand', 'slate'] },
  cairn: { name: 'Cairn', rockFamilies: ['gray', 'sand', 'slate', 'rose', 'umber'] },
  periscope: { name: 'Periscope', rockFamilies: ['gray', 'basalt', 'umber'] },
  shard: { name: 'Shard', rockFamilies: ['sage', 'sand', 'gray'] },
} as const satisfies Record<ResidentKind, ResidentSpecies>

export interface PlanetNative {
  id: string
  name: string
  code: string
  resident: ResidentKind
  size: 1 | 2 | 3
  relief: 1 | 2 | 3
  mineralAbundance: 1 | 2 | 3
  clustering: 1 | 2 | 3
  shelter: ShelterKind
  /** S1 is the first playable slice; later entries are authored data only. */
  stage: 'S1' | 'later'
  /** Restrained terrain colors; resident bodies carry the stronger hues. */
  terrainTint: { low: string; high: string; steep: string }
}

// D-047 proposal: one native species per authored planet. The current procedural seed registry does not consume this yet.
export const planetNatives: readonly PlanetNative[] = [
  { id: 'ares-9', name: 'Grey Plain', code: 'Ares-9', resident: 'facet', size: 2, relief: 2, mineralAbundance: 2, clustering: 2, shelter: 'sink', stage: 'S1',
    terrainTint: { low: '#6b6964', high: '#bdbab3', steep: '#4a4946' } },
  { id: 'tide-moss', name: 'Tidal Moss', code: 'TBD', resident: 'moss', size: 2, relief: 1, mineralAbundance: 3, clustering: 2, shelter: 'sink', stage: 'later',
    terrainTint: { low: '#6e6e65', high: '#b4b4a9', steep: '#51534b' } },
  { id: 'strata', name: 'Slab Strata', code: 'TBD', resident: 'slab', size: 3, relief: 3, mineralAbundance: 2, clustering: 1, shelter: 'sink', stage: 'later',
    terrainTint: { low: '#78706a', high: '#beb6ae', steep: '#5c5550' } },
  { id: 'crystal-yard', name: 'Crystal Ore', code: 'TBD', resident: 'crystal', size: 1, relief: 2, mineralAbundance: 3, clustering: 3, shelter: 'sink', stage: 'later',
    terrainTint: { low: '#6c6b68', high: '#b2b1ac', steep: '#4f504f' } },
  { id: 'quiet-sky', name: 'Still Void', code: 'TBD', resident: 'sentinel', size: 1, relief: 1, mineralAbundance: 1, clustering: 1, shelter: 'sink', stage: 'later',
    terrainTint: { low: '#696762', high: '#afaca6', steep: '#4c4b48' } },
  { id: 'hollow', name: 'Hollow', code: 'TBD', resident: 'hermit', size: 3, relief: 2, mineralAbundance: 1, clustering: 1, shelter: 'sink', stage: 'later',
    terrainTint: { low: '#7a766d', high: '#c0bbb1', steep: '#5e5a53' } },
  { id: 'rubble', name: 'Scree Belt', code: 'TBD', resident: 'cairn', size: 1, relief: 2, mineralAbundance: 2, clustering: 3, shelter: 'sink', stage: 'later',
    terrainTint: { low: '#716e68', high: '#b7b3ac', steep: '#54524e' } },
  { id: 'dust-basin', name: 'Dust Basin', code: 'TBD', resident: 'periscope', size: 3, relief: 1, mineralAbundance: 3, clustering: 1, shelter: 'sink', stage: 'later',
    terrainTint: { low: '#757067', high: '#bcb6ab', steep: '#59554d' } },
  { id: 'spire', name: 'Spire', code: 'TBD', resident: 'shard', size: 2, relief: 3, mineralAbundance: 2, clustering: 3, shelter: 'sink', stage: 'later',
    terrainTint: { low: '#73726c', high: '#b9b8b0', steep: '#565752' } },
]
