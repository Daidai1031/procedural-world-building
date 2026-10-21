import { CatmullRomCurve3, CurvePath, LineCurve3, Vector3 } from 'three'
import { heightAt, buildTerrainSurface } from '../distributions/terrain.js'
import { createRandom } from '../distributions/random.js'

export const DISPLAY_OFFSET = 0.06
export const STEP_SECONDS = 0.1
export const ENTRANCE = new Vector3(-2.5, 0.18, 0)
export const SHELTER = new Vector3(2.5, 0.18, 0)

export function orderedWaypoints(order) {
  const points = { A: ENTRANCE, B: new Vector3(0, 0.18, -1.5), C: SHELTER }
  // #region waypoint-order
  return order.split(' → ').map((id) => ({ id, point: points[id].clone() }))
  // #endregion
}

export function makeRoute(points, curved = true) {
  if (curved) {
    // #region curve-construction
    const curve = new CatmullRomCurve3(points, false, 'centripetal')
    // #endregion
    curve.arcLengthDivisions = 1200
    return curve
  }
  const route = new CurvePath()
  for (let index = 1; index < points.length; index += 1) {
    route.add(new LineCurve3(points[index - 1], points[index]))
  }
  return route
}

export function motionRoute() {
  return makeRoute([
    ENTRANCE.clone(), new Vector3(-2.2, 0.18, -0.2),
    new Vector3(-1.9, 0.18, -0.8), new Vector3(1, 0.18, -1.6), SHELTER.clone(),
  ])
}

export function travelSample(curve, seconds, mode, duration = 8) {
  const progress = Math.min(1, Math.max(0, seconds / duration))
  // #region distance-sampling
  const point = mode === 'Distance' ? curve.getPointAt(progress) : curve.getPoint(progress)
  const tangent = mode === 'Distance' ? curve.getTangentAt(progress) : curve.getTangent(progress)
  // #endregion
  return { point, tangent, progress }
}

export function arcDistance(curve, from, to, mode) {
  if (mode === 'Distance') return (to - from) * curve.getLength()
  let distance = 0
  let previous = curve.getPoint(from)
  for (let index = 1; index <= 100; index += 1) {
    const point = curve.getPoint(from + (to - from) * index / 100)
    distance += previous.distanceTo(point)
    previous = point
  }
  return distance
}

export function projectRoute(curve, spacing, ground = heightAt) {
  const count = Math.max(1, Math.ceil(curve.getLength() / spacing))
  // #region terrain-projection
  return Array.from({ length: count + 1 }, (_, index) => {
    const point = curve.getPointAt(index / count)
    point.y = ground(point.x, point.z) + DISPLAY_OFFSET
    return point
  })
  // #endregion
}

export function penetrationReport(points, ground = heightAt) {
  let worst = 0
  const contacts = []
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]
    const b = points[index]
    const count = Math.max(2, Math.ceil(a.distanceTo(b) / 0.015))
    let depth = 0
    for (let sample = 0; sample <= count; sample += 1) {
      const p = a.clone().lerp(b, sample / count)
      depth = Math.max(depth, ground(p.x, p.z) - p.y)
    }
    worst = Math.max(worst, depth)
    if (depth > 0.001) contacts.push([a, b])
  }
  return { worst, contacts }
}

export function editedHeight(x, z, width) {
  const distance = Math.hypot(Math.max(0, Math.abs(x) - 2.5), z)
  // #region terrain-influence
  const t = Math.max(0, 1 - distance / width)
  const influence = t * t * (3 - 2 * t)
  const along = Math.max(0, Math.min(1, (x + 2.5) / 5))
  const grade = heightAt(-2.5, 0) * (1 - along) + heightAt(2.5, 0) * along
  return heightAt(x, z) * (1 - influence) + grade * influence
  // #endregion
}

export function terrainCopy(ground) {
  const surface = buildTerrainSurface()
  for (let index = 0; index < surface.positions.length; index += 3) {
    const x = surface.positions[index]
    const z = surface.positions[index + 2]
    surface.positions[index + 1] = ground(x, z)
  }
  return surface
}

export function shelterCandidates(seed) {
  const random = createRandom(seed)
  const candidates = []
  for (const [shelter, z] of [['A', -0.85], ['B', 2]]) {
    for (let bend = 0; bend < 3; bend += 1) {
      const end = new Vector3(2.5, 0.18, z)
      const middle = new Vector3(0, 0.18, z + (random() - 0.5) * 0.5)
      const curve = makeRoute([ENTRANCE.clone(), middle, end])
      candidates.push({ id: `${shelter}${bend + 1}`, shelter, curve, end })
    }
  }
  return candidates
}
