import { useEffect, useRef } from 'react'
import { skyFrame } from '../state/skyFrame'
import {
  buildNebula, glowSprite, pickStarColor, rng, STAR_COLORS,
  type NebulaSpec, type Rgb,
} from './spaceLayers'

export type SkyView = 'orbit' | 'system' | 'surface'

// D-074: deep space behind the 3D canvas, painted in 2D and slid at several depths as the camera turns.
// Back to front: base gradient, one faint nebula, stars at several depths, then meteors. Stars move by their share of the
// camera turn (`f`), so the near layers cross the screen while the far ones barely shift.

// How strongly each view shows the sky: the surface has most of it above the horizon, so it gets the richest sky.
const MOOD: Record<SkyView, { nebula: number; decor: number; meteors: number; stars: number; shade: number }> = {
  orbit: { nebula: 0.12, decor: 1, meteors: 1, stars: 1, shade: 0 },
  system: { nebula: 0.08, decor: 0.75, meteors: 0.6, stars: 0.9, shade: 0 },
  surface: { nebula: 0.16, decor: 1.8, meteors: 2.4, stars: 1.25, shade: 0.18 },
}

const NEBULAE: Record<'far', NebulaSpec & { f: number; scale: number; alpha: number }> = {
  far: { size: 320, seed: 11, period: 3, octaves: 5, warp: 1.1, from: [204, 201, 192], to: [220, 217, 208], core: [172, 168, 157],
    low: 0.38, high: 0.78, gain: 0.6, contrast: 1.2, f: 0.1, scale: 1.5, alpha: 0.85 },
}

const STAR_LAYERS = [
  { density: 1 / 900, size: [0.6, 0.95], alpha: [0.25, 0.6], f: 0.08, glow: false },
  { density: 1 / 4200, size: [0.9, 1.3], alpha: [0.4, 0.8], f: 0.17, glow: false },
  { density: 1 / 14000, size: [1.2, 1.7], alpha: [0.6, 0.95], f: 0.32, glow: false },
  { density: 1 / 85000, size: [1.7, 2.5], alpha: [0.8, 1], f: 0.58, glow: true },
]
const PAD = 40

interface Star { x: number; y: number; r: number; alpha: number; phase: number; speed: number; color: number }
interface Meteor { x: number; y: number; dx: number; dy: number; speed: number; length: number; width: number; age: number; life: number; color: Rgb; fire: boolean }

interface Assets {
  nebulae: Partial<Record<keyof typeof NEBULAE, HTMLCanvasElement>>
  glints: HTMLCanvasElement[]
}
// Painted once per page load and kept across remounts; each piece lands in its own timer so the first frame is not held up.
let assets: Assets | null = null
const listeners = new Set<() => void>()
function loadAssets(onReady: () => void) {
  listeners.add(onReady)
  if (assets) return
  const made: Assets = { nebulae: {}, glints: STAR_COLORS.map(color => glowSprite(color)) }
  assets = made
  const jobs: (() => void)[] = [
    () => { made.nebulae.far = buildNebula(NEBULAE.far) },
  ]
  const next = () => {
    const job = jobs.shift()
    if (!job) return
    job()
    listeners.forEach(listener => listener())
    window.setTimeout(next, 16)
  }
  window.setTimeout(next, 0)
}

export function Starfield({ view }: { view: SkyView }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const viewRef = useRef(view)
  const redraw = useRef<() => void>(() => {})

  useEffect(() => {
    viewRef.current = view
    redraw.current()
  }, [view])

  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0, height = 0, frame = 0, last = 0, clock = 0, scale = 1
    const stars: Star[][][] = STAR_LAYERS.map(() => STAR_COLORS.map(() => []))
    const meteors: Meteor[] = []
    const mood = { ...MOOD[viewRef.current] }
    let nextMeteor = 2.5
    const random = rng(1380)
    const flight = rng(Date.now() >>> 0)

    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      scale = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const area = (width + PAD * 2) * (height + PAD * 2)
      STAR_LAYERS.forEach((layer, index) => {
        stars[index].forEach(group => { group.length = 0 })
        const count = Math.round(area * layer.density)
        for (let i = 0; i < count; i++) {
          const color = pickStarColor(random())
          stars[index][color].push({
            x: random() * (width + PAD * 2), y: random() * (height + PAD * 2),
            r: layer.size[0] + random() * (layer.size[1] - layer.size[0]),
            alpha: layer.alpha[0] + random() * random() * (layer.alpha[1] - layer.alpha[0]),
            phase: random() * Math.PI * 2, speed: 0.7 + random() * 1.8, color,
          })
        }
      })
      if (still) draw(0)
    }

    const spawnMeteor = (mode: typeof mood) => {
      const depth = 0.35 + 0.65 * Math.pow(flight(), 0.7)
      const fire = flight() < 0.12
      const angle = 2.5 + (flight() - 0.5) * 0.4
      const high = viewRef.current === 'surface' ? 0.4 : 0.55
      meteors.push({
        x: width * (0.25 + flight() * 0.85), y: height * (-0.04 + flight() * high),
        dx: Math.cos(angle), dy: Math.sin(angle),
        speed: (440 + 720 * depth) * (fire ? 0.7 : 1), length: (90 + 230 * depth) * (fire ? 1.7 : 1) * (0.8 + 0.2 * mode.decor),
        width: (1.1 + 1.7 * depth) * (fire ? 1.8 : 1), age: 0, life: 0.7 + flight() * 0.8,
        color: fire ? [176, 108, 66] : [92, 90, 86], fire,
      })
    }

    // A repeating pattern wraps without a seam, which drawing neighbouring copies does not.
    const patterns = new Map<HTMLCanvasElement, CanvasPattern>()
    const tile = (image: HTMLCanvasElement, size: number, offsetX: number, offsetY: number) => {
      let pattern = patterns.get(image)
      if (!pattern) { pattern = context.createPattern(image, 'repeat')!; patterns.set(image, pattern) }
      pattern.setTransform(new DOMMatrix().translate(wrap(offsetX, size), wrap(offsetY, size)).scale(size / image.width))
      context.fillStyle = pattern
      context.fillRect(0, 0, width, height)
    }

    const wrap = (value: number, span: number) => ((value % span) + span) % span

    const drawStars = (layerIndex: number, ox: number, oy: number, time: number, amount: number) => {
      const layer = STAR_LAYERS[layerIndex]
      const spanX = width + PAD * 2, spanY = height + PAD * 2
      stars[layerIndex].forEach((group, color) => {
        if (group.length === 0) return
        const [r, g, b] = STAR_COLORS[color]
        context.fillStyle = `rgb(${r},${g},${b})`
        for (const star of group) {
          const x = wrap(star.x + ox, spanX) - PAD, y = wrap(star.y + oy, spanY) - PAD
          if (x < -4 || x > width + 4 || y < -4 || y > height + 4) continue
          const twinkle = 0.72 + 0.28 * Math.sin(time * star.speed + star.phase)
          const alpha = star.alpha * twinkle * amount
          if (layer.glow) {
            const halo = star.r * 9
            context.globalAlpha = alpha * 0.55
            context.drawImage(assets!.glints[color], x - halo, y - halo, halo * 2, halo * 2)
            context.globalAlpha = alpha
            context.beginPath()
            context.arc(x, y, star.r * 0.75, 0, Math.PI * 2)
            context.fill()
            if (star.r > 2.15) {
              context.globalAlpha = alpha * 0.4
              context.fillRect(x - star.r * 6, y - 0.35, star.r * 12, 0.7)
              context.fillRect(x - 0.35, y - star.r * 6, 0.7, star.r * 12)
            }
          } else {
            context.globalAlpha = alpha
            if (star.r < 1.05) context.fillRect(x - star.r / 2, y - star.r / 2, star.r, star.r)
            else { context.beginPath(); context.arc(x, y, star.r, 0, Math.PI * 2); context.fill() }
          }
        }
      })
      context.globalAlpha = 1
    }

    const drawMeteor = (meteor: Meteor) => {
      const travelled = meteor.speed * meteor.age
      const headX = meteor.x + meteor.dx * travelled, headY = meteor.y + meteor.dy * travelled
      const grow = Math.min(1, meteor.age / 0.12)
      const fade = Math.pow(Math.sin(Math.PI * Math.min(1, meteor.age / meteor.life)), 0.6)
      const length = meteor.length * grow
      const tailX = headX - meteor.dx * length, tailY = headY - meteor.dy * length
      const [r, g, b] = meteor.color
      const trail = context.createLinearGradient(tailX, tailY, headX, headY)
      trail.addColorStop(0, `rgba(${r},${g},${b},0)`)
      trail.addColorStop(0.6, `rgba(${r},${g},${b},${0.45 * fade})`)
      trail.addColorStop(1, `rgba(${r},${g},${b},${0.95 * fade})`)
      context.strokeStyle = trail
      context.lineWidth = meteor.width
      context.lineCap = 'round'
      context.beginPath()
      context.moveTo(tailX, tailY)
      context.lineTo(headX, headY)
      context.stroke()
      const reach = meteor.width * (meteor.fire ? 7 : 4.5)
      const glow = context.createRadialGradient(headX, headY, 0, headX, headY, reach)
      glow.addColorStop(0, `rgba(${r},${g},${b},${0.8 * fade})`)
      glow.addColorStop(0.3, `rgba(${r},${g},${b},${0.3 * fade})`)
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
      context.fillStyle = glow
      context.fillRect(headX - reach, headY - reach, reach * 2, reach * 2)
    }

    const draw = (dt: number) => {
      const target = MOOD[viewRef.current]
      const ease = Math.min(1, dt * 2.5) || 1
      mood.nebula += (target.nebula - mood.nebula) * ease
      mood.decor += (target.decor - mood.decor) * ease
      mood.meteors += (target.meteors - mood.meteors) * ease
      mood.stars += (target.stars - mood.stars) * ease
      mood.shade += (target.shade - mood.shade) * ease
      context.setTransform(scale, 0, 0, scale, 0, 0)
      context.globalAlpha = 1
      context.globalCompositeOperation = 'source-over'
      const sky = context.createLinearGradient(0, 0, 0, height)
      // Warm paper, a little deeper toward the bottom; the surface view goes deeper still so the pale Drifter stands out.
      const deep = mood.shade
      const tone = (a: number[], b: number[]) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * deep)).join(',')})`
      sky.addColorStop(0, tone([250, 249, 245], [226, 222, 212]))
      sky.addColorStop(1, tone([250, 248, 243], [204, 199, 188]))
      context.fillStyle = sky
      context.fillRect(0, 0, width, height)

      const span = Math.max(width, height)
      const turn = height * 1.25
      const shiftX = (f: number) => skyFrame.yaw * turn * f - clock * 6 * f
      const shiftY = (f: number) => skyFrame.pitch * turn * f + clock * 1.5 * f
      const parts = assets!

      const nebula = (name: keyof typeof NEBULAE, amount: number) => {
        const spec = NEBULAE[name]
        const image = parts.nebulae[name]
        if (!image) return
        context.globalAlpha = Math.min(1, spec.alpha * amount)
                tile(image, span * spec.scale, shiftX(spec.f) + 120, shiftY(spec.f) + 60)
        context.globalAlpha = 1
        context.globalCompositeOperation = 'source-over'
      }
      nebula('far', mood.nebula)
      drawStars(0, shiftX(STAR_LAYERS[0].f), shiftY(STAR_LAYERS[0].f), clock, mood.stars)
      drawStars(1, shiftX(STAR_LAYERS[1].f), shiftY(STAR_LAYERS[1].f), clock, mood.stars)
      drawStars(2, shiftX(STAR_LAYERS[2].f), shiftY(STAR_LAYERS[2].f), clock, mood.stars)
      drawStars(3, shiftX(STAR_LAYERS[3].f), shiftY(STAR_LAYERS[3].f), clock, mood.stars)

      const vignette = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.45, width / 2, height / 2, Math.hypot(width, height) * 0.62)
      vignette.addColorStop(0, 'rgba(0,0,0,0)')
      vignette.addColorStop(1, 'rgba(110,100,86,0.015)')
      context.fillStyle = vignette
      context.fillRect(0, 0, width, height)

      if (!still) {
        for (const meteor of meteors) drawMeteor(meteor)
      }
    }

    const tick = (time: number) => {
      const dt = Math.min(0.1, (time - last) / 1000)
      last = time
      clock += dt
      nextMeteor -= dt
      if (nextMeteor <= 0) {
        spawnMeteor(mood)
        nextMeteor = (2.2 + flight() * 4.5) / mood.meteors
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        meteors[i].age += dt
        if (meteors[i].age > meteors[i].life) meteors.splice(i, 1)
      }
      draw(dt)
      frame = window.requestAnimationFrame(tick)
    }

    redraw.current = () => { if (still && width > 0) { Object.assign(mood, MOOD[viewRef.current]); draw(0) } }
    loadAssets(redraw.current)
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    if (!still) frame = window.requestAnimationFrame(time => { last = time; tick(time) })
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      listeners.delete(redraw.current)
      redraw.current = () => {}
    }
  }, [])

  return <canvas className="starfield" ref={ref} aria-hidden="true" />
}
