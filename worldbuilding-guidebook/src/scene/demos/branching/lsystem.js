// Teaching limits, not universal ones: a generation that would exceed either
// is refused, and the last valid generation stays on screen.
export const DEFAULT_LIMITS = { maxSymbols: 20000, maxSegments: 4096 }

export function countSymbol(text, symbol) {
  let count = 0
  for (const character of text) if (character === symbol) count += 1
  return count
}

// One pass over the old string. Every symbol is replaced from the old string
// only, and a symbol with no rule survives unchanged.
export function rewrite(text, rules) {
  let next = ''
  for (const symbol of text) {
    // #region replace-symbol
    next += rules[symbol] ?? symbol
    // #endregion
  }
  return next
}

// strings[n] is generation n. If a pass would pass a limit, generation stops
// and `stopped` says which generation was refused and why.
export function generate(axiom, rules, generations, limits = DEFAULT_LIMITS) {
  const strings = [axiom]
  for (let generation = 1; generation <= generations; generation += 1) {
    const next = rewrite(strings[generation - 1], rules)
    if (next.length > limits.maxSymbols) return { strings, stopped: { generation, reason: 'symbols' } }
    if (countSymbol(next, 'F') > limits.maxSegments) return { strings, stopped: { generation, reason: 'segments' } }
    strings.push(next)
  }
  return { strings, stopped: null }
}
