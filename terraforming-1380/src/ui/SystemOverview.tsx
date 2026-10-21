import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, DoubleSide, IcosahedronGeometry, MeshStandardMaterial, type Mesh } from 'three'
import type { createRunStore } from '../state/runState'
import { registryFor } from '../state/planets'
import { systemPlanets, type SystemPlanet } from '../systems/system'
import { planetConfig, type PlanetWorld } from '../world/planet'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { palette } from '../config/palette'

type Store = ReturnType<typeof createRunStore>
const SCALE = 0.7

// SYS-02: the overview shape is the world's own current chunk meshes merged into one geometry, never a stand-in sphere.
function mergeChunks(world: PlanetWorld) {
  const meshes = world.chunks.map(({ mesh }) => mesh).filter(mesh => mesh.positions.length > 0)
  const length = meshes.reduce((sum, mesh) => sum + mesh.positions.length, 0)
  const positions = new Float32Array(length), normals = new Float32Array(length)
  let offset = 0
  for (const mesh of meshes) {
    positions.set(mesh.positions, offset)
    normals.set(mesh.normals, offset)
    offset += mesh.positions.length
  }
  for (let i = 1; i < length; i += 3) positions[i] -= VOXEL_WORLD_SIZE / 2
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new BufferAttribute(normals, 3))
  geometry.computeBoundingSphere()
  return geometry
}

// SYS-04: one comparison of chunk versions per frame; geometry is rebuilt only when a world's mesh really changed.
function WorldBody({ world, planet, hovered, onHover, onPick }: {
  world: PlanetWorld; planet: SystemPlanet; hovered: boolean
  onHover: (seed: string | null) => void; onPick: (planet: SystemPlanet) => void
}) {
  const mesh = useRef<Mesh>(null)
  const version = useRef(-1)
  const material = useMemo(() => new MeshStandardMaterial({ color: '#d9d5cb', roughness: 0.95 }), [])
  useEffect(() => () => { material.dispose(); mesh.current?.geometry.dispose() }, [material])
  useEffect(() => { material.color.set(hovered ? '#d8d2c4' : planet.active ? '#bdb7aa' : '#a29d93') }, [material, hovered, planet.active])
  useFrame(() => {
    if (!mesh.current || world.meshVersion === version.current) return
    version.current = world.meshVersion
    const previous = mesh.current.geometry
    mesh.current.geometry = mergeChunks(world)
    previous.dispose()
  })
  return <group position={planet.position}>
    <mesh ref={mesh} material={material} scale={SCALE}
      onPointerOver={event => { event.stopPropagation(); onHover(planet.seed) }} onPointerOut={() => onHover(null)}
      onClick={event => { if (event.delta > 5) return; event.stopPropagation(); onPick(planet) }} />
    {planet.active && <mesh rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
      <ringGeometry args={[2.3, 2.38, 64]} />
      <meshBasicMaterial color="#353632" side={DoubleSide} />
    </mesh>}
  </group>
}

const signalGeometry = new IcosahedronGeometry(1, 1)
// A planet answered by a signal but never visited has no world yet, so it is drawn as an outline, not as terrain.
function SignalBody({ planet, hovered, onHover, onPick }: {
  planet: SystemPlanet; hovered: boolean; onHover: (seed: string | null) => void; onPick: (planet: SystemPlanet) => void
}) {
  // PLN-02: the outline already has the planet's real radius, so size can be compared before landing.
  return <mesh position={planet.position} geometry={signalGeometry} scale={planetConfig(planet.seed).radius * VOXEL_WORLD_SIZE * SCALE}
    onPointerOver={event => { event.stopPropagation(); onHover(planet.seed) }} onPointerOut={() => onHover(null)}
    onClick={event => { if (event.delta > 5) return; event.stopPropagation(); onPick(planet) }}>
    <meshBasicMaterial color={hovered ? '#3a3b36' : '#8a887f'} wireframe />
  </mesh>
}

// Left drag orbits the whole system; the wheel moves closer or further.
function OverviewCamera({ target, distance }: { target: [number, number, number]; distance: number }) {
  const { camera, gl } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    let azimuth = 0.6, polar = 1.05, range = distance, dragging = false, lastX = 0, lastY = 0
    const update = () => {
      camera.position.set(target[0] + range * Math.sin(polar) * Math.sin(azimuth), target[1] + range * Math.cos(polar),
        target[2] + range * Math.sin(polar) * Math.cos(azimuth))
      camera.lookAt(...target)
    }
    const down = (event: PointerEvent) => { dragging = true; lastX = event.clientX; lastY = event.clientY }
    const move = (event: PointerEvent) => {
      if (!dragging || !(event.buttons & 1)) return
      azimuth -= (event.clientX - lastX) * 0.006
      polar = Math.max(0.2, Math.min(Math.PI - 0.2, polar + (event.clientY - lastY) * 0.006))
      lastX = event.clientX; lastY = event.clientY
      update()
    }
    const up = () => { dragging = false }
    const wheel = (event: WheelEvent) => { event.preventDefault(); range = Math.max(5, Math.min(60, range * (1 + Math.sign(event.deltaY) * 0.1))); update() }
    update()
    canvas.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    canvas.addEventListener('wheel', wheel, { passive: false })
    return () => {
      canvas.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      canvas.removeEventListener('wheel', wheel)
    }
  }, [camera, gl, target, distance])
  return null
}

function describe(planet: SystemPlanet) {
  if (!planet.visited) return `${planet.traits} · answered a signal, not visited yet`
  const parts = [planet.traits, `${Math.round((planet.remaining ?? 1) * 100)}% of the original rock`]
  // Descriptive only: where residents are, never whether they are "happy".
  if (planet.residents) parts.push(`${planet.residents} resident${planet.residents === 1 ? '' : 's'}${planet.residentsSearching ? `, ${planet.residentsSearching} looking for shelter` : ''}`)
  if (planet.plants || planet.antennas) parts.push(`${planet.plants} plant${planet.plants === 1 ? '' : 's'}, ${planet.antennas} antenna${planet.antennas === 1 ? '' : 's'}`)
  parts.push(planet.active ? (planet.robotsRunning ? `${planet.robotsRunning} robot${planet.robotsRunning === 1 ? '' : 's'} at work` : 'Crew idle')
    : planet.robotsRunning ? 'Crew paused until you return' : 'Quiet')
  return parts.join(' · ')
}

// S4: every known world in one 3D space, drawn from its current edited terrain. Hover inspects, click travels.
export function SystemOverview({ store, onVisit, onClose }: {
  store: Store; onVisit: (seed: string, name: string) => void; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const registry = useMemo(() => registryFor(store), [store])
  const [planets, setPlanets] = useState(() => systemPlanets(store))
  const [hovered, setHovered] = useState<string | null>(null)
  useEffect(() => {
    dialog.current?.showModal()
    // Descriptions follow the running planet while the overview is open.
    const timer = window.setInterval(() => setPlanets(systemPlanets(store)), 1000)
    return () => window.clearInterval(timer)
  }, [store])
  const center = useMemo<[number, number, number]>(() => {
    const sum = planets.reduce((acc, p) => acc.map((v, i) => v + p.position[i]), [0, 0, 0])
    return sum.map(v => v / planets.length) as [number, number, number]
  }, [planets.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const distance = useMemo(() => 8 + Math.max(...planets.map(p => Math.hypot(...p.position.map((v, i) => v - center[i])))) * 1.6,
    [center]) // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (planet: SystemPlanet) => { if (planet.active) onClose(); else onVisit(planet.seed, planet.name) }
  const focus = planets.find(p => p.seed === hovered)

  return <dialog className="system-dialog" ref={dialog} aria-labelledby="system-title" onClose={onClose}>
    <div className="map-heading"><div><p className="kicker">Contract #1380 / known worlds</p><h2 id="system-title">System overview</h2></div>
      <button className="map-close" onClick={onClose} aria-label="Close system overview">Close ×</button></div>
    <div className="system-body">
      <div className="system-canvas" data-hover={!!hovered}>
        <Canvas camera={{ position: [0, 6, 16], fov: 40 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.15} />
          <hemisphereLight args={[palette.light.sky, palette.light.ground, 0.7]} />
          <directionalLight position={[5, 4, 3]} intensity={2.6} />
          <directionalLight position={[-5, -2, -3]} intensity={0.5} />
          <OverviewCamera target={center} distance={distance} />
          {planets.map(planet => planet.visited
            ? <WorldBody key={planet.seed} world={registry.world(planet.seed)} planet={planet} hovered={hovered === planet.seed} onHover={setHovered} onPick={pick} />
            : <SignalBody key={planet.seed} planet={planet} hovered={hovered === planet.seed} onHover={setHovered} onPick={pick} />)}
        </Canvas>
        <p className="system-hint">{focus ? `${focus.name} — ${describe(focus)}` : 'Drag to turn the system · hover a world to inspect · click to travel'}</p>
      </div>
      <ul className="system-list" aria-label="Known worlds">
        {planets.map(planet => <li key={planet.seed} data-hover={hovered === planet.seed} onPointerEnter={() => setHovered(planet.seed)} onPointerLeave={() => setHovered(null)}>
          <span className="system-swatch" data-kind={planet.active ? 'here' : planet.visited ? 'visited' : 'signal'} aria-hidden="true" />
          <div><strong>{planet.name}{planet.active ? ' · you are here' : ''}</strong><small>{describe(planet)}</small></div>
          {!planet.active && <button onClick={() => pick(planet)}>{planet.visited ? 'Return' : 'Travel'} →</button>}
        </li>)}
      </ul>
    </div>
  </dialog>
}
