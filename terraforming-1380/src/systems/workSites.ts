import type { createRunStore } from '../state/runState'
import { placerFull, type PlacerState } from './placer'
import type { StructureKind } from './structures'
import { distance, type Vec3 } from './geometry'
import type { PlanetWorld } from '../world/planet'
import { reconcileResidentsAfterGroundChange } from './residents'

// Only wake an armed Gardener or Rigger whose work area intersects the edited ground.
export function notifyGroundChanged(store: ReturnType<typeof createRunStore>, center: Vec3, radius: number, world?: PlanetWorld) {
  if (world) reconcileResidentsAfterGroundChange(world, store, center, radius)
  const state = store.getState()
  const affected = (robot: PlacerState) => robot.phase === 'stopped' && robot.stopReason === 'no-sites'
    && robot.area && distance(robot.area.center, center) <= robot.area.radius + radius
  const wake = (robots: PlacerState[], kind: StructureKind) => !placerFull(state, kind) && robots.some(affected)
    ? robots.map(robot => affected(robot) ? { ...robot, phase: 'scanning' as const, stopReason: null, site: null, misses: 0, phaseTicks: 0 } : robot)
    : null
  const gardeners = wake(state.gardeners, 'plant'), riggers = wake(state.riggers, 'antenna')
  if (gardeners) store.setState({ gardeners })
  if (riggers) store.setState({ riggers })
}
