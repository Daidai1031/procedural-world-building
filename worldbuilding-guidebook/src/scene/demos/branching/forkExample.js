import { generate } from './lsystem.js'
import { parseInstructions } from './turtle.js'
import { interpretTree, radiusAtDepth } from './tree.js'

// Step 3: one hand-written fork, then two rewriting rules that make forks.
export const BRANCH_PROGRAM = parseInstructions('F[+F]F')
export const BRANCH_LENGTH = 1.2

// trunkPieces is how many F sit outside brackets in the rule. Each generation
// makes that many times more trunk, so the segment length is divided to match
// and every generation reaches about the same height.
export const FORK_RULES = {
  'One side': { rule: 'F[+F]F', trunkPieces: 2 },
  'Both sides': { rule: 'F[+F]F[-F]F', trunkPieces: 3 },
}
export const TREE_HEIGHT = 4.2

export function growFork(ruleName, generation) {
  const { rule, trunkPieces } = FORK_RULES[ruleName]
  const { strings } = generate('F', { F: rule }, generation)
  const reached = strings.length - 1
  return { text: strings[reached], length: TREE_HEIGHT / trunkPieces ** reached, generation: reached }
}

// Step 4: the two-sided fork with length and thickness chosen by depth.
export const SHAPE_RULE = 'Both sides'
export const BASE_RADIUS = 0.045
export const PICK_REACH = 0.15
export const DEPTH_TOKENS = ['--ink', '--water-deep', '--clay-deep', '--moss-deep', '--summit-deep']

// "Equal" ignores both ratios so the same graph can be compared with and
// without depth shaping.
export function buildShapedTree(params) {
  const { text, length } = growFork(SHAPE_RULE, params.branchingForkGeneration)
  const shaped = params.branchingShape === 'By depth'
  const lengthRatio = shaped ? params.branchingLengthRatio : 1
  const radiusRatio = shaped ? params.branchingRadiusRatio : 1
  const { segments } = interpretTree(parseInstructions(text), { angleDegrees: params.branchingAngle, length, lengthRatio })
  return segments.map((segment) => ({ ...segment, width: 2 * radiusAtDepth(BASE_RADIUS, radiusRatio, segment.depth) }))
}

// The id of the segment closest to a point, or null if the point is not on one.
export function nearestSegment(segments, x, y) {
  let best = null
  let bestDistance = Infinity
  for (const { id, from, to, width = 0 } of segments) {
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    const along = Math.max(0, Math.min(1, ((x - from[0]) * dx + (y - from[1]) * dy) / (dx * dx + dy * dy || 1)))
    const distance = Math.hypot(x - (from[0] + dx * along), y - (from[1] + dy * along))
    if (distance <= Math.max(width / 2, PICK_REACH) && distance < bestDistance) { best = id; bestDistance = distance }
  }
  return best
}
