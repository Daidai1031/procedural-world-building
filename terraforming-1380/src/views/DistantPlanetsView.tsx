import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { IcosahedronGeometry, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import type { createRunStore } from '../state/runState'
import { distantPlanets, visiblePlanetCount, type DistantPlanet } from '../systems/signal'
import { tuning } from '../config/tuning'
import { hashSeed } from '../world/planet'

const DEPTH = 30
const ray = new Vector3()

// A lumpy low-poly body so each distant planet reads as rock, not a perfect ball.
function planetGeometry(seed: string) {
  const geometry = new IcosahedronGeometry(1, 3)
  const h = hashSeed(seed)
  const a = 2 + (h % 3), b = 3 + ((h >>> 3) % 3), phase = (h % 628) / 100
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i)
    const relief = 1 + 0.07 * Math.sin(a * x + phase) * Math.cos(b * y) + 0.05 * Math.sin(b * z - phase)
    position.setXYZ(i, x * relief, y * relief, z * relief)
  }
  geometry.computeVertexNormals()
  return geometry
}

// Signal response: after enough broadcasts, planets fade in behind the home planet, held at fixed screen positions.
export function DistantPlanetsView({ store, seed, onHover, onSelect }: {
  store: ReturnType<typeof createRunStore>
  seed: string
  onHover: (planet: DistantPlanet | null) => void
  onSelect: (planet: DistantPlanet) => void
}) {
  const camera = useThree(state => state.camera)
  const gl = useThree(state => state.gl)
  const meshes = useRef<(Mesh | null)[]>([])
  const appeared = useRef<(number | null)[]>([])
  const planets = useMemo(() => distantPlanets(seed), [seed])
  const bodies = useMemo(() => planets.map(planet => ({
    geometry: planetGeometry(planet.seed),
    material: new MeshStandardMaterial({ color: planet.color, roughness: 0.9, flatShading: true, transparent: true, opacity: 0 }),
  })), [planets])
  useEffect(() => () => bodies.forEach(({ geometry, material }) => { geometry.dispose(); material.dispose() }), [bodies])
  // Three.js raycasting ignores visibility, so a planet only answers once it has mostly faded in.
  const reachable = (index: number) => bodies[index].material.opacity > 0.5
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useFrame(({ clock }, delta) => {
    // Half the view height at DEPTH, read from the live projection so lens changes are respected.
    const halfHeight = DEPTH / camera.projectionMatrix.elements[5]
    const count = visiblePlanetCount(store.getState().signal.broadcastCount)
    planets.forEach((planet, index) => {
      const mesh = meshes.current[index]
      if (!mesh) return
      const shown = index < count
      if (shown && appeared.current[index] == null) appeared.current[index] = clock.elapsedTime
      const fade = shown ? Math.min(1, (clock.elapsedTime - appeared.current[index]!) / (still ? 0.01 : tuning.signal.planetFadeSeconds)) : 0
      mesh.visible = fade > 0
      bodies[index].material.opacity = fade
      ray.set(planet.ndc[0], planet.ndc[1], 0.5).unproject(camera).sub(camera.position).normalize()
      mesh.position.copy(camera.position).addScaledVector(ray, DEPTH)
      mesh.scale.setScalar(planet.size * halfHeight * (0.6 + 0.4 * fade))
      if (!still) mesh.rotation.y += delta * 0.08
    })
  })

  return <group>
    {planets.map((planet, index) => <mesh key={planet.seed} ref={mesh => { meshes.current[index] = mesh }}
      geometry={bodies[index].geometry} material={bodies[index].material}
      onPointerOver={event => { if (!reachable(index)) return; event.stopPropagation(); gl.domElement.style.cursor = 'pointer'; onHover(planet) }}
      onPointerOut={() => { gl.domElement.style.cursor = 'crosshair'; onHover(null) }}
      onClick={event => { if (!reachable(index)) return; event.stopPropagation(); onSelect(planet) }} />)}
  </group>
}
