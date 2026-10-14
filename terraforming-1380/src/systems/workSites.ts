import type { createRunStore } from '../state/runState'
import { tuning } from '../config/tuning'
import { distance, type Vec3 } from './geometry'

// Only wake an armed Gardener whose work area intersects the edited ground.
export function notifyGroundChanged(store: ReturnType<typeof createRunStore>, center: Vec3, radius: number) {
  const state = store.getState()
  if (state.structures.filter(s => s.kind === 'plant').length >= tuning.structures.maxPlants
    && state.structures.filter(s => s.kind === 'antenna').length >= tuning.structures.maxAntennas) return
  const affected = (robot: typeof state.gardeners[number]) => robot.phase === 'stopped' && robot.stopReason === 'no-sites'
    && robot.area && distance(robot.area.center, center) <= robot.area.radius + radius
  if (!state.gardeners.some(affected)) return
  store.setState({ gardeners: state.gardeners.map(robot => affected(robot)
    ? { ...robot, phase: 'scanning', stopReason: null, site: null, misses: 0, phaseTicks: 0 } : robot) })
}
