import { tuning } from '../config/tuning'
import type { createRunStore } from '../state/runState'
import { burrowSites, hashSeed, surfaceOf, type PlanetWorld } from '../world/planet'
import { distance, HALF, hoverGoal, scale, unit, surfaceRadius, type Vec3 } from './geometry'
import { burrowOpen } from './residents'
import { pruneStructures } from './structures'
import { notifyGroundChanged } from './workSites'

type RunStore = ReturnType<typeof createRunStore>
const toGrid = (p: Vec3) => ({ x: p[0], y: p[1] + HALF, z: p[2] })
const midpoint = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]

// SUR-09: runs every frame on the active planet in every mode, since the ground heals whoever is watching.
// An inactive planet is frozen (D-040), so its timers simply wait for the player to come back.
export function stepSurface(world: PlanetWorld, store: RunStore, seconds: number) {
  const moved = world.settle(seconds)
  if (moved.length === 0) return
  for (const { x, y, z, radius } of moved) notifyGroundChanged(store, [x, y - HALF, z], radius, world)
  pruneStructures(world, store)
  store.setState({ planetRemaining: world.planetRemaining })
}

// SUR-10: a crack running through a burrow's tunnel can bring it down. A seeded roll per burrow and chip keeps it
// reproducible. The plug is ordinary terrain, so residents inside react through the usual blocked-entrance path.
export function crackBurrows(world: PlanetWorld, store: RunStore, center: Vec3) {
  const { seed, crack } = { seed: store.getState().seed, crack: tuning.surface.crack }
  if (surfaceOf(seed).brittleness === 0) return
  for (const burrow of burrowSites(seed)) {
    const middle = midpoint(burrow.mouth, burrow.pocket)
    if (distance(center, middle) > crack.reach || !burrowOpen(world, burrow)) continue
    if (hashSeed(`${seed}:crack:${burrow.id}:${world.chips}`) / 4294967296 >= crack.chance) continue
    const result = world.edit('add', toGrid(middle), tuning.residents.burrows.tunnelRadius * crack.plug)
    if (result.changed) notifyGroundChanged(store, middle, tuning.residents.burrows.tunnelRadius * crack.plug, world)
  }
}

// SUR-10: heat. A robot that stays over one spot melts the ice under it, and sinks with the ground.
export function meltUnderRobots(world: PlanetWorld, store: RunStore) {
  if (world.surface !== 'ice') return
  const rules = tuning.surface.melt
  const state = store.getState()
  const heat: typeof state.heat = {}
  const sunk = new Map<string, Vec3>()
  for (const robot of [...state.robots, ...state.gardeners, ...state.riggers, ...state.builders]) {
    const direction = unit(robot.position)
    const last = state.heat[robot.id]
    const still = last && distance(last.direction, direction) < rules.stillWithin
    const ticks = still ? last.ticks + 1 : 0
    heat[robot.id] = { direction: still ? last.direction : direction, ticks }
    if (ticks < rules.afterTicks || ticks % rules.everyTicks !== 0) continue
    const ground = scale(direction, surfaceRadius(world.densityAt, direction))
    const result = world.edit('dig', toGrid(ground), rules.radius)
    if (!result.changed) continue
    sunk.set(robot.id, scale(direction, Math.hypot(...hoverGoal(world.densityAt, direction, tuning.miner.hoverHeight))))
    notifyGroundChanged(store, ground, result.reach, world)
  }
  const place = <T extends { id: string; position: Vec3 }>(robots: T[]) => sunk.size === 0 ? robots
    : robots.map(robot => sunk.has(robot.id) ? { ...robot, position: sunk.get(robot.id)! } : robot)
  store.setState(current => ({ heat, robots: place(current.robots), gardeners: place(current.gardeners),
    riggers: place(current.riggers), builders: place(current.builders) }))
  if (sunk.size > 0) {
    pruneStructures(world, store)
    store.setState({ planetRemaining: world.planetRemaining })
  }
}
