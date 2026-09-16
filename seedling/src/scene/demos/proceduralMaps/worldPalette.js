import { Color } from 'three'
import { readToken } from '../../../styles/readToken.js'

export function elevationColors() {
  return [new Color(readToken('--water')), new Color(readToken('--moss')), new Color(readToken('--summit'))]
}

export function heightColor(value, target, colors, midpoint = 0.52) {
  if (value < midpoint) return target.lerpColors(colors[0], colors[1], Math.max(0, value / midpoint))
  return target.lerpColors(colors[1], colors[2], Math.min(1, (value - midpoint) / (1 - midpoint)))
}
