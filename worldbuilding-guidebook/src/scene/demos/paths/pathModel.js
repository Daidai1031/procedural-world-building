import { Vector3 } from 'three'
import { heightAt } from '../distributions/terrain.js'
import { ENTRANCE, SHELTER, editedHeight, makeRoute, motionRoute, orderedWaypoints, penetrationReport, projectRoute, shelterCandidates } from './pathMath.js'
import { disturbanceCost, rankRoutes, validateRoute } from './pathClearance.js'

export const flatGround = () => 0.12
export const teachingGround = (x, z) => 0.12 + 0.05 * Math.sin(x) * Math.sin(z)

export function buildPathModel(demo, params) {
  const model = { rocks: [], points: [], nodes: [], ground: flatGround, radius: 0.18, status: '' }
  if (demo === 'path-order') {
    const ordered = orderedWaypoints(params.pathOrder)
    model.nodes = ordered.map(({ id, point }, index) => ({ label: `${index + 1} · ${id}${id === 'A' ? ' Entrance' : id === 'C' ? ' Shelter' : ' Waypoint'}`, point }))
    model.points = ordered.map(({ point }) => point)
    model.rocks = [{ x: 0, z: 0, radius: 0.65 }]
    model.status = `Route ${params.pathOrder} · ends at ${ordered.at(-1).id === 'C' ? 'the shelter' : 'the waypoint'}`
  }
  if (demo === 'path-turn') {
    // #region turn-controls
    model.controls = [ENTRANCE.clone(), new Vector3(0, 0.18, -params.pathBend), SHELTER.clone()]
    model.curve = makeRoute(model.controls, params.pathShape === 'Curve')
    model.points = model.curve.getSpacedPoints(240)
    // #endregion
    model.rocks = [{ x: 0.65, z: -1.4, radius: 0.4 }]
    model.validation = validateRoute(model.points, 0, model.rocks)
    model.status = model.validation.valid ? 'Clear centreline · body clearance comes later' : 'Touches rock · × marks contact'
  }
  if (demo === 'path-motion') {
    model.curve = motionRoute()
    model.points = model.curve.getSpacedPoints(240)
    model.status = `${params.pathSampling} sampling · dots mark equal time intervals`
  }
  if (demo === 'path-ground') {
    model.ground = heightAt
    model.curve = makeRoute([new Vector3(-2.6, 0, -1.9), new Vector3(-0.4, 0, 0.5), new Vector3(2.6, 0, 1.5)])
    model.points = projectRoute(model.curve, params.pathSpacing)
    model.penetration = penetrationReport(model.points)
    model.mapY = 3.5
    model.status = `${model.points.length} samples · worst measured penetration ${model.penetration.worst.toFixed(3)} m`
  }
  if (demo === 'path-clearance') {
    model.radius = params.pathRadius
    const gap = { Original: 0.8, 'Block passage': 0.22, 'Open passage': 1.6 }[params.pathPassage]
    model.rocks = [-1, 1].map((sign) => ({ x: 0, z: sign * (0.8 + gap / 2), radius: 0.8 }))
    model.curve = makeRoute([ENTRANCE.clone(), SHELTER.clone()], false)
    model.points = projectRoute(model.curve, 0.025, flatGround)
    model.validation = validateRoute(model.points, model.radius, model.rocks)
    model.status = `${model.validation.valid ? 'Passable' : 'Blocked · stop before ×'} · gap ${gap.toFixed(2)} m / body ${(model.radius * 2).toFixed(2)} m · supported`
    if (params.pathExperiment) {
      model.ground = params.pathEffect === 'After' ? (x, z) => editedHeight(x, z, params.pathWidth) : heightAt
      model.points = projectRoute(model.curve, 0.1, model.ground)
      model.validation = validateRoute(model.points, model.radius, model.rocks, model.ground)
      model.status = `${params.pathEffect} terrain edit · ${model.validation.valid ? 'Passable' : model.validation.reason} · rechecked support and slope`
    }
  }
  if (demo === 'path-choice') {
    model.ground = teachingGround
    if (params.pathGates !== 'Open') model.rocks.push({ x: 2.15, z: -0.85, radius: 0.48 })
    if (params.pathGates === 'Both blocked') model.rocks.push({ x: 2.15, z: 2, radius: 0.48 })
    model.candidates = shelterCandidates(params.pathSeed).map((candidate) => {
      const points = projectRoute(candidate.curve, 0.04, teachingGround)
      const validation = validateRoute(points, model.radius, model.rocks, teachingGround)
      const disturbance = disturbanceCost(points, params.pathDisturbance)
      return { ...candidate, points, validation, disturbance, cost: validation.length / 8 + disturbance / 2 }
    })
    model.selected = rankRoutes(model.candidates)[0] ?? null
    model.points = model.selected?.points ?? []
    model.validation = model.selected?.validation
    model.status = model.selected ? `Selected ${model.selected.id} · lowest-cost valid route` : 'Waiting at entrance · no valid candidate in this set'
    model.nodes = ['A', 'B'].map((id) => ({ label: `Shelter ${id}`, point: model.candidates.find((c) => c.shelter === id).points.at(-1) }))
    model.nodes.push({ label: 'Entrance', point: new Vector3(ENTRANCE.x, teachingGround(ENTRANCE.x, 0) + 0.06, 0) })
  }
  if (!model.nodes.length) model.nodes = [
    { label: 'Entrance', point: model.points[0] ?? ENTRANCE },
    { label: 'Shelter', point: model.points.at(-1) ?? SHELTER },
  ]
  return model
}

export function polylineSample(points, distance) {
  if (points.length < 2) return { point: ENTRANCE.clone(), tangent: new Vector3(1, 0, 0) }
  let remaining = distance
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]
    const b = points[index]
    const length = a.distanceTo(b)
    if (remaining <= length || index === points.length - 1) {
      return { point: a.clone().lerp(b, Math.min(1, remaining / Math.max(length, 0.00001))), tangent: b.clone().sub(a).normalize() }
    }
    remaining -= length
  }
}
