import { advance, TURTLE_START } from './turtle.js'

export const MAX_RADIUS = 0.1

// Thickness follows branch depth, not rewrite generation: the more brackets a
// branch is nested in, the more times the ratio is applied.
export function radiusAtDepth(baseRadius, radiusRatio, depth) {
  // #region depth-radius
  return Math.min(MAX_RADIUS, baseRadius * radiusRatio ** depth)
  // #endregion
}

// Like interpret, but every segment also records its id, the segment it hangs
// from and its depth, and the length shrinks with depth. The graph of
// connections depends on the instructions only, never on the ratio.
export function interpretTree(instructions, { angleDegrees, length, lengthRatio = 1 }) {
  const turn = (angleDegrees * Math.PI) / 180
  const states = [TURTLE_START]
  const segments = []
  for (const [tokenIndex, symbol] of instructions.entries()) {
    const before = states[tokenIndex]
    const reach = length * lengthRatio ** before.depth
    const after = advance(before, symbol, turn, reach)
    if (symbol === 'F') {
      segments.push({
        id: before.segmentCount, parentId: before.parentId, depth: before.depth,
        from: [before.x, before.y], to: [after.x, after.y], length: reach, tokenIndex,
      })
    }
    states.push(after)
  }
  return { states, segments }
}
