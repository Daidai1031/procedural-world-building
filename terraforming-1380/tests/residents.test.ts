import test from 'node:test'
import assert from 'node:assert/strict'
import { createRunStore } from '../src/state/runState'
import { PlanetWorld, burrowSites } from '../src/world/planet'
import { recordDisturbance, shelterAt, spawnResidents, stepResidents, type Resident } from '../src/systems/residents'
import { HALF, distance, scale, unit, type Vec3 } from '../src/systems/geometry'
import { groundRadius } from '../src/systems/exploration'
import { tuning } from '../src/config/tuning'

const rules = tuning.residents
const run = (world: PlanetWorld, store: ReturnType<typeof createRunStore>, ticks: number) => {
  for (let i = 0; i < ticks; i++) stepResidents(world, store)
}
const at = (p: Vec3) => ({ x: p[0], y: p[1] + HALF, z: p[2] })

test('RES-01/T6: the same seed places the same residents, each in a valid seeded burrow', () => {
  const world = new PlanetWorld('1380')
  assert.deepEqual(spawnResidents('1380'), spawnResidents('1380'))
  const residents = spawnResidents('1380')
  assert.ok(residents.length > 0 && residents.length < burrowSites('1380').length, 'some burrows start empty')
  for (const resident of residents) assert.equal(shelterAt(world, resident.home!).valid, true)
})

test('HAB-T1: validity follows geometry: an open pit is exposed, a dug tunnel shelters, a plugged burrow is sealed', () => {
  const world = new PlanetWorld('1380')
  const pitDir = unit([0.3, 0.8, 0.5])
  const pitGround = groundRadius(world, pitDir)
  world.edit('dig', at(scale(pitDir, pitGround)), 0.5)
  assert.equal(shelterAt(world, scale(pitDir, pitGround - 0.25)).reason, 'exposed')
  const tunnelDir = unit([-0.6, 0.2, 0.7])
  const tunnelGround = groundRadius(world, tunnelDir)
  for (let d = 0; d < 0.9; d += 0.04) world.edit('dig', at(scale(tunnelDir, tunnelGround - d)), 0.2)
  assert.equal(shelterAt(world, scale(tunnelDir, tunnelGround - 0.85)).valid, true)
  const pocket = burrowSites('1380')[0].pocket
  for (let plugs = 0; plugs < 6 && shelterAt(world, pocket).valid; plugs++) world.edit('add', at(shelterAt(world, pocket).mouth!), 0.3)
  assert.equal(shelterAt(world, pocket).reason, 'sealed')
})

test('RES-T1: brief disturbance makes a resident hide, then it returns to the same home after quiet', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  run(world, store, 60)
  const before = store.getState().residents[0]
  assert.equal(before.state, 'peeking')
  recordDisturbance(store, before.home!, 'manual', false)
  run(world, store, 2)
  assert.equal(store.getState().residents[0].state, 'hiding')
  run(world, store, 400)
  const after = store.getState().residents[0]
  assert.equal(after.state, 'peeking')
  assert.deepEqual(after.home, before.home)
})

test('RES-T2: sustained work sends a resident along an open route to a quiet valid home', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  run(world, store, 30)
  const start = store.getState().residents[0].home!
  const route: Vec3[] = []
  let moved = false
  for (let t = 0; t < 2400 && !moved; t++) {
    if (t < 1500) recordDisturbance(store, start, 'robot', false)
    stepResidents(world, store)
    const r = store.getState().residents[0]
    if (r.state === 'moving') route.push(r.position)
    moved = r.state !== 'moving' && route.length > 0
  }
  const r = store.getState().residents[0]
  assert.ok(route.length > 0, 'the resident set off')
  assert.notDeepEqual(r.home, start)
  assert.equal(shelterAt(world, r.home!).valid, true)
  // No step of the walk is inside rock.
  const halfSample = HALF * 2 / (tuning.grid.resolution - 1) / 2
  for (const p of route) assert.ok(world.densityAt(p[0], p[1] + HALF, p[2]) >= -halfSample)
})

test('RES-T4: residents never share a home', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  // Disturb everyone for a while so several search at once.
  for (let t = 0; t < 900; t++) {
    if (t < 600 && t % 3 === 0) for (const b of burrowSites('1380')) recordDisturbance(store, b.pocket, 'robot', false)
    stepResidents(world, store)
  }
  const homes = store.getState().residents.map(r => r.home).filter((h): h is Vec3 => !!h)
  for (let i = 0; i < homes.length; i++) for (let j = i + 1; j < homes.length; j++) {
    assert.ok(distance(homes[i], homes[j]) >= rules.search.occupiedRadius)
  }
})

test('RES-T3/T5: with every burrow sealed residents wait in view; a new dug cavity is taken after quiet', () => {
  const world = new PlanetWorld('1380')
  const store = createRunStore('1380')
  for (const { pocket } of burrowSites('1380')) {
    for (let plugs = 0; plugs < 8 && shelterAt(world, pocket).valid; plugs++) world.edit('add', at(shelterAt(world, pocket).mouth!), 0.3)
    world.edit('add', at(pocket), 0.3)
  }
  run(world, store, 120)
  const waiting = store.getState().residents
  assert.equal(waiting.length, spawnResidents('1380').length, 'nobody is deleted')
  assert.ok(waiting.every((r: Resident) => r.state === 'waiting' && r.home === null))
  // Dig a tunnel near the first resident, then stop and let it go quiet.
  const near = unit(waiting[0].position)
  const ground = groundRadius(world, near)
  for (let d = 0; d < 0.9; d += 0.04) {
    const p = scale(near, ground - d)
    world.edit('dig', at(p), 0.2)
    recordDisturbance(store, p, 'robot', true)
  }
  run(world, store, 1200)
  const housed = store.getState().residents.filter(r => r.home)
  assert.ok(housed.length >= 1, 'someone moved into the new tunnel')
  assert.equal(shelterAt(world, housed[0].home!).valid, true)
})
