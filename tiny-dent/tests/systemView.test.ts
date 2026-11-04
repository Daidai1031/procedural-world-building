import test from 'node:test'
import assert from 'node:assert/strict'
import { createRunStore } from '../src/state/runState'
import { planetMarks, cameraPose, holdProgress, ORBIT_DISTANCE, parentSeed, systemArcs, systemDistance, systemLayout } from '../src/systems/systemView'
import { planetPosition } from '../src/systems/system'
import { planetConfig } from '../src/world/planet'
import { VOXEL_WORLD_SIZE } from '../src/world/voxels/voxelMath.js'
import { tuning } from '../src/config/tuning'

const near = (a: number[], b: number[]) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9, `${a} vs ${b}`))
const seeds = ['home', 'home/signal-1', 'home/signal-2', 'home/signal-2/signal-1']
const crowdedSeeds = [
  'home',
  ...Array.from({ length: tuning.signal.maxPlanets }, (_, i) => `home/signal-${i + 1}`),
  ...[1, 2, 3].flatMap(parent => Array.from({ length: tuning.signal.maxPlanets }, (_, i) => `home/signal-${parent}/signal-${i + 1}`)),
]
const planets = seeds.map(seed => ({ seed, position: planetPosition(seed) }))
const crowded = crowdedSeeds.map(seed => ({ seed, position: planetPosition(seed) }))
const surfaceGap = (a: string, b: string, positions: Record<string, number[]>) => {
  const pa = positions[a], pb = positions[b]
  const d = Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2])
  return d - planetConfig(a).radius * VOXEL_WORLD_SIZE - planetConfig(b).radius * VOXEL_WORLD_SIZE
}

// SYS-T2: pull 0 is exactly today's orbit pose, pull 1 looks at the layout center, and the steps between are monotonic.
test('cameraPose at pull 0 is the orbit pose for any azimuth and polar', () => {
  for (const [azimuth, polar] of [[0, Math.PI / 2], [0.6, 1.05], [-2.4, 0.3], [4, 2.9]]) {
    const pose = cameraPose({ pull: 0, azimuth, polar, center: [3, 1, -4], distance: 30 })
    near(pose.target, [0, 0, 0])
    assert.equal(pose.distance, ORBIT_DISTANCE)
    near(pose.position, [8 * Math.sin(polar) * Math.sin(azimuth), 8 * Math.cos(polar), 8 * Math.sin(polar) * Math.cos(azimuth)])
  }
})

test('cameraPose at pull 1 targets the center, and distance and target move monotonically', () => {
  const input = { azimuth: 0.6, polar: 1.05, center: [3, 1, -4] as [number, number, number], distance: 26 }
  near(cameraPose({ ...input, pull: 1 }).target, input.center)
  assert.equal(cameraPose({ ...input, pull: 1 }).distance, 26)
  let last = cameraPose({ ...input, pull: 0 })
  for (let step = 1; step <= 10; step++) {
    const pose = cameraPose({ ...input, pull: step / 10 })
    assert.ok(pose.distance > last.distance)
    assert.ok(Math.hypot(...pose.target) > Math.hypot(...last.target))
    last = pose
  }
})

test('cameraPose keeps the angles, and focus moves the target toward the focused world', () => {
  const base = { pull: 1, azimuth: 1.2, polar: 0.8, center: [0, 0, 0] as [number, number, number], distance: 26 }
  const focus = { position: [6, 0, 0] as [number, number, number], distance: 13 }
  near(cameraPose({ ...base, focus: { ...focus, amount: 0 } }).position, cameraPose(base).position)
  const full = cameraPose({ ...base, focus: { ...focus, amount: 1 } })
  near(full.target, focus.position)
  assert.equal(full.distance, 13)
  // The direction from target to camera is the player's azimuth and polar, whatever the focus.
  near(full.position.map((v, i) => v - full.target[i]), [13 * Math.sin(0.8) * Math.sin(1.2), 13 * Math.cos(0.8), 13 * Math.sin(0.8) * Math.cos(1.2)])
})

// SYS-T3
test('systemLayout puts the active planet at the origin', () => {
  for (const active of seeds) {
    const layout = systemLayout(planets, active)
    assert.deepEqual(layout.positions[active], [0, 0, 0])
    for (const seed of seeds) assert.ok(layout.positions[seed])
  }
})

test('systemLayout does not depend on the active planet except by translation', () => {
  const a = systemLayout(planets, 'home'), b = systemLayout(planets, 'home/signal-2')
  const shift = b.positions.home
  for (const seed of seeds) near(b.positions[seed], a.positions[seed].map((v, i) => v + shift[i]))
  near(b.center, a.center.map((v, i) => v + shift[i]))
  assert.ok(Math.abs(a.extent - b.extent) < 1e-9)
})

test('systemLayout keeps a surface gap between known worlds, including deep signal branches', () => {
  const layout = systemLayout(crowded, 'home')
  const { minGap } = tuning.system.layout
  for (let i = 0; i < crowdedSeeds.length; i++) {
    for (let j = i + 1; j < crowdedSeeds.length; j++) {
      assert.ok(surfaceGap(crowdedSeeds[i], crowdedSeeds[j], layout.positions) >= minGap - 1e-6,
        `${crowdedSeeds[i]} vs ${crowdedSeeds[j]}`)
    }
  }
})

test('systemLayout extent reaches the far surface of the farthest world', () => {
  const layout = systemLayout(planets, 'home')
  const farthest = Math.max(...seeds.map(seed => Math.hypot(...layout.positions[seed].map((v, i) => v - layout.center[i]))))
  assert.ok(layout.extent > farthest)
  assert.ok(layout.extent < farthest + 3)
  assert.deepEqual(systemLayout([], 'home').center, [0, 0, 0])
})

test('systemDistance fits the extent inside the field of view and stays within its limits', () => {
  const { min, max } = tuning.system.distance
  assert.equal(systemDistance(0, 42), min)
  assert.equal(systemDistance(1000, 42), max)
  const mid = systemDistance(10, 42)
  assert.ok(mid > min && mid < max)
  assert.ok(mid * Math.tan(21 * Math.PI / 180) >= 10)
  const fit = systemDistance(systemLayout(planets, 'home').extent, 42)
  assert.ok(fit >= min && fit <= max)
})

test('parentSeed reads the signal suffix and systemArcs links each known child to a known parent', () => {
  assert.equal(parentSeed('a/signal-2'), 'a')
  assert.equal(parentSeed('a/signal-2/signal-1'), 'a/signal-2')
  assert.equal(parentSeed('a'), null)
  assert.deepEqual(systemArcs(planets), [
    { from: 'home', to: 'home/signal-1' }, { from: 'home', to: 'home/signal-2' }, { from: 'home/signal-2', to: 'home/signal-2/signal-1' },
  ])
  // A child whose parent is not known has no arc, and the home planet never has one.
  assert.deepEqual(systemArcs([{ seed: 'home' }, { seed: 'home/signal-2/signal-1' }]), [])
})

// SYS-T5
test('holdProgress is linear and clamped to 0..1', () => {
  assert.equal(holdProgress(0, 900), 0)
  assert.equal(holdProgress(450, 900), 0.5)
  assert.equal(holdProgress(2000, 900), 1)
  assert.equal(holdProgress(-50, 900), 0)
})

// SYS-T4
test('planetMarks respects the caps, is deterministic, uses only state positions and is empty for an empty state', () => {
  const state = createRunStore('marks').getState()
  const empty = planetMarks({ ...state, structures: [], residents: [], robots: [], gardeners: [], riggers: [], builders: [] })
  assert.deepEqual(empty, { plants: [], antennas: [], residents: [], robots: [] })

  const structures = Array.from({ length: 150 }, (_, i) => ({ id: 's' + i, kind: (i % 3 === 0 ? 'antenna' : 'plant') as 'antenna' | 'plant',
    position: [i, 1, 2] as [number, number, number], normal: [0, 1, 0] as [number, number, number], bornTick: 0 }))
  const crowded = { ...state, structures, residents: Array.from({ length: 40 }, (_, i) => ({ ...state.residents[0], position: [0, i, 0] as [number, number, number] })) }
  const marks = planetMarks(crowded)
  const caps = tuning.system.marks
  assert.ok(marks.plants.length <= caps.plants && marks.antennas.length <= caps.antennas)
  assert.ok(marks.residents.length <= caps.residents && marks.robots.length <= caps.robots)
  assert.equal(marks.plants.length, caps.plants)
  assert.equal(marks.antennas.length, caps.antennas)
  assert.deepEqual(planetMarks(crowded), marks)
  const known = new Set(structures.map(({ position }) => position[0]))
  assert.ok(marks.plants.every(([x]) => known.has(x)))
  assert.deepEqual(marks.robots.map(({ position }) => position), [state.robots[0], state.gardeners[0], state.riggers[0], state.builders[0]].map(({ position }) => position))
})
