import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Matrix4, Quaternion, Vector3, type Group } from 'three'
import type { createRunStore } from '../state/runState'
import { burrowSites, hashSeed, type Burrow, type PlanetWorld } from '../world/planet'
import { disturbanceAt, plantCoverAt, stepResidents, temperamentOf, type Temperament } from '../systems/residents'
import { stepMigration } from '../systems/migration'
import { stepTraffic } from '../systems/traffic'
import { isAquatic, stepWater } from '../systems/water'
import { stepLogistics } from '../systems/logistics'
import { tuning } from '../config/tuning'
import { HALF, type Vec3 } from '../systems/geometry'
import { audiencePlaces, type VisitPose } from '../systems/fieldVisit'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import type { ResidentKind } from '../content/residents'
import { createResidentKit, createResidentModel, type ResidentPose } from '../render/models/residents'

type Store = ReturnType<typeof createRunStore>
type World = Pick<PlanetWorld, 'densityAt'>
const rules = tuning.residents

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
      // D-067/D-068: Manual mode does not run stepSimulation, but trains and visitors still move.
      stepMigration(store)
      stepTraffic(world as PlanetWorld, store)
      stepWater(world as PlanetWorld, store)
      stepLogistics(store)
    }
  })
  return null
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
// D-059: how often and how long depend on the species. Every cycle keeps at least a second below ground, so frequent,
// long peeks never wrap around mid-rise.
function exposure(id: string, time: number, rise: number, plantCover: number, nature: Temperament['look']) {
  const basePeriod = nature.every[0] + fraction(`${id}:peek-period`) * (nature.every[1] - nature.every[0])
  const timeOut = nature.out + plantCover * look.plants.outBonus
  const period = Math.max(timeOut + 2 * rise + 1, basePeriod * (1 - plantCover * (1 - look.plants.periodScale)))
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

// Yaw while surfaced, from -1 to 1. snap holds each side then snaps across; sweep pans; dart jumps between random
// directions about `rate / 2` times a second (the view's smoothing turns the jumps into quick turns).
function glanceAt(style: Temperament['look']['glanceStyle'], id: string, index: number, time: number, rate: number) {
  if (style === 'sweep') return Math.sin(time * rate + index * 1.9)
  if (style === 'dart') return fraction(`${id}:dart:${Math.floor(time * rate * 0.5 + index * 0.37)}`) * 2 - 1
  return Math.tanh(3 * Math.sin(time * rate + index * 1.9))
}

const pose: ResidentPose = { tuck: 0, shut: 0, peek: 0, shake: 0, walk: 0 }
const setPose = (tuck: number, shut: number, peek: number, shake: number, walk: number) => Object.assign(pose, { tuck, shut, peek, shake, walk })

// RES-08, D-055: calm residents lurk with the crown showing and now and then surface to glance around; hiding sinks
// further; disturbance nearby stops the peeks and sets the body trembling. Moving and searching stand on the surface.
// D-059: every planet's residents are its own species, each with its body (render/models/residents.ts) and character.
export function ResidentsView({ world, store, visitRef, placesRef }: {
  world: World; store: Store
  visitRef?: MutableRefObject<VisitPose | null>
  placesRef?: MutableRefObject<Map<string, Vec3>>
}) {
  const group = useRef<Group>(null)
  const seed = store(state => state.seed)
  // D-068: a planet can hold several species, so a body is chosen per resident, keyed by id and species together.
  const ids = store(state => state.residents.map(resident => `${resident.id}|${resident.species}`).join(' '))
  const kit = useMemo(() => createResidentKit(), [])
  useEffect(() => () => kit.dispose(), [kit])
  const models = useMemo(() => {
    return ids ? ids.split(' ').map(key => { const [id, species] = key.split('|'); return createResidentModel(species as ResidentKind, hashSeed(`${seed}:${id}:body`), kit) }) : []
  }, [seed, ids, kit])
  const shown = useRef<Vector3[]>([])
  const heading = useRef<Vector3[]>([])
  const glance = useRef<number[]>([])
  useEffect(() => {
    shown.current = []
    heading.current = []
    glance.current = []
    return () => models.forEach(model => model.dispose())
  }, [models])

  useFrame(({ clock }, delta) => {
    const { residents: list, habitat, seed: current, structures } = store.getState()
    if (current !== seed) return
    const burrows = burrowSites(seed)
    const time = clock.elapsedTime
    const visit = visitRef?.current
    const crowd = new Map((visit?.shown ? audiencePlaces(list.map((resident) => ({ id: resident.id, position: resident.position })), visit) : []).map((place) => [place.id, place]))
    if (placesRef) placesRef.current.clear()
    list.forEach((resident, index) => {
      const model = models[index]
      if (!model) return
      const nature = temperamentOf(resident.species)
      const node = model.object
      if (isAquatic(resident.species)) {
        // D-073: a swimmer is drawn where it is, in three dimensions, facing the way it swims.
        const shownAt = shown.current[index] ??= new Vector3(...resident.position)
        const was = shownAt.clone()
        shownAt.lerp(target.set(...resident.position), Math.min(1, delta * 10))
        const course = heading.current[index] ??= new Vector3(0, 0, 1)
        if (was.distanceToSquared(shownAt) > 1e-9) course.copy(shownAt).sub(was).normalize()
        up.copy(shownAt).normalize()
        side.crossVectors(up, course)
        if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
        side.normalize()
        facing.crossVectors(course, side).normalize()
        basis.makeBasis(side, facing, course)
        node.quaternion.setFromRotationMatrix(basis)
        node.position.copy(shownAt)
        node.scale.setScalar(nature.look.scale * resident.size)
        placesRef?.current.set(resident.id, [shownAt.x, shownAt.y, shownAt.z])
        setPose(0, 0, 0, 0, 0)
        model.update(pose, time, delta, nature.look.gait)
        return
      }
      const radius = rules.bodyRadius * resident.size
      const scale = nature.look.scale * resident.size
      const settled = resident.state === 'peeking' || resident.state === 'hiding'
      const burrow = resident.burrowId ? burrows.find(item => item.id === resident.burrowId) : undefined
      const level = settled ? disturbanceAt(habitat, resident.home ?? resident.position) : 0
      const fear = Math.min(1, Math.max(0, (level - rules.quietLevel) / (nature.retreatLevel - rules.quietLevel)))
      const plantCover = Math.min(1, plantCoverAt(structures, resident.home ?? resident.position) * nature.look.plants)
      const out = resident.state === 'peeking' && fear === 0
        ? exposure(resident.id, time, burrow ? look.climb : look.rise, plantCover, nature.look) : 0
      // Depths of the model origin below the ground, in model units: lurking shows the crown but keeps the eyes under
      // (a periscope's stalk eye is meant to show), hiding shuts the eyes and shows less crown, peeking clears the eyes.
      const crown = -model.top * (1 - nature.look.crown)
      const lurk = model.stalkPeek ? crown : Math.min(crown, -model.eyeTop - look.eyeCover)
      const hidden = -model.top * (1 - nature.look.crown * look.hideCrown / look.crown)
      const peek = model.stalkPeek ? lurk : Math.min(0, Math.max(lurk, look.eyeClear - model.eyeLine))
      const spot = crowd.get(resident.id)
      let goal: Vector3
      if (spot && visit) {
        // The slot is a direction. Start from the Drifter's ground radius so the surface search lands on this planet.
        const rough = Math.hypot(visit.feet[0], visit.feet[1], visit.feet[2])
        goal = target.set(...spot.direction).setLength(rough)
        goal.setLength(drawnGround(world, [goal.x, goal.y, goal.z]))
      } else if (settled && burrow) {
        goal = mix(burrow.mouth, burrow.pocket, 0.82 + (tunnelExit(burrow, peek * scale) - 0.82) * out)
      } else if (settled && resident.home) {
        const depth = resident.state === 'hiding' ? hidden : lurk + (peek - lurk) * out
        goal = target.set(...resident.home)
        goal.setLength(drawnGround(world, resident.home) + depth * scale)
      } else {
        // Routes run `surfaceLift` above the ground; the feet go on the ground.
        goal = target.set(...resident.position)
        goal.setLength(goal.length() - rules.surfaceLift)
      }
      const shownAt = shown.current[index] ??= goal.clone()
      const previous = shownAt.clone()
      shownAt.lerp(goal, Math.min(1, delta * 12))
      up.copy(shownAt).normalize()
      // Face along the walk while moving and out of the tunnel while in a burrow; otherwise keep a stable heading.
      const travel = previous.sub(shownAt).negate()
      const wanted = heading.current[index] ??= new Vector3(1, 0, 0)
      // Followers walk the way he walks, from behind. They do not turn around to face him on the way there.
      if (spot?.manner === 'follow' && visit) wanted.set(...visit.heading)
      else if (spot?.manner === 'watch' && visit && travel.lengthSq() > 1e-5) wanted.set(...visit.heading)
      else if (spot?.manner === 'watch' && visit) wanted.set(...visit.feet).sub(shownAt)
      else if (resident.state === 'moving' && travel.lengthSq() > 1e-8) wanted.copy(travel).normalize()
      else if (burrow) wanted.set(...burrow.mouth).sub(target.set(...burrow.pocket)).normalize()
      facing.copy(wanted).addScaledVector(up, -wanted.dot(up))
      if (facing.lengthSq() < 1e-6) facing.set(1, 0, 0).addScaledVector(up, -up.x)
      facing.normalize()
      side.crossVectors(up, facing)
      basis.makeBasis(side, up, facing)
      node.quaternion.setFromRotationMatrix(basis)
      // Look around while surfaced or searching, in the species' manner.
      const looking = spot?.manner === 'follow' ? 0 : resident.state === 'searching' ? 1 : out
      const seen = glance.current[index] ?? 0
      const yaw = looking * nature.look.glance * glanceAt(nature.look.glanceStyle, resident.id, index, time, nature.look.glanceRate)
      glance.current[index] = seen + (yaw - seen) * Math.min(1, delta * 10)
      node.quaternion.multiply(turn.setFromAxisAngle(localUp, glance.current[index]))
      const bob = resident.state === 'searching' ? Math.abs(Math.sin(time * 3 + index)) * 0.02 : 0
      node.position.copy(shownAt).addScaledVector(up, bob)
      if (fear > 0 && !spot) {
        const wave = time * Math.PI * 2 * look.tremble.rate + index
        const shake = fear * nature.look.tremble * radius
        node.position.addScaledVector(side, Math.sin(wave) * shake).addScaledVector(facing, Math.sin(wave * 1.37 + index) * shake * 0.6)
        node.quaternion.multiply(turn.setFromAxisAngle(localFront, Math.sin(wave * 1.13) * fear * look.tremble.roll))
      }
      node.scale.setScalar(scale)
      placesRef?.current.set(resident.id, [shownAt.x, shownAt.y, shownAt.z])
      if (spot) setPose(0, 0, travel.length() > 0.0015 ? 0 : 1, 0, travel.length() > 0.0015 ? 1 : 0)
      else if (resident.state === 'moving') setPose(0, 0, 0, 0, 1)
      else if (resident.state === 'searching') setPose(0, 0, 1, 0.25, 0)
      else setPose(1, resident.state === 'hiding' ? 1 : 0, out, fear, 0)
      model.update(pose, time, delta, nature.look.gait)
    })
  })

  return <group ref={group}>
    {models.map((model, index) => <primitive key={`${seed}:${index}`} object={model.object} dispose={null} />)}
  </group>
}
