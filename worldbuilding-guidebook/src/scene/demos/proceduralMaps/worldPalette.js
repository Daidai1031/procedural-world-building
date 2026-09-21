import { Color } from 'three'
import { readToken } from '../../../styles/readToken.js'

// Low ground is olive green, so it never reads as water: the only blue in a
// terrain is the water itself.
export function elevationColors(grayscale = false) {
  const tokens = grayscale
    ? ['--terrain-gray-low', '--terrain-gray-mid', '--terrain-gray-high']
    : ['--meadow-deep', '--moss', '--summit']
  return tokens.map((token) => new Color(readToken(token)))
}

export function heightColor(value, target, colors, midpoint = 0.52) {
  if (value < midpoint) return target.lerpColors(colors[0], colors[1], Math.max(0, value / midpoint))
  return target.lerpColors(colors[1], colors[2], Math.min(1, (value - midpoint) / (1 - midpoint)))
}
