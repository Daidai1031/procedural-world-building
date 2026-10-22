import * as THREE from 'three'
import { createResidentKit, createResidentModel } from '../../terraforming-1380/src/render/models/residents'
import { planetNatives, residentSpecies } from '../../terraforming-1380/src/content/residents'
import { palette } from '../../terraforming-1380/src/config/palette'

// Resident profiles: the game's own species text and bodies. One renderer draws every visible portrait into its card.

const ORDER = ['facet', 'cairn', 'sentinel', 'moss', 'periscope', 'crystal', 'hermit', 'shard', 'slab']
const TRAIT = {
  facet: 'Curious', moss: 'Homebody', slab: 'Stoic', crystal: 'Skittish', sentinel: 'Lookout',
  hermit: 'Loner', cairn: 'Gregarious', periscope: 'Watcher', shard: 'Restless',
}
// What each species does when you come close, following its temperament.
const REACTION = {
  facet: { peek: 1 }, moss: { tuck: 1 }, slab: {}, crystal: { tuck: 1, shut: 1, shake: 0.6 }, sentinel: { peek: 1 },
  hermit: { tuck: 1, shut: 1 }, cairn: { shake: 0.7 }, periscope: { tuck: 1, peek: 1 }, shard: { walk: 1 },
}
const REST = { tuck: 0, shut: 0, peek: 0, shake: 0, walk: 0 }
const SIZE = 220

const list = document.querySelector('[data-residents]')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

function card(kind, index) {
  const species = residentSpecies[kind]
  const home = planetNatives.find(native => native.resident === kind)
  const element = document.createElement('li')
  element.className = 'resident-card'
  element.style.setProperty('--i', index)
  element.tabIndex = 0
  element.innerHTML = `
    <div class="resident-portrait"><canvas width="${SIZE * 2}" height="${SIZE * 2}" aria-hidden="true"></canvas></div>
    <div class="resident-id">
      <span class="resident-trait">${TRAIT[kind]}</span>
      <h3>${species.name}</h3>
      <p class="resident-home">Native of ${home.name}${home.code !== 'TBD' ? ` · ${home.code}` : ''}</p>
    </div>
    <blockquote class="resident-quote">${species.nature}</blockquote>`
  element.setAttribute('aria-label', `${species.name}, ${TRAIT[kind].toLowerCase()}. ${species.nature}`)
  return element
}

if (list) {
  const cards = ORDER.map((kind, index) => {
    const element = card(kind, index)
    list.append(element)
    return { kind, element, canvas: element.querySelector('canvas'), visible: false, hover: false }
  })

  let renderer = null
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch {
    list.classList.add('no-portraits')
  }

  if (renderer) {
    renderer.setPixelRatio(1)
    renderer.setSize(SIZE * 2, SIZE * 2, false)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    const kit = createResidentKit()
    const scene = new THREE.Scene()
    scene.add(new THREE.HemisphereLight(palette.light.sky, '#5a574f', 1.6))
    const key = new THREE.DirectionalLight('#fff4e0', 2.6)
    key.position.set(-2, 4, 5)
    scene.add(key)
    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50)

    const shadow = document.createElement('canvas')
    shadow.width = shadow.height = 64
    const context = shadow.getContext('2d')
    const fade = context.createRadialGradient(32, 32, 2, 32, 32, 32)
    fade.addColorStop(0, 'rgba(0,0,0,.45)')
    fade.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = fade
    context.fillRect(0, 0, 64, 64)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadow), transparent: true, depthWrite: false }))
    ground.rotation.x = -Math.PI / 2
    scene.add(ground)

    for (const [index, entry] of cards.entries()) {
      const model = createResidentModel(entry.kind, 1380 + index * 7, kit)
      model.update(REST, 0, 1, 1)
      model.object.rotation.y = -0.35
      const box = new THREE.Box3().setFromObject(model.object)
      const size = box.getSize(new THREE.Vector3())
      entry.model = model
      entry.fit = { height: Math.max(size.y, size.x * 0.9, 0.6), width: Math.max(size.x, size.z) }
      entry.context = entry.canvas.getContext('2d')
      model.object.visible = false
      scene.add(model.object)
      const enter = () => { entry.hover = true }
      const leave = () => { entry.hover = false }
      entry.element.addEventListener('pointerenter', enter)
      entry.element.addEventListener('pointerleave', leave)
      entry.element.addEventListener('focus', enter)
      entry.element.addEventListener('blur', leave)
    }

    function draw(entry, seconds, delta) {
      const { model, fit } = entry
      const target = entry.hover ? { ...REST, ...REACTION[entry.kind] } : REST
      model.update(target, seconds, delta, 1)
      model.object.visible = true
      ground.scale.set(fit.width * 1.6, fit.width * 1.6, 1)
      const distance = (fit.height * 0.62) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) + fit.width * 0.4
      camera.position.set(0, fit.height * 0.55 + distance * 0.12, distance)
      camera.lookAt(0, fit.height * 0.45, 0)
      renderer.render(scene, camera)
      model.object.visible = false
      entry.context.clearRect(0, 0, entry.canvas.width, entry.canvas.height)
      entry.context.drawImage(renderer.domElement, 0, 0)
    }

    const observer = new IntersectionObserver(entries => {
      for (const item of entries) {
        const entry = cards.find(c => c.element === item.target)
        entry.visible = item.isIntersecting
      }
      start()
    }, { rootMargin: '80px' })
    cards.forEach(entry => observer.observe(entry.element))

    let running = false, last = 0
    const start = () => {
      if (running || !cards.some(entry => entry.visible)) return
      running = true
      last = performance.now()
      requestAnimationFrame(tick)
    }
    const tick = now => {
      const delta = Math.min(0.05, (now - last) / 1000)
      last = now
      const visible = cards.filter(entry => entry.visible)
      if (!visible.length) { running = false; return }
      for (const entry of visible) draw(entry, reducedMotion ? 0 : now / 1000, reducedMotion ? 1 : delta)
      requestAnimationFrame(tick)
    }
  }
}
