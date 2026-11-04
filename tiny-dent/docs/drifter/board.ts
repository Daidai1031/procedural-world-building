// D-064: the Drifter's character board. Bundled into docs/drifter/board.html by scripts/build-drifter-board.mjs,
// so the board always shows the model the game ships.
import {
  AmbientLight, BufferAttribute, CircleGeometry, Color, DirectionalLight, GridHelper, Group, HemisphereLight,
  IcosahedronGeometry, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, OrthographicCamera,
  PCFSoftShadowMap, PerspectiveCamera, Scene, ShadowMaterial, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { palette } from '../../src/config/palette'
import { createDrifter, drifterClipInfo, drifterClipNames, drifterPose, drifterWalk, type DrifterClip } from '../../src/render/models/drifter'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

// ─── palette swatches, from the same tokens the model reads ───
const swatchNames: [keyof typeof palette.drifter, string, string][] = [
  ['ivory', 'Ivory', 'suit / helmet'], ['cuff', 'Ochre', 'cuffs'], ['boot', 'Warm gray', 'boots'],
  ['face', 'Charcoal', 'face inset, opaque'], ['rose', 'Dusty red', 'rose petals'], ['leaf', 'Sage', 'stem & leaves'],
]
$('swatches').innerHTML = swatchNames.map(([key, name, use]) =>
  `<li><i style="background:${palette.drifter[key]}"></i><span>${name}<small>${use.toUpperCase()}</small></span></li>`).join('')

function lights(scene: Scene, shadows: boolean) {
  scene.add(new AmbientLight(0xffffff, 0.55))
  scene.add(new HemisphereLight(palette.light.sky, palette.light.ground, 1.6))
  const key = new DirectionalLight(0xffffff, 2.1)
  key.position.set(4, 7, 6)
  if (shadows) {
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 6, bottom: -2, near: 0.5, far: 30 })
    key.shadow.bias = -0.0004
    key.shadow.radius = 4
  }
  scene.add(key)
  const fill = new DirectionalLight(0xffffff, 0.7)
  fill.position.set(-5, 2, -3)
  scene.add(fill)
  return key
}

function renderer(canvas: HTMLCanvasElement) {
  const gl = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  gl.setPixelRatio(Math.min(devicePixelRatio, 2))
  gl.outputColorSpace = SRGBColorSpace
  return gl
}

// ─── turnaround: four still figures under one orthographic camera ───
{
  const canvas = $<HTMLCanvasElement>('turnaround')
  const gl = renderer(canvas)
  const scene = new Scene()
  lights(scene, false)
  const camera = new OrthographicCamera()
  const spacing = 3.1
  const neutral = drifterPose('idle', 0)
  neutral.joints.neck = [0, 0, 0]; neutral.joints.hips = [0, 0, 0]; neutral.gaze = [0, 0]; neutral.lift = [0, 0, 0]
  ;[0, -Math.PI / 2, Math.PI, -0.62].forEach((turn, index) => {
    const figure = createDrifter()
    figure.apply(neutral)
    figure.object.position.x = index * spacing
    figure.object.rotation.y = turn
    scene.add(figure.object)
  })
  const guides: [string, number][] = [['TOP (HELMET)', 4], ['SHOULDER', 2.66], ['HIP', 1.42], ['KNEE', 0.8], ['GROUND', 0]]
  const layout = () => {
    const box = $('views')
    const width = box.clientWidth, height = box.clientHeight
    const left = 70, right = width < 520 ? 60 : 90, bottom = 36, top = 18
    const contentWidth = spacing * 3 + 2.3, contentHeight = 4.25
    const scale = Math.min((width - left - right) / contentWidth, (height - top - bottom) / contentHeight)
    const groundPx = height - bottom - ((height - top - bottom) - contentHeight * scale) / 2 - 0.12 * scale
    const firstX = -1.15 - ((width - left - right) - contentWidth * scale) / 2 / scale
    camera.left = firstX - left / scale
    camera.right = camera.left + width / scale
    camera.top = groundPx / scale
    camera.bottom = camera.top - height / scale
    camera.position.set(0, 0, 20)
    camera.updateProjectionMatrix()
    gl.setSize(width, height, false)
    gl.render(scene, camera)
    $('guides').innerHTML = guides.map(([name, y]) =>
      `<div class="guide" style="top:${(groundPx - y * scale).toFixed(1)}px"><span>${name}</span></div>`).join('')
      + `<div class="measure" style="top:${(groundPx - 4 * scale).toFixed(1)}px;height:${(4 * scale).toFixed(1)}px"><b>4.0<small>HEADS</small></b></div>`
  }
  new ResizeObserver(layout).observe($('views'))
}

// ─── live stage ───
const canvas = $<HTMLCanvasElement>('live')
const gl = renderer(canvas)
gl.shadowMap.enabled = true
gl.shadowMap.type = PCFSoftShadowMap
const scene = new Scene()
const key = lights(scene, true)
const camera = new PerspectiveCamera(36, 1, 0.1, 200)
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.minDistance = 3
controls.maxDistance = 40
controls.autoRotateSpeed = 1.6

const drifter = createDrifter()
drifter.object.traverse((child) => { if (child instanceof Mesh) child.castShadow = true })
scene.add(drifter.object)

// Studio: a shadow-catching floor, a faint grid and dots that slide past while walking.
const studio = new Group()
const floor = new Mesh(new CircleGeometry(14, 64).rotateX(-Math.PI / 2), new ShadowMaterial({ opacity: 0.16 }))
floor.receiveShadow = true
const grid = new GridHelper(28, 28, palette.terrain.high, palette.terrain.high)
;(grid.material as MeshBasicMaterial).transparent = true
;(grid.material as MeshBasicMaterial).opacity = 0.35
const dots = new InstancedMesh(new CircleGeometry(0.05, 10).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: palette.terrain.low }), 160)
const dotPositions = Array.from({ length: 160 }, (_, i) => new Vector3(((i * 7919) % 1000) / 1000 * 12 - 6, 0.004, ((i * 104729) % 1000) / 1000 * 24 - 12))
studio.add(floor, grid, dots)

// Tiny planet: the Drifter stays on top and the planet turns under it. A smooth trail runs where it walks.
const R = 11
const planet = new Group()
{
  const geometry = new IcosahedronGeometry(R, 14)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const v = new Vector3(), low = new Color(palette.terrain.low), high = new Color(palette.terrain.high), c = new Color()
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).normalize()
    const trail = Math.min(1, Math.max(0, (Math.abs(v.x) * R - 1.4) / 1.6))
    const n = Math.sin(v.x * 9.1 + v.y * 3.7) * Math.cos(v.z * 7.3 - v.y * 5.1) + 0.5 * Math.sin(v.x * 21 + v.z * 17)
    const h = n * 0.32 * trail
    v.multiplyScalar(R + h)
    position.setXYZ(i, v.x, v.y, v.z)
    c.copy(low).lerp(high, 0.55 + h * 1.2 - trail * 0.12)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  const ground = new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }))
  ground.receiveShadow = true
  planet.add(ground)
}
// The planet's centre sits R below the Drifter's feet.
const planetPivot = new Group()
planetPivot.position.y = -R
planetPivot.add(planet)

let setting: 'planet' | 'studio' = 'planet'
function setSetting(next: typeof setting) {
  setting = next
  scene.remove(studio, planetPivot)
  scene.add(next === 'planet' ? planetPivot : studio)
  $('set-planet').setAttribute('aria-pressed', String(next === 'planet'))
  $('set-studio').setAttribute('aria-pressed', String(next === 'studio'))
  // Each setting has its own framing: the planet shows its curve, the studio shows the body.
  const view = next === 'planet' ? { eye: [9.5, 5.2, 13.5], at: [0, 1.5, 0] } : { eye: [4.6, 3.3, 7.4], at: [0, 1.75, 0] }
  camera.position.set(...(view.eye as [number, number, number]))
  controls.target.set(...(view.at as [number, number, number]))
}
$('set-planet').addEventListener('click', () => setSetting('planet'))
$('set-studio').addEventListener('click', () => setSetting('studio'))
setSetting('planet')

// ─── clips ───
let clip: DrifterClip = 'walk'
let clipClock = 0
const clipButtons = new Map<DrifterClip, HTMLButtonElement>()
$('clips').innerHTML = ''
drifterClipNames.forEach((name, index) => {
  const info = drifterClipInfo[name]
  const button = document.createElement('button')
  button.className = 'clip'
  button.innerHTML = `<span class="key">${index + 1}</span><b>${info.label}</b><span class="len">${info.duration.toFixed(1)} s</span><small>${info.note}</small>`
  button.addEventListener('click', () => { select(name); tour = false; syncToggles() })
  clipButtons.set(name, button)
  $('clips').append(button)
})
function select(name: DrifterClip) {
  clip = name
  clipClock = 0
  drifter.play(name)
  clipButtons.forEach((button, key) => button.setAttribute('aria-pressed', String(key === name)))
  $('now-name').textContent = drifterClipInfo[name].label
}
addEventListener('keydown', (event) => {
  const index = Number(event.key) - 1
  if (index >= 0 && index < drifterClipNames.length && !event.altKey && !event.ctrlKey && !event.metaKey) {
    select(drifterClipNames[index]); tour = false; syncToggles()
  }
})

const speed = $<HTMLInputElement>('speed')
const speedOut = $('speed-out')
const showSpeed = () => { speedOut.textContent = `${(Number(speed.value) * drifterWalk.reference * 0.046).toFixed(2)} world u/s` }
speed.addEventListener('input', showSpeed)
showSpeed()

let pivots = false, tour = false, slow = false
function syncToggles() {
  $('t-pivots').setAttribute('aria-pressed', String(pivots))
  $('t-turn').setAttribute('aria-pressed', String(controls.autoRotate))
  $('t-tour').setAttribute('aria-pressed', String(tour))
  $('t-slow').setAttribute('aria-pressed', String(slow))
}
$('t-pivots').addEventListener('click', () => { pivots = !pivots; drifter.showPivots(pivots); syncToggles() })
$('t-turn').addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; syncToggles() })
$('t-tour').addEventListener('click', () => { tour = !tour; tourClock = 0; syncToggles() })
$('t-slow').addEventListener('click', () => { slow = !slow; syncToggles() })
select('walk')
syncToggles()

// ─── loop ───
let last = performance.now(), tourClock = 0
const dummy = new Object3D()
function frame(now: number) {
  let delta = Math.min(0.05, (now - last) / 1000)
  last = now
  if (slow) delta *= 0.25
  if (reduceMotion && clip !== 'walk') delta *= 0.5
  const box = $('stage')
  const width = box.clientWidth, height = box.clientHeight
  if (canvas.width !== Math.floor(width * gl.getPixelRatio()) || canvas.height !== Math.floor(height * gl.getPixelRatio())) {
    gl.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  if (tour) {
    tourClock += delta
    if (tourClock > (clip === 'sit' || clip === 'drift' ? 7 : 4.5)) {
      tourClock = 0
      select(drifterClipNames[(drifterClipNames.indexOf(clip) + 1) % drifterClipNames.length])
    }
  }
  const walking = clip === 'walk'
  const groundSpeed = walking ? Number(speed.value) * drifterWalk.reference : 0
  drifter.update(delta, { speed: groundSpeed })
  clipClock += delta
  $('now-time').textContent = walking
    ? `${groundSpeed.toFixed(1)} heads/s`
    : `${(clipClock % drifterClipInfo[clip].duration).toFixed(1)} / ${drifterClipInfo[clip].duration.toFixed(1)} s`
  // The ground moves, the Drifter stays: the walk's phase comes from this same distance.
  planet.rotation.x -= (groundSpeed * delta) / R
  dotPositions.forEach((p, i) => {
    p.z -= groundSpeed * delta
    if (p.z < -12) p.z += 24
    dummy.position.copy(p)
    dummy.updateMatrix()
    dots.setMatrixAt(i, dummy.matrix)
  })
  dots.instanceMatrix.needsUpdate = true
  key.target.position.set(0, 1.5, 0)
  key.target.updateMatrixWorld()
  controls.update()
  gl.render(scene, camera)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

// Lets automated screenshots set a camera; harmless for viewers.
;(window as unknown as { drifterBoard: unknown }).drifterBoard = { camera, controls }
