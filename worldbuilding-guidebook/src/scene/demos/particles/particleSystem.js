import { createRandom } from '../distributions/random.js'

export const SPECK_COUNT = 90

// The pit the dust rises from, and the ground around it. Later steps reuse both.
export const PIT_RADIUS = 1.4
export const PIT_DEPTH = 0.5
export function digSiteGround(x, z) {
  const rim = 0.12 + 0.05 * Math.sin(x) * Math.sin(z)
  return rim - PIT_DEPTH * Math.exp(-(x * x + z * z) / (PIT_RADIUS * PIT_RADIUS))
}

// One notebook page per speck, kept as parallel arrays: speck i owns
// position[3i..3i+2], velocity[3i..3i+2], age[i] and lifetime[i]. How a speck
// is drawn never appears here.
export function createParticles(capacity, seed) {
  const random = createRandom(seed)
  const state = {
    capacity,
    count: capacity,
    position: new Float32Array(capacity * 3),
    velocity: new Float32Array(capacity * 3),
    age: new Float32Array(capacity),
    lifetime: new Float32Array(capacity),
  }
  for (let index = 0; index < capacity; index += 1) {
    const height = 0.15 + random() * 1.5
    const spread = 0.4 + height * 0.5
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random()) * spread
    state.position.set([Math.cos(angle) * radius, height, Math.sin(angle) * radius], index * 3)
    state.velocity.set([(random() - 0.5) * 0.3, 0.2 + random() * 0.4, (random() - 0.5) * 0.3], index * 3)
    state.lifetime[index] = 3 + random() * 3
    state.age[index] = random() * state.lifetime[index] * 0.7
  }
  return state
}

export function describeParticle(state, index) {
  const at = index * 3
  return {
    position: [state.position[at], state.position[at + 1], state.position[at + 2]],
    velocity: [state.velocity[at], state.velocity[at + 1], state.velocity[at + 2]],
    age: state.age[index],
    lifetime: state.lifetime[index],
  }
}

// One cloud for the whole page, so switching how it is drawn can never rebuild it.
let sharedCloud = null
export function getParticleCloud() {
  sharedCloud ??= createParticles(SPECK_COUNT, 1380)
  return sharedCloud
}

// From Step 2 on, specks are born and die. A pool keeps a fixed number of
// pages; alive[i] says whether page i is in use, so a dead speck's page can be
// handed to the next one born instead of growing the arrays forever.
export function createPool(capacity, seed) {
  return {
    capacity,
    live: 0,
    births: 0,
    accumulator: 0,
    random: createRandom(seed),
    alive: new Uint8Array(capacity),
    position: new Float32Array(capacity * 3),
    velocity: new Float32Array(capacity * 3),
    age: new Float32Array(capacity),
    lifetime: new Float32Array(capacity),
    onBirth: null,
  }
}

// spawn(pool, index) writes the new speck's position, velocity and lifetime.
export function emitParticles(pool, count, spawn) {
  let emitted = 0
  for (let index = 0; index < pool.capacity && emitted < count; index += 1) {
    if (pool.alive[index]) continue
    pool.alive[index] = 1
    pool.age[index] = 0
    spawn(pool, index)
    pool.onBirth?.(index)
    pool.live += 1
    pool.births += 1
    emitted += 1
  }
  return emitted
}

// A steady tap: rate specks per second. Fractions of a speck are kept for the
// next update, so the number born per second does not depend on the frame rate.
export function emitOverTime(pool, rate, dt, spawn) {
  // #region emission-accumulator
  pool.accumulator += rate * dt
  // #endregion
  const births = Math.floor(pool.accumulator)
  pool.accumulator -= births
  return emitParticles(pool, births, spawn)
}

export function removeParticle(pool, index) {
  if (!pool.alive[index]) return
  pool.alive[index] = 0
  pool.live -= 1
}

export function ageParticles(pool, dt) {
  for (let index = 0; index < pool.capacity; index += 1) {
    if (!pool.alive[index]) continue
    pool.age[index] += dt
    if (pool.age[index] >= pool.lifetime[index]) removeParticle(pool, index)
  }
}

const NO_PUSH = [0, 0, 0]

// One update of motion. The push (acceleration) changes the speed first; the
// new speed then moves the speck. A wind map, when there is one, is read at the
// speck's own position. As a speed it carries the speck; as a push it is added
// to the acceleration.
export function stepMotion(pool, dt, { acceleration = NO_PUSH, field = null, fieldMeans = 'Speed' } = {}) {
  const { position, velocity } = pool
  const arrow = [0, 0, 0]
  const push = [0, 0, 0]
  const carried = [0, 0, 0]
  for (let index = 0; index < pool.capacity; index += 1) {
    if (!pool.alive[index]) continue
    const at = index * 3
    arrow[0] = arrow[1] = arrow[2] = 0
    if (field) {
      const x = position[at]
      const z = position[at + 2]
      // #region read-under-speck
      field(x, z, arrow)
      // #endregion
    }
    const arrowIsPush = fieldMeans === 'Push'
    for (let axis = 0; axis < 3; axis += 1) {
      push[axis] = acceleration[axis] + (arrowIsPush ? arrow[axis] : 0)
      carried[axis] = arrowIsPush ? 0 : arrow[axis]
    }
    for (let axis = 0; axis < 3; axis += 1) {
      // #region velocity-update
      velocity[at + axis] += push[axis] * dt
      // #endregion
    }
    for (let axis = 0; axis < 3; axis += 1) {
      const drift = velocity[at + axis] + carried[axis]
      // #region position-update
      position[at + axis] += drift * dt
      // #endregion
    }
  }
}

export function speedOf(pool, index, field = null) {
  const at = index * 3
  const arrow = [0, 0, 0]
  if (field) field(pool.position[at], pool.position[at + 2], arrow)
  return Math.hypot(pool.velocity[at] + arrow[0], pool.velocity[at + 1] + arrow[1], pool.velocity[at + 2] + arrow[2])
}

// A wind map does not know where the ground is. This rule does.
export function removeBelowGround(pool, groundHeight) {
  const { position } = pool
  for (let index = 0; index < pool.capacity; index += 1) {
    if (!pool.alive[index]) continue
    const at = index * 3
    const x = position[at]
    const z = position[at + 2]
    // #region ground-rule
    if (position[at + 1] < groundHeight(x, z)) removeParticle(pool, index)
    // #endregion
  }
}

// Specks that leave the square region are removed, or re-enter on the other
// side. A wrapped speck jumps, so it reports the jump like a new birth.
export function applyEdges(pool, halfSize, rule, onJump) {
  const { position } = pool
  for (let index = 0; index < pool.capacity; index += 1) {
    if (!pool.alive[index]) continue
    const at = index * 3
    for (const axis of [0, 2]) {
      const value = position[at + axis]
      if (Math.abs(value) <= halfSize) continue
      if (rule === 'Wrap') {
        position[at + axis] = value - Math.sign(value) * halfSize * 2
        onJump?.(index)
      } else {
        removeParticle(pool, index)
        break
      }
    }
  }
}
