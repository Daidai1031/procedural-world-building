// A trail remembers each speck's last few positions, like the wake behind a
// boat. Every speck owns a fixed ring of slots, so memory never grows.
export const MAX_HISTORY = 40

export function createHistory(capacity) {
  return {
    points: new Float32Array(capacity * MAX_HISTORY * 3),
    head: new Uint16Array(capacity),
    length: new Uint16Array(capacity),
  }
}

// Called on every birth. A reused page must forget where its last speck went,
// or the trail draws a line from the old death to the new birth.
export function clearHistory(history, index) {
  history.length[index] = 0
  history.head[index] = 0
}

export function recordHistory(history, pool, limit) {
  const cap = Math.min(limit, MAX_HISTORY)
  for (let index = 0; index < pool.capacity; index += 1) {
    if (!pool.alive[index]) continue
    const slot = (history.head[index] + 1) % MAX_HISTORY
    const to = (index * MAX_HISTORY + slot) * 3
    const from = index * 3
    history.points[to] = pool.position[from]
    history.points[to + 1] = pool.position[from + 1]
    history.points[to + 2] = pool.position[from + 2]
    history.head[index] = slot
    history.length[index] = Math.min(cap, history.length[index] + 1)
  }
}

// The k-th most recent point of speck i (k = 0 is the newest).
export function historyPoint(history, index, k, target) {
  const slot = (history.head[index] - k + MAX_HISTORY * 2) % MAX_HISTORY
  const at = (index * MAX_HISTORY + slot) * 3
  target[0] = history.points[at]
  target[1] = history.points[at + 1]
  target[2] = history.points[at + 2]
  return target
}

export function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value))
}

// Normalised age, age / lifetime, runs from 0 at birth to 1 at death.
export function fadeWithAge(age, lifetime) {
  // #region fade-with-age
  const opacity = clamp(1 - age / lifetime, 0, 1)
  // #endregion
  return opacity
}
