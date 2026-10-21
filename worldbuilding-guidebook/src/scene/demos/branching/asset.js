import { createRandom } from '../distributions/random.js'
import { FORK_RULES } from './forkExample.js'
import { generate } from './lsystem.js'
import { radiusAtDepth } from './tree.js'
import { parseInstructions } from './turtle.js'

// Bump this when a change would make the same configuration and seed draw a
// different asset, so a saved preset can tell which generator made it.
export const GENERATOR_VERSION = 1

const GOLDEN_ANGLE = (137.5 * Math.PI) / 180
const MAX_JITTER = 0.5

// Scales one random number into a small change around 1. At zero variation the
// result is exactly 1, so the asset is the same planar skeleton as the 2D lab.
export function jitter(random, variation) {
  // #region seeded-jitter
  return 1 + (random() * 2 - 1) * variation
  // #endregion
}

// The body each preset fixes. Its rule, height and trunk radius are part of the
// species; the sliders then move the angle, ratios, spread and variation.
export const ASSET_PRESETS = {
  'Cave Fan': {
    body: { rule: 'Fan', height: 1.3, baseRadius: 0.06 },
    values: { branchingAssetGeneration: 3, branchingAssetAngle: 50, branchingAssetLengthRatio: 0.85, branchingAssetRadiusRatio: 0.75, branchingSpread: 0.5, branchingVariation: 0.2 },
  },
  'Stone Coral': {
    body: { rule: 'One side', height: 1.2, baseRadius: 0.14 },
    values: { branchingAssetGeneration: 3, branchingAssetAngle: 50, branchingAssetLengthRatio: 0.9, branchingAssetRadiusRatio: 1, branchingSpread: 0.7, branchingVariation: 0.15 },
  },
  'Whisper Root': {
    body: { rule: 'One side', height: 3, baseRadius: 0.07 },
    values: { branchingAssetGeneration: 3, branchingAssetAngle: 28, branchingAssetLengthRatio: 0.65, branchingAssetRadiusRatio: 0.55, branchingSpread: 0.4, branchingVariation: 0.3 },
  },
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

// Rodrigues: turn a vector about a unit axis. The pen's frame turns as one
// piece, so direction and left stay at right angles.
function rotate(vector, axis, angle) {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const along = dot(axis, vector) * (1 - cosine)
  const across = cross(axis, vector)
  return vector.map((component, index) => component * cosine + across[index] * sine + axis[index] * along)
}

// The rules an asset can grow from. The two fork rules are the ones from the
// 2D lab, sized by their trunk. Fan forks at the tip instead, so its size is
// measured from the finished shape and scaled to the design's height.
const ASSET_RULES = {
  ...FORK_RULES,
  Fan: { rule: 'F[+F][-F]', normalize: true },
}

// A pen in three dimensions. dir is where it faces and left is the way a +
// turns it; their cross product is the turning plane. Each [ rolls the frame
// about dir by spread × a golden-angle step, so side branches leave the plane
// by a bounded, repeatable amount. At spread 0 nothing rolls and the graph
// stays flat.
function walk(instructions, { unitLength, angle, lengthRatio, radiusRatio, spread, variation, seed, baseRadius }) {
  const turn = (angle * Math.PI) / 180
  const amount = Math.min(MAX_JITTER, variation)
  const random = createRandom(seed)
  let state = { position: [0, 0, 0], dir: [0, 1, 0], left: [-1, 0, 0], depth: 0, parentId: null }
  const stack = []
  const segments = []
  let branches = 0
  for (const symbol of instructions) {
    if (symbol === 'F') {
      const length = unitLength * lengthRatio ** state.depth * jitter(random, amount)
      const to = state.position.map((component, index) => component + state.dir[index] * length)
      const id = segments.length
      segments.push({
        id, parentId: state.parentId, depth: state.depth, from: state.position, to, length,
        radius: radiusAtDepth(baseRadius, radiusRatio, state.depth),
      })
      state = { ...state, position: to, parentId: id }
    } else if (symbol === '+' || symbol === '-') {
      const sign = symbol === '+' ? 1 : -1
      const axis = cross(state.dir, state.left)
      const angleNow = sign * turn * jitter(random, amount)
      state = { ...state, dir: rotate(state.dir, axis, angleNow), left: rotate(state.left, axis, angleNow) }
    } else if (symbol === '[') {
      stack.push(state)
      branches += 1
      state = { ...state, depth: state.depth + 1, left: rotate(state.left, state.dir, spread * GOLDEN_ANGLE * branches) }
    } else {
      state = stack.pop()
    }
  }
  return segments
}

export function generateAsset(config) {
  const { rule, generation, height } = config
  const { rule: replacement, trunkPieces, normalize } = ASSET_RULES[rule]
  const { strings } = generate('F', { F: replacement }, generation)
  const reached = strings.length - 1
  const instructions = parseInstructions(strings[reached])
  let unitLength = height / trunkPieces ** reached
  if (normalize) {
    // The same asset without variation, built once at unit length, sets the scale.
    const unit = walk(instructions, { ...config, unitLength: 1, variation: 0 })
    unitLength = height / Math.max(...unit.map((segment) => segment.to[1]))
  }
  return { segments: walk(instructions, { ...config, unitLength }), version: GENERATOR_VERSION }
}

// Everything about an asset except how it is looked at.
export function assetConfigFromParams(params) {
  const { body } = ASSET_PRESETS[params.branchingPreset]
  return {
    ...body,
    generation: params.branchingAssetGeneration,
    angle: params.branchingAssetAngle,
    lengthRatio: params.branchingAssetLengthRatio,
    radiusRatio: params.branchingAssetRadiusRatio,
    spread: params.branchingSpread,
    variation: params.branchingVariation,
    seed: params.branchingSeed,
  }
}
