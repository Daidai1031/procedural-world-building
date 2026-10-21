import { perlin2d } from '../proceduralMaps/noiseMath.js'

// A wind map answers one question: at this spot (x, z), which way does the air
// go, and how strongly? Every map here writes its arrow into target as
// [x, y, z] and stays flat (y = 0), so the arrows can be drawn on the ground.

export function uniformField(strength) {
  return (x, z, target) => {
    target[0] = strength
    target[1] = 0
    target[2] = 0
    return target
  }
}

// The direction turns slowly across the ground, so specks dropped in different
// places read different arrows and drift apart.
export function varyingField(strength) {
  return (x, z, target) => {
    const angle = 0.9 * Math.sin(0.8 * z) + 0.5 * Math.sin(0.6 * x + 1)
    const length = strength * (0.7 + 0.3 * Math.cos(0.5 * z))
    target[0] = Math.cos(angle) * length
    target[1] = 0
    target[2] = Math.sin(angle) * length
    return target
  }
}

// Arrows circle the centre. The direction (-(z - cz), x - cx) is at a right
// angle to the line from the centre, so it goes round instead of in or out.
// Strength peaks at the radius and fades towards the centre and far away, so
// the arrow is never infinite, not even at the centre itself.
export function vortexField(strength, centreX, centreZ, radius) {
  return (x, z, target) => {
    const dx = x - centreX
    const dz = z - centreZ
    const scale = (2 * strength * radius) / (dx * dx + dz * dz + radius * radius)
    target[0] = -dz * scale
    target[1] = 0
    target[2] = dx * scale
    return target
  }
}

// Smooth noise, as in the Lesson 02 maps, read twice to get two directions.
export function gustField(strength, scale = 0.7, seed = 7) {
  return (x, z, target) => {
    target[0] = strength * perlin2d(x * scale, z * scale, seed) * 1.6
    target[1] = 0
    target[2] = strength * perlin2d(x * scale + 31.7, z * scale - 12.3, seed + 1) * 1.6
    return target
  }
}

const calm = (x, z, target) => {
  target[0] = target[1] = target[2] = 0
  return target
}

// The three layers added arrow by arrow. A layer that is switched off is calm.
export function windField({ breeze = calm, whirl = calm, gust = calm }) {
  const breezeBuffer = [0, 0, 0]
  const whirlBuffer = [0, 0, 0]
  const gustBuffer = [0, 0, 0]
  return (x, z, target) => {
    const breezeArrow = breeze(x, z, breezeBuffer)
    const whirlArrow = whirl(x, z, whirlBuffer)
    const gustArrow = gust(x, z, gustBuffer)
    // #region add-layers
    target[0] = breezeArrow[0] + whirlArrow[0] + gustArrow[0]
    // #endregion
    target[1] = 0
    target[2] = breezeArrow[2] + whirlArrow[2] + gustArrow[2]
    return target
  }
}

export function layeredWind(params, { useSwitches = true } = {}) {
  const on = (name) => !useSwitches || params[name]
  return windField({
    breeze: on('particleBreeze') ? uniformField(params.particleBreezeStrength) : undefined,
    whirl: on('particleWhirlpool')
      ? vortexField(params.particleWhirlStrength, params.particleWhirlX, params.particleWhirlZ, params.particleWhirlRadius)
      : undefined,
    gust: on('particleGusts') ? gustField(params.particleGustStrength) : undefined,
  })
}
