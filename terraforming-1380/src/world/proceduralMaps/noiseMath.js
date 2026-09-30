import { resolveFunction } from './functionOverrides.js'

const UINT32_MAX = 4294967295

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function lerp(a, b, amount) {
  return a + (b - a) * amount
}

function fade(value) {
  return value * value * value * (value * (value * 6 - 15) + 10)
}

function hash2D(x, y, seed) {
  let hash = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  return ((hash ^ (hash >>> 16)) >>> 0) / UINT32_MAX
}

function whiteNoise2D(x, y, seed) {
  return hash2D(Math.floor(x), Math.floor(y), seed)
}

export function valueNoise2D(x, y, seed) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = fade(x - x0)
  const ty = fade(y - y0)
  const bottom = lerp(hash2D(x0, y0, seed), hash2D(x0 + 1, y0, seed), tx)
  const top = lerp(hash2D(x0, y0 + 1, seed), hash2D(x0 + 1, y0 + 1, seed), tx)

  return lerp(bottom, top, ty)
}

function gradientDot(ix, iy, x, y, seed) {
  const angle = hash2D(ix, iy, seed) * Math.PI * 2
  const gradientX = Math.cos(angle)
  const gradientY = Math.sin(angle)
  return gradientX * (x - ix) + gradientY * (y - iy)
}

// Blend the corner gradients with eased distances inside this grid cell.
export function perlin2d(x, y, seed) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = fade(x - x0)
  const ty = fade(y - y0)
  const bottom = lerp(
    gradientDot(x0, y0, x, y, seed),
    gradientDot(x0 + 1, y0, x, y, seed),
    tx,
  )
  const top = lerp(
    gradientDot(x0, y0 + 1, x, y, seed),
    gradientDot(x0 + 1, y0 + 1, x, y, seed),
    tx,
  )

  return clamp01(0.5 + lerp(bottom, top, ty) * 0.72)
}

function worleyNoise2D(x, y, seed) {
  const cellX = Math.floor(x)
  const cellY = Math.floor(y)
  let closestDistance = Infinity

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const neighborX = cellX + offsetX
      const neighborY = cellY + offsetY
      const pointX = neighborX + hash2D(neighborX, neighborY, seed)
      const pointY = neighborY + hash2D(neighborX, neighborY, seed + 1013)
      const distance = Math.hypot(x - pointX, y - pointY)
      closestDistance = Math.min(closestDistance, distance)
    }
  }

  return clamp01(closestDistance)
}

function baseNoise(type, x, y, seed) {
  if (type === 'white') return whiteNoise2D(x * 16, y * 16, seed)
  if (type === 'value') return resolveFunction('valueNoise2D', valueNoise2D)(x, y, seed)
  if (type === 'worley') return worleyNoise2D(x, y, seed)
  return resolveFunction('perlin2d', perlin2d)(x, y, seed)
}

export function fractalNoise(type, x, y, settings) {
  // #region noise-octaves
  let value = 0
  let amplitude = 1
  let frequency = settings.frequency
  let amplitudeTotal = 0

  for (let octave = 0; octave < settings.octaves; octave += 1) {
    value += baseNoise(type, x * frequency, y * frequency, settings.seed + octave * 131) * amplitude
    amplitudeTotal += amplitude
    amplitude *= settings.persistence
    frequency *= 2
  }

  return value / amplitudeTotal
  // #endregion
}

export function shapeValue(value, shaping) {
  if (shaping === 'ridged') return 1 - Math.abs(value * 2 - 1) // Fold into crests.
  if (shaping === 'billow') return Math.sqrt(Math.abs(value * 2 - 1))
  if (shaping === 'turbulence') return clamp01(Math.abs(value - 0.5) * 2.4)
  if (shaping === 'terracing') return Math.round(value * 6) / 6
  if (shaping === 'power') return value ** 2.2
  return value
}

export function sampleProceduralMap(x, y, settings) {
  const override = resolveFunction('sampleProceduralMap', null)
  if (override) return override(x, y, settings)
  let sampleX = x
  let sampleY = y

  // #region domain-warp
  if (settings.shaping === 'domainWarp') {
    const warpSettings = {
      ...settings,
      frequency: settings.frequency * 0.65,
      octaves: Math.min(settings.octaves, 3),
    }
    const warpX = resolveFunction('fractalNoise', fractalNoise)('perlin', x + 19.1, y + 7.7, warpSettings) - 0.5
    const warpY = resolveFunction('fractalNoise', fractalNoise)('perlin', x - 5.2, y + 31.4, warpSettings) - 0.5
    sampleX += warpX * settings.warpStrength
    sampleY += warpY * settings.warpStrength
  }
  // #endregion

  const value = resolveFunction('fractalNoise', fractalNoise)(settings.noiseType, sampleX, sampleY, settings)
  return resolveFunction('shapeValue', shapeValue)(value, settings.shaping)
}

export const DEFAULT_MAP_SETTINGS = {
  noiseType: 'perlin',
  shaping: 'normal',
  frequency: 0.32,
  octaves: 4,
  persistence: 0.5,
  amplitude: 2.4,
  resolution: 64,
  seed: 12,
  warpStrength: 2.5,
}
