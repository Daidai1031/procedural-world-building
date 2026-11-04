import assert from 'node:assert/strict'
import test from 'node:test'
import { tuning } from '../src/config/tuning'
import type { SurfaceKind } from '../src/content/surfaces'
import { createRunStore, type Resident } from '../src/state/runState'
import { registryFor } from '../src/state/planets'
import { buildRoute, buildSpaceport, cancelShipment, creatureIds, logisticsOf, planetState, routeQuote, ship, stepLogistics } from '../src/systems/logistics'
import { coloniesOf, homeSurface, nextLife, siteScore, wantedMaterial } from '../src/systems/migration'
import { planetSpecies } from '../src/systems/residents'
import { stepSimulation } from '../src/systems/simulation'
import { travelTo } from '../src/systems/signal'
import { describePlanet, systemPlanets } from '../src/systems/system'
import { planetConfig } from '../src/world/planet'

type Store = ReturnType<typeof createRunStore>

function seedOf(kind: SurfaceKind, accept: (seed: string) => boolean = () => true, skip = '') {
  for (let parent = 0; parent < 800; parent += 1) {
    for (let index = 1; index <= 5; index += 1) {
      const seed = `m${parent}/signal-${index}`
      if (seed !== skip && planetConfig(seed).surface === kind && planetConfig(seed).water === 0 && accept(seed)) return seed
    }
  }
  throw new Error(`no ${kind} planet`)
}
// Two plastic planets with Cairns, one metal planet with Sentinels.
const P1 = seedOf('plastic', s => planetSpecies(s) === 'cairn')
const P2 = seedOf('plastic', s => planetSpecies(s) === 'cairn', P1)
const M = seedOf('metal', s => planetSpecies(s) === 'sentinel')

// Every planet has a spaceport and each is joined to the next one; the player ends on P1.
function network(): Store {
  const store = createRunStore(P1)
  store.setState(s => ({ metrics: { ...s.metrics, capital: 100000 } }))
  buildSpaceport(store)
  for (const seed of [P2, M]) {
    travelTo(store, seed)
    buildSpaceport(store)
    assert.ok(buildRoute(store, P1).ok, `route ${seed}`)
  }
  travelTo(store, P1)
  return store
}
const run = (store: Store, ticks: number) => {
  const world = registryFor(store).world(store.getState().seed)
  for (let i = 0; i < ticks; i += 1) stepSimulation(world, store)
}
const first = (store: Store) => [...store.getState().residents].sort((a, b) => a.creatureId < b.creatureId ? -1 : 1)[0]
const cairnOf = (store: Store, seed: string) => planetState(store, seed)!.residents.filter(r => r.species === 'cairn' && r.origin === P1)

test('MIG-01/02/03: creature ids are unique everywhere and a creature in a train is on no planet', () => {
  const store = network()
  const ids = () => creatureIds(store)
  const before = ids()
  assert.equal(new Set(before).size, before.length)
  assert.ok(before.length > 10)
  const traveller = first(store)
  assert.equal(traveller.creatureId, `${P1}#${traveller.id}`)
  assert.equal(traveller.origin, P1)
  const sent = ship(store, M, [], [traveller.creatureId])
  assert.ok(sent.ok)
  assert.ok(!store.getState().residents.some(r => r.creatureId === traveller.creatureId), 'gone from the planet')
  assert.equal(sent.value.passengers[0].life, 'traveling')
  assert.deepEqual(ids().sort(), before.slice().sort(), 'still exactly once, now in the train')
  assert.equal(ship(store, M, [], [traveller.creatureId]).ok, false, 'cannot board twice')
  for (let i = 0; i < routeQuote(P1, M).travelTicks; i += 1) stepLogistics(store)
  const there = planetState(store, M)!.residents.filter(r => r.creatureId === traveller.creatureId)
  assert.equal(there.length, 1)
  assert.equal(there[0].life, 'exploring')
  assert.deepEqual(there[0].passport.map(e => e.kind), ['born', 'departed', 'arrived'])
  assert.equal(new Set(ids()).size, ids().length)
  assert.equal(ids().length, before.length)
  // Local ids on the metal planet start at resident-0 too, and nothing collides with the arrival's key.
  const keys = planetState(store, M)!.residents.map(r => r.id)
  assert.equal(new Set(keys).size, keys.length)
})

test('MIG: a seat costs a fee, and cancelling returns the creature and the fee', () => {
  const store = network()
  const money = store.getState().metrics.capital
  const count = store.getState().residents.length
  const who = first(store)
  const sent = ship(store, M, [], [who.creatureId])
  assert.ok(sent.ok)
  assert.ok(Math.abs(money - store.getState().metrics.capital - tuning.migration.seatFee) < 1e-9)
  assert.equal(store.getState().residents.length, count - 1)
  assert.equal(cancelShipment(store, sent.value.id), true)
  assert.equal(store.getState().residents.length, count)
  assert.ok(Math.abs(store.getState().metrics.capital - money) < 1e-9)
  const back = store.getState().residents.find(r => r.creatureId === who.creatureId)!
  assert.equal(back.life, 'native')
  assert.equal(new Set(creatureIds(store)).size, creatureIds(store).length)
})

test('MIG-04: bare foreign ground scores low, native ground high, a companion helps a little', () => {
  const store = createRunStore(M)
  const state = store.getState()
  const cairn = (over: Partial<Resident>): Resident => ({ ...state.residents[0], creatureId: 'c1', species: 'cairn', origin: P1, bias: 0, home: [1, 0, 0], homeValid: true, ...over })
  const alone = siteScore(state, cairn({}), [])
  assert.ok(alone < 0.5, `foreign ${alone}`)
  const friend = cairn({ creatureId: 'c2', home: [1.05, 0, 0] })
  assert.ok(siteScore(state, cairn({}), [friend]) > alone)
  assert.equal(siteScore(state, cairn({ home: null }), []), 0)
  const native = createRunStore(P1).getState()
  assert.ok(siteScore(native, { ...cairn({}), home: [1, 0, 0] }, []) > 0.8)
  assert.equal(homeSurface('cairn'), 'plastic')
  assert.equal(homeSurface('sentinel'), 'metal')
  assert.equal(wantedMaterial('cairn'), 'plastic')
})

test('MIG-05: leaving a state takes a different belonging than entering it, and waits for the cooldown', () => {
  const base = createRunStore(P1).getState().residents[0]
  const at = (life: Resident['life'], belonging: number, ago = 10000): Resident => ({ ...base, life, belonging, arrivedTick: 0, lifeTick: 20000 - ago })
  const now = 20000
  assert.equal(nextLife(at('exploring', 0.9), 100), 'exploring', 'the trial runs first')
  assert.equal(nextLife(at('exploring', 0.9), now), 'established')
  assert.equal(nextLife(at('exploring', 0.1), now), 'homesick')
  assert.equal(nextLife(at('exploring', 0.5), now), 'settling')
  assert.equal(nextLife(at('established', 0.6), now), 'established', 'between keepAbove and establishAt it stays')
  assert.equal(nextLife(at('established', 0.45), now), 'settling')
  assert.equal(nextLife(at('established', 0.45, 10), now), 'established', 'cooldown')
  assert.equal(nextLife(at('homesick', 0.3, 100), now), 'homesick', 'recovery needs recoverAt')
  assert.equal(nextLife(at('homesick', 0.45), now), 'settling')
  assert.equal(nextLife(at('homesick', 0.1, tuning.migration.returnAfterTicks), now), 'returning')
  assert.equal(nextLife(at('returning', 0.5), now), 'settling')
})

test('MIG-07: colonies are same-species groups; a lone creature or a mixed pair is not one', () => {
  const base = createRunStore(P1).getState().residents[0]
  const at = (id: string, species: Resident['species'], x: number): Resident => ({ ...base, creatureId: id, species, home: [x, 0, 0] })
  const colonies = coloniesOf([at('a', 'cairn', 0), at('b', 'cairn', 1), at('c', 'cairn', 2), at('d', 'cairn', 9), at('e', 'sentinel', 0.5), at('f', 'sentinel', 8)])
  assert.equal(colonies.length, 1)
  assert.deepEqual(colonies[0].members, ['a', 'b', 'c'])
  assert.equal(colonies[0].species, 'cairn')
})

test('MIG-T2: a Cairn on a plastic planet settles; on bare metal it is homesick, asks for plastic, and does not flip-flop', () => {
  const store = network()
  const goer = first(store)
  const home = ship(store, P2, [], [goer.creatureId])
  assert.ok(home.ok)
  for (let i = 0; i < routeQuote(P1, P2).travelTicks; i += 1) stepLogistics(store)
  travelTo(store, P2)
  assert.equal(planetState(store, P2)!.residents.filter(r => r.creatureId === goer.creatureId).length, 1)
  run(store, 3000)
  const happy = store.getState().residents.find(r => r.creatureId === goer.creatureId)!
  assert.equal(happy.life, 'established', `on plastic: ${happy.life} comfort ${happy.comfort.toFixed(2)} belonging ${happy.belonging.toFixed(2)}`)
  assert.equal(happy.request, null)

  travelTo(store, P1)
  const other = first(store)
  assert.ok(ship(store, M, [], [other.creatureId]).ok)
  for (let i = 0; i < routeQuote(P1, M).travelTicks; i += 1) stepLogistics(store)
  travelTo(store, M)
  const lives: string[] = []
  const world = registryFor(store).world(M)
  for (let i = 0; i < 2400; i += 1) {
    stepSimulation(world, store)
    const creature = store.getState().residents.find(r => r.creatureId === other.creatureId)
    if (creature && lives.at(-1) !== creature.life) lives.push(creature.life)
  }
  const sad = store.getState().residents.find(r => r.creatureId === other.creatureId)!
  assert.ok(['homesick', 'returning'].includes(sad.life), `on metal: ${sad.life} comfort ${sad.comfort.toFixed(2)} belonging ${sad.belonging.toFixed(2)}`)
  assert.equal(sad.request, 'plastic')
  assert.ok(lives.length <= 4, `no oscillation: ${lives.join(' > ')}`)
  assert.ok(sad.passport.some(e => e.kind === 'homesick'))
  assert.equal(sad.origin, P1)
})

test('MIG-T3: two species share a planet, and a homesick Cairn takes the free train home with its passport', () => {
  const store = network()
  const traveller = first(store)
  assert.ok(ship(store, M, [], [traveller.creatureId]).ok)
  for (let i = 0; i < routeQuote(P1, M).travelTicks; i += 1) stepLogistics(store)
  travelTo(store, M)
  const planet = systemPlanets(store).find(p => p.seed === M)!
  assert.equal(planet.kinds, 2)
  assert.match(describePlanet(planet), /2 species/)
  const funds = store.getState().metrics.capital
  run(store, 6000)
  assert.ok(!store.getState().residents.some(r => r.creatureId === traveller.creatureId), 'it left')
  assert.equal(store.getState().metrics.capital >= funds - 1e-6, true, 'the way home is free')
  const trains = logisticsOf(store).getState().shipments
  assert.equal(trains.length, 2)
  assert.equal(trains[1].to, P1)
  for (let i = 0; i < 20; i += 1) stepLogistics(store)
  travelTo(store, P1)
  const back = store.getState().residents.filter(r => r.creatureId === traveller.creatureId)
  assert.equal(back.length, 1, 'once')
  assert.equal(back[0].life, 'native')
  assert.deepEqual(back[0].passport.map(e => e.kind).filter(k => k !== 'settling' && k !== 'homesick'), ['born', 'departed', 'arrived', 'departed', 'returned'])
  assert.equal(new Set(creatureIds(store)).size, creatureIds(store).length)
  assert.equal(cairnOf(store, P1).length >= 1, true)
})
