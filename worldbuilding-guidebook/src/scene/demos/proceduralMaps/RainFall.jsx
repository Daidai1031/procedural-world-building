import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture } from 'three'
import { readToken } from '../../../styles/readToken.js'
import { useSceneStore } from '../../../store/sceneStore.js'
import { sampleSimulationGrid } from './simulationMath.js'
import { useSimulationState } from './simulationState.js'

// The simulation adds the same rainfall to every cell on every update, so the
// rain falls over the whole map. Drops are dots that only picture that: their
// count follows the Rainfall control, and they fall while the simulation runs or
// just after a single step. The water they land in is drawn by WaterSurface.
const DROPS_PER_RAINFALL = 45000
const MAX_DROPS = 1600
const STEP_RAIN_SECONDS = 0.8
const HIDDEN_HEIGHT = -1000
// Dots keep the same size on screen wherever they are, so far drops stay as
// crisp as near ones.
const DOT_SIZE_PIXELS = 2.5

// A soft round dot, drawn once on a plain 2D canvas.
function createDotTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.beginPath()
  context.arc(16, 16, 14, 0, Math.PI * 2)
  context.fill()
  return new CanvasTexture(canvas)
}

function dropCountFor(rainfall, worldSize) {
  const area = (worldSize / 10) ** 2
  return Math.min(MAX_DROPS, Math.max(20, Math.round(rainfall * DROPS_PER_RAINFALL * area)))
}

// Per-drop position, the height it lands at, and whether it is in the air.
function createDrops(count) {
  return {
    x: new Float32Array(count),
    z: new Float32Array(count),
    y: new Float32Array(count),
    ground: new Float32Array(count),
    falling: new Uint8Array(count),
  }
}

function launchDrop(drops, index, startHeight, worldSize, amplitude) {
  const { simulation } = useSimulationState.getState()
  const u = Math.random()
  const v = Math.random()
  drops.x[index] = (u - 0.5) * worldSize
  drops.z[index] = (v - 0.5) * worldSize
  drops.ground[index] = sampleSimulationGrid(simulation.height, simulation.size, u, v) * amplitude
  drops.y[index] = startHeight
  drops.falling[index] = 1
}

export default function RainFall({ settings, mapSettings }) {
  const meshRef = useRef(null)
  const rainUntil = useRef(0)
  const lastIteration = useRef(useSimulationState.getState().simulation.iteration)
  const wasActive = useRef(false)

  const { worldSize, rainfall } = settings
  const dropCount = dropCountFor(rainfall, worldSize)
  const fallSpeed = worldSize * 1.2
  const skyHeight = mapSettings.amplitude * 1.25 + worldSize * 0.3

  const dropsRef = useRef(null)
  const positions = useMemo(() => new Float32Array(dropCount * 3).fill(HIDDEN_HEIGHT), [dropCount])
  const dotTexture = useMemo(() => createDotTexture(), [])
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useLayoutEffect(() => {
    dropsRef.current = createDrops(dropCount)
  }, [dropCount])

  useEffect(() => () => dotTexture.dispose(), [dotTexture])

  useFrame((state, delta) => {
    const points = meshRef.current
    const drops = dropsRef.current
    if (!points || !drops) return

    const iteration = useSimulationState.getState().simulation.iteration
    if (iteration > lastIteration.current) rainUntil.current = state.clock.elapsedTime + STEP_RAIN_SECONDS
    lastIteration.current = iteration

    const isActive = useSceneStore.getState().isRunning || state.clock.elapsedTime < rainUntil.current
    if (!isActive && !wasActive.current && !drops.falling.some(Boolean)) return

    // Rain that starts now begins above the map, spread over a second of fall so
    // the drops do not arrive as one sheet.
    if (isActive && !wasActive.current) {
      for (let index = 0; index < dropCount; index += 1) {
        if (!drops.falling[index]) launchDrop(drops, index, skyHeight + Math.random() * fallSpeed, worldSize, mapSettings.amplitude)
      }
    }
    wasActive.current = isActive

    for (let index = 0; index < dropCount; index += 1) {
      if (drops.falling[index]) {
        drops.y[index] -= fallSpeed * delta
        if (drops.y[index] <= drops.ground[index]) {
          if (isActive) launchDrop(drops, index, skyHeight + Math.random() * worldSize * 0.1, worldSize, mapSettings.amplitude)
          else drops.falling[index] = 0
        }
      }

      const offset = index * 3
      const isFalling = drops.falling[index] === 1
      const array = points.geometry.attributes.position.array
      array[offset] = drops.x[index]
      array[offset + 1] = isFalling ? drops.y[index] : HIDDEN_HEIGHT
      array[offset + 2] = drops.z[index]
    }
    points.geometry.attributes.position.needsUpdate = true
  })

  if (reducedMotion) return null

  return (
    <points key={dropCount} ref={meshRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={dotTexture}
        color={readToken('--erosion-water')}
        size={DOT_SIZE_PIXELS}
        sizeAttenuation={false}
        transparent
        alphaTest={0.3}
        depthWrite={false}
      />
    </points>
  )
}
