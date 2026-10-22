import * as THREE from 'three'
import { createRobot } from '../../terraforming-1380/src/render/models/robots'
import { modelMaterial } from '../../terraforming-1380/src/render/models/voxel'
import {
  antennaColors,
  antennaGeometries,
  branchGeometries,
  crystalClusterGeometry,
  lichenGeometries,
} from '../../terraforming-1380/src/render/models/surfaceModels'
import { palette } from '../../terraforming-1380/src/config/palette'

// Each crew portrait is a miniature work site built from the same models and surface assets as the game.
const roster = document.querySelector('[data-crew]')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const STATE = { miner: 'work', gardener: 'plant', rigger: 'work', builder: 'work' }
const SIZE = { width: 280, height: 220 }

function mesh(geometry, color) {
  const object = new THREE.Mesh(geometry, modelMaterial(color))
  object.castShadow = true
  object.receiveShadow = true
  return object
}

function slab(parent, { x, y, width, height, depth = 0.86, color = palette.terrain.high }) {
  const object = mesh(new THREE.BoxGeometry(width, height, depth), color)
  object.position.set(x, y, 0)
  parent.add(object)
  return object
}

function rod(from, to, radius, color) {
  const direction = to.clone().sub(from)
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 6)
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
  geometry.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2)
  return mesh(geometry, color)
}

function addColoredGeometries(parent, parts) {
  for (const { color, geometry } of parts) parent.add(mesh(geometry, color))
}

function createMinerSite(stage) {
  slab(stage, { x: -0.62, y: -0.5, width: 0.62, height: 0.34 })
  slab(stage, { x: 0.44, y: -0.5, width: 0.94, height: 0.34 })
  slab(stage, { x: -0.05, y: -0.66, width: 0.5, height: 0.12, depth: 0.7, color: palette.terrain.steep })

  const tunnelStart = new THREE.Vector3(-0.2, -0.28, 0.28)
  const tunnelEnd = new THREE.Vector3(0.5, -0.53, 0.3)
  stage.add(rod(tunnelStart, tunnelEnd, 0.045, palette.robot.charcoal))

  const crystals = new THREE.Mesh(
    crystalClusterGeometry('crew-miner', 7, 0.3),
    new THREE.MeshStandardMaterial({ color: palette.resource.mineral, emissive: palette.crystalGlow, emissiveIntensity: 0.9, roughness: 0.45 }),
  )
  crystals.position.set(0.52, -0.43, 0.38)
  crystals.scale.setScalar(0.78)
  stage.add(crystals)

  const dust = Array.from({ length: 4 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({ color: palette.robot.soil, transparent: true, opacity: 0.75 })
    const particle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), material)
    particle.userData.phase = index / 4
    stage.add(particle)
    return particle
  })
  return time => {
    dust.forEach(particle => {
      const progress = (time * 0.45 + particle.userData.phase) % 1
      particle.position.lerpVectors(tunnelStart, tunnelEnd, progress)
      particle.position.y += Math.sin(progress * Math.PI) * 0.08
      particle.material.opacity = 0.25 + Math.sin(progress * Math.PI) * 0.65
      particle.rotation.set(progress * 5, progress * 3, 0)
    })
  }
}

function createGardenSite(stage) {
  slab(stage, { x: 0, y: -0.49, width: 1.65, height: 0.34 })
  slab(stage, { x: 0.4, y: -0.29, width: 0.72, height: 0.08, depth: 0.64, color: palette.terrain.low })

  addColoredGeometries(stage, lichenGeometries('crew-garden-lichen', 0.5, 24).map(part => {
    part.geometry.translate(0.38, -0.24, 0.05)
    return part
  }))

  const plants = [-0.02, 0.34, 0.62].map((x, index) => {
    const plant = new THREE.Group()
    addColoredGeometries(plant, branchGeometries(`crew-garden-${index}`, 0.34 + index * 0.05, 1))
    plant.position.set(x, -0.24, index === 1 ? -0.08 : 0.12)
    plant.scale.setScalar(index === 0 ? 0.8 : 1)
    stage.add(plant)
    return plant
  })
  return time => {
    const growth = 0.92 + Math.sin(time * 0.8) * 0.04
    plants.forEach((plant, index) => { plant.scale.y = growth + index * 0.025 })
  }
}

function createRiggerSite(stage) {
  slab(stage, { x: -0.62, y: -0.54, width: 0.52, height: 0.24 })
  slab(stage, { x: -0.08, y: -0.5, width: 0.54, height: 0.32, color: palette.terrain.low })
  slab(stage, { x: 0.5, y: -0.45, width: 0.66, height: 0.42 })

  const antenna = new THREE.Group()
  const geometries = antennaGeometries(0.58)
  for (const [part, geometry] of Object.entries(geometries)) {
    const object = mesh(geometry, antennaColors[part])
    object.name = part
    antenna.add(object)
  }
  antenna.position.set(0.5, -0.23, 0)
  antenna.scale.setScalar(0.86)
  stage.add(antenna)

  const rings = [0, 0.5].map((phase, index) => {
    const material = new THREE.MeshBasicMaterial({ color: palette.antenna.lamp, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.135, 32), material)
    ring.position.set(0.5, 0.38, 0.12 + index * 0.004)
    ring.userData.phase = phase
    stage.add(ring)
    return ring
  })
  const dish = antenna.getObjectByName('dish')
  return time => {
    if (dish) dish.rotation.y = time * 0.7
    rings.forEach(ring => {
      const progress = (time * 0.38 + ring.userData.phase) % 1
      ring.scale.setScalar(0.65 + progress * 1.35)
      ring.material.opacity = (1 - progress) * 0.42
    })
  }
}

function createBuilderSite(stage) {
  const heights = [0.46, 0.25, 0.39, 0.29, 0.29, 0.29]
  heights.forEach((height, index) => {
    slab(stage, {
      x: -0.67 + index * 0.27,
      y: -0.62 + height / 2,
      width: 0.275,
      height,
      depth: 0.84,
      color: index < 3 ? palette.terrain.low : palette.terrain.high,
    })
  })
  const level = mesh(new THREE.BoxGeometry(1.58, 0.012, 0.025), palette.robot.band.builder)
  level.position.set(0, -0.33, 0.44)
  stage.add(level)
  const fill = mesh(new THREE.BoxGeometry(0.21, 0.1, 0.55), palette.robot.soil)
  fill.position.set(-0.25, -0.38, 0.02)
  stage.add(fill)
  return time => {
    fill.position.y = -0.39 + Math.sin(time * 1.2) * 0.018
  }
}

function createWorkSite(role, index) {
  const stage = new THREE.Group()
  const robot = createRobot[role]()
  robot.object.scale.setScalar(2.35)
  robot.object.rotation.y = -0.55 + index * 0.08
  robot.setState(STATE[role])
  stage.add(robot.object)

  const positions = {
    miner: [-0.48, 0.02, 0.04],
    gardener: [-0.52, 0.02, 0.02],
    rigger: [-0.48, -0.03, 0.03],
    builder: [0.05, -0.01, 0.08],
  }
  robot.object.position.set(...positions[role])
  const base = robot.object.position.clone()

  const updateSite = role === 'miner' ? createMinerSite(stage)
    : role === 'gardener' ? createGardenSite(stage)
      : role === 'rigger' ? createRiggerSite(stage) : createBuilderSite(stage)

  const update = time => {
    robot.update(time)
    updateSite(time)
    robot.object.position.copy(base)
    robot.object.position.y += Math.sin(time * 1.5 + index) * 0.012
    if (role === 'builder') robot.object.position.x += Math.sin(time * 0.65) * 0.11
  }
  return { stage, update }
}

if (roster) {
  const entries = [...roster.querySelectorAll('[data-robot]')].map(element => ({
    element,
    role: element.dataset.robot,
    canvas: element.querySelector('canvas'),
    visible: false,
  }))

  let renderer = null
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch {
    roster.classList.add('no-robots')
  }

  if (renderer) {
    renderer.setPixelRatio(2)
    renderer.setSize(SIZE.width, SIZE.height, false)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping

    const scene = new THREE.Scene()
    scene.add(new THREE.HemisphereLight(palette.light.sky, '#77736b', 2.3))
    const key = new THREE.DirectionalLight('#fff4e0', 3.2)
    key.position.set(-3, 5, 6)
    scene.add(key)
    const camera = new THREE.PerspectiveCamera(25, SIZE.width / SIZE.height, 0.01, 50)

    for (const [index, entry] of entries.entries()) {
      const workSite = createWorkSite(entry.role, index)
      entry.stage = workSite.stage
      entry.update = workSite.update
      entry.context = entry.canvas.getContext('2d')
      scene.add(entry.stage)
      const box = new THREE.Box3().setFromObject(entry.stage)
      const dimensions = box.getSize(new THREE.Vector3())
      entry.center = box.getCenter(new THREE.Vector3())
      const verticalFov = THREE.MathUtils.degToRad(camera.fov)
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
      entry.distance = Math.max(
        dimensions.y / (2 * Math.tan(verticalFov / 2)),
        dimensions.x / (2 * Math.tan(horizontalFov / 2)),
      ) * 1.18
      entry.stage.visible = false
    }

    function draw(entry, seconds) {
      entry.update(seconds)
      entry.stage.visible = true
      camera.position.set(entry.center.x, entry.center.y + 0.04, entry.center.z + entry.distance)
      camera.lookAt(entry.center.x, entry.center.y, entry.center.z)
      renderer.render(scene, camera)
      entry.stage.visible = false
      entry.context.clearRect(0, 0, entry.canvas.width, entry.canvas.height)
      entry.context.drawImage(renderer.domElement, 0, 0, entry.canvas.width, entry.canvas.height)
    }

    const observer = new IntersectionObserver(items => {
      for (const item of items) {
        const entry = entries.find(candidate => candidate.element === item.target)
        entry.visible = item.isIntersecting
      }
      start()
    }, { rootMargin: '100px' })
    entries.forEach(entry => observer.observe(entry.element))

    let running = false
    function start() {
      if (running || !entries.some(entry => entry.visible)) return
      running = true
      requestAnimationFrame(tick)
    }
    function tick(now) {
      const visible = entries.filter(entry => entry.visible)
      if (!visible.length) { running = false; return }
      const seconds = reducedMotion ? 0 : now / 1000
      visible.forEach(entry => draw(entry, seconds))
      roster.classList.add('is-live')
      if (!reducedMotion) requestAnimationFrame(tick)
      else running = false
    }
  }
}
