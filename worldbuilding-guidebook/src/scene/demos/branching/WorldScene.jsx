import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, Object3D } from 'three'
import { useSceneStore } from '../../../store/sceneStore.js'
import { readToken } from '../../../styles/readToken.js'
import { useWorldPlayback } from './worldPlayback.js'
import {
  isPocket, isWalkable, noiseAt, residentPosition, statusOf, WORLD_MAP,
} from './worldExperiment.js'

const CELL = 0.5
// World A sits behind world B, so the legend on the right never covers either.
const OFFSETS = [-2.15, 2.15]
const WIDTH = WORLD_MAP[0].length
const HEIGHT = WORLD_MAP.length
const STATUS_TOKENS = {
  calm: '--ink', bothered: '--clay-deep', walking: '--water-deep', 'staying put': '--summit-deep', 'in a pocket': '--moss-deep',
}
const FLOOR_CELLS = WORLD_MAP.flatMap((row, y) => Array.from({ length: WIDTH }, (_, x) => [x, y]).filter((cell) => isWalkable(cell)))
const ROCK_CELLS = WORLD_MAP.flatMap((row, y) => Array.from({ length: WIDTH }, (_, x) => [x, y]).filter((cell) => !isWalkable(cell)))

// Cell (x, y) of a world, placed on the ground plane around the world's centre.
const worldX = (cell) => (cell[0] - (WIDTH - 1) / 2) * CELL
const worldZ = (cell, offset) => offset + (cell[1] - (HEIGHT - 1) / 2) * CELL

function useGeometry(factory, dependencies) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(factory, dependencies)
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

// Steps both runs with a fixed dt. A slow or fast screen changes how many steps
// run per frame, never how long one step is.
function Clock() {
  const clock = useRef({ accumulator: 0 })
  useFrame((_, delta) => {
    const playback = useWorldPlayback.getState()
    if (!playback.running || document.hidden) { clock.current.accumulator = 0; return }
    playback.advance(clock.current, delta)
  })
  useEffect(() => {
    const pauseHidden = () => { if (document.hidden) useWorldPlayback.getState().pause() }
    document.addEventListener('visibilitychange', pauseHidden)
    return () => document.removeEventListener('visibilitychange', pauseHidden)
  }, [])
  return null
}

const scratch = new Object3D()
const tint = new Color()

function Patch({ index, outline }) {
  const offset = OFFSETS[index]
  const overlay = useSceneStore((state) => state.params.branchingNoiseOverlay)
  const floor = useRef(null)
  const robot = useRef(null)
  const walkers = useRef([])
  const palette = useMemo(() => ({
    floor: new Color(readToken('--paper-3')), pocket: new Color(readToken('--moss')), loud: new Color(readToken('--clay-deep')),
  }), [])
  const outlineGeometry = useGeometry(() => {
    const half = [(WIDTH * CELL) / 2 + 0.06, (HEIGHT * CELL) / 2 + 0.06]
    const corners = [[-half[0], -half[1]], [half[0], -half[1]], [half[0], half[1]], [-half[0], half[1]], [-half[0], -half[1]]]
    const lines = new BufferGeometry()
    lines.setAttribute('position', new BufferAttribute(new Float32Array(corners.flatMap(([x, z]) => [x, 0.02, z])), 3))
    return lines
  }, [])

  useFrame(() => {
    const world = useWorldPlayback.getState().worlds?.[index]
    if (!world || !floor.current) return
    FLOOR_CELLS.forEach((cell, slot) => {
      scratch.position.set(worldX(cell), 0, worldZ(cell, offset))
      scratch.updateMatrix()
      floor.current.setMatrixAt(slot, scratch.matrix)
      tint.copy(isPocket(cell) ? palette.pocket : palette.floor)
      if (overlay) tint.lerp(palette.loud, Math.min(1, noiseAt(world, cell)) * 0.85)
      floor.current.setColorAt(slot, tint)
    })
    floor.current.instanceMatrix.needsUpdate = true
    floor.current.instanceColor.needsUpdate = true
    robot.current.position.set(worldX(world.work), 0.34, worldZ(world.work, offset))
    robot.current.scale.setScalar(0.6 + 0.4 * world.level)
    world.residents.forEach((resident, slot) => {
      const mesh = walkers.current[slot]
      if (!mesh) return
      const [x, y] = residentPosition(resident)
      mesh.position.set(worldX([x, y]), 0.2, worldZ([x, y], offset))
      mesh.material.color.set(readToken(STATUS_TOKENS[statusOf(world, resident)]))
    })
  })

  return <group>
    <instancedMesh ref={floor} args={[undefined, undefined, FLOOR_CELLS.length]}>
      <boxGeometry args={[CELL * 0.94, 0.08, CELL * 0.94]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
    {ROCK_CELLS.map((cell) => (
      <mesh key={cell.join(',')} position={[worldX(cell), 0.12, worldZ(cell, offset)]}>
        <boxGeometry args={[CELL * 0.98, 0.3, CELL * 0.98]} />
        <meshStandardMaterial color={readToken('--ink-dim')} roughness={1} />
      </mesh>
    ))}
    <mesh ref={robot}>
      <coneGeometry args={[0.18, 0.46, 4]} />
      <meshStandardMaterial color={readToken('--summit')} roughness={0.8} />
    </mesh>
    {[0, 1, 2].map((slot) => (
      <mesh key={slot} ref={(mesh) => { walkers.current[slot] = mesh }}>
        <sphereGeometry args={[0.15, 16, 12]} />
        <meshStandardMaterial roughness={0.8} />
      </mesh>
    ))}
    <group position={[0, 0, offset]}>
      <lineLoop geometry={outlineGeometry}><lineBasicMaterial color={readToken(outline)} /></lineLoop>
    </group>
  </group>
}

export default function WorldScene() {
  const worlds = useWorldPlayback((state) => state.worlds)
  return <>
    <color attach="background" args={[readToken('--paper')]} />
    <ambientLight intensity={0.75} />
    <directionalLight position={[3, 8, 5]} intensity={1.8} />
    <Clock />
    {worlds && <>
      <Patch index={0} outline="--ink" />
      <Patch index={1} outline="--water-deep" />
    </>}
  </>
}
