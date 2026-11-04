// D-074: the pieces of the deep-space backdrop, painted once with 2D noise and then slid around by Starfield.
// Everything is seeded and periodic, so a tile repeats without a seam however far the sky turns.

export type Rgb = [number, number, number]

export function rng(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]

function lattice(ix: number, iy: number, seed: number) {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(seed + 1, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

function noise(x: number, y: number, period: number, seed: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y)
  const fx = x - x0, fy = y - y0
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = ((x0 % period) + period) % period, b = (a + 1) % period
  const c = ((y0 % period) + period) % period, d = (c + 1) % period
  const top = lattice(a, c, seed) + (lattice(b, c, seed) - lattice(a, c, seed)) * sx
  const bottom = lattice(a, d, seed) + (lattice(b, d, seed) - lattice(a, d, seed)) * sx
  return top + (bottom - top) * sy
}

// Fractal noise that repeats every `period` cells, so it also tiles when u*period runs from 0 to period.
export function fbm(x: number, y: number, period: number, seed: number, octaves: number) {
  let sum = 0, amplitude = 0.5, norm = 0, p = period, fx = x, fy = y
  for (let o = 0; o < octaves; o++) {
    sum += amplitude * noise(fx, fy, p, seed + o * 31)
    norm += amplitude
    amplitude *= 0.5
    fx *= 2; fy *= 2; p *= 2
  }
  return sum / norm
}

function canvasOf(width: number, height = width) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

// ---------- Nebulae ----------

export interface NebulaSpec {
  size: number; seed: number; period: number; octaves: number
  warp: number // how far a second noise bends the first, in cells: 0 is soft clouds, 2 and more is filaments
  from: Rgb; to: Rgb; core: Rgb
  low: number; high: number // the density range that becomes visible
  gain: number; contrast: number
  dark?: boolean // dust lanes: opaque dark colour instead of light to be added
}

export function buildNebula(spec: NebulaSpec) {
  const { size, seed, period, octaves, warp, from, to, core, low, high, gain, contrast } = spec
  const canvas = canvasOf(size)
  const context = canvas.getContext('2d')!
  const image = context.createImageData(size, size)
  const data = image.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * period, v = (y / size) * period
      const qx = fbm(u, v, period, seed + 101, 3)
      const qy = fbm(u + 5.2, v + 1.3, period, seed + 202, 3)
      const n = fbm(u + warp * (qx - 0.5) * 2, v + warp * (qy - 0.5) * 2, period, seed, octaves)
      const density = Math.pow(smooth(low, high, n), contrast)
      if (density <= 0.002) continue
      const tint = fbm(u * 0.5, v * 0.5, period, seed + 303, 2)
      const color = spec.dark ? from : mixRgb(mixRgb(from, to, smooth(0.3, 0.7, tint)), core, density * density * 0.85)
      const at = (y * size + x) * 4
      data[at] = color[0]; data[at + 1] = color[1]; data[at + 2] = color[2]
      data[at + 3] = Math.min(255, density * gain * 255)
    }
  }
  context.putImageData(image, 0, 0)
  return canvas
}

// ---------- Stars ----------

// Spectral classes: blue-white, white, warm white, orange, faint red.
export const STAR_COLORS: Rgb[] = [[140, 138, 132], [120, 118, 112], [196, 168, 160], [160, 174, 190], [164, 182, 160]]
export const STAR_WEIGHTS = [0.4, 0.28, 0.12, 0.1, 0.1]

export function pickStarColor(roll: number) {
  let total = 0
  for (let i = 0; i < STAR_WEIGHTS.length; i++) { total += STAR_WEIGHTS[i]; if (roll < total) return i }
  return 1
}

export function glowSprite(color: Rgb) {
  const canvas = canvasOf(64)
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, `rgba(${color.join(',')}, 0.9)`)
  gradient.addColorStop(0.18, `rgba(${color.join(',')}, 0.35)`)
  gradient.addColorStop(1, `rgba(${color.join(',')}, 0)`)
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)
  return canvas
}
