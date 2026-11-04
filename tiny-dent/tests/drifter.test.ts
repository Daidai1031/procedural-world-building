import assert from 'node:assert/strict'
import test from 'node:test'
import { Box3, Color, Mesh, type MeshStandardMaterial, type Object3D } from 'three'
import { palette } from '../src/config/palette'
import { tuning } from '../src/config/tuning'
import { eyeHeight } from '../src/systems/exploration'
import { restingMind, stepDrifterMind, uprightDirection } from '../src/systems/drifter'
import {
  walkLeg, walkStride, bakeDrifterClips, createDrifter, drifterClipInfo, drifterClipNames, drifterJoints, drifterPose, type DrifterJoint,
} from '../src/render/models/drifter'

// D-064: the Quiet Drifter is built from the turnaround sheet and its poses land where the sheet and the clips say.
const box = new Box3()
const lowest = (object: Object3D, direct = false) => {
  let min = Infinity
  const meshes = direct ? object.children : (() => { const all: Object3D[] = []; object.traverse((child) => all.push(child)); return all })()
  for (const child of meshes) if (child instanceof Mesh && child.visible) { box.setFromObject(child, true); min = Math.min(min, box.min.y) }
  return min
}

test('the Drifter is 4.0 heads tall, stands on the origin and uses palette colors only', () => {
  const drifter = createDrifter()
  drifter.apply(drifterPose('idle', 0))
  box.setFromObject(drifter.object, true)
  assert.ok(Math.abs(box.max.y - 4) < 0.02, `top at ${box.max.y}`)
  assert.ok(Math.abs(box.min.y) < 0.02, `soles at ${box.min.y}`)
  const allowed = new Set(Object.values(palette.drifter).map((hex) => new Color(hex).getHexString()))
  let meshes = 0
  drifter.object.traverse((child) => {
    if (!(child instanceof Mesh)) return
    meshes += 1
    const color = (child.material as MeshStandardMaterial).color.getHexString()
    assert.ok(allowed.has(color), `${child.name || 'a part'} uses #${color}`)
  })
  assert.ok(meshes <= 70, `draws ${meshes} meshes`)
  for (const name of drifterJoints) assert.ok(drifter.joints[name], `joint ${name}`)
  // Scaled for the game, he stands taller than the residents, so his eyes sit above the walker's eye line.
  const scale = tuning.drifter.height / drifter.height
  assert.ok(tuning.drifter.height > 0.34)
  assert.ok(drifter.eyeLine * scale > eyeHeight)
  drifter.dispose()
})

test('every clip loops without a seam', () => {
  for (const clip of drifterClipNames) {
    const { duration } = drifterClipInfo[clip]
    const start = drifterPose(clip, 0), end = drifterPose(clip, duration)
    for (const name of drifterJoints) start.joints[name].forEach((value, axis) =>
      assert.ok(Math.abs(value - end.joints[name][axis]) < 1e-6, `${clip} ${name}[${axis}]`))
    start.lift.forEach((value, axis) => assert.ok(Math.abs(value - end.lift[axis]) < 1e-6, `${clip} lift`))
  }
})

test('grounded clips keep the body on the ground; contact poses touch where they should', () => {
  const drifter = createDrifter()
  const j = drifter.joints
  const at = (clip: (typeof drifterClipNames)[number], time: number) => { drifter.apply(drifterPose(clip, time)); drifter.object.updateMatrixWorld(true) }
  for (const clip of ['idle', 'walk', 'look', 'wave', 'kneel', 'sit'] as const) {
    for (let time = 0; time < drifterClipInfo[clip].duration; time += drifterClipInfo[clip].duration / 12) {
      at(clip, time)
      const floor = lowest(drifter.object)
      assert.ok(floor > -0.06 && floor < 0.08, `${clip} at ${time.toFixed(2)} s: lowest point ${floor.toFixed(3)}`)
    }
  }
  at('kneel', 0)
  assert.ok(Math.abs(lowest(j.ankleL)) < 0.03, 'kneel: left sole on the ground')
  assert.ok(Math.abs(lowest(j.kneeR, true)) < 0.03, 'kneel: right knee on the ground')
  at('sit', 0)
  assert.ok(Math.abs(lowest(drifter.object.getObjectByName('torso')!)) < 0.03, 'sit: seat on the ground')
  at('drift', 0)
  assert.ok(lowest(drifter.object) > 0.4, 'drift: floats')
  at('jump', 0)
  assert.ok(Math.abs(lowest(drifter.object)) < 0.08, 'jump: starts on the ground')
  at('jump', drifterClipInfo.jump.duration / 2)
  assert.ok(lowest(drifter.object) > 0.45, 'jump: clears the ground')
  at('jump', drifterClipInfo.jump.duration)
  assert.ok(Math.abs(lowest(drifter.object)) < 0.08, 'jump: lands on the ground')
  drifter.dispose()
})

test('the walk keeps a boot planted and its steps match the ground covered', () => {
  const drifter = createDrifter()
  for (const amount of [0.4, 1, 1.3]) {
    for (let i = 0; i < 24; i++) {
      drifter.apply(drifterPose('walk', i / 24, amount))
      drifter.object.updateMatrixWorld(true)
      const floor = Math.min(lowest(drifter.joints.ankleL), lowest(drifter.joints.ankleR))
      assert.ok(Math.abs(floor) < 0.035, `walk ${amount} at ${i}/24: lowest boot ${floor.toFixed(3)}`)
    }
    // While standing (heel strike at π/2 to toe-off at 3π/2) the ankle only moves backward.
    let last = Infinity
    for (let k = 0; k <= 12; k++) {
      const ahead = walkLeg(Math.PI / 2 + (k / 12) * Math.PI, amount).ahead
      assert.ok(ahead < last + 1e-9, `stance ankle moves back at ${amount}`)
      last = ahead
    }
  }
  assert.ok(walkStride(1) > 2 && walkStride(1) < 3, `stride ${walkStride(1)}`)
  drifter.dispose()
})

test('the mixer cross-fades, walks with distance and blinks on its own', () => {
  const drifter = createDrifter()
  drifter.play('walk')
  for (let i = 0; i < 30; i++) drifter.update(1 / 60, { speed: 5 })
  assert.equal(drifter.clip, 'walk')
  const hip = drifter.joints.hipL.rotation.x
  drifter.update(0.1, { speed: 5 })
  assert.notEqual(drifter.joints.hipL.rotation.x, hip, 'legs move while walking')
  // At zero speed the walk has no stride left to show.
  for (let i = 0; i < 60; i++) drifter.update(1 / 60, { speed: 0 })
  assert.ok(Math.abs(drifter.joints.hipL.rotation.x) < 0.01)
  const eye = drifter.object.getObjectByName('eyeL')!
  let shut = false
  for (let i = 0; i < 60 * 8; i++) { drifter.update(1 / 60); if (eye.scale.y < 0.5) shut = true }
  assert.ok(shut, 'blinks within eight seconds')
  drifter.dispose()
})

test('on the surface the Drifter walks, idles, looks around, sits, and holds gestures until it moves', () => {
  let mind = restingMind()
  const run = (seconds: number, moving = false) => {
    let clip = ''
    for (let t = 0; t < seconds; t += 0.1) ({ mind, clip } = stepDrifterMind(mind, moving, 0.1))
    return clip
  }
  assert.equal(run(1, true), 'walk')
  assert.equal(run(1), 'idle')
  assert.equal(run(tuning.drifter.lookAfter), 'look')
  assert.equal(run(tuning.drifter.sitAfter), 'sit')
  assert.equal(stepDrifterMind(mind, false, 0.1, 'kneel').clip, 'kneel')
  ;({ mind } = stepDrifterMind(mind, false, 0.1, 'kneel'))
  assert.equal(run(30), 'kneel')
  assert.equal(run(0.1, true), 'walk')
  ;({ mind } = stepDrifterMind(mind, false, 0.1, 'wave'))
  assert.equal(run(5), 'idle', 'a wave ends by itself')
  ;({ mind } = stepDrifterMind(restingMind(), true, 0.1, 'jump'))
  assert.equal(mind.gesture, 'jump')
  assert.equal(stepDrifterMind(mind, true, 0.1).clip, 'jump', 'a jump keeps going while walking')
  assert.equal(stepDrifterMind(mind, true, drifterClipInfo.jump.duration).clip, 'walk')
})

test('the body stands on the ground normal', () => {
  const radial: [number, number, number] = [0, 1, 0]
  const near = (value: readonly number[], expected: readonly number[]) =>
    value.forEach((axis, index) => assert.ok(Math.abs(axis - expected[index]) < 1e-6, `${value} ~ ${expected}`))
  const slope = uprightDirection(radial, [0.4, 1, 0])
  near(slope, [0.4 / Math.hypot(0.4, 1), 1 / Math.hypot(0.4, 1), 0])
  near(uprightDirection(radial, [0, 0, 0]), radial)
  near(uprightDirection(radial, [0, -1, 0]), radial)
  near(uprightDirection(radial, [1, 0.05, 0]), radial)
})

test('baked clips cover every joint for export', () => {
  const drifter = createDrifter()
  const clips = bakeDrifterClips(drifter, 10)
  assert.deepEqual(clips.map((clip) => clip.name), [...drifterClipNames])
  for (const clip of clips) {
    for (const name of drifterJoints as readonly DrifterJoint[]) {
      assert.ok(clip.tracks.some((track) => track.name === `drifter_${name}.quaternion`), `${clip.name} ${name}`)
    }
    assert.ok(clip.validate(), `${clip.name} is valid`)
  }
  drifter.dispose()
})
