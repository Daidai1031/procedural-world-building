import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildPointsGeometry } from '../src/scene/demos/particles/particleLook.js'
import {
  ageParticles, createParticles, createPool, describeParticle, digSiteGround, emitOverTime, emitParticles,
  getParticleCloud, SPECK_COUNT, speedOf, stepMotion,
} from '../src/scene/demos/particles/particleSystem.js'
import { gustField, layeredWind, uniformField, varyingField, vortexField, windField } from '../src/scene/demos/particles/fields.js'
import { particleParams, PARTICLE_PRESETS } from '../src/scene/demos/particles/params.js'
import { advanceFixed, advanceRunners, createRace, createSimulation, fieldFromParams } from '../src/scene/demos/particles/simulations.js'
import { fadeWithAge, MAX_HISTORY } from '../src/scene/demos/particles/trails.js'

const defaults = Object.fromEntries(Object.entries(particleParams).map(([key, value]) => [key, value.default]))
const settings = (overrides = {}) => ({ ...defaults, ...overrides })
const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not near ${expected}`)

function run(simulation, seconds, values, frameDelta = 1 / 60) {
  const clock = { accumulator: 0 }
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += frameDelta) advanceFixed(simulation, clock, frameDelta, values)
}

function onePiece(velocity, position = [0, 1, 0]) {
  const pool = createPool(1, 1)
  emitParticles(pool, 1, (target, index) => {
    target.position.set(position, index * 3)
    target.velocity.set(velocity, index * 3)
    target.lifetime[index] = Infinity
  })
  return pool
}

// Step 1
test('a seeded cloud is repeatable and every page is complete', () => {
  const first = createParticles(SPECK_COUNT, 7)
  const second = createParticles(SPECK_COUNT, 7)
  assert.deepEqual(first.position, second.position)
  assert.notDeepEqual(first.position, createParticles(SPECK_COUNT, 8).position)
  for (let index = 0; index < first.count; index += 1) {
    const page = describeParticle(first, index)
    assert.ok(page.lifetime >= 3 && page.age >= 0 && page.age < page.lifetime)
    assert.ok(page.position[1] > digSiteGround(page.position[0], page.position[2]))
  }
})

test('the drawing reads the state arrays and the cloud is never rebuilt', () => {
  const state = getParticleCloud()
  assert.equal(getParticleCloud(), state)
  const before = { position: [...state.position], age: [...state.age] }
  const geometry = buildPointsGeometry(state)
  assert.equal(geometry.getAttribute('position').array, state.position)
  assert.deepEqual([...state.position], before.position)
  assert.deepEqual([...state.age], before.age)
})

// Step 2
test('live count settles near rate × lifetime', () => {
  const simulation = createSimulation('particle-lifecycle', settings({ particleRate: 30, particleLifetime: 4 }))
  run(simulation, 15, settings({ particleRate: 30, particleLifetime: 4 }))
  const average = simulation.averageLive()
  assert.ok(Math.abs(average - 120) <= 6, `average ${average}`)
})

test('births per second do not depend on the frame rate, and the count never passes capacity', () => {
  const births = (frameDelta) => {
    const values = settings({ particleRate: 37, particleLifetime: 2 })
    const simulation = createSimulation('particle-lifecycle', values)
    const clock = { accumulator: 0 }
    while (simulation.time < 6 - 1e-9) advanceFixed(simulation, clock, frameDelta, values)
    return simulation.pool.births
  }
  assert.equal(births(1 / 30), births(1 / 144))
  const crowded = settings({ particleRate: 100, particleLifetime: 10 })
  const simulation = createSimulation('particle-lifecycle', crowded)
  const clock = { accumulator: 0 }
  for (let frame = 0; frame < 60 * 8; frame += 1) {
    advanceFixed(simulation, clock, 1 / 60, crowded)
    assert.ok(simulation.pool.live <= simulation.pool.capacity)
  }
  assert.equal(simulation.pool.live, simulation.pool.capacity)
})

test('fractional births carry over instead of being lost', () => {
  const pool = createPool(50, 2)
  const spawn = (target, index) => { target.lifetime[index] = 100 }
  for (let update = 0; update < 60; update += 1) emitOverTime(pool, 0.5, 1 / 60, spawn)
  assert.equal(pool.births, 0)
  // Half a speck is carried over, so the next 1.5 make two whole specks.
  for (let update = 0; update < 60; update += 1) emitOverTime(pool, 1.5, 1 / 60, spawn)
  assert.equal(pool.births, 2)
})

// Step 3
test('velocity × dt gives the same distance however the time is split', () => {
  for (const steps of [1, 5, 30]) {
    const pool = onePiece([2, 0, 0])
    for (let step = 0; step < steps; step += 1) stepMotion(pool, 0.5 / steps)
    near(pool.position[0], 1, 1e-5)
  }
})

test('the fixed-step runner depends on the frame rate and the dt runner does not', () => {
  const after = (framesPerSecond, seconds) => {
    const race = createRace(framesPerSecond)
    for (let frame = 0; frame < Math.round(seconds * framesPerSecond); frame += 1) advanceRunners(race)
    return { speed: race.pool.position[0], frame: race.frameRunnerX }
  }
  const slow = after(30, 2)
  const fast = after(144, 2)
  near(slow.speed, fast.speed, 1e-4)
  assert.ok(fast.frame - slow.frame > 1)
})

// Step 4
test('constant gravity gives v = g·t and the semi-implicit position sum', () => {
  const gravity = 3
  const pool = onePiece([0, 0, 0])
  const dt = 1 / 60
  const steps = 120
  for (let step = 0; step < steps; step += 1) stepMotion(pool, dt, { acceleration: [0, -gravity, 0] })
  near(pool.velocity[1], -gravity * steps * dt, 1e-4)
  // Velocity first, then position: the drop is g·dt²·n(n+1)/2, slightly more than ½·g·t².
  const semiImplicit = gravity * dt * dt * steps * (steps + 1) / 2
  near(1 - pool.position[1], semiImplicit, 1e-4)
  assert.ok(semiImplicit > 0.5 * gravity * (steps * dt) ** 2)
})

test('switching the push off keeps the current speed', () => {
  const pool = onePiece([0.5, 2, 0])
  for (let step = 0; step < 30; step += 1) stepMotion(pool, 1 / 60, { acceleration: [1, -3, 0] })
  const speed = speedOf(pool, 0)
  for (let step = 0; step < 60; step += 1) stepMotion(pool, 1 / 60)
  near(speedOf(pool, 0), speed, 1e-5)
})

test('the forces scene starts with a burst, removes landed rubble, and bursts again', () => {
  const values = settings()
  const simulation = createSimulation('particle-forces', values)
  const { pool } = simulation
  assert.ok(pool.live > 0)
  const clock = { accumulator: 0 }
  let emptied = false
  for (let frame = 0; frame < 60 * 8; frame += 1) {
    advanceFixed(simulation, clock, 1 / 60, values)
    if (pool.live === 0) emptied = true
    for (let index = 0; index < pool.capacity; index += 1) {
      if (pool.alive[index]) assert.ok(pool.position[index * 3 + 1] >= digSiteGround(pool.position[index * 3], pool.position[index * 3 + 2]))
    }
  }
  assert.ok(emptied, 'all rubble lands')
  assert.ok(pool.births > 24, 'another burst followed')
  assert.ok(simulation.crumbs.count > 0)
})

// Step 5
test('a uniform field moves every speck alike; a varying one does not', () => {
  const displacement = (field, x, z) => {
    const pool = onePiece([0, 0, 0], [x, 0.3, z])
    for (let step = 0; step < 30; step += 1) stepMotion(pool, 1 / 60, { field })
    return [pool.position[0] - x, pool.position[2] - z]
  }
  const uniform = uniformField(0.7)
  assert.deepEqual(displacement(uniform, -2, -1), displacement(uniform, 1, 2))
  const varying = varyingField(0.7)
  const a = displacement(varying, -2, -1)
  const b = displacement(varying, 1, 2)
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.05)
})

test('as a speed the arrow carries the speck; as a push it builds speed', () => {
  const field = uniformField(1)
  const carried = onePiece([0, 0, 0])
  const pushed = onePiece([0, 0, 0])
  for (let step = 0; step < 60; step += 1) {
    stepMotion(carried, 1 / 60, { field, fieldMeans: 'Speed' })
    stepMotion(pushed, 1 / 60, { field, fieldMeans: 'Push' })
  }
  near(carried.position[0], 1, 1e-4)
  near(carried.velocity[0], 0)
  near(pushed.velocity[0], 1, 1e-4)
  assert.ok(pushed.position[0] < carried.position[0])
})

test('the field scene reads its kind from the settings', () => {
  const arrow = [0, 0, 0]
  fieldFromParams(settings({ particleFieldShape: 'Uniform', particleFlow: 0.9 }))(1, 2, arrow)
  assert.deepEqual(arrow, [0.9, 0, 0])
  fieldFromParams(settings({ particleFieldShape: 'Varying' }))(1, 2, arrow)
  assert.notEqual(arrow[2], 0)
})

// Step 6
test('the whirlpool is finite at its centre and turns around it', () => {
  const vortex = vortexField(1.2, 0.5, -0.3, 0.9)
  const arrow = [0, 0, 0]
  vortex(0.5, -0.3, arrow)
  assert.ok(arrow.every(Number.isFinite))
  for (const [x, z] of [[1.5, -0.3], [0.5, 1.2], [-1, -2], [0.6, -0.25]]) {
    vortex(x, z, arrow)
    near(arrow[0] * (x - 0.5) + arrow[2] * (z + 0.3), 0, 1e-9)
  }
})

test('layers add arrow by arrow, and gusts off leaves exactly breeze + whirlpool', () => {
  const values = settings({ particleGusts: false })
  const summed = layeredWind(values)
  const breeze = uniformField(values.particleBreezeStrength)
  const whirl = vortexField(values.particleWhirlStrength, values.particleWhirlX, values.particleWhirlZ, values.particleWhirlRadius)
  const [total, b, w] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  for (const [x, z] of [[0, 0], [1, -2], [-2.5, 2]]) {
    summed(x, z, total)
    breeze(x, z, b)
    whirl(x, z, w)
    assert.equal(total[0], b[0] + w[0])
    assert.equal(total[2], b[2] + w[2])
  }
  const opposite = windField({ breeze: uniformField(0.5), whirl: uniformField(-0.5) })
  assert.equal(opposite(1, 1, total)[0], 0)
  assert.ok(Math.abs(gustField(0.4)(0.3, 0.7, total)[0]) > 0)
})

// Step 7
test('fade runs from 1 at birth to 0 at death', () => {
  assert.equal(fadeWithAge(0, 4), 1)
  assert.equal(fadeWithAge(4, 4), 0)
  near(fadeWithAge(1, 4), 0.75)
  assert.equal(fadeWithAge(9, 4), 0)
})

test('trails stay within their cap, and only an uncleared respawn keeps old history', () => {
  const maxJump = (clear) => {
    const values = settings({ particleClearTrail: clear, particleHistory: 12, particleGusts: false })
    const simulation = createSimulation('particle-trails', values)
    let worst = 0
    const clock = { accumulator: 0 }
    for (let frame = 0; frame < 60 * 9; frame += 1) {
      advanceFixed(simulation, clock, 1 / 60, values)
      const { pool, history } = simulation
      for (let index = 0; index < pool.capacity; index += 1) {
        assert.ok(history.length[index] <= Math.min(12, MAX_HISTORY))
        if (!pool.alive[index] || history.length[index] === 0) continue
        const slot = (index * MAX_HISTORY + history.head[index]) * 3
        const gap = Math.hypot(pool.position[index * 3] - history.points[slot], pool.position[index * 3 + 2] - history.points[slot + 2])
        worst = Math.max(worst, gap)
      }
    }
    return worst
  }
  assert.ok(maxJump(true) < 0.2, 'a cleared trail never jumps')
  assert.ok(maxJump(false) > 1, 'an uncleared trail draws a stray line')
})

test('the look never changes where the specks are', () => {
  const positions = (view) => {
    const values = settings({ particleView: view, particleFade: view === 'Puffs', particleSpeedColour: view === 'Dots' })
    const simulation = createSimulation('particle-trails', values)
    run(simulation, 3, values)
    return [...simulation.pool.position]
  }
  assert.deepEqual(positions('Dots'), positions('Trails'))
  assert.deepEqual(positions('Puffs'), positions('Trails'))
})

// Step 8
test('with the ground rule on, no live speck is below the terrain', () => {
  for (const preset of Object.keys(PARTICLE_PRESETS)) {
    const values = settings({ particlePreset: preset, ...PARTICLE_PRESETS[preset] })
    const simulation = createSimulation('particle-recipe', values)
    const clock = { accumulator: 0 }
    for (let frame = 0; frame < 60 * 12; frame += 1) {
      advanceFixed(simulation, clock, 1 / 60, values)
      const { pool } = simulation
      assert.ok(pool.live <= pool.capacity)
      for (let index = 0; index < pool.capacity; index += 1) {
        if (!pool.alive[index]) continue
        const at = index * 3
        assert.ok(pool.position[at + 1] >= digSiteGround(pool.position[at], pool.position[at + 2]), `${preset} speck below ground`)
      }
    }
    assert.ok(simulation.pool.live > 0, `${preset} keeps running`)
  }
})

test('rain sinks into the terrain when the ground rule is off', () => {
  const values = settings({ ...PARTICLE_PRESETS.Rain, particleGround: false })
  const simulation = createSimulation('particle-recipe', values)
  run(simulation, 3, values)
  const { pool } = simulation
  let below = 0
  for (let index = 0; index < pool.capacity; index += 1) {
    if (pool.alive[index] && pool.position[index * 3 + 1] < digSiteGround(pool.position[index * 3], pool.position[index * 3 + 2])) below += 1
  }
  assert.ok(below > 10)
})

test('every preset only sets known settings within their ranges', () => {
  for (const preset of Object.values(PARTICLE_PRESETS)) {
    for (const [key, value] of Object.entries(preset)) {
      const definition = particleParams[key]
      assert.ok(definition, key)
      if (definition.type === 'float') assert.ok(value >= definition.min && value <= definition.max, `${key} ${value}`)
      if (definition.type === 'select') assert.ok(definition.options.some((option) => option.value === value), `${key} ${value}`)
    }
  }
})

test('ageing removes a speck exactly at its lifetime', () => {
  const pool = createPool(1, 3)
  emitParticles(pool, 1, (target, index) => { target.lifetime[index] = 0.5 })
  for (let step = 0; step < 29; step += 1) ageParticles(pool, 1 / 60)
  assert.equal(pool.live, 1)
  ageParticles(pool, 1 / 60)
  assert.equal(pool.live, 0)
})
