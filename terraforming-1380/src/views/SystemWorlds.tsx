import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BoxGeometry, Color, CylinderGeometry, IcosahedronGeometry, MeshBasicMaterial, TetrahedronGeometry, TorusGeometry, type Group, type Mesh, type MeshStandardMaterial } from 'three'
import type { PlanetRegistry } from '../state/planets'
import type { SystemPlanet } from '../systems/system'
import type { SystemLayout } from '../systems/systemView'
import { createTerrainMaterial } from '../render/terrainMaterial'
import { useWorldGeometry } from '../render/worldMesh'
import { planetConfig } from '../world/planet'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { palette } from '../config/palette'
import { tuning } from '../config/tuning'
import { PlanetReadouts } from './PlanetReadouts'
import { pickWorld, setHover, systemViewFrame, useSystemView } from '../state/systemView'

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
// How far a world has appeared: 0 while the camera is in orbit view, 1 when the system is fully shown.
const appearance = () => smoothstep(tuning.system.fade.otherWorlds[0], tuning.system.fade.otherWorlds[1], systemViewFrame.pull)

// A visited world keeps the active planet's terrain material, with two extra uniforms: how far it has faded
// into the paper background, and a small lift toward white while it is hovered.
function createWorldMaterial(baseRadius: number) {
  const material = createTerrainMaterial([], baseRadius)
  const uniforms = { uFade: { value: 0 }, uLift: { value: 0 }, uPaper: { value: new Color(palette.background).convertLinearToSRGB() } }
  const terrain = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    terrain.call(material, shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    // The terrain shader measures height from the scene origin; this world sits elsewhere, so measure from its own center.
    shader.vertexShader = shader.vertexShader.replace('vTerrainPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;', 'vTerrainPosition = transformed;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFade;\nuniform float uLift;\nuniform vec3 uPaper;')
      // After the output encoding, so the paper color is mixed in the same space the screen shows.
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        gl_FragColor.rgb = mix(uPaper, mix(gl_FragColor.rgb, vec3(1.0), uLift), uFade);`)
  }
  material.customProgramCacheKey = () => 'terrain-system-world-v1'
  return { material, uniforms }
}

// Unit-sized outlines per solid: the sphere's radius, the cube's half-extent and the tetrahedron's circumradius are all 1.
const outlines = {
  sphere: new IcosahedronGeometry(1, 1), cube: new BoxGeometry(2, 2, 2), tetra: new TetrahedronGeometry(1),
  donut: new TorusGeometry(tuning.planets.donut.major, tuning.planets.donut.minor, 6, 14).rotateX(Math.PI / 2),
  apple: new IcosahedronGeometry(1, 1),
  nail: new CylinderGeometry(tuning.planets.nail.shaft, tuning.planets.nail.shaft, 2.4, 8),
}
const outlineScale = (seed: string) => {
  const { radius, shape } = planetConfig(seed)
  const size = radius * VOXEL_WORLD_SIZE
  return shape === 'cube' ? size * tuning.planets.cubeHalf : shape === 'tetra' ? size * tuning.planets.tetraReach
    : shape === 'nail' ? size * tuning.planets.nail.scale : size
}
// Raycasting ignores visibility, so worlds only react while the system view is fully open.
const reachable = () => useSystemView.getState().phase === 'system'


interface WorldProps {
  planet: SystemPlanet
  position: [number, number, number]
  registry: PlanetRegistry
}

// Another world's real terrain: its own edited chunk meshes (SYS-02), refreshed only when they change (SYS-04).
function VisitedWorld({ planet, position, registry }: WorldProps) {
  const world = useMemo(() => registry.world(planet.seed), [registry, planet.seed])
  const group = useRef<Group>(null)
  const mesh = useRef<Mesh>(null)
  const baseRadius = planetConfig(planet.seed).radius * VOXEL_WORLD_SIZE
  const { material, uniforms } = useMemo(() => createWorldMaterial(baseRadius), [baseRadius])
  useEffect(() => () => material.dispose(), [material])
  useWorldGeometry(world, mesh)
  const gl = useThree(state => state.gl)

  useFrame(() => {
    const fade = appearance()
    if (group.current) group.current.visible = fade > 0.001
    const { hover, focus } = useSystemView.getState()
    uniforms.uFade.value = fade
    uniforms.uLift.value = hover === planet.seed || focus === planet.seed ? 0.12 : 0
  })

  return <group ref={group} position={position} visible={false}>
    <mesh ref={mesh} material={material as MeshStandardMaterial}
      onPointerOver={event => { if (!reachable()) return; event.stopPropagation(); setHover(planet.seed); gl.domElement.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(null); gl.domElement.style.cursor = '' }}
      onClick={event => { if (!reachable() || event.delta > 5 || event.button !== 0) return; event.stopPropagation(); pickWorld(planet.seed) }} />
    <PlanetReadouts seed={planet.seed} source={() => registry.snapshot(planet.seed)} live={false} />
  </group>
}

// A planet only known from a signal has no terrain yet, so it is an outline at its real radius until it is visited (SYS-07).
function SignalWorld({ planet, position }: WorldProps) {
  const group = useRef<Group>(null)
  const material = useMemo(() => new MeshBasicMaterial({ color: palette.system.wire, wireframe: true, transparent: true, opacity: 0 }), [])
  useEffect(() => () => material.dispose(), [material])
  const gl = useThree(state => state.gl)

  useFrame(() => {
    const fade = appearance()
    if (group.current) group.current.visible = fade > 0.001
    const { hover, focus } = useSystemView.getState()
    material.opacity = fade
    material.color.set(hover === planet.seed || focus === planet.seed ? palette.system.wireHover : palette.system.wire)
  })

  return <group ref={group} position={position} visible={false}>
    <mesh geometry={outlines[planetConfig(planet.seed).shape]} material={material} scale={outlineScale(planet.seed)}
      onPointerOver={event => { if (!reachable()) return; event.stopPropagation(); setHover(planet.seed); gl.domElement.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(null); gl.domElement.style.cursor = '' }}
      onClick={event => { if (!reachable() || event.delta > 5 || event.button !== 0) return; event.stopPropagation(); pickWorld(planet.seed) }} />
  </group>
}

// D-049: every known world except the active one, placed around it. The active planet is never moved or scaled.
export function SystemWorlds({ planets, layout, registry }: { planets: SystemPlanet[]; layout: SystemLayout; registry: PlanetRegistry }) {
  return <>
    {planets.filter(planet => !planet.active && layout.positions[planet.seed]).map(planet => planet.visited
      ? <VisitedWorld key={planet.seed} planet={planet} position={layout.positions[planet.seed]} registry={registry} />
      : <SignalWorld key={planet.seed} planet={planet} position={layout.positions[planet.seed]} registry={registry} />)}
  </>
}
