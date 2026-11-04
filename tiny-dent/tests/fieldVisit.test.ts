import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { audiencePlaces, directionAhead, fieldCardFor, inspectVisit, pickFieldTarget, rayDistance, type VisitPose } from '../src/systems/fieldVisit'
import type { Vec3 } from '../src/systems/geometry'
import { tuning } from '../src/config/tuning'

const feet: Vec3 = [0, 1, 0]
const pose: VisitPose = { feet, heading: [0, 0, 1], shown: true }

describe('directionAhead', () => {
  it('steps along the tangent and stays a unit direction', () => {
    const next = directionAhead([0, 1, 0], [0, 0, 1], 0.1, 1)
    assert.ok(next[2] > 0.05)
    assert.ok(Math.abs(Math.hypot(...next) - 1) < 1e-6)
  })
})

describe('audiencePlaces', () => {
  it('gathers only residents near the Drifter, with at most three walking behind him', () => {
    const near = Array.from({ length: 6 }, (_, index) => ({ id: `near-${index}`, position: feet }))
    const far = { id: 'far', position: [4, 0, 0] as Vec3 }
    const places = audiencePlaces([...near, far], pose)
    assert.equal(places.some((place) => place.id === 'far'), false)
    assert.equal(places.length, 6)
    const followers = places.filter((place) => place.manner === 'follow')
    assert.ok(followers.length <= tuning.drifter.visit.follow.length)
    for (const follower of followers) assert.ok(follower.direction[2] < 0, 'followers stand behind the heading')
    const watchers = places.filter((place) => place.manner === 'watch')
    assert.ok(watchers.length > 0)
    for (const watcher of watchers) assert.ok(watcher.direction[2] <= 0.02, 'watchers stay off his face')
  })
})

describe('picking a field card', () => {
  it('returns the nearest hit and lets the Drifter block whoever stands behind him', () => {
    const plant = { id: 'plant-1', kind: 'plant' as const, position: [0, 0, 1] as Vec3, stage: 0 }
    const tower = { id: 'antenna-1', kind: 'antenna' as const, position: [0, 0, 3] as Vec3 }
    assert.equal(pickFieldTarget([0, 0, 0], [0, 0, 1], [tower, plant], 4)?.id, 'plant-1')
    assert.equal(rayDistance([0, 0, 0], [0, 0, 1], [0, 0, 2], 0.2)! > 1, true)
    const blocked = pickFieldTarget([0, 0, 0], [0, 0, 1], [tower], 4, { position: [0, 0, 1], radius: 0.2 })
    assert.equal(blocked, null)
    assert.equal(fieldCardFor(plant, '1380').title, 'Sprout')
    assert.equal(fieldCardFor({ id: 'antenna-1', kind: 'antenna', position: tower.position }, '1380').kicker, 'Signal tower')
    assert.equal(fieldCardFor({ id: 'r', kind: 'resident', position: feet, manner: 'watch' }, '1380').title, 'Facet Pebble')
  })

  it('describes the resident drawn under the cursor', () => {
    const card = inspectVisit([0, 0, 0], [0, 0, 1], {
      seed: '1380',
      residents: [{ id: 'pebble', position: [0, 0, 1.2] }],
      shown: new Map([['pebble', [0, 0, 1.2]]]),
      structures: [],
      tick: 0,
      pose: null,
    })
    assert.equal(card?.title, 'Facet Pebble')
    assert.equal(card?.kicker, 'Native life')
  })
})
