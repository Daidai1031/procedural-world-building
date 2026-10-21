import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { IcosahedronGeometry, Matrix4, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3, type Group } from 'three'
import type { createRunStore } from '../state/runState'
import { burrowSites, hashSeed, type Burrow, type PlanetWorld } from '../world/planet'
import { disturbanceAt, plantCoverAt, stepResidents } from '../systems/residents'
import { tuning } from '../config/tuning'
import { palette } from '../config/palette'
import { HALF } from '../systems/geometry'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { residentSpecies } from '../content/residents'

type Store = ReturnType<typeof createRunStore>
type World = Pick<PlanetWorld, 'densityAt'>
const rules = tuning.residents
const facetColors = residentSpecies.facet.rockFamilies.flatMap(family => palette.resident.rock[family])

// In Manual mode this runner advances residents. Auto/Autopilot advances them through stepSimulation.
export function ResidentRunner({ world, store, active }: { world: PlanetWorld; store: Store; active: boolean }) {
  const accumulator = useRef(0)
  useFrame((_, delta) => {
    if (!active) { accumulator.current = 0; return }
    const step = 1 / rules.tickRate
    accumulator.current = Math.min(accumulator.current + delta, step * 3)
    while (accumulator.current >= step) {
      accumulator.current -= step
      stepResidents(world, store)
    }
  })
  return null
}

// One coarse rock body; a little vertex noise per vertex keeps it from reading as a ball.
function bodyGeometry() {
  const geometry = new IcosahedronGeometry(1, 1)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i)
    const k = 1 + 0.12 * Math.sin(x * 5.1 + y * 2.3) * Math.cos(z * 4.7 - y * 1.9)
    position.setXYZ(i, x * k * 1.05, y * k * 0.9, z * k)
  }
  geometry.computeVertexNormals()
  return geometry
}

const up = new Vector3(), facing = new Vector3(), side = new Vector3(), target = new Vector3(), basis = new Matrix4()
const turn = new Quaternion(), localUp = new Vector3(0, 1, 0), localFront = new Vector3(0, 0, 1)
const look = rules.look
const fraction = (key: string) => (hashSeed(key) % 1000) / 1000
const ease = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
const mix = (a: readonly number[], b: readonly number[], t: number) => target.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)

// D-055: 0 while lurking, 1 while surfaced. Each resident keeps its own rhythm, so the population never peeks in unison.
function exposure(id: string, time: number, rise: number, plantCover: number) {
  const basePeriod = look.every[0] + fraction(`${id}:peek-period`) * (look.every[1] - look.every[0])
  const period = basePeriod * (1 - plantCover * (1 - look.plants.periodScale))
  const timeOut = look.out + plantCover * look.plants.outBonus
  const into = (time + fraction(`${id}:peek-phase`) * period) % period - (period - timeOut - 2 * rise)
  if (into < 0) return 0
  return ease(0, rise, into) * (1 - ease(timeOut + rise, timeOut + 2 * rise, into))
}

// Where along a burrow's tunnel (0 = mouth, 1 = pocket) the body sits `lift` above the ground. The mouth is placed
// 0.12 outside the surface (burrowSites), and the radius along the tunnel only grows toward the mouth.
function tunnelExit(burrow: Burrow, lift: number) {
  const ground = Math.hypot(...burrow.mouth) - 0.12 + lift
  let near = 0, far = 1
  for (let i = 0; i < 12; i++) {
    const mid = (near + far) / 2
    if (mix(burrow.mouth, burrow.pocket, mid).length() > ground) near = mid
    else far = mid
  }
  return near
}

// The home comes from nearest-sample density reads, so it can sit up to half a voxel off the drawn surface. Blending
// the eight surrounding samples, as the terrain mesh does along its edges, finds the ground the player actually sees.
const GRID = (tuning.grid.resolution - 1) / VOXEL_WORLD_SIZE
function blendedDensity(world: World, x: number, y: number, z: number) {
  const g = [x + HALF, y + HALF, z + HALF].map(v => Math.min(tuning.grid.resolution - 1.001, Math.max(0, v * GRID)))
  const base = g.map(Math.floor), f = g.map((v, i) => v - base[i])
  let total = 0
  for (let corner = 0; corner < 8; corner++) {
    const o = [corner & 1, (corner >> 1) & 1, (corner >> 2) & 1]
    const weight = o.reduce((w, bit, i) => w * (bit ? f[i] : 1 - f[i]), 1)
    if (weight > 0) total += weight * world.densityAt((base[0] + o[0]) / GRID - HALF, (base[1] + o[1]) / GRID, (base[2] + o[2]) / GRID - HALF)
  }
  return total
}

function drawnGround(world: World, home: readonly number[]) {
  const length = Math.hypot(home[0], home[1], home[2])
  const u = home.map(v => v / length)
  const solid = (r: number) => blendedDensity(world, u[0] * r, u[1] * r, u[2] * r) < 0
  let outside = length + 1 / GRID
  let inside = outside
  while (inside > length - 2 / GRID && !solid(inside)) inside -= 0.2 / GRID
  if (!solid(inside)) return length
  for (let i = 0; i < 8; i++) {
    const mid = (inside + outside) / 2
    if (solid(mid)) inside = mid
    else outside = mid
  }
  return (inside + outside) / 2
}

// RES-08, D-055: calm residents lurk with the crown showing and now and then surface to glance around; hiding sinks
// further; disturbance nearby stops the peeks and sets the body trembling. Moving and searching stay fully visible.
export function ResidentsView({ world, store }: { world: World; store: Store }) {
  const group = useRef<Group>(null)
  const parts = useMemo(() => ({
    body: bodyGeometry(),
    eye: new SphereGeometry(0.16, 8, 6),
    skin: facetColors.map(color => new MeshStandardMaterial({ color, roughness: 1, flatShading: true })),
    pupil: new MeshStandardMaterial({ color: palette.resident.accent.eyeInk, roughness: 0.6 }),
  }), [])
  useEffect(() => () => {
    parts.body.dispose()
    parts.eye.dispose()
    parts.skin.forEach(material => material.dispose())
    parts.pupil.dispose()
  }, [parts])
  const residents = store(state => state.residents.length)
  const shown = useRef<Vector3[]>([])
  const heading = useRef<Vector3[]>([])
  const glance = useRef<number[]>([])

  useFrame(({ clock }, delta) => {
    const root = group.current
    if (!root) return
    const { residents: list, habitat, seed, structures } = store.getState()
    const burrows = burrowSites(seed)
    const time = clock.elapsedTime
    list.forEach((resident, index) => {
      const node = root.children[index] as Group | undefined
      if (!node) return
      const radius = rules.bodyRadius * resident.size
      const settled = resident.state === 'peeking' || resident.state === 'hiding'
      const burrow = resident.burrowId ? burrows.find(item => item.id === resident.burrowId) : undefined
      const level = settled ? disturbanceAt(habitat, resident.home ?? resident.position) : 0
      const fear = Math.min(1, Math.max(0, (level - rules.quietLevel) / (rules.retreatLevel - rules.quietLevel)))
      const plantCover = plantCoverAt(structures, resident.home ?? resident.position)
      const out = resident.state === 'peeking' && fear === 0
        ? exposure(resident.id, time, burrow ? look.climb : look.rise, plantCover) : 0
      let goal = target.set(...resident.position)
      if (settled && burrow) {
        goal = mix(burrow.mouth, burrow.pocket, 0.82 + (tunnelExit(burrow, look.peek * radius) - 0.82) * out)
      } else if (settled && resident.home) {
        const depth = resident.state === 'hiding' ? look.hide : look.lurk + (look.peek - look.lurk) * out
        goal = target.set(...resident.home)
        goal.setLength(drawnGround(world, resident.home) + depth * radius)
      }
      const current = shown.current[index] ??= goal.clone()
      const previous = current.clone()
      current.lerp(goal, Math.min(1, delta * 12))
      up.copy(current).normalize()
      // Face along the walk while moving and out of the tunnel while in a burrow; otherwise keep a stable heading.
      const travel = previous.sub(current).negate()
      const wanted = heading.current[index] ??= new Vector3(1, 0, 0)
      if (resident.state === 'moving' && travel.lengthSq() > 1e-8) wanted.copy(travel).normalize()
      else if (burrow) wanted.set(...burrow.mouth).sub(target.set(...burrow.pocket)).normalize()
      facing.copy(wanted).addScaledVector(up, -wanted.dot(up))
      if (facing.lengthSq() < 1e-6) facing.set(1, 0, 0).addScaledVector(up, -up.x)
      facing.normalize()
      side.crossVectors(up, facing)
      basis.makeBasis(side, up, facing)
      node.quaternion.setFromRotationMatrix(basis)
      // Glance left and right while surfaced: hold each side, then snap across.
      const seen = glance.current[index] ?? 0
      const yaw = out * look.glance * Math.tanh(3 * Math.sin(time * look.glanceRate + index * 1.9))
      glance.current[index] = seen + (yaw - seen) * Math.min(1, delta * 10)
      node.quaternion.multiply(turn.setFromAxisAngle(localUp, glance.current[index]))
      const bob = resident.state === 'moving' ? Math.abs(Math.sin(time * 14 + index)) * 0.025
        : resident.state === 'searching' ? Math.abs(Math.sin(time * 3 + index)) * 0.02 : 0
      node.position.copy(current).addScaledVector(up, bob)
      if (fear > 0) {
        const wave = time * Math.PI * 2 * look.tremble.rate + index
        const shake = fear * look.tremble.amount * radius
        node.position.addScaledVector(side, Math.sin(wave) * shake).addScaledVector(facing, Math.sin(wave * 1.37 + index) * shake * 0.6)
        node.quaternion.multiply(turn.setFromAxisAngle(localFront, Math.sin(wave * 1.13) * fear * look.tremble.roll))
      }
      node.scale.setScalar(radius)
    })
  })

  return <group ref={group}>
    {Array.from({ length: residents }, (_, index) => <group key={index}>
      <mesh geometry={parts.body} material={parts.skin[(index * 5) % parts.skin.length]} raycast={() => null} />
      <mesh geometry={parts.eye} material={parts.pupil} position={[-0.32, 0.25, 0.86]} raycast={() => null} />
      <mesh geometry={parts.eye} material={parts.pupil} position={[0.32, 0.25, 0.86]} raycast={() => null} />
    </group>)}
  </group>
}
