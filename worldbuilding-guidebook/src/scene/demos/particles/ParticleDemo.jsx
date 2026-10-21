import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, CanvasTexture, Color, Plane, Vector2, Vector3 } from 'three'
import { useSceneStore } from '../../../store/sceneStore.js'
import { readToken } from '../../../styles/readToken.js'
import TerrainWorld from '../proceduralMaps/TerrainWorld.jsx'
import { TerrainMesh } from '../distributions/ScenePieces.jsx'
import { terrainCopy } from '../paths/pathMath.js'
import { buildPointsGeometry } from './particleLook.js'
import { useParticlePlayback } from './playback.js'
import { useParticleSelection } from './particleSelection.js'
import { PIT_RADIUS, digSiteGround, getParticleCloud, speedOf } from './particleSystem.js'
import { advanceFixed, REGION_HALF_SIZE, RUNNER_FINISH, RUNNER_START } from './simulations.js'
import { fadeWithAge, historyPoint, MAX_HISTORY } from './trails.js'

// Soft round images for the points. They are drawn once on a plain 2D canvas.
function makeTexture(draw) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  draw(canvas.getContext('2d'))
  return new CanvasTexture(canvas)
}

const dotTexture = () => makeTexture((context) => {
  context.beginPath()
  context.arc(32, 32, 30, 0, Math.PI * 2)
  context.fillStyle = '#fff'
  context.fill()
})

const puffTexture = () => makeTexture((context) => {
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)
})

const ringTexture = () => makeTexture((context) => {
  context.beginPath()
  context.arc(32, 32, 27, 0, Math.PI * 2)
  context.lineWidth = 6
  context.strokeStyle = '#fff'
  context.stroke()
})

function useTextures() {
  const textures = useMemo(() => ({ Dot: dotTexture(), Puff: puffTexture(), ring: ringTexture() }), [])
  useEffect(() => () => Object.values(textures).forEach((texture) => texture.dispose()), [textures])
  return textures
}

// A geometry built from inputs and disposed when they change or the scene goes.
function useGeometry(factory, dependencies) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(factory, dependencies)
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

const SLOW_TOKEN = '--water-deep'
const FAST_TOKEN = '--clay-deep'
const FAST_SPEED = 1.5
const WHIRL_LIMIT = 2.5

function usePalette(tint) {
  return useMemo(() => ({
    tint: new Color(readToken(tint)),
    slow: new Color(readToken(SLOW_TOKEN)),
    fast: new Color(readToken(FAST_TOKEN)),
    mixed: new Color(),
  }), [tint])
}

function speedShade(palette, pool, index, field) {
  return palette.mixed.lerpColors(palette.slow, palette.fast, Math.min(1, speedOf(pool, index, field) / FAST_SPEED))
}

function DigSite({ cave = false, onGroundClick }) {
  const buildGround = useMemo(() => () => terrainCopy(digSiteGround), [])
  const caveX = 2.7
  return <>
    <group onClick={onGroundClick}><TerrainMesh build={buildGround} /></group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, digSiteGround(0, 0) + 0.015, 0]}>
      <ringGeometry args={[PIT_RADIUS * 0.55, PIT_RADIUS * 0.6, 48]} />
      <meshBasicMaterial color={readToken('--ink-dim')} />
    </mesh>
    {cave && <mesh position={[caveX, digSiteGround(caveX, 0), 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
      <torusGeometry args={[0.34, 0.1, 8, 20, Math.PI]} />
      <meshStandardMaterial color={readToken('--moss-deep')} roughness={0.9} />
    </mesh>}
  </>
}

// Steps the running simulation with a fixed dt. A slow or fast screen changes
// how many steps run per frame, never how long one step is.
function Clock() {
  const clock = useRef({ accumulator: 0 })
  useFrame((_, delta) => {
    const playback = useParticlePlayback.getState()
    if (!playback.simulation || !playback.running || document.hidden) { clock.current.accumulator = 0; return }
    const params = useSceneStore.getState().params
    if (advanceFixed(playback.simulation, clock.current, delta, params)) playback.publish(params)
  })
  useEffect(() => {
    const pauseHidden = () => { if (document.hidden) useParticlePlayback.getState().pause() }
    document.addEventListener('visibilitychange', pauseHidden)
    return () => document.removeEventListener('visibilitychange', pauseHidden)
  }, [])
  return null
}

// Paints each speck from its own page: hidden when dead, and optionally
// coloured by speed and faded by age. The positions are the pool's own array.
function PoolPoints({ pool, look = 'Dot', size = 1, tint, speedColour = false, fade = false, field = null }) {
  const textures = useTextures()
  const geometry = useGeometry(() => {
    const points = buildPointsGeometry(pool)
    points.setAttribute('color', new BufferAttribute(new Float32Array(pool.capacity * 4), 4))
    return points
  }, [pool])
  const palette = usePalette(tint)
  const puff = look === 'Puff'

  useFrame(() => {
    const colour = geometry.getAttribute('color')
    for (let index = 0; index < pool.capacity; index += 1) {
      if (!pool.alive[index]) { colour.setXYZW(index, 0, 0, 0, 0); continue }
      const shade = speedColour ? speedShade(palette, pool, index, field) : palette.tint
      const alpha = fade ? fadeWithAge(pool.age[index], pool.lifetime[index]) : 1
      colour.setXYZW(index, shade.r, shade.g, shade.b, alpha * (puff ? 0.7 : 1))
    }
    colour.needsUpdate = true
    geometry.getAttribute('position').needsUpdate = true
  })

  return <points geometry={geometry} frustumCulled={false}>
    <pointsMaterial key={look} map={textures[look]} size={(puff ? 0.5 : 0.13) * size} vertexColors transparent alphaTest={0.02} depthWrite={false} />
  </points>
}

// Each trail is a run of short lines from the speck back through its stored
// positions, fading towards the oldest one.
function TrailLines({ pool, history, limit, tint, speedColour, fade, field }) {
  const maxVertices = pool.capacity * MAX_HISTORY * 2
  const geometry = useGeometry(() => {
    const lines = new BufferGeometry()
    lines.setAttribute('position', new BufferAttribute(new Float32Array(maxVertices * 3), 3))
    lines.setAttribute('color', new BufferAttribute(new Float32Array(maxVertices * 4), 4))
    return lines
  }, [pool, maxVertices])
  const palette = usePalette(tint)
  const scratch = useRef({ from: [0, 0, 0], to: [0, 0, 0] })

  useFrame(() => {
    const position = geometry.getAttribute('position')
    const colour = geometry.getAttribute('color')
    const { from, to } = scratch.current
    let vertex = 0
    for (let index = 0; index < pool.capacity; index += 1) {
      const length = Math.min(history.length[index], limit)
      if (!pool.alive[index] || length === 0) continue
      const shade = speedColour ? speedShade(palette, pool, index, field) : palette.tint
      const life = fade ? fadeWithAge(pool.age[index], pool.lifetime[index]) : 1
      to[0] = pool.position[index * 3]
      to[1] = pool.position[index * 3 + 1]
      to[2] = pool.position[index * 3 + 2]
      for (let k = 0; k < length; k += 1) {
        historyPoint(history, index, k, from)
        position.setXYZ(vertex, to[0], to[1], to[2])
        colour.setXYZW(vertex, shade.r, shade.g, shade.b, life * (1 - 0.7 * k / length))
        position.setXYZ(vertex + 1, from[0], from[1], from[2])
        colour.setXYZW(vertex + 1, shade.r, shade.g, shade.b, life * (1 - 0.7 * (k + 1) / length))
        vertex += 2
        to[0] = from[0]
        to[1] = from[1]
        to[2] = from[2]
      }
    }
    geometry.setDrawRange(0, vertex)
    position.needsUpdate = true
    colour.needsUpdate = true
  })

  return <lineSegments geometry={geometry} frustumCulled={false}>
    <lineBasicMaterial vertexColors transparent depthWrite={false} />
  </lineSegments>
}

// The wind map drawn as arrows on a coarse grid, a little above the ground.
function Arrows({ field }) {
  const geometry = useGeometry(() => {
    const vertices = []
    const arrow = [0, 0, 0]
    const steps = 12
    for (let row = 0; row <= steps; row += 1) {
      for (let column = 0; column <= steps; column += 1) {
        const x = -3 + (column / steps) * 6
        const z = -3 + (row / steps) * 6
        field(x, z, arrow)
        const strength = Math.hypot(arrow[0], arrow[2])
        if (strength < 1e-4) continue
        const length = Math.min(0.42, strength * 0.35)
        const directionX = arrow[0] / strength
        const directionZ = arrow[2] / strength
        const y = digSiteGround(x, z) + 0.07
        const tipX = x + directionX * length
        const tipZ = z + directionZ * length
        const head = Math.min(0.1, length * 0.45)
        vertices.push(x, y, z, tipX, y, tipZ)
        vertices.push(tipX, y, tipZ, tipX - (directionX + directionZ * 0.6) * head, y, tipZ - (directionZ - directionX * 0.6) * head)
        vertices.push(tipX, y, tipZ, tipX - (directionX - directionZ * 0.6) * head, y, tipZ - (directionZ + directionX * 0.6) * head)
      }
    }
    const lines = new BufferGeometry()
    lines.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3))
    return lines
  }, [field])
  return <lineSegments geometry={geometry}><lineBasicMaterial color={readToken('--ink-dim')} /></lineSegments>
}

function StateScene() {
  const look = useSceneStore((s) => s.params.particleLook)
  const size = useSceneStore((s) => s.params.particleSize)
  const selected = useParticleSelection((s) => s.selected)
  const select = useParticleSelection((s) => s.select)
  const getThree = useThree((s) => s.get)
  const textures = useTextures()
  const state = getParticleCloud()
  const geometry = useGeometry(() => buildPointsGeometry(state), [state])
  const ringGeometry = useGeometry(
    () => buildPointsGeometry({ position: state.position.slice(selected * 3, selected * 3 + 3) }),
    [state, selected],
  )

  useEffect(() => {
    const { params } = getThree().raycaster
    const previous = params.Points.threshold
    params.Points.threshold = 0.07
    return () => { params.Points.threshold = previous }
  }, [getThree])

  const puff = look === 'Puff'
  return <>
    <DigSite />
    <points
      geometry={geometry}
      onClick={(event) => { event.stopPropagation(); select(event.index) }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}
    >
      <pointsMaterial
        key={look}
        map={textures[look]}
        size={(puff ? 0.55 : 0.17) * size}
        color={readToken(puff ? '--clay-deep' : '--ink')}
        transparent
        opacity={puff ? 0.45 : 1}
        alphaTest={puff ? 0 : 0.5}
        depthWrite={!puff}
      />
    </points>
    <points geometry={ringGeometry} renderOrder={5}>
      <pointsMaterial map={textures.ring} size={0.7} color={readToken('--water-deep')} transparent alphaTest={0.3} depthTest={false} />
    </points>
  </>
}

const RUNNER_LANES = { speed: 1.9, frame: 2.6 }
const FOOTPRINT_CAPACITY = 1200

function Footprints({ race, lane, tint }) {
  const geometry = useGeometry(() => {
    const points = new BufferGeometry()
    points.setAttribute('position', new BufferAttribute(new Float32Array(FOOTPRINT_CAPACITY * 3), 3))
    return points
  }, [race])
  useFrame(() => {
    const steps = race.footprints[lane]
    const position = geometry.getAttribute('position')
    const count = Math.min(steps.length, FOOTPRINT_CAPACITY)
    const z = RUNNER_LANES[lane]
    for (let index = 0; index < count; index += 1) position.setXYZ(index, steps[index], digSiteGround(steps[index], z) + 0.02, z)
    geometry.setDrawRange(0, count)
    position.needsUpdate = true
  })
  return <points geometry={geometry} frustumCulled={false}><pointsMaterial size={0.05} color={readToken(tint)} /></points>
}

function Runner({ race, lane, tint }) {
  const mesh = useRef(null)
  useFrame(() => {
    const x = lane === 'speed' ? race.pool.position[0] : race.frameRunnerX
    const z = RUNNER_LANES[lane]
    mesh.current.position.set(x, digSiteGround(x, z) + 0.14, z)
  })
  return <mesh ref={mesh} castShadow><sphereGeometry args={[0.14, 20, 12]} /><meshStandardMaterial color={readToken(tint)} /></mesh>
}

function RaceScene({ simulation }) {
  const { race } = simulation
  const line = (x) => <mesh key={x} position={[x, digSiteGround(x, 2.25) + 0.01, 2.25]} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[0.05, 1.3]} /><meshBasicMaterial color={readToken('--ink')} />
  </mesh>
  return <>
    <DigSite />
    {line(RUNNER_START)}
    {line(RUNNER_FINISH)}
    <Runner race={race} lane="speed" tint="--water-deep" />
    <Runner race={race} lane="frame" tint="--clay-deep" />
    <Footprints race={race} lane="speed" tint="--water-deep" />
    <Footprints race={race} lane="frame" tint="--clay-deep" />
  </>
}

function Crumbs({ crumbs }) {
  const geometry = useGeometry(() => buildPointsGeometry({ position: crumbs.points }), [crumbs])
  useFrame(() => {
    geometry.setDrawRange(0, crumbs.count)
    geometry.getAttribute('position').needsUpdate = true
  })
  return <points geometry={geometry} frustumCulled={false}><pointsMaterial size={0.07} color={readToken('--ink-dim')} /></points>
}

function TrackedRing({ simulation }) {
  const textures = useTextures()
  const geometry = useGeometry(() => buildPointsGeometry({ position: new Float32Array(3) }), [simulation])
  const material = useRef(null)
  useFrame(() => {
    const index = simulation.tracked
    const visible = index >= 0 && simulation.pool.alive[index] === 1
    material.current.visible = visible
    if (!visible) return
    const position = geometry.getAttribute('position')
    position.array.set(simulation.pool.position.subarray(index * 3, index * 3 + 3))
    position.needsUpdate = true
  })
  return <points geometry={geometry} renderOrder={5} frustumCulled={false}>
    <pointsMaterial ref={material} map={textures.ring} size={0.45} color={readToken('--water-deep')} transparent alphaTest={0.3} depthTest={false} />
  </points>
}

// Drag the whirlpool's centre across the ground. The drag writes the same two
// settings as the Centre X and Centre Z sliders, so either way works.
function WhirlHandle() {
  const centreX = useSceneStore((s) => s.params.particleWhirlX)
  const centreZ = useSceneStore((s) => s.params.particleWhirlZ)
  const radius = useSceneStore((s) => s.params.particleWhirlRadius)
  const getThree = useThree((s) => s.get)
  const stopDrag = useRef(null)
  useEffect(() => () => stopDrag.current?.(), [])

  const startDrag = (event) => {
    event.stopPropagation()
    const { gl, camera, raycaster, controls } = getThree()
    if (controls) controls.enabled = false
    const plane = new Plane(new Vector3(0, 1, 0), -0.12)
    const pointer = new Vector2()
    const hit = new Vector3()
    const snap = (value) => Math.round(Math.max(-WHIRL_LIMIT, Math.min(WHIRL_LIMIT, value)) * 20) / 20
    const move = (moveEvent) => {
      const bounds = gl.domElement.getBoundingClientRect()
      pointer.set(((moveEvent.clientX - bounds.left) / bounds.width) * 2 - 1, -((moveEvent.clientY - bounds.top) / bounds.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      if (!raycaster.ray.intersectPlane(plane, hit)) return
      const { setParam } = useSceneStore.getState()
      setParam('particleWhirlX', snap(hit.x))
      setParam('particleWhirlZ', snap(hit.z))
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      if (controls) controls.enabled = true
      document.body.style.cursor = ''
      stopDrag.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    document.body.style.cursor = 'grabbing'
    stopDrag.current = stop
  }

  return <group position={[centreX, digSiteGround(centreX, centreZ) + 0.05, centreZ]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} /><meshBasicMaterial color={readToken('--water-deep')} transparent opacity={0.6} />
    </mesh>
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={startDrag}
      onPointerOver={() => { if (!stopDrag.current) document.body.style.cursor = 'grab' }}
      onPointerOut={() => { if (!stopDrag.current) document.body.style.cursor = '' }}
    >
      <circleGeometry args={[0.18, 32]} /><meshBasicMaterial color={readToken('--water-deep')} />
    </mesh>
  </group>
}

function LeafScene({ simulation, layered }) {
  const params = useSceneStore((s) => s.params)
  const field = useMemo(() => simulation.field(params), [simulation, params])
  const drop = layered ? undefined : (event) => { event.stopPropagation(); simulation.dropLeaf(event.point.x, event.point.z) }
  return <>
    <DigSite cave onGroundClick={drop} />
    <Arrows field={field} />
    <PoolPoints pool={simulation.pool} tint="--summit-deep" size={2} />
    {layered && <WhirlHandle />}
  </>
}

const PRESET_TINTS = { Dust: '--clay-deep', Mist: '--ink-faint', Rain: '--water-deep', Spores: '--summit-deep' }

function DustScene({ simulation, recipe }) {
  const params = useSceneStore((s) => s.params)
  const field = useMemo(() => simulation.field(params), [simulation, params])
  const view = params.particleView
  const look = {
    pool: simulation.pool,
    tint: recipe ? PRESET_TINTS[params.particlePreset] : '--clay-deep',
    speedColour: params.particleSpeedColour,
    fade: params.particleFade,
    field,
  }
  const size = recipe ? params.particleSize : 1
  return <>
    <DigSite cave />
    {view === 'Trails' && <TrailLines {...look} history={simulation.history} limit={params.particleHistory} />}
    <PoolPoints {...look} look={view === 'Puffs' ? 'Puff' : 'Dot'} size={view === 'Trails' ? size * 0.55 : size} />
  </>
}

export default function ParticleDemo() {
  const demo = useSceneStore((s) => s.demoKey)
  const screen = useSceneStore((s) => s.params.particleScreen)
  const simulation = useParticlePlayback((s) => (s.demo === demo ? s.simulation : null))

  useEffect(() => {
    if (demo === 'particle-state') return
    useParticlePlayback.getState().restart(demo, useSceneStore.getState().params)
  }, [demo, screen])
  useEffect(() => () => useParticlePlayback.setState({ simulation: null, demo: null, running: false, readout: null }), [])

  return <TerrainWorld worldSize={REGION_HALF_SIZE * 2}>
    {demo === 'particle-state' && <StateScene />}
    {simulation && <>
      <Clock />
      {demo === 'particle-lifecycle' && <><DigSite /><PoolPoints pool={simulation.pool} tint="--ink" /></>}
      {demo === 'particle-time' && <RaceScene simulation={simulation} />}
      {demo === 'particle-forces' && <>
        <DigSite />
        <Crumbs crumbs={simulation.crumbs} />
        <PoolPoints pool={simulation.pool} tint="--ink" size={1.2} />
        <TrackedRing simulation={simulation} />
      </>}
      {(demo === 'particle-field' || demo === 'particle-layers') && <LeafScene simulation={simulation} layered={demo === 'particle-layers'} />}
      {(demo === 'particle-trails' || demo === 'particle-recipe') && <DustScene simulation={simulation} recipe={demo === 'particle-recipe'} />}
    </>}
  </TerrainWorld>
}
