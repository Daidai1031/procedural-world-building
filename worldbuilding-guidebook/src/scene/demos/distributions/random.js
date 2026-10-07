// A seeded generator (mulberry32). The same seed always gives the same
// sequence of values from 0 up to, but not including, 1.
export function createRandom(seed) {
  let state = seed >>> 0

  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0
    let value = Math.imul(state ^ (state >>> 15), state | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
