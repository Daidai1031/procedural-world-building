import { tuning } from '../config/tuning'
import type { ShearPattern } from '../content/surfaces'
import { add, scale, unit, type Vec3 } from './geometry'
import type { WorkArea } from './miner'

type Offset = [number, number]
const rules = tuning.surface.shear

// SUR-08: the points a Gardener shears for one pattern, as offsets from the center of its work area, in cutting order.
const plans = new Map<string, Offset[]>()
function shearPlan(pattern: ShearPattern, radius: number) {
  const key = `${pattern}:${radius}`
  const known = plans.get(key)
  if (known) return known
  const plan: Offset[] = []
  if (pattern === 'stripes') {
    // Back and forth along rows, so the robot never crosses the area between two strips.
    let row = 0
    for (let v = -radius; v <= radius; v += rules.gap, row += 1) {
      const half = Math.sqrt(radius ** 2 - v ** 2)
      const cuts = Math.floor(half * 2 / rules.along)
      for (let i = 0; i <= cuts; i += 1) plan.push([(row % 2 ? 1 : -1) * (half - i * rules.along), v])
    }
  } else if (pattern === 'rings') {
    for (let r = rules.gap / 2; r <= radius; r += rules.gap) {
      const cuts = Math.ceil(Math.PI * 2 * r / rules.along)
      for (let i = 0; i < cuts; i += 1) plan.push([Math.cos(i / cuts * Math.PI * 2) * r, Math.sin(i / cuts * Math.PI * 2) * r])
    }
  } else {
    // Equal steps along an Archimedean spiral: the angle advances by arc length over the current radius.
    const perTurn = rules.gap / (Math.PI * 2)
    for (let angle = 1; perTurn * angle <= radius; angle += rules.along / (perTurn * angle)) {
      plan.push([Math.cos(angle) * perTurn * angle, Math.sin(angle) * perTurn * angle])
    }
  }
  plans.set(key, plan)
  return plan
}

// The direction of the `step`-th cut, or null when the pattern is finished.
export function shearDirection(pattern: ShearPattern, area: WorkArea, step: number): Vec3 | null {
  const offset = shearPlan(pattern, area.radius)[step]
  if (!offset) return null
  const up = unit(area.center)
  const helper: Vec3 = Math.abs(up[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]
  const east = unit([up[1] * helper[2] - up[2] * helper[1], up[2] * helper[0] - up[0] * helper[2], up[0] * helper[1] - up[1] * helper[0]])
  const north: Vec3 = [east[1] * up[2] - east[2] * up[1], east[2] * up[0] - east[0] * up[2], east[0] * up[1] - east[1] * up[0]]
  return unit(add(area.center, add(scale(east, offset[0]), scale(north, offset[1]))))
}
