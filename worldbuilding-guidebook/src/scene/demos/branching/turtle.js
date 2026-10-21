export const TURTLE_SYMBOLS = ['F', '+', '-', '[', ']']

// Headings are measured in radians, anticlockwise from straight up, so the pen
// starts pointing up the page and a left turn adds to the heading.
// depth counts the brackets the pen is inside, parentId is the segment the
// next one will attach to, and stack holds the spots saved by [.
export const TURTLE_START = { x: 0, y: 0, heading: 0, segmentCount: 0, depth: 0, parentId: null, stack: [] }

// Every [ needs a later ] and no ] may come before its [. A bad list is refused
// before anything is drawn.
export function parseInstructions(text) {
  const symbols = Array.from(text.replace(/\s+/g, ''))
  const unknown = symbols.find((symbol) => !TURTLE_SYMBOLS.includes(symbol))
  if (unknown) throw new Error(`Unsupported symbol "${unknown}"`)
  let open = 0
  for (const symbol of symbols) {
    if (symbol === '[') open += 1
    if (symbol === ']') open -= 1
    if (open < 0) throw new Error('Unmatched "]"')
  }
  if (open > 0) throw new Error('Unmatched "["')
  return symbols
}

// Remember where the pen is, which way it faces, how deep it is and which
// segment it hangs from, then go one level deeper.
function save(state) {
  const { x, y, heading, depth, parentId } = state
  return { ...state, depth: state.depth + 1, stack: [...state.stack, { x, y, heading, depth, parentId }] }
}

// Go back to the latest saved spot: its position, heading, depth and parent.
function restore(state) {
  if (state.stack.length === 0) throw new Error('Unmatched "]"')
  const saved = state.stack.at(-1)
  // #region restore-saved
  return { ...state, ...saved, stack: state.stack.slice(0, -1) }
  // #endregion
}

// One instruction in, the pen's next state out. Only F moves the pen.
export function advance(state, symbol, turn, length) {
  // #region turn-left
  if (symbol === '+') return { ...state, heading: state.heading + turn }
  // #endregion
  if (symbol === '-') return { ...state, heading: state.heading - turn }
  if (symbol === '[') return save(state)
  if (symbol === ']') return restore(state)
  return {
    ...state,
    x: state.x - Math.sin(state.heading) * length,
    y: state.y + Math.cos(state.heading) * length,
    segmentCount: state.segmentCount + 1,
    parentId: state.segmentCount,
  }
}

// Plays a whole instruction list. states[0] is the start and states[n] is the
// pen after n instructions, so a playback cursor can index straight into it.
export function interpret(instructions, { angleDegrees, length }) {
  const turn = (angleDegrees * Math.PI) / 180
  const states = [TURTLE_START]
  const segments = []
  for (const [tokenIndex, symbol] of instructions.entries()) {
    const before = states[tokenIndex]
    const after = advance(before, symbol, turn, length)
    if (symbol === 'F') segments.push({ from: [before.x, before.y], to: [after.x, after.y], tokenIndex })
    states.push(after)
  }
  return { states, segments }
}
