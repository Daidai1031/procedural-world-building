// The hero title is drawn as sand: "Learn it." blows in from the planet, then a leaning "Shape it.".
// Hovering loosens the grains under the pointer; pressing digs them out, and the hole refills.
// The h1 keeps its real text underneath for readers, search and a no-script fallback.

const title = document.querySelector('.hero-title-editorial')
const hero = title?.closest('.hero')
const planet = hero?.querySelector('.planet-stage')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

const ARRIVE = 0, REST = 1, FALL = 2, DUG = 3, RETURN = 4
const START = 520 // after the planet has begun to settle
const LINE_GAP = 1700 // "Shape it." starts once "Learn it." has mostly landed
const LOOSEN_R = 58, DIG_R = 24, REFILL_AFTER = 2600
const TILT = -4 * Math.PI / 180
const COLORS = [
  '#2f302c', '#353632', '#3f403b', '#4b4c45', '#5a5a52', '#77746a',
  '#a9542b', '#b45d31', '#c56a3a', '#cd7444', '#d9875a', '#e3a576',
]

const rand = (a = 0, b = 1) => a + Math.random() * (b - a)
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5
const clamp01 = t => Math.max(0, Math.min(1, t))
const easeOutCubic = t => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

if (title && hero) document.fonts.load('400 100px Audiowide').then(start, () => {})

function start() {
  const canvas = document.createElement('canvas')
  canvas.className = 'hero-dust'
  canvas.setAttribute('aria-hidden', 'true')
  hero.append(canvas)
  const ctx = canvas.getContext('2d')
  const pointer = { x: 0, y: 0, over: false, down: false }
  // Time runs from page load, so a late module joins the entrance instead of replaying it.
  const begin = Math.max(0, performance.now() - START)
  let grains = [], groups = [], lastDig = -1e9, visible = true

  // Each span is redrawn on a scratch canvas at its laid-out position, then sampled into grains.
  function build() {
    // Drops the CSS entrance offset so the spans are measured where they finally sit.
    title.classList.add('is-dust')
    const dpr = Math.min(2, devicePixelRatio || 1)
    const w = hero.clientWidth, h = hero.clientHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const box = hero.getBoundingClientRect()
    const scratch = document.createElement('canvas')
    scratch.width = w
    scratch.height = h
    const sctx = scratch.getContext('2d', { willReadFrequently: true })
    const measure = span => {
      const style = getComputedStyle(span)
      const rect = span.getBoundingClientRect()
      sctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      sctx.letterSpacing = style.letterSpacing
      return { style, rect, baseline: rect.top - box.top + sctx.measureText(span.textContent).fontBoundingBoxAscent }
    }
    // "Shape it." leans, turning about its right end on the baseline so the S dips away from the line above.
    const accentLine = title.querySelector('.hero-title-action-accent')
    const accentEnd = measure(accentLine.lastElementChild)
    const pivotX = accentEnd.rect.right - box.left, pivotY = accentEnd.baseline
    const lean = Math.ceil((accentEnd.rect.right - accentLine.firstElementChild.getBoundingClientRect().left) * Math.sin(-TILT)) + 4
    grains = []
    for (const span of title.querySelectorAll('.hero-title-action > span')) {
      const { style, rect, baseline } = measure(span)
      const accent = span.closest('.hero-title-action-accent')
      sctx.clearRect(0, 0, w, h)
      const x0 = rect.left - box.left, top = rect.top - box.top
      if (accent) {
        sctx.translate(pivotX, pivotY)
        sctx.rotate(TILT)
        sctx.translate(-pivotX, -pivotY)
      }
      sctx.fillText(span.textContent, x0, baseline)
      sctx.setTransform(1, 0, 0, 1, 0, 0)
      const pad = accent ? lean : 0
      const left = Math.max(0, Math.floor(x0) - 4), right = Math.min(w, Math.ceil(rect.right - box.left) + 4)
      const upper = Math.max(0, Math.floor(top) - pad), lower = Math.min(h, Math.ceil(rect.bottom - box.top) + pad)
      const data = sctx.getImageData(0, 0, w, h).data
      const alpha = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : data[(Math.floor(y) * w + Math.floor(x)) * 4 + 3]
      // Initials are coarse gravel, the rest is fine sand.
      const cap = span.classList.contains('hero-title-cap')
      const step = cap ? 2.6 : 1.7, grain = cap ? 2.5 : 1.7
      const palette = accent ? 6 : 0
      const lineDelay = START + (accent ? LINE_GAP : 0)
      for (let y = upper; y <= lower; y += step) for (let x = left; x <= right; x += step) {
        if (alpha(x, y) < 140) continue
        const tx = x + rand(-0.5, 0.5) * step, ty = y + rand(-0.5, 0.5) * step
        grains.push({
          tx, ty, x: tx, y: ty, sx: 0, sy: 0, t0: 0, vx: 0, vy: 0,
          color: palette + Math.min(5, Math.floor(Math.pow(Math.random(), 1.8) * 6)),
          size: grain * (Math.random() < 0.1 ? rand(1.5, 2) : rand(0.95, 1.4)),
          bottom: alpha(x, y + step * 2) < 60,
          state: reducedMotion ? REST : ARRIVE,
          phase: rand(0, 6.283),
          ox: gauss() * 150, oy: gauss() * 150, curl: rand(-1, 1) * 120,
          delay: lineDelay + (tx - left) / 520 * 600 + rand(0, 320), dur: rand(900, 1300),
        })
      }
    }
    groups = COLORS.map((_, i) => grains.filter(g => g.color === i))
  }

  function draw(g, x, y, alpha) {
    if (alpha <= 0) return
    if (alpha < 1) ctx.globalAlpha = alpha
    ctx.fillRect(x, y, g.size, g.size)
    if (alpha < 1) ctx.globalAlpha = 1
  }

  function loosen(g, now) {
    g.state = FALL
    g.t0 = now
    g.sx = g.x
    g.sy = g.y
    g.vx = rand(-0.15, 0.15)
    g.vy = rand(0, 0.4)
  }

  function dig(now) {
    for (const g of grains) {
      if (g.state !== REST) continue
      const dx = g.x - pointer.x, dy = g.y - pointer.y, d2 = dx * dx + dy * dy
      if (d2 > DIG_R * DIG_R) continue
      const d = Math.sqrt(d2) || 1
      // Thrown up and outward, like spoil off a shovel.
      g.state = DUG
      g.t0 = now
      g.sx = g.x
      g.sy = g.y
      g.vx = dx / d * rand(0.8, 3) + rand(-0.6, 0.6)
      g.vy = -rand(2.2, 5) + dy / d * 0.8
    }
    lastDig = now
  }

  function frame(now) {
    requestAnimationFrame(frame)
    if (!visible) return
    const t = now - begin
    ctx.clearRect(0, 0, hero.clientWidth, hero.clientHeight)
    if (pointer.down) dig(now)
    if (!reducedMotion && t > START + LINE_GAP + 2400) {
      // A slow trickle off the lower edges of the letters.
      for (let n = 0; n < 2; n++) {
        const g = grains[Math.floor(rand(0, grains.length))]
        if (g?.bottom && g.state === REST) loosen(g, now)
      }
    }
    // Dust leaves the planet wherever it is in its own arrival animation.
    let px = 0, py = 0
    if (t < START + LINE_GAP + 2600 && planet) {
      const box = hero.getBoundingClientRect(), p = planet.getBoundingClientRect()
      px = p.left - box.left + p.width / 2
      py = p.top - box.top + p.height / 2
    }
    const refill = now - lastDig > REFILL_AFTER
    const loosening = !reducedMotion && pointer.over && !pointer.down
    for (let i = 0; i < groups.length; i++) {
      ctx.fillStyle = COLORS[i]
      for (const g of groups[i]) {
        if (g.state === ARRIVE) {
          const k = clamp01((t - g.delay) / g.dur)
          if (k <= 0) continue
          const e = easeInOutCubic(k)
          const sx = px + g.ox, sy = py + g.oy
          const nx = -(g.ty - sy), ny = g.tx - sx, nl = Math.hypot(nx, ny) || 1
          const bend = Math.sin(e * Math.PI) * g.curl
          g.x = sx + (g.tx - sx) * e + nx / nl * bend
          g.y = sy + (g.ty - sy) * e + ny / nl * bend
          if (k >= 1) { g.state = REST; g.x = g.tx; g.y = g.ty }
          draw(g, g.x, g.y, clamp01(k * 3))
        } else if (g.state === REST) {
          // Near the pointer the grains shiver and sag, and now and then one comes free.
          let ox = 0, oy = 0
          if (loosening) {
            const dx = g.tx - pointer.x, dy = g.ty - pointer.y, d2 = dx * dx + dy * dy
            if (d2 < LOOSEN_R * LOOSEN_R) {
              const k = Math.pow(1 - Math.sqrt(d2) / LOOSEN_R, 1.4)
              ox = Math.sin(now * 0.05 + g.phase) * k * 1.3
              oy = Math.cos(now * 0.043 + g.phase * 1.7) * k * 0.9 + k * 1.6
              if (Math.random() < 0.004 * k) {
                g.x = g.tx + ox
                g.y = g.ty + oy
                loosen(g, now)
              }
            }
          }
          if (g.state === REST) { g.x = g.tx + ox; g.y = g.ty + oy }
          draw(g, g.x, g.y, 1)
        } else if (g.state === FALL) {
          const ft = now - g.t0
          if (ft >= 1100) { g.state = REST; g.x = g.tx; g.y = g.ty; draw(g, g.x, g.y, 1); continue }
          g.vy += 0.05
          g.sx += g.vx
          g.sy += g.vy
          draw(g, g.sx, g.sy, 1 - ft / 1100)
          // The grain's home spot refills a moment later.
          if (ft > 700) draw(g, g.tx, g.ty, (ft - 700) / 400)
        } else if (g.state === DUG) {
          const ft = now - g.t0
          if (ft < 1000) {
            g.vy += 0.2
            g.vx *= 0.985
            g.sx += g.vx
            g.sy += g.vy
            draw(g, g.sx, g.sy, 1 - ft / 1000)
          } else if (refill && reducedMotion) {
            g.state = REST
            g.x = g.tx
            g.y = g.ty
          } else if (refill) {
            // The hole fills back in: sand slides up from just below the crater.
            g.state = RETURN
            g.t0 = now + rand(0, 700)
            g.dur = rand(700, 1200)
            g.sx = g.tx + gauss() * 28
            g.sy = g.ty + rand(18, 56)
          }
        } else {
          const k = clamp01((now - g.t0) / g.dur)
          if (k <= 0) continue
          const e = easeOutCubic(k)
          g.x = g.sx + (g.tx - g.sx) * e
          g.y = g.sy + (g.ty - g.sy) * e
          if (k >= 1) { g.state = REST; g.x = g.tx; g.y = g.ty }
          draw(g, g.x, g.y, clamp01(k * 2.5))
        }
      }
    }
  }

  const toLocal = event => {
    const box = hero.getBoundingClientRect()
    pointer.x = event.clientX - box.left
    pointer.y = event.clientY - box.top
  }
  title.addEventListener('pointerenter', () => { pointer.over = true })
  title.addEventListener('pointerleave', () => { pointer.over = false })
  title.addEventListener('pointerdown', event => {
    if (event.button !== 0) return
    event.preventDefault()
    toLocal(event)
    pointer.down = true
  })
  hero.addEventListener('pointermove', toLocal)
  addEventListener('pointerup', () => { pointer.down = false })
  addEventListener('pointercancel', () => { pointer.down = false })

  let pending = 0
  new ResizeObserver(() => {
    cancelAnimationFrame(pending)
    pending = requestAnimationFrame(build)
  }).observe(hero)
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }).observe(hero)
  build()
  requestAnimationFrame(frame)
}
