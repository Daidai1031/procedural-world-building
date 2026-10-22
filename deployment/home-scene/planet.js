import * as THREE from 'three'
import { burrowSites, planetConfig, PlanetWorld } from '../../terraforming-1380/src/world/planet'
import { generateResourceClusters } from '../../terraforming-1380/src/world/resourceClusters'
import { VOXEL_WORLD_SIZE } from '../../terraforming-1380/src/world/voxels/voxelMath.js'
import { createTerrainMaterial, setResourceGlowActive } from '../../terraforming-1380/src/render/terrainMaterial'
import { createAtmosphere } from '../../terraforming-1380/src/render/atmosphere'
import { createBuilder, createGardener, createMiner } from '../../terraforming-1380/src/render/models/robots'
import { createResidentKit, createResidentModel } from '../../terraforming-1380/src/render/models/residents'
import { antennaColors, antennaGeometries, branchGeometries, crystalClusterGeometry, lichenGeometries } from '../../terraforming-1380/src/render/models/surfaceModels'
import { planetSpecies } from '../../terraforming-1380/src/systems/residents'
import { palette } from '../../terraforming-1380/src/config/palette'

// Hero loop: the game's own planets (PlanetWorld, terrain shader, atmosphere) reshaped by the game's robots, sped up.
// One loop is one contract, sol 0 to sol 1380; the next loop flies to another planet and its native species.
// As in the game (VIEW-01) the planet never rotates: the terrain shader works in world space, so the camera orbits.

const SEEDS = ['1380', '1380/signal-2', 'a/signal-1', '1380/signal-4', 'b/signal-1', '1380/signal-5']
const HALF = VOXEL_WORLD_SIZE / 2
const RESOLUTION = 64
const SPACING = VOXEL_WORLD_SIZE / (RESOLUTION - 1)
const CYCLE = 32
const ORBIT = (Math.PI * 2) / 90
const ROBOT_SCALE = 1.5
const PROP_SCALE = 1.25
const RESIDENT_SCALE = 0.24

const stage = document.querySelector('.planet-stage')
const fallback = stage?.querySelector('.planet-fallback')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const query = new URLSearchParams(location.search)
const stillAt = Number(query.get('t'))

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const up = new THREE.Vector3(0, 1, 0)

function seeded(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Trilinear density in centered coordinates, read from the game's sample grid (densityAt expects y in 0..size).
function sampler(world) {
  const at = (x, y, z) => world.densityAt(-HALF + x * SPACING, y * SPACING, -HALF + z * SPACING)
  return (x, y, z) => {
    const gx = (x + HALF) / SPACING, gy = (y + HALF) / SPACING, gz = (z + HALF) / SPACING
    const x0 = Math.floor(gx), y0 = Math.floor(gy), z0 = Math.floor(gz)
    if (x0 < 0 || y0 < 0 || z0 < 0 || x0 >= RESOLUTION - 1 || y0 >= RESOLUTION - 1 || z0 >= RESOLUTION - 1) return 1
    const tx = gx - x0, ty = gy - y0, tz = gz - z0
    const lerp = (a, b, t) => a + (b - a) * t
    const plane = dz => lerp(
      lerp(at(x0, y0, z0 + dz), at(x0 + 1, y0, z0 + dz), tx),
      lerp(at(x0, y0 + 1, z0 + dz), at(x0 + 1, y0 + 1, z0 + dz), tx), ty)
    return lerp(plane(0), plane(1), tz)
  }
}

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  const canvas = renderer.domElement
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'A planet from the game, sped up: robots dig out minerals, level pads, raise antennas and plant lichen while the native residents peek out of their burrows.')
  canvas.tabIndex = 0
  stage.prepend(canvas)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100)
  // The game's lights (App.tsx).
  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  scene.add(new THREE.HemisphereLight(palette.light.sky, palette.light.ground, 1.8))
  const key = new THREE.DirectionalLight(0xffffff, 2)
  key.position.set(4, 6, 5)
  const fill = new THREE.DirectionalLight(palette.light.sky, 1.3)
  fill.position.set(-3, -5, 2)
  const back = new THREE.DirectionalLight(0xffffff, 0.6)
  back.position.set(2, 1, -5)
  scene.add(key, fill, back)

  const materials = new Map()
  const material = (color, glow) => {
    const id = color + (glow ?? '')
    if (!materials.has(id)) materials.set(id, new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, emissive: glow ?? '#000000' }))
    return materials.get(id)
  }
  const crew = [
    { role: 'miner', model: createMiner() },
    { role: 'builder', model: createBuilder() },
    { role: 'gardener', model: createGardener() },
  ]
  for (const bot of crew) {
    bot.model.object.scale.setScalar(ROBOT_SCALE)
    scene.add(bot.model.object)
  }
  const residentKit = createResidentKit()

  let planet = null, clock = 0, loop = -1, random = seeded(1380), orbitOffset = 0
  const viewDir = new THREE.Vector3()
  const cameraDirAt = time => {
    const angle = 0.6 + time * ORBIT + orbitOffset
    return viewDir.set(Math.sin(angle), 0.22, Math.cos(angle)).normalize()
  }

  // ── One planet per loop ──
  function loadPlanet(seed) {
    if (planet) {
      scene.remove(planet.group)
      planet.group.traverse(object => { if (object.isMesh && object.geometry && !object.userData.shared) object.geometry.dispose() })
      planet.terrain.dispose()
      planet.atmosphere.dispose()
      planet.residents.forEach(resident => resident.model.dispose())
    }
    const world = new PlanetWorld(seed)
    const config = planetConfig(seed)
    const clusters = generateResourceClusters(seed)
    const terrain = createTerrainMaterial(clusters, config.radius * VOXEL_WORLD_SIZE)
    const group = new THREE.Group()
    const chunkMeshes = world.chunks.map(() => {
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), terrain)
      mesh.visible = false
      mesh.userData.version = -1
      group.add(mesh)
      return mesh
    })
    const atmosphere = createAtmosphere(seed)
    group.add(atmosphere.group)
    scene.add(group)
    const species = planetSpecies(seed)
    planet = {
      seed, world, config, clusters, terrain, group, chunkMeshes, atmosphere, species,
      density: sampler(world),
      collected: clusters.map(() => false),
      burrows: burrowSites(seed).map(burrow => ({ ...burrow, dir: new THREE.Vector3(...burrow.mouth).normalize(), taken: false })),
      residents: [], props: [], used: [],
      extent: 0,
    }
    syncChunks()
    // Frame the solid as meshed, plus room for the dust shell.
    for (const mesh of chunkMeshes) if (mesh.visible) planet.extent = Math.max(planet.extent, mesh.geometry.boundingSphere.center.length() + mesh.geometry.boundingSphere.radius)
    planet.extent *= 1.08
    setResourceGlowActive(terrain, planet.collected.map(done => !done))
  }

  function syncChunks() {
    planet.world.chunks.forEach((chunk, index) => {
      const mesh = planet.chunkMeshes[index]
      if (mesh.userData.version === chunk.version) return
      mesh.userData.version = chunk.version
      mesh.geometry.dispose()
      const { positions, normals } = chunk.mesh
      mesh.visible = positions.length > 0
      if (!mesh.visible) return
      const geometry = new THREE.BufferGeometry()
      const shifted = Float32Array.from(positions)
      for (let i = 1; i < shifted.length; i += 3) shifted[i] -= HALF
      geometry.setAttribute('position', new THREE.BufferAttribute(shifted, 3))
      geometry.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(normals), 3))
      geometry.computeBoundingSphere()
      mesh.geometry = geometry
    })
  }

  // Distance from the center to the current surface along a unit direction.
  function surfaceAt(dir) {
    const step = SPACING * 0.5
    let r = HALF * 0.98, previous = planet.density(dir.x * r, dir.y * r, dir.z * r)
    while (r > 0.2) {
      const next = r - step, value = planet.density(dir.x * next, dir.y * next, dir.z * next)
      if (value < 0) return r - step * previous / (previous - value)
      r = next
      previous = value
    }
    return 0.2
  }
  const pointOn = (dir, depth = 0) => dir.clone().multiplyScalar(surfaceAt(dir) - depth)
  function edit(mode, center, radius) {
    planet.world.edit(mode, { x: center.x, y: center.y + HALF, z: center.z }, radius, 'radial')
  }
  function place(object, dir, lift = 0, yaw = 0) {
    object.position.copy(dir).multiplyScalar(surfaceAt(dir) + lift)
    object.quaternion.setFromUnitVectors(up, dir).multiply(new THREE.Quaternion().setFromAxisAngle(up, yaw))
  }
  function prop(parts, dir, size, yaw) {
    const group = new THREE.Group()
    for (const { color, geometry } of parts) group.add(new THREE.Mesh(geometry, material(color)))
    place(group, dir, -0.01, yaw)
    group.userData.size = size
    group.scale.setScalar(0.0001)
    planet.group.add(group)
    planet.props.push(group)
    return group
  }
  const offset = (dir, distance, angle) => {
    const tangent = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) < 0.9 ? up : new THREE.Vector3(1, 0, 0)).normalize()
    const bitangent = new THREE.Vector3().crossVectors(dir, tangent)
    return dir.clone().addScaledVector(tangent, Math.cos(angle) * distance).addScaledVector(bitangent, Math.sin(angle) * distance).normalize()
  }

  // Work sites face the camera at the time the robot will be working there.
  function pickSite(from, time, candidates) {
    const view = cameraDirAt(time).clone()
    let best = null, bestScore = -Infinity
    for (const dir of candidates) {
      if (planet.used.some(other => other.dot(dir) > 0.98)) continue
      const score = dir.dot(view) * 2.4 - (from ? from.angleTo(dir) * 0.4 : 0) + random() * 0.35
      if (score > bestScore) { best = dir; bestScore = score }
    }
    best ??= view.clone()
    planet.used.push(best)
    return best
  }
  const randomDirs = count => Array.from({ length: count }, () => {
    const y = random() * 2 - 1, angle = random() * Math.PI * 2, ring = Math.sqrt(1 - y * y)
    return new THREE.Vector3(Math.cos(angle) * ring, y, Math.sin(angle) * ring)
  })

  const jobs = {
    miner(bot, time) {
      // Miners go for the planet's own mineral deposits first, then dig wherever is in view.
      const open = planet.clusters.map((cluster, index) => ({ index, dir: new THREE.Vector3(...cluster.position).normalize() }))
        .filter(({ index }) => !planet.collected[index])
      const target = pickSite(bot.dir, time, open.length ? open.map(item => item.dir) : randomDirs(60))
      const cluster = open.find(item => item.dir === target)
      return { site: target, duration: 3.4, run: site => {
        const crystals = new THREE.Mesh(crystalClusterGeometry(`${planet.seed}-${planet.used.length}`, 6, 0.14), material(palette.resource.mineral, palette.crystalGlow))
        return [
          [0.3, () => edit('dig', pointOn(site), 0.24)],
          [0.6, () => { place(crystals, site, 0.03); crystals.scale.setScalar(0.0001); crystals.userData.size = PROP_SCALE; planet.group.add(crystals); planet.props.push(crystals) }],
          [1.2, () => edit('dig', pointOn(offset(site, 0.1, random() * 6)), 0.2)],
          [2.1, () => {
            crystals.userData.size = 0
            if (cluster) { planet.collected[cluster.index] = true; setResourceGlowActive(planet.terrain, planet.collected.map(done => !done)) }
          }],
          [2.5, () => edit('add', pointOn(offset(site, 0.2, random() * 6), 0.05), 0.12)],
        ]
      } }
    },
    builder(bot, time) {
      return { site: pickSite(bot.dir, time, randomDirs(80)), duration: 3.6, run: site => [
        [0.3, () => edit('flatten', pointOn(site), 0.32)],
        [1.0, () => {
          const parts = antennaGeometries(0.45)
          prop(Object.entries(parts).map(([part, geometry]) => ({ color: antennaColors[part], geometry })), site, PROP_SCALE, random() * 6)
        }],
      ] }
    },
    gardener(bot, time) {
      return { site: pickSite(bot.dir, time, randomDirs(80)), duration: 3.2, run: site => Array.from({ length: 4 }, (_, i) => [0.3 + i * 0.6, () => {
        const dir = offset(site, 0.03 + random() * 0.12, random() * 6)
        prop(lichenGeometries(`${planet.seed}-${planet.used.length}-${i}`, 0.22, 30), dir, PROP_SCALE, random() * 6)
        if (i % 2) prop(branchGeometries(`${planet.seed}-${planet.used.length}-${i}`, 0.24, 1), offset(dir, 0.04, random() * 6), PROP_SCALE, random() * 6)
      }]) }
    },
  }

  function startJob(bot, job) {
    Object.assign(bot, { phase: 'work', phaseStart: clock, dir: job.site.clone(), steps: job.run(job.site), next: 0, duration: job.duration })
  }

  function nextLoop() {
    loop += 1
    random = seeded(1380 + loop * 97)
    clock = 0
    loadPlanet(query.get('seed') ?? SEEDS[loop % SEEDS.length])
    crew.forEach((bot, i) => {
      bot.heading = new THREE.Vector3(1, 0, 0)
      bot.pending = jobs[bot.role](bot, 1.6 + i * 0.4)
      Object.assign(bot, { phase: 'land', phaseStart: i * 0.4, dir: bot.pending.site })
    })
  }

  const tangent = new THREE.Vector3(), side = new THREE.Vector3(), basis = new THREE.Matrix4()
  function placeBot(bot, dir, lift) {
    const model = bot.model
    place(model.object, dir, model.hoverHeight * ROBOT_SCALE + lift)
    tangent.copy(bot.heading).addScaledVector(dir, -bot.heading.dot(dir))
    if (tangent.lengthSq() < 1e-6) return
    tangent.normalize()
    side.crossVectors(tangent, dir)
    model.object.quaternion.setFromRotationMatrix(basis.makeBasis(tangent, dir, side))
  }

  function stepCrew() {
    for (const bot of crew) {
      const elapsed = clock - bot.phaseStart
      if (clock > CYCLE - 3) {
        bot.model.setState('move')
        placeBot(bot, bot.dir, smoothstep(CYCLE - 3, CYCLE - 1.3, clock) ** 2 * 4)
        continue
      }
      if (bot.phase === 'land') {
        bot.model.object.visible = elapsed >= 0
        if (elapsed < 0) continue
        bot.model.setState('move')
        placeBot(bot, bot.dir, (1 - smoothstep(0, 1.3, elapsed)) ** 2 * 4)
        if (elapsed >= 1.3) startJob(bot, bot.pending)
      } else if (bot.phase === 'work') {
        bot.model.setState(bot.role === 'gardener' ? 'plant' : 'work')
        while (bot.next < bot.steps.length && elapsed >= bot.steps[bot.next][0]) bot.steps[bot.next++][1]()
        placeBot(bot, bot.dir, 0.015 * Math.sin(clock * 9))
        if (elapsed >= bot.duration) {
          const travel = 0.8
          const job = jobs[bot.role](bot, clock + travel + 1.5)
          bot.heading.copy(job.site).sub(bot.dir).normalize()
          Object.assign(bot, { phase: 'travel', phaseStart: clock, from: bot.dir.clone(), pending: job,
            travel: travel + bot.dir.angleTo(job.site) * 1.4 })
        }
      } else {
        bot.model.setState('move')
        const t = smoothstep(0, bot.travel, elapsed)
        const dir = bot.from.clone().lerp(bot.pending.site, t).normalize()
        placeBot(bot, dir, Math.sin(t * Math.PI) * 0.4)
        bot.dir = dir
        if (elapsed >= bot.travel) startJob(bot, bot.pending)
      }
    }
  }

  // Natives live in the seeded burrows; they come out, look around, and duck when a robot works close by.
  function stepResidents(dt) {
    const view = cameraDirAt(clock)
    if (planet.residents.length < 4 && clock > 2.5 + planet.residents.length * 2.2 && clock < CYCLE - 6) {
      const burrow = planet.burrows.filter(b => !b.taken).sort((a, b) => b.dir.dot(view) - a.dir.dot(view))[0]
      if (burrow) {
        burrow.taken = true
        const model = createResidentModel(planet.species, 1380 + loop * 13 + planet.residents.length, residentKit)
        const dir = offset(burrow.dir, 0.05, random() * 6)
        const yaw = random() * 6
        model.object.scale.setScalar(0.0001)
        planet.group.add(model.object)
        planet.residents.push({ model, born: clock, dir, yaw })
      }
    }
    for (const resident of planet.residents) {
      const age = clock - resident.born
      const near = crew.some(bot => bot.phase === 'work' && bot.dir.angleTo(resident.dir) < 0.35)
      const leaving = clock > CYCLE - 4
      const strolling = !near && age > 3 && age < 5
      if (strolling) resident.dir = offset(resident.dir, dt * 0.04, resident.yaw)
      // Face the camera a little, so a visitor can see the eyes.
      place(resident.model.object, resident.dir, 0, strolling ? resident.yaw + Math.PI / 2 : resident.yaw)
      resident.model.object.scale.setScalar(RESIDENT_SCALE * smoothstep(0, 0.6, age))
      const hide = age < 0.5 || leaving || near
      resident.model.update({ tuck: hide ? 1 : 0, shut: leaving || near ? 1 : 0, peek: strolling || hide ? 0 : 1, shake: near ? 0.6 : 0, walk: strolling ? 1 : 0 }, clock, dt, 1)
    }
  }

  function step(dt) {
    clock += dt
    if (clock >= CYCLE) nextLoop()
    stepCrew()
    stepResidents(dt)
    for (const object of planet.props) {
      const target = object.userData.size, current = object.scale.x
      object.scale.setScalar(current + (target - current) * (1 - Math.exp(-dt * 4)) + 1e-5)
    }
    for (const bot of crew) bot.model.update(clock)
    planet.atmosphere.update(clock)
  }

  // ── View ──
  let aspect = 1
  function aim() {
    const vertical = THREE.MathUtils.degToRad(camera.fov) / 2
    const limiting = aspect < 1 ? Math.atan(Math.tan(vertical) * aspect) : vertical
    const distance = (planet.extent + 0.05) / Math.sin(limiting)
    camera.position.copy(cameraDirAt(clock)).multiplyScalar(distance)
    camera.lookAt(0, 0, 0)
  }
  function resize() {
    const { width, height } = stage.getBoundingClientRect()
    if (!width || !height) return
    aspect = camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }
  const draw = () => { aim(); renderer.render(scene, camera) }
  new ResizeObserver(() => { resize(); if (!running) draw() }).observe(stage)
  resize()
  nextLoop()

  let pointer = null
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return
    pointer = { x: event.clientX, id: event.pointerId }
    canvas.setPointerCapture(event.pointerId)
    stage.classList.add('is-dragging')
  })
  canvas.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return
    orbitOffset -= (event.clientX - pointer.x) * 0.006
    pointer.x = event.clientX
    if (!running) draw()
  })
  const release = () => { pointer = null; stage.classList.remove('is-dragging') }
  canvas.addEventListener('pointerup', release)
  canvas.addEventListener('pointercancel', release)
  canvas.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    orbitOffset += event.key === 'ArrowLeft' ? 0.2 : -0.2
    if (!running) draw()
  })
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault()
    canvas.hidden = true
    if (fallback) fallback.hidden = false
  })

  // A still frame (reduced motion, or ?t= for screenshots) fast-forwards the same simulation.
  let running = false
  if (reducedMotion || stillAt > 0) {
    const target = stillAt > 0 ? stillAt : CYCLE * 0.7
    for (let simulated = 0; simulated < target; simulated += 1 / 30) {
      step(1 / 30)
      planet.world.remeshDirty(Infinity)
    }
    syncChunks()
    draw()
  } else {
    let visible = true, last = 0
    const tick = now => {
      if (!visible) { running = false; return }
      step(Math.min(0.05, (now - last) / 1000))
      last = now
      planet.world.remeshDirty(4)
      syncChunks()
      stage.classList.toggle('is-resetting', clock > CYCLE - 0.8 || clock < 0.3)
      draw()
      requestAnimationFrame(tick)
    }
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (!visible || running) return
      running = true
      last = performance.now()
      requestAnimationFrame(tick)
    }).observe(stage)
  }
  if (fallback) fallback.hidden = true
  stage.classList.add('is-live')
}

if (stage) {
  try {
    start()
  } catch (error) {
    console.error(error)
    if (fallback) fallback.hidden = false
  }
}
