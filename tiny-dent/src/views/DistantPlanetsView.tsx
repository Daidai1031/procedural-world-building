import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { createRunStore } from '../state/runState'
import { distantPlanets, visiblePlanetCount, type DistantPlanet } from '../systems/signal'
import { createDistantBody } from '../render/distantPlanet'
import { tuning } from '../config/tuning'

const DEPTH = 30
const ray = new Vector3()

// Signal response: after enough broadcasts, planets fade in behind the home planet, held at fixed screen positions.
// D-074: each is drawn as the world it really is (see render/distantPlanet.ts), not a grey lump.
export function DistantPlanetsView({ store, seed, onHover, onSelect }: {
  store: ReturnType<typeof createRunStore>
  seed: string
  onHover: (planet: DistantPlanet | null) => void
  onSelect: (planet: DistantPlanet) => void
}) {
  const camera = useThree(state => state.camera)
  const gl = useThree(state => state.gl)
  const appeared = useRef<(number | null)[]>([])
  const hovered = useRef<number | null>(null)
  const lift = useRef<number[]>([])
  const planets = useMemo(() => distantPlanets(seed), [seed])
  const bodies = useMemo(() => planets.map(planet => createDistantBody(planet.seed)), [planets])
  useEffect(() => () => bodies.forEach(body => body.dispose()), [bodies])
  // Three.js raycasting ignores visibility, so a planet only answers once it has mostly faded in.
  const reachable = (index: number) => bodies[index].group.userData.fade > 0.5
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useFrame(({ clock }, delta) => {
    // Half the view height at DEPTH, read from the live projection so lens changes are respected.
    const halfHeight = DEPTH / camera.projectionMatrix.elements[5]
    const count = visiblePlanetCount(store.getState().signal.broadcastCount)
    planets.forEach((planet, index) => {
      const entry = bodies[index]
      const shown = index < count
      if (shown && appeared.current[index] == null) appeared.current[index] = clock.elapsedTime
      const fade = shown ? Math.min(1, (clock.elapsedTime - appeared.current[index]!) / (still ? 0.01 : tuning.signal.planetFadeSeconds)) : 0
      entry.group.visible = fade > 0
      entry.group.userData.fade = fade
      entry.setFade(fade)
      const goal = hovered.current === index ? 1 : 0
      lift.current[index] = (lift.current[index] ?? 0) + (goal - (lift.current[index] ?? 0)) * Math.min(1, delta * 8)
      entry.setLift(lift.current[index])
      ray.set(planet.ndc[0], planet.ndc[1], 0.5).unproject(camera).sub(camera.position).normalize()
      entry.group.position.copy(camera.position).addScaledVector(ray, DEPTH)
      entry.group.scale.setScalar(planet.size * halfHeight * (0.6 + 0.4 * fade))
      entry.update(clock.elapsedTime, delta, still)
    })
  })

  return <group>
    {planets.map((planet, index) => <primitive key={planet.seed} object={bodies[index].group}
      onPointerOver={(event: { stopPropagation: () => void }) => { if (!reachable(index)) return; event.stopPropagation(); hovered.current = index; gl.domElement.style.cursor = 'pointer'; onHover(planet) }}
      onPointerOut={() => { if (hovered.current === index) hovered.current = null; gl.domElement.style.cursor = ''; onHover(null) }}
      onClick={(event: { stopPropagation: () => void }) => { if (!reachable(index)) return; event.stopPropagation(); onSelect(planet) }} />)}
  </group>
}
