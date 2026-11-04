import { useEffect, useRef } from 'react'

interface Star { x: number; y: number; r: number; depth: number; phase: number; tone: number }
interface Haze { x: number; y: number; r: number; vx: number; vy: number; color: string }

// Warm-paper deep space: dust motes drift in three depth layers over a few slow, pale pastel hazes.
const DRIFT = [-1, 0.42]
// Dust is mostly warm gray, with a few specks tinted to match the haze.
const TINTS = ['140, 138, 132', '140, 138, 132', '196, 168, 160', '160, 174, 190', '164, 182, 160', '178, 166, 184']
const HAZES: Omit<Haze, 'x' | 'y'>[] = [
  { r: 0.42, vx: 0.9, vy: 0.25, color: '236, 214, 208' },
  { r: 0.4, vx: -0.7, vy: 0.4, color: '208, 216, 224' },
  { r: 0.42, vx: 0.4, vy: -0.5, color: '212, 222, 210' },
  { r: 0.36, vx: -0.5, vy: -0.3, color: '224, 216, 228' },
]

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0, height = 0, frame = 0, last = 0
    const stars: Star[] = []
    const hazes: Haze[] = []
    const random = (() => { let seed = 1380; return () => (seed = (seed * 16807) % 2147483647) / 2147483647 })()

    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width
      canvas.height = height
      stars.length = 0
      const count = Math.round(width * height / 5000)
      for (let i = 0; i < count; i++) {
        const depth = random() < 0.6 ? 0 : random() < 0.7 ? 1 : 2
        stars.push({ x: random() * width, y: random() * height, depth, phase: random() * Math.PI * 2, tone: random(),
          r: [0.9, 1.4, 2][depth] })
      }
      hazes.length = 0
      HAZES.forEach((haze, index) => hazes.push({ ...haze, x: width * (0.2 + 0.3 * index), y: height * (0.3 + 0.25 * ((index * 2) % 3)) }))
    }

    const draw = (time: number, dt: number) => {
      // A near-white warm base; the haze hues are the same warm-gray family as the planet's rock.
      context.fillStyle = '#faf9f5'
      context.fillRect(0, 0, width, height)
      const size = Math.max(width, height)
      for (const haze of hazes) {
        haze.x += haze.vx * dt * 6
        haze.y += haze.vy * dt * 6
        const reach = haze.r * size
        if (haze.x > width + reach) haze.x = -reach
        if (haze.x < -reach) haze.x = width + reach
        if (haze.y > height + reach) haze.y = -reach
        if (haze.y < -reach) haze.y = height + reach
        const gradient = context.createRadialGradient(haze.x, haze.y, 0, haze.x, haze.y, reach)
        gradient.addColorStop(0, `rgba(${haze.color}, 0.2)`)
        gradient.addColorStop(1, `rgba(${haze.color}, 0)`)
        context.fillStyle = gradient
        context.fillRect(0, 0, width, height)
      }
      for (const star of stars) {
        const speed = (star.depth + 1) * 2.4
        star.x += DRIFT[0] * speed * dt
        star.y += DRIFT[1] * speed * dt
        if (star.x < -2) star.x = width + 2
        if (star.y > height + 2) star.y = -2
        const twinkle = 0.65 + 0.35 * Math.sin(time / 1400 + star.phase)
        const alpha = (0.2 + star.depth * 0.1) * twinkle
        context.fillStyle = `rgba(${TINTS[Math.floor(star.tone * TINTS.length)]}, ${alpha})`
        context.beginPath()
        context.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        context.fill()
      }
    }

    const tick = (time: number) => {
      const dt = Math.min(0.1, (time - last) / 1000)
      last = time
      draw(time, dt)
      frame = window.requestAnimationFrame(tick)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    if (still) draw(0, 0)
    else frame = window.requestAnimationFrame(time => { last = time; tick(time) })
    return () => { window.cancelAnimationFrame(frame); observer.disconnect() }
  }, [])

  return <canvas className="starfield" ref={ref} aria-hidden="true" />
}
