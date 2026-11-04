import assert from 'node:assert/strict'
import test from 'node:test'
import { residentSpecies, type ResidentKind } from '../src/content/residents'
import { speciesHabitat, type SpeciesHabitat } from '../src/content/species'
import { surfaceKinds, surfaces, type SurfaceKind } from '../src/content/surfaces'
import { createRunStore, type Resident, type RunState } from '../src/state/runState'
import { recordDisturbance } from '../src/systems/residents'
import { creatureLines, siteScore, wantedMaterial } from '../src/systems/migration'
import { fitOn, homeSurface } from '../src/systems/habitat'
import { addPatch } from '../src/systems/patches'
import { planetConfig } from '../src/world/planet'

const kinds = Object.keys(residentSpecies) as ResidentKind[]
// D-073: a swimmer is judged by the water, not a surface; tests/water.test.ts covers it.
const landKinds = kinds.filter(kind => !speciesHabitat[kind].aquatic)
function seedOf(kind: SurfaceKind) {
  if (kind === 'rock') return '1380'
  for (let parent = 0; parent < 500; parent += 1) for (let index = 1; index <= 5; index += 1) {
    const seed = `s${parent}/signal-${index}`
    if (planetConfig(seed).surface === kind && planetConfig(seed).water === 0) return seed
  }
  throw new Error(`no ${kind}`)
}
const states = Object.fromEntries(surfaceKinds.map(kind => [kind, createRunStore(seedOf(kind))])) as Record<SurfaceKind, ReturnType<typeof createRunStore>>
const sample = states.rock.getState().residents[0]
const at = (species: ResidentKind, extra: Partial<Resident> = {}): Resident => ({ ...sample, creatureId: `t-${species}`, species, origin: 'elsewhere', bias: 0, home: [1, 0, 0], homeValid: true, ...extra })

test('ECO-01: every species has a row of data, with weights that sum to one and fits within 0..1', () => {
  assert.deepEqual(Object.keys(speciesHabitat).sort(), [...kinds].sort())
  for (const kind of kinds) {
    const row = speciesHabitat[kind]
    const sum = Object.values(row.weights).reduce((a, b) => a + b, 0)
    assert.ok(Math.abs(sum - 1) < 1e-9, `${kind}: weights sum to ${sum}`)
    assert.ok(Object.values(row.weights).every(v => v >= 0 && v <= 1))
    assert.ok(Object.values(row.kin ?? {}).every(v => v >= 0 && v < 1), `${kind}: kin below the home's full fit`)
    assert.ok(!(row.home in (row.kin ?? {})), `${kind}: home is not listed as kin`)
    assert.ok(row.likes.length > 10)
    assert.equal(fitOn(kind, row.home), 1)
  }
})

test('ECO-01: the table agrees with the surfaces that favour each species, and every surface has a native species', () => {
  for (const kind of kinds) {
    let best: SurfaceKind = 'rock', weight = 0
    for (const surface of surfaceKinds) {
      const natives: Partial<Record<ResidentKind, number>> = surfaces[surface].natives
      if ((natives[kind] ?? 0) > weight) { best = surface; weight = natives[kind]! }
    }
    assert.equal(homeSurface(kind), best, `${kind}: D-060 affinity and the table agree`)
  }
  for (const surface of surfaceKinds) assert.ok(landKinds.some(kind => homeSurface(kind) === surface), `${surface} has a native species`)
  assert.deepEqual(kinds.filter(k => homeSurface(k) === 'fur'), ['moss'])
  assert.deepEqual(kinds.filter(k => homeSurface(k) === 'jelly'), ['periscope'])
  assert.deepEqual(kinds.filter(k => homeSurface(k) === 'ice'), ['crystal'])
})

test('ECO-01: each species scores its own ground far above bare foreign ground, and asks for its own material there', () => {
  for (const kind of landKinds) {
    const own = siteScore(states[homeSurface(kind)].getState(), at(kind), [])
    assert.ok(own > 0.7, `${kind} at home ${own}`)
    for (const surface of surfaceKinds) {
      if (surface === homeSurface(kind)) continue
      const there = siteScore(states[surface].getState(), at(kind), [])
      assert.ok(own - there > 0.2, `${kind} on ${surface}: ${there} against ${own}`)
    }
  }
  assert.equal(wantedMaterial('moss'), 'fiber')
  assert.equal(wantedMaterial('periscope'), 'gel')
  assert.equal(wantedMaterial('crystal'), 'ice')
  assert.equal(wantedMaterial('facet'), 'soil')
  assert.equal(wantedMaterial('cairn'), 'plastic')
  assert.equal(wantedMaterial('sentinel'), 'scrap')
})

test('ECO-01: a patch of a species\' material lifts it on foreign ground, for every material', () => {
  for (const kind of landKinds) {
    const foreign = surfaceKinds.find(s => s !== homeSurface(kind))!
    const store = createRunStore(seedOf(foreign))
    const bare = siteScore(store.getState(), at(kind), [])
    addPatch(store, [1, 0, 0], wantedMaterial(kind))
    const patched = siteScore(store.getState(), at(kind), [])
    assert.ok(patched > bare + 0.2, `${kind}: ${bare} -> ${patched}`)
  }
})

test('ECO-01: species differ in what they care about, all from the table', () => {
  const score = (kind: ResidentKind, state: RunState, others: Resident[] = [], extra: Partial<Resident> = {}) => siteScore(state, at(kind, extra), others)
  // Moss Cap likes plants near its home; a Facet Pebble does not mind.
  const rock = states.rock.getState()
  const planted: RunState = { ...rock, structures: Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, kind: 'plant' as const, position: [1, 0.05 * i, 0] as [number, number, number], normal: [1, 0, 0] as [number, number, number], bornTick: 0 })) }
  assert.ok(score('moss', planted) - score('moss', rock) > 0.1)
  assert.equal(score('facet', planted), score('facet', rock))
  // Noise: a Crystal Crown loses more of its comfort than a Sentinel.
  const noisy = createRunStore('1380')
  recordDisturbance(noisy, [1, 0, 0], 'manual', false)
  const loud = noisy.getState()
  const ice = states.ice.getState(), metal = states.metal.getState()
  const crystalLoss = score('crystal', ice) - score('crystal', { ...ice, habitat: loud.habitat })
  const sentinelLoss = score('sentinel', metal) - score('sentinel', { ...metal, habitat: loud.habitat })
  assert.ok(crystalLoss > sentinelLoss * 3, `${crystalLoss} against ${sentinelLoss}`)
  // Company: a Hermit Shell wants to be alone, a Cairn wants neighbours.
  const friend = at('hermit', { creatureId: 'friend', home: [1.1, 0, 0] })
  assert.ok(score('hermit', rock, [friend]) < score('hermit', rock))
  assert.ok(score('cairn', states.plastic.getState(), [at('cairn', { creatureId: 'c2', home: [1.1, 0, 0] })]) > score('cairn', states.plastic.getState()))
})

test('ECO-02/T1: a new species is a new row; the migration code is untouched', () => {
  const table = speciesHabitat as Record<string, SpeciesHabitat>
  table.testmoss = { home: 'jelly', kin: { fur: 0.9 }, weights: { fit: 0.8, stable: 0.2, quiet: 0, company: 0, plants: 0 }, likes: 'A species that exists only in this test.' }
  try {
    const kind = 'testmoss' as ResidentKind
    assert.equal(homeSurface(kind), 'jelly')
    assert.equal(wantedMaterial(kind), 'gel')
    assert.equal(fitOn(kind, 'fur'), 0.9)
    assert.equal(fitOn(kind, 'ice'), 0.2)
    const onJelly = siteScore(states.jelly.getState(), at(kind), []), onFur = siteScore(states.fur.getState(), at(kind), [])
    assert.ok(Math.abs(onJelly - 1) < 1e-9)
    assert.ok(Math.abs(onFur - (0.8 * 0.9 + 0.2)) < 1e-9)
    assert.match(creatureLines(at(kind, { life: 'exploring' }), id => id).join(' '), /Likes: A species that exists only in this test/)
  } finally { delete table.testmoss }
})
