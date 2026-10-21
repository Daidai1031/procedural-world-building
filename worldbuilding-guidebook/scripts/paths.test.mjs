import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Vector3 } from 'three'
import { pathParams } from '../src/scene/demos/paths/params.js'
import { arcDistance, editedHeight, motionRoute, orderedWaypoints, penetrationReport, travelSample } from '../src/scene/demos/paths/pathMath.js'
import { buildPathModel, polylineSample } from '../src/scene/demos/paths/pathModel.js'
import { rankRoutes, segmentClearance, validateRoute } from '../src/scene/demos/paths/pathClearance.js'
import { heightAt, buildTerrainSurface } from '../src/scene/demos/distributions/terrain.js'
import { travelLimit, usePathPlayback } from '../src/scene/demos/paths/playback.js'

const defaults = Object.fromEntries(Object.entries(pathParams).map(([key, value]) => [key, value.default]))
const model = (demo, overrides = {}) => buildPathModel(demo, { ...defaults, ...overrides })

test('waypoint order changes the route but never its fixed positions', () => {
  const abc = orderedWaypoints('A → B → C')
  const acb = orderedWaypoints('A → C → B')
  assert.deepEqual(abc.map((n) => n.id), ['A', 'B', 'C'])
  assert.deepEqual(acb.map((n) => n.id), ['A', 'C', 'B'])
  for (const node of abc) assert.deepEqual(node.point, acb.find((n) => n.id === node.id).point)
})

test('a rounded turn can touch a rock that the control polygon clears', () => {
  assert.equal(model('path-turn', { pathShape: 'Straight' }).validation.valid, true)
  assert.equal(model('path-turn').validation.valid, false)
  assert.equal(model('path-turn', { pathBend: 0 }).validation.valid, true)
})

test('distance sampling has constant arc distance, parameter sampling does not', () => {
  const curve = motionRoute()
  const distances = (mode) => Array.from({ length: 16 }, (_, i) => arcDistance(curve, i / 16, (i + 1) / 16, mode))
  const uniform = distances('Distance')
  const varied = distances('Parameter')
  assert.ok(Math.max(...uniform) - Math.min(...uniform) < 1e-8)
  assert.ok(Math.max(...varied) / Math.min(...varied) > 2)
  assert.ok(travelSample(curve, 99, 'Distance').point.distanceTo(curve.getPoint(1)) < 1e-8)
  assert.ok(Math.abs(travelSample(curve, 2, 'Distance').tangent.length() - 1) < 1e-8)
})

test('dense projection resolves penetration, and map plane clears the terrain', () => {
  const coarse = model('path-ground', { pathSpacing: 2.5 })
  const fine = model('path-ground', { pathSpacing: 0.1 })
  assert.ok(coarse.penetration.worst > 0.2)
  assert.ok(fine.penetration.worst < 0.001)
  const { positions } = buildTerrainSurface()
  for (let i = 1; i < positions.length; i += 3) assert.ok(positions[i] < coarse.mapY)
})

test('penetration check catches an off-midpoint hill', () => {
  const points = [new Vector3(0, 0.06, 0), new Vector3(1, 0.06, 0)]
  const report = penetrationReport(points, (x) => Math.exp(-(((x - 0.23) / 0.03) ** 2)))
  assert.ok(report.worst > 0.8)
})

test('swept segment clearance catches a thin obstacle between endpoints', () => {
  const a = new Vector3(-1, 0.18, 0)
  const b = new Vector3(1, 0.18, 0)
  const rock = { x: 0.23, z: 0, radius: 0.02 }
  assert.ok(Math.abs(segmentClearance(a, b, rock) + 0.02) < 1e-12)
  assert.equal(validateRoute([a, b], 0.1, [rock]).valid, false)
})

test('body size and reversible passage edits change passability; safe stop stays outside rock', () => {
  assert.equal(model('path-clearance').validation.valid, true)
  assert.equal(model('path-clearance', { pathRadius: 0.5 }).validation.valid, false)
  const blocked = model('path-clearance', { pathPassage: 'Block passage' })
  assert.equal(blocked.validation.valid, false)
  const stop = polylineSample(blocked.points, blocked.validation.safeDistance).point
  for (const rock of blocked.rocks) assert.ok(segmentClearance(stop, stop, rock) >= blocked.radius)
  assert.equal(model('path-clearance', { pathRadius: 0.65, pathPassage: 'Open passage' }).validation.valid, true)
  assert.deepEqual(model('path-clearance').points, model('path-clearance').points)
})

test('support and slope are hard constraints independently of rocks', () => {
  const route = [new Vector3(0, 0.18, 0), new Vector3(1, 0.18, 0)]
  assert.equal(validateRoute(route, 0.1, [], () => NaN).reason, 'No support')
  assert.equal(validateRoute(route, 0.1, [], (x) => x > 0.2 && x < 0.3 ? -1 : 0.12).reason, 'No support')
  assert.equal(validateRoute([new Vector3(0, 0.06, 0), new Vector3(1, 2.06, 0)], 0.1, [], (x) => 2 * x).reason, 'Too steep')
})

test('terrain influence is local, deterministic and does not mutate the source ground', () => {
  const original = heightAt(0, 0)
  assert.notEqual(editedHeight(0, 0, 0.7), original)
  assert.equal(editedHeight(0, 2, 0.7), heightAt(0, 2))
  assert.equal(editedHeight(0, 0, 0.7), editedHeight(0, 0, 1.5))
  assert.equal(heightAt(0, 0), original)
  assert.equal(model('path-clearance', { pathExperiment: true, pathEffect: 'Before', pathPassage: 'Open passage' }).validation.reason, 'Too steep')
  assert.equal(model('path-clearance', { pathExperiment: true, pathEffect: 'After', pathPassage: 'Open passage' }).validation.valid, true)
})

test('seeded candidates validate before ranking and disturbance changes the selected shelter', () => {
  const quiet = model('path-choice')
  assert.equal(quiet.selected.shelter, 'A')
  assert.equal(model('path-choice', { pathDisturbance: 1 }).selected.shelter, 'B')
  assert.equal(model('path-choice', { pathGates: 'A blocked' }).selected.shelter, 'B')
  assert.equal(model('path-choice', { pathGates: 'Both blocked' }).selected, null)
  assert.deepEqual(quiet.candidates.map((c) => c.points), model('path-choice').candidates.map((c) => c.points))
  assert.notDeepEqual(quiet.candidates.map((c) => c.points), model('path-choice', { pathSeed: 139 }).candidates.map((c) => c.points))
  const candidates = [{ id: 'bad', cost: 0, validation: { valid: false } }, { id: 'B', cost: 1, validation: { valid: true } }, { id: 'A', cost: 1, validation: { valid: true } }]
  assert.deepEqual(rankRoutes(candidates).map((c) => c.id), ['A', 'B'])
})

test('playback starts paused, advances fixed time, clamps at arrival and waits when blocked', () => {
  const store = usePathPlayback.getState()
  store.reset()
  assert.equal(usePathPlayback.getState().running, false)
  store.toggle()
  for (let tick = 0; tick < 100; tick += 1) store.advance(8)
  assert.equal(usePathPlayback.getState().time, 8)
  assert.equal(usePathPlayback.getState().running, false)
  assert.equal(travelLimit(model('path-choice', { pathGates: 'Both blocked' }), 'path-choice'), 0)
  store.reset()
})
