// Native species, their characters and their authored native planets.
// This is descriptive content. The numbers behind each character live in config/tuning.ts (residents.temperament),
// and systems/residents.ts (planetSpecies) uses the native planets below to choose each signal planet's species.

export type ResidentKind = 'facet' | 'moss' | 'slab' | 'crystal' | 'sentinel' | 'hermit' | 'cairn' | 'periscope' | 'shard'
export type ResidentRockFamily = 'gray' | 'sand' | 'rose' | 'slate' | 'basalt' | 'umber' | 'sage' | 'moss'
export type ShelterKind = 'sink' | 'cavity' | 'niche' | 'burrow'

export interface ResidentSpecies {
  name: string
  rockFamilies: readonly ResidentRockFamily[]
  /** Character and habits in a sentence, as tuned in residents.temperament. */
  nature: string
}

// The first family is the default. Tall Slabs use palette.resident.strata for their banded bodies.
export const residentSpecies = {
  facet: { name: 'Facet Pebble', rockFamilies: ['gray', 'slate', 'sand'],
    nature: 'Curious and sociable; the baseline every other species is tuned against.' },
  moss: { name: 'Moss Cap', rockFamilies: ['umber', 'sage', 'gray'],
    nature: 'A slow homebody that basks for a long time, shrugs off some noise, rarely strolls and stays out longest among plants.' },
  slab: { name: 'Tall Slab', rockFamilies: ['rose', 'sand', 'slate'],
    nature: 'A stoic elder: hard to frighten and slow to leave, but once hidden it takes a long time to come back out.' },
  crystal: { name: 'Crystal Crown', rockFamilies: ['slate', 'basalt', 'gray'],
    nature: 'Skittish and still; it hides at the faintest noise, peeks only briefly and its crystals glint while it trembles.' },
  sentinel: { name: 'Cyclops Sentinel', rockFamilies: ['basalt', 'gray', 'umber'],
    nature: 'A brave lookout that surfaces often, pans its one eye slowly across the ground and comes back quickly.' },
  hermit: { name: 'Hermit Shell', rockFamilies: ['gray', 'sand', 'slate'],
    nature: 'A shy loner that keeps away from others, favours burrows and rolls a door stone shut when it hides.' },
  cairn: { name: 'Cairn', rockFamilies: ['gray', 'sand', 'slate', 'rose', 'umber'],
    nature: 'Gregarious and wobbly; it lives in crowds, settles next to companions and slumps into a pile when it hides.' },
  periscope: { name: 'Periscope', rockFamilies: ['gray', 'basalt', 'umber'],
    nature: 'Watches from below: its body stays buried and only the eye stalk rises, often and for a while.' },
  shard: { name: 'Shard', rockFamilies: ['sage', 'sand', 'gray'],
    nature: 'Restless and jumpy; it strolls often and fast, darts its gaze about and is quick to leave noise behind.' },
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

// D-047/D-059: one native species per planet. The home planet keeps the Facet Pebble; a signal planet gets the species
// whose native planet here best matches its size, relief and mineral abundance. Names, codes, clustering, shelter and
// terrain tints are authored for later and are not read yet.
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
