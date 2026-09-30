import * as THREE from 'three'
import { buildMarchingMeshInCells } from '../../terraforming-1380/src/world/voxels/marchingCubes.js'

const container = document.querySelector('.planet-art')
const fallback = container.querySelector('.planet-fallback')
let renderer
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
} catch {
  fallback.hidden = false
}

if (renderer) {
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-20, 20, 14, -14, 0.1, 150)
  camera.position.set(25, 17, 30)
  camera.lookAt(0, -0.5, 0)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  const canvas = renderer.domElement
  canvas.setAttribute('aria-label', 'A low-resolution Marching Cubes planet with triangular terrain. Drag or use arrow keys to rotate.')
  canvas.setAttribute('role', 'img')
  canvas.tabIndex = 0
  container.prepend(canvas)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8e8a7d, 1.7))
  const sun = new THREE.DirectionalLight(0xfff9eb, 2.7)
  sun.position.set(-15, 26, 20)
  scene.add(sun)

  // Use the same surface extraction as the game, sampled on a deliberately coarse grid.
  const resolution = 13
  const spacing = 6 / (resolution - 1)
  const field = (x, y, z) => {
    const centeredY = y - 3
    const distance = Math.hypot(x, centeredY, z)
    const relief = .11 * Math.sin(x * 3.1 + z * 1.6) * Math.sin(centeredY * 2.5 - z)
      + .085 * Math.sin(z * 4.5 - x * 1.2)
    const crater = Math.max(0, 1 - Math.hypot(x - .8, centeredY - 1.2, z - 1.7) / 1.1)
    return distance - (2.34 + relief) + crater * .47
  }
  const valueAt = (x, y, z) => field(-3 + x * spacing, y * spacing, -3 + z * spacing)
  const extracted = buildMarchingMeshInCells({
    resolution,
    cells: { min: [0, 0, 0], max: [resolution - 1, resolution - 1, resolution - 1] },
    valueAt,
    gradientAt: (x, y, z) => [
      valueAt(x + 1, y, z) - valueAt(x - 1, y, z),
      valueAt(x, y + 1, z) - valueAt(x, y - 1, z),
      valueAt(x, y, z + 1) - valueAt(x, y, z - 1),
    ],
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(extracted.positions, 3))
  geometry.translate(0, -3, 0)
  geometry.scale(3.25, 3.25, 3.25)
  geometry.computeVertexNormals()
  const positions = geometry.getAttribute('position')
  const colors = new Float32Array(positions.count * 3)
  const color = new THREE.Color()
  for (let triangle = 0; triangle < positions.count; triangle += 3) {
    const x = (positions.getX(triangle) + positions.getX(triangle + 1) + positions.getX(triangle + 2)) / 3
    const y = (positions.getY(triangle) + positions.getY(triangle + 1) + positions.getY(triangle + 2)) / 3
    const z = (positions.getZ(triangle) + positions.getZ(triangle + 1) + positions.getZ(triangle + 2)) / 3
    const variation = .025 * Math.sin(x * 1.7 + z * 2.9) + .018 * Math.cos(y * 2.2)
    const stone = .48 + variation
    color.setRGB(stone, stone * .994, stone * .95)
    if (x > 2.3 && x < 4.6 && y > -.8 && y < 1.7 && z > 5.4) color.set('#e6bb35')
    for (let corner = 0; corner < 3; corner++) color.toArray(colors, (triangle + corner) * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, flatShading: true })
  const mesh = new THREE.Mesh(geometry, material)
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 18), new THREE.LineBasicMaterial({ color: 0x565750, transparent: true, opacity: .12 }))
  const planet = new THREE.Group()
  planet.add(mesh, edges)
  planet.rotation.set(.07, -.15, -.1)
  scene.add(planet)

  const shadowCanvas = document.createElement('canvas')
  shadowCanvas.width = shadowCanvas.height = 128
  const shadowContext = shadowCanvas.getContext('2d')
  const fade = shadowContext.createRadialGradient(64, 64, 4, 64, 64, 64)
  fade.addColorStop(0, 'rgba(53,54,50,.22)')
  fade.addColorStop(.45, 'rgba(53,54,50,.12)')
  fade.addColorStop(1, 'rgba(53,54,50,0)')
  shadowContext.fillStyle = fade
  shadowContext.fillRect(0, 0, 128, 128)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -9
  scene.add(ground)

  let frame = 0
  const render = () => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      renderer.render(scene, camera)
      frame = 0
    })
  }
  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect
    if (!width || !height) return
    const aspect = width / height
    const halfHeight = Math.max(12.4, 12.4 / aspect)
    camera.left = -halfHeight * aspect
    camera.right = halfHeight * aspect
    camera.top = halfHeight
    camera.bottom = -halfHeight
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    render()
  }).observe(container)

  let pointer = null
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return
    pointer = { x: event.clientX, y: event.clientY, id: event.pointerId }
    canvas.setPointerCapture(event.pointerId)
    canvas.classList.add('is-dragging')
  })
  canvas.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return
    planet.rotation.y += (event.clientX - pointer.x) * .008
    planet.rotation.x = Math.max(-.7, Math.min(.7, planet.rotation.x + (event.clientY - pointer.y) * .005))
    pointer.x = event.clientX
    pointer.y = event.clientY
    render()
  })
  const release = () => { pointer = null; canvas.classList.remove('is-dragging') }
  canvas.addEventListener('pointerup', release)
  canvas.addEventListener('pointercancel', release)
  canvas.addEventListener('lostpointercapture', release)
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'ArrowLeft') planet.rotation.y -= .15
    if (event.key === 'ArrowRight') planet.rotation.y += .15
    if (event.key === 'ArrowUp') planet.rotation.x = Math.max(-.7, planet.rotation.x - .1)
    if (event.key === 'ArrowDown') planet.rotation.x = Math.min(.7, planet.rotation.x + .1)
    render()
  })
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault()
    canvas.hidden = true
    fallback.hidden = false
  })
  fallback.hidden = true
  container.querySelector('.planet-hint').hidden = false
}

