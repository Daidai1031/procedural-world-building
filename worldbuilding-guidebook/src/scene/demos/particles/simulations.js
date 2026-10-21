import { layeredWind, uniformField, varyingField, vortexField, windField } from './fields.js'
import {
  ageParticles, applyEdges, createPool, digSiteGround, emitOverTime, emitParticles, removeBelowGround,
  speedOf, stepMotion,
} from './particleSystem.js'
import { clearHistory, createHistory, recordHistory } from './trails.js'

// Every scene from Step 2 on is one of these simulations. The scene clock
// calls step() a whole number of times with the same fixed dt, whatever the
// screen's frame rate, so two runs with the same settings always match.
export const STEP_SECONDS = 1 / 60
export const REGION_HALF_SIZE = 3.2
export const LIFECYCLE_CAPACITY = 300
export const RECIPE_CAPACITY = 600
export const RUNNER_SPEED = 1
export const RUNNER_START = -2.5
export const RUNNER_FINISH = 2.5
const HISTORY_EVERY = 3

export function advanceFixed(simulation, clock, delta, params) {
  clock.accumulator += Math.min(delta, 0.1)
  let steps = 0
  while (clock.accumulator >= simulation.stepSeconds && !simulation.finished) {
    simulation.step(params)
    clock.accumulator -= simulation.stepSeconds
    steps += 1
  }
  return steps
}

function inDisc(random, radius) {
  const angle = random() * Math.PI * 2
  const distance = Math.sqrt(random()) * radius
  return [Math.cos(angle) * distance, Math.sin(angle) * distance]
}

function place(pool, index, x, y, z, vx = 0, vy = 0, vz = 0) {
  pool.position.set([x, y, z], index * 3)
  pool.velocity.set([vx, vy, vz], index * 3)
}

// Step 2. Specks appear inside the cloud above the pit and vanish at the end
// of their lifetime. They do not move yet; motion starts in Step 3.
function lifecycleSimulation(params) {
  const pool = createPool(LIFECYCLE_CAPACITY, 202)
  const recent = []
  const spawn = (target, index) => {
    const height = 0.15 + target.random() * 1.5
    const [x, z] = inDisc(target.random, 0.4 + height * 0.5)
    place(target, index, x, height, z)
    target.lifetime[index] = params.current.particleLifetime
  }
  return {
    pool, stepSeconds: STEP_SECONDS, time: 0,
    step(values) {
      params.current = values
      ageParticles(pool, STEP_SECONDS)
      emitOverTime(pool, values.particleRate, STEP_SECONDS, spawn)
      recent.push(pool.live)
      if (recent.length > 60) recent.shift()
      this.time += STEP_SECONDS
    },
    burst(values) { params.current = values; emitParticles(pool, 40, spawn) },
    averageLive: () => recent.reduce((sum, value) => sum + value, 0) / Math.max(1, recent.length),
    readout(values) {
      return {
        live: pool.live,
        average: this.averageLive(),
        expected: values.particleRate * values.particleLifetime,
        capacity: pool.capacity,
      }
    },
  }
}

// Step 3. Two runners race to the same finish line. One moves by speed × dt;
// the other takes the same step every frame, sized for a 60 fps screen.
export function createRace(framesPerSecond) {
  const pool = createPool(1, 303)
  emitParticles(pool, 1, (target, index) => {
    place(target, index, RUNNER_START, 0.3, -0.6, RUNNER_SPEED, 0, 0)
    target.lifetime[index] = Infinity
  })
  return { pool, frameSeconds: 1 / framesPerSecond, frameRunnerX: RUNNER_START, frames: 0, footprints: { speed: [], frame: [] } }
}

export function advanceRunners(race) {
  // The dt runner: velocity × this frame's length, in seconds.
  stepMotion(race.pool, race.frameSeconds)
  // The frame runner: one fixed step per frame, whatever the frame's length.
  race.frameRunnerX += RUNNER_SPEED / 60
  race.frames += 1
  race.pool.position[0] = Math.min(race.pool.position[0], RUNNER_FINISH)
  race.frameRunnerX = Math.min(race.frameRunnerX, RUNNER_FINISH)
  race.footprints.speed.push(race.pool.position[0])
  race.footprints.frame.push(race.frameRunnerX)
}

function raceSimulation(values) {
  const race = createRace(Number(values.particleScreen))
  return {
    race, pool: race.pool, stepSeconds: race.frameSeconds, time: 0, finished: false, startsPaused: true,
    step() {
      advanceRunners(race)
      this.time += race.frameSeconds
      this.finished = this.time >= (RUNNER_FINISH - RUNNER_START) / RUNNER_SPEED + 0.5
    },
    readout() {
      return {
        time: this.time,
        frames: race.frames,
        speedRunner: race.pool.position[0] - RUNNER_START,
        frameRunner: race.frameRunnerX - RUNNER_START,
      }
    },
  }
}

// Step 4. A burst of rubble leaves the pit. Gravity and a sideways push change
// each piece's speed; the dots left behind show the path bending.
function forcesSimulation() {
  const pool = createPool(60, 404)
  const crumbs = { points: new Float32Array(2400 * 3), next: 0, count: 0 }
  let tracked = -1
  let steps = 0
  let quiet = 0
  const spawn = (target, index) => {
    const angle = target.random() * Math.PI * 2
    const outward = 0.4 + target.random() * 0.8
    place(target, index, 0, digSiteGround(0, 0) + 0.05, 0, Math.cos(angle) * outward, 2.4 + target.random() * 0.8, Math.sin(angle) * outward)
    target.lifetime[index] = 8
    if (tracked < 0 || !target.alive[tracked]) tracked = index
  }
  const simulation = {
    pool, crumbs, stepSeconds: STEP_SECONDS, time: 0,
    get tracked() { return tracked },
    burst() { tracked = -1; emitParticles(pool, 24, spawn) },
    step(values) {
      // #region forces-step
      ageParticles(pool, STEP_SECONDS)
      const acceleration = [values.particleSideways, -values.particleGravity, 0]
      stepMotion(pool, STEP_SECONDS, { acceleration })
      // Rubble is removed when it lands; Step 8 explains this ground rule.
      removeBelowGround(pool, digSiteGround)
      // #endregion
      steps += 1
      if (steps % 4 === 0) {
        for (let index = 0; index < pool.capacity; index += 1) {
          if (!pool.alive[index]) continue
          crumbs.points.set(pool.position.subarray(index * 3, index * 3 + 3), crumbs.next * 3)
          crumbs.next = (crumbs.next + 1) % (crumbs.points.length / 3)
          crumbs.count = Math.min(crumbs.count + 1, crumbs.points.length / 3)
        }
      }
      // When every piece has landed, the pit throws another burst.
      quiet = pool.live === 0 ? quiet + STEP_SECONDS : 0
      if (quiet > 0.8) this.burst()
      this.time += STEP_SECONDS
    },
    readout() {
      const alive = tracked >= 0 && pool.alive[tracked]
      return { live: pool.live, speed: alive ? speedOf(pool, tracked) : null }
    },
  }
  simulation.burst()
  return simulation
}

export function fieldFromParams(values) {
  return values.particleFieldShape === 'Uniform' ? uniformField(values.particleFlow) : varyingField(values.particleFlow)
}

const LEAF_LIFT = 0.3

// Steps 5 and 6. Leaves float above the ground and go wherever the arrows
// under them say. Step 5 drops them by hand; Step 6 releases a steady stream.
function leafSimulation(demo) {
  const layered = demo === 'particle-layers'
  const pool = createPool(layered ? 320 : 200, 505)
  const leafAt = (x, z) => (target, index) => {
    place(target, index, x, digSiteGround(x, z) + LEAF_LIFT, z)
    target.lifetime[index] = layered ? 16 : 14
  }
  const dropRow = () => {
    for (let row = 0; row < 7; row += 1) {
      const z = -2.4 + row * 0.8
      emitParticles(pool, 1, leafAt(-2.6, z))
    }
  }
  const stream = (target, index) => leafAt(-3, -2.6 + target.random() * 5.2)(target, index)
  if (!layered) dropRow()
  return {
    pool, stepSeconds: STEP_SECONDS, time: 0,
    dropLeaf: (x, z) => emitParticles(pool, 1, leafAt(x, z)),
    dropRow,
    field: (current) => (layered ? layeredWind(current) : fieldFromParams(current)),
    step(current) {
      ageParticles(pool, STEP_SECONDS)
      if (layered) emitOverTime(pool, 10, STEP_SECONDS, stream)
      stepMotion(pool, STEP_SECONDS, { field: this.field(current), fieldMeans: layered ? 'Speed' : current.particleArrowMeans })
      applyEdges(pool, REGION_HALF_SIZE, 'Remove')
      this.time += STEP_SECONDS
    },
    readout() { return { live: pool.live } },
  }
}

// Step 7 studies trails, so it uses one fixed wind that carries the dust from
// the pit towards the cave, whatever was left set in Step 6.
const TRAIL_WIND = windField({ breeze: uniformField(0.6), whirl: vortexField(0.5, 1.2, 0.5, 0.8) })

// Steps 7 and 8 share one engine: a tap, a lifetime, the layered wind (plus
// gravity in Step 8), trails, and in Step 8 the ground and edge rules.
function dustSimulation(demo) {
  const recipe = demo === 'particle-recipe'
  const pool = createPool(recipe ? RECIPE_CAPACITY : 160, recipe ? 808 : 707)
  const history = createHistory(pool.capacity)
  let current = null
  let steps = 0
  pool.onBirth = (index) => {
    if (recipe || current.particleClearTrail) clearHistory(history, index)
  }
  const spawn = (target, index) => {
    const random = target.random
    const emitter = recipe ? current.particleEmitter : 'Pit'
    if (emitter === 'Sky') {
      const x = (random() * 2 - 1) * 3
      const z = (random() * 2 - 1) * 3
      place(target, index, x, 2.6 + random() * 0.6, z, 0, -1.5, 0)
    } else if (emitter === 'Wide low') {
      const x = (random() * 2 - 1) * 3
      const z = (random() * 2 - 1) * 3
      place(target, index, x, digSiteGround(x, z) + 0.05 + random() * 0.35, z)
    } else {
      const [x, z] = inDisc(random, 0.7)
      place(target, index, x, digSiteGround(x, z) + 0.08 + random() * 0.6, z, 0, 0.25, 0)
    }
    const lifetime = recipe ? current.particleLifetime : 4
    target.lifetime[index] = lifetime * (0.8 + random() * 0.4)
  }
  return {
    pool, history, stepSeconds: STEP_SECONDS, time: 0,
    field: (values) => (recipe ? layeredWind(values, { useSwitches: false }) : TRAIL_WIND),
    step(values) {
      current = values
      // #region recipe-step
      ageParticles(pool, STEP_SECONDS)
      emitOverTime(pool, recipe ? values.particleRate : 30, STEP_SECONDS, spawn)
      const gravity = recipe ? values.particleGravity : 0
      stepMotion(pool, STEP_SECONDS, { acceleration: [0, -gravity, 0], field: this.field(values) })
      if (recipe && values.particleGround) removeBelowGround(pool, digSiteGround)
      applyEdges(pool, REGION_HALF_SIZE, recipe ? values.particleEdge : 'Remove', (index) => clearHistory(history, index))
      // #endregion
      steps += 1
      if (steps % HISTORY_EVERY === 0) recordHistory(history, pool, values.particleHistory)
      this.time += STEP_SECONDS
    },
    readout() { return { live: pool.live, capacity: pool.capacity } },
  }
}

export function createSimulation(demo, values) {
  if (demo === 'particle-lifecycle') return lifecycleSimulation({ current: values })
  if (demo === 'particle-time') return raceSimulation(values)
  if (demo === 'particle-forces') return forcesSimulation()
  if (demo === 'particle-field' || demo === 'particle-layers') return leafSimulation(demo)
  if (demo === 'particle-trails' || demo === 'particle-recipe') return dustSimulation(demo)
  return null
}
