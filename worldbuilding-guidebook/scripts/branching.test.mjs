import assert from 'node:assert/strict'
import { test } from 'node:test'
import { countSymbol, generate, rewrite } from '../src/scene/demos/branching/lsystem.js'
import { FIRST_LENGTH, FIRST_PROGRAM, LINE_AXIOM, LINE_GENERATIONS, LINE_LENGTH, LINE_RULES } from '../src/scene/demos/branching/lineExample.js'
import { BRANCH_LENGTH, BRANCH_PROGRAM, buildShapedTree, FORK_RULES, growFork, nearestSegment, TREE_HEIGHT } from '../src/scene/demos/branching/forkExample.js'
import { ASSET_PRESETS, assetConfigFromParams, generateAsset, jitter } from '../src/scene/demos/branching/asset.js'
import { skeletonPositions, triangleCount, tubeIndex, tubeSegments, writeTubes } from '../src/scene/demos/branching/assetGeometry.js'
import { GROWTH_MODES, growthProgress, growthSchedule } from '../src/scene/demos/branching/growth.js'
import { buildLodSet, chooseLod, LOD_SIDES } from '../src/scene/demos/branching/lod.js'
import { createRandom } from '../src/scene/demos/distributions/random.js'
import {
  advanceFixed, chooseShelter, createWorld, findPath, isWalkable, POCKET_CELLS, residentPosition, snapshot, statusOf, stepWorld,
  TIME_STEP, WORK_SPOTS, WORLD_A_SPOT,
} from '../src/scene/demos/branching/worldExperiment.js'
import { branchingParams, BRANCHING_DEMOS, BRANCHING_PRIMARY_KEYS } from '../src/scene/demos/branching/params.js'
import { interpretTree, MAX_RADIUS, radiusAtDepth } from '../src/scene/demos/branching/tree.js'
import { interpret, parseInstructions, TURTLE_START } from '../src/scene/demos/branching/turtle.js'

const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not near ${expected}`)

// Step 1
test('F+F-F at 90 degrees goes up, left, up', () => {
  const { states, segments } = interpret(FIRST_PROGRAM, { angleDegrees: 90, length: FIRST_LENGTH })
  assert.equal(segments.length, 3)
  const ends = segments.map((segment) => segment.to.map((value) => Number(value.toFixed(9))))
  assert.deepEqual(ends, [[0, FIRST_LENGTH], [-FIRST_LENGTH, FIRST_LENGTH], [-FIRST_LENGTH, 2 * FIRST_LENGTH]].map((end) => end.map((value) => Number(value.toFixed(9)))))
  assert.equal(states.length, FIRST_PROGRAM.length + 1)
})

test('a turn changes the heading only: position and segment count stay put', () => {
  const { states } = interpret(FIRST_PROGRAM, { angleDegrees: 30, length: FIRST_LENGTH })
  assert.deepEqual(states[0], TURTLE_START)
  for (const index of [2, 4]) {
    const [before, after] = [states[index - 1], states[index]]
    assert.equal(after.x, before.x)
    assert.equal(after.y, before.y)
    assert.equal(after.segmentCount, before.segmentCount)
    assert.notEqual(after.heading, before.heading)
  }
  near(states[2].heading, Math.PI / 6)
  near(states[4].heading, 0)
})

test('the same instructions draw different shapes at different angles', () => {
  const at = (angleDegrees) => interpret(FIRST_PROGRAM, { angleDegrees, length: FIRST_LENGTH }).segments.at(-1).to
  assert.notDeepEqual(at(30), at(90))
})

test('only F + - are accepted, and spaces are ignored', () => {
  assert.deepEqual(parseInstructions(' F + F\n- F '), ['F', '+', 'F', '-', 'F'])
  assert.throws(() => parseInstructions('FX'), /Unsupported symbol "X"/)
})

// Step 2
test('generations 0 to 3 hold 1, 2, 4, 8 F and generation 2 is F+F+F+F', () => {
  const { strings, stopped } = LINE_GENERATIONS
  assert.equal(stopped, null)
  assert.deepEqual(strings.slice(0, 4).map((text) => countSymbol(text, 'F')), [1, 2, 4, 8])
  assert.equal(strings[2], 'F+F+F+F')
  assert.equal(strings[0], LINE_AXIOM)
})

test('the plus signs survive and every symbol is replaced from the old string only', () => {
  assert.equal(rewrite('F+F', LINE_RULES), 'F+F+F+F')
  assert.equal(rewrite('F', { F: 'FF' }), 'FF')
  assert.equal(rewrite('+-', LINE_RULES), '+-')
})

test('a refused generation keeps the last valid result and says why', () => {
  const symbols = generate('F', { F: 'FFFFFFFF' }, 6)
  assert.equal(symbols.strings.length, 5)
  assert.equal(countSymbol(symbols.strings.at(-1), 'F'), 4096)
  assert.deepEqual(symbols.stopped, { generation: 5, reason: 'symbols' })
  const segments = generate('F', { F: 'FF' }, 10, { maxSymbols: 1e9, maxSegments: 100 })
  assert.equal(segments.strings.length, 7)
  assert.deepEqual(segments.stopped, { generation: 7, reason: 'segments' })
})

test('generation 3 at 45 degrees closes a regular octagon', () => {
  const { segments } = interpret(parseInstructions(LINE_GENERATIONS.strings[3]), { angleDegrees: 45, length: LINE_LENGTH })
  assert.equal(segments.length, 8)
  near(segments.at(-1).to[0], 0)
  near(segments.at(-1).to[1], 0)
})

test('drawing size does not depend on the generation: segment length is fixed', () => {
  for (const text of LINE_GENERATIONS.strings) {
    for (const { from, to } of interpret(parseInstructions(text), { angleDegrees: 45, length: LINE_LENGTH }).segments) {
      near(Math.hypot(to[0] - from[0], to[1] - from[1]), LINE_LENGTH)
    }
  }
})

test('both demos name real parameters', () => {
  for (const demo of BRANCHING_DEMOS) for (const key of BRANCHING_PRIMARY_KEYS[demo]) assert.ok(branchingParams[key], key)
})

// Step 3
const tree = (program, options = {}) => interpretTree(parseInstructions(program), { angleDegrees: 90, length: 1.2, ...options })
const round = (value) => Number(value.toFixed(9))

test('F[+F]F at 90 degrees: the second trunk piece continues from the first, not from the side tip', () => {
  const { segments } = tree('F[+F]F')
  assert.equal(segments.length, 3)
  assert.deepEqual(segments.map((segment) => segment.to.map(round)), [[0, 1.2], [-1.2, 1.2], [0, 2.4]])
  assert.deepEqual(segments.map((segment) => segment.from.map(round)), [[0, 0], [0, 1.2], [0, 1.2]])
  assert.deepEqual(segments.map((segment) => segment.parentId), [null, 0, 0])
  assert.deepEqual(segments.map((segment) => segment.depth), [0, 1, 0])
})

test('[ and ] draw nothing and ] restores position, heading, depth and parent', () => {
  const { states } = tree('F[+F]F')
  const [saved, returned] = [states[2], states[5]]
  assert.equal(saved.stack.length, 1)
  assert.equal(saved.depth, 1)
  assert.equal(returned.stack.length, 0)
  assert.equal(returned.depth, 0)
  assert.equal(returned.parentId, 0)
  assert.deepEqual([returned.x, returned.y, returned.heading].map(round), [round(states[1].x), round(states[1].y), round(states[1].heading)])
  assert.equal(returned.segmentCount, states[4].segmentCount)
  assert.equal(states[2].segmentCount, states[1].segmentCount)
})

test('nested brackets return in reverse order and depths nest', () => {
  const { segments, states } = tree('F[+F[+F]F]F')
  assert.deepEqual(segments.map((segment) => segment.depth), [0, 1, 2, 1, 0])
  assert.deepEqual(segments.map((segment) => segment.parentId), [null, 0, 1, 1, 0])
  assert.equal(Math.max(...states.map((state) => state.stack.length)), 2)
  assert.equal(states.at(-1).stack.length, 0)
})

test('mismatched brackets are refused before anything is drawn', () => {
  assert.throws(() => parseInstructions('F]'), /Unmatched "\]"/)
  assert.throws(() => parseInstructions('F[+F'), /Unmatched "\["/)
  assert.throws(() => parseInstructions(']F['), /Unmatched/)
})

test('the one-sided and two-sided rules hold 3^n and 5^n F, and every generation reaches the same trunk height', () => {
  const counts = (name) => [0, 1, 2, 3].map((generation) => countSymbol(growFork(name, generation).text, 'F'))
  assert.deepEqual(counts('One side'), [1, 3, 9, 27])
  assert.deepEqual(counts('Both sides'), [1, 5, 25, 125])
  for (const name of Object.keys(FORK_RULES)) {
    for (const generation of [0, 1, 2, 3]) {
      const grown = growFork(name, generation)
      const { segments } = interpretTree(parseInstructions(grown.text), { angleDegrees: 30, length: grown.length })
      const trunk = segments.filter((segment) => segment.depth === 0)
      near(trunk.at(-1).to[1], TREE_HEIGHT, 1e-9)
    }
  }
})

test('every side branch starts where its parent ends, at any angle and length ratio', () => {
  for (const [angleDegrees, lengthRatio] of [[30, 1], [90, 0.5], [120, 0.4]]) {
    const { segments } = interpretTree(parseInstructions(growFork('Both sides', 3).text), { angleDegrees, length: 0.2, lengthRatio })
    for (const segment of segments) {
      if (segment.parentId === null) continue
      near(segment.from[0], segments[segment.parentId].to[0])
      near(segment.from[1], segments[segment.parentId].to[1])
    }
  }
})

// Step 4
test('length follows depth: 1, 0.7, 0.49 at depths 0, 1, 2', () => {
  const { segments } = tree('F[+F[+F]F]F', { length: 1, lengthRatio: 0.7 })
  const byDepth = (depth) => segments.filter((segment) => segment.depth === depth).map((segment) => segment.length)
  near(byDepth(0)[0], 1)
  near(byDepth(1)[0], 0.7)
  near(byDepth(2)[0], 0.49)
  near(Math.hypot(segments[2].to[0] - segments[2].from[0], segments[2].to[1] - segments[2].from[1]), 0.49)
})

test('changing the ratios moves attachment points but never changes the connections', () => {
  const connections = (ratio) => tree('F[+F[+F]F]F[-F]F', { lengthRatio: ratio }).segments.map(({ id, parentId, depth }) => [id, parentId, depth])
  assert.deepEqual(connections(1), connections(0.4))
  assert.notDeepEqual(tree('F[+F]F', { lengthRatio: 1 }).segments[2].to, tree('F[+F]F', { lengthRatio: 1 }).segments[1].to)
})

test('one generation holds several depths, and generation is not depth', () => {
  const depths = new Set(interpretTree(parseInstructions(growFork('Both sides', 2).text), { angleDegrees: 45, length: 0.3 }).segments.map((segment) => segment.depth))
  assert.deepEqual([...depths].sort(), [0, 1, 2])
})

test('thickness follows depth, is capped, and Equal ignores both ratios', () => {
  near(radiusAtDepth(0.09, 0.7, 2), 0.09 * 0.49)
  assert.equal(radiusAtDepth(0.09, 1.2, 40), MAX_RADIUS)
  const settings = { branchingForkGeneration: 2, branchingAngle: 45, branchingLengthRatio: 0.5, branchingRadiusRatio: 1.2 }
  const equal = buildShapedTree({ ...settings, branchingShape: 'Equal' })
  assert.ok(equal.every((segment) => segment.width === equal[0].width))
  assert.ok(equal.every((segment) => Math.abs(segment.length - equal[0].length) < 1e-9))
  const shaped = buildShapedTree({ ...settings, branchingShape: 'By depth' })
  assert.deepEqual(shaped.map((segment) => segment.parentId), equal.map((segment) => segment.parentId))
  const outer = shaped.find((segment) => segment.depth === 2)
  assert.ok(outer.width > shaped[0].width, 'a ratio above 1 thickens outward')
})

test('clicking finds the nearest segment and misses empty board', () => {
  const segments = buildShapedTree({ branchingForkGeneration: 1, branchingAngle: 45, branchingShape: 'By depth', branchingLengthRatio: 0.7, branchingRadiusRatio: 0.7 })
  const side = segments.find((segment) => segment.depth === 1)
  const middle = [(side.from[0] + side.to[0]) / 2, (side.from[1] + side.to[1]) / 2]
  assert.equal(nearestSegment(segments, ...middle), side.id)
  assert.equal(nearestSegment(segments, 50, 50), null)
})

test('hand-written fork matches the F[+F]F it advertises', () => {
  assert.equal(BRANCH_PROGRAM.join(''), 'F[+F]F')
  assert.equal(interpretTree(BRANCH_PROGRAM, { angleDegrees: 90, length: BRANCH_LENGTH }).segments.length, 3)
})

// Step 5
const assetParams = (overrides = {}) => ({
  ...Object.fromEntries(Object.entries(branchingParams).map(([key, definition]) => [key, definition.default])),
  ...overrides,
})
const makeAsset = (overrides = {}) => generateAsset(assetConfigFromParams(assetParams(overrides)))

test('identical configuration, version and seed give identical segment data; another seed does not', () => {
  assert.deepEqual(makeAsset({ branchingSeed: 7 }), makeAsset({ branchingSeed: 7 }))
  assert.notDeepEqual(makeAsset({ branchingSeed: 7 }).segments, makeAsset({ branchingSeed: 8 }).segments)
})

test('zero variation is exactly reproducible whatever the seed', () => {
  const first = makeAsset({ branchingVariation: 0, branchingSeed: 3 })
  assert.deepEqual(first.segments, makeAsset({ branchingVariation: 0, branchingSeed: 90 }).segments)
  assert.equal(jitter(createRandom(5), 0), 1)
})

test('zero spread keeps the asset flat and matches the planar lab; nonzero spread leaves the plane', () => {
  const body = ASSET_PRESETS['Whisper Root'].body
  const flat = makeAsset({ branchingPreset: 'Whisper Root', branchingSpread: 0, branchingVariation: 0, branchingAssetGeneration: 2, branchingAssetAngle: 45, branchingAssetLengthRatio: 0.7 })
  assert.ok(flat.segments.every((segment) => Math.abs(segment.from[2]) < 1e-12 && Math.abs(segment.to[2]) < 1e-12))
  const planar = interpretTree(parseInstructions(growFork(body.rule, 2).text), {
    angleDegrees: 45, length: growFork(body.rule, 2).length * body.height / TREE_HEIGHT, lengthRatio: 0.7,
  }).segments
  assert.equal(flat.segments.length, planar.length)
  flat.segments.forEach((segment, index) => {
    near(segment.to[0], planar[index].to[0], 1e-9)
    near(segment.to[1], planar[index].to[1], 1e-9)
    assert.equal(segment.parentId, planar[index].parentId)
  })
  const spread = makeAsset({ branchingSpread: 0.7, branchingVariation: 0 })
  assert.ok(spread.segments.some((segment) => Math.abs(segment.to[2]) > 0.05))
})

test('the Fan design is scaled to its height without variation, and variation moves it only a little', () => {
  const plain = makeAsset({ branchingVariation: 0 }).segments
  near(Math.max(...plain.map((segment) => segment.to[1])), ASSET_PRESETS['Cave Fan'].body.height, 1e-9)
  const varied = makeAsset({ branchingVariation: 0.2 }).segments
  assert.equal(varied.length, plain.length)
  assert.notDeepEqual(varied.map((segment) => segment.to), plain.map((segment) => segment.to))
})

test('side branches stay attached in three dimensions, and the variation is bounded', () => {
  const { segments } = makeAsset({ branchingSpread: 1, branchingVariation: 0.5 })
  for (const segment of segments) {
    if (segment.parentId === null) continue
    segment.from.forEach((component, axis) => near(component, segments[segment.parentId].to[axis]))
  }
  const base = makeAsset({ branchingVariation: 0 }).segments
  makeAsset({ branchingVariation: 0.2 }).segments.forEach((segment, index) => {
    assert.ok(segment.length <= base[index].length * 1.2 + 1e-9 && segment.length >= base[index].length * 0.8 - 1e-9)
  })
})

test('every preset builds a different silhouette from the same generator', () => {
  const extents = Object.keys(ASSET_PRESETS).map((name) => {
    const { segments } = generateAsset(assetConfigFromParams(assetParams({ branchingPreset: name, ...ASSET_PRESETS[name].values })))
    const ys = segments.map((segment) => segment.to[1])
    const xs = segments.flatMap((segment) => [segment.to[0], segment.to[2]])
    return { height: Math.max(...ys), width: Math.max(...xs) - Math.min(...xs) }
  })
  assert.ok(extents[0].width / extents[0].height > extents[2].width / extents[2].height, 'Cave Fan is wider for its height than Whisper Root')
  assert.ok(extents[1].height < extents[2].height, 'Stone Coral is shorter than Whisper Root')
})

test('tubes: two triangles per side, positions finite, skeleton uses the same endpoints', () => {
  const { segments } = makeAsset({ branchingAssetGeneration: 2 })
  const tubes = tubeSegments(segments)
  const positions = new Float32Array(segments.length * 8 * 2 * 3)
  writeTubes(positions, tubes, 8)
  assert.ok(positions.every(Number.isFinite))
  assert.equal(triangleCount(tubeIndex(segments.length, 8)), segments.length * 16)
  const lines = skeletonPositions(segments)
  assert.equal(lines.length, segments.length * 6)
  near(lines[3], segments[0].to[0], 1e-6)
  near(lines[4], segments[0].to[1], 1e-6)
})

// Step 6
test('growth reaches the full graph at time 1 in both modes, and the pieces stay attached on the way', () => {
  const { segments } = makeAsset({ branchingSpread: 0.6 })
  for (const mode of GROWTH_MODES) {
    for (const piece of growthProgress(segments, mode, 1)) {
      piece.to.forEach((component, axis) => near(component, segments[piece.id].to[axis], 1e-9))
      piece.from.forEach((component, axis) => near(component, segments[piece.id].from[axis], 1e-9))
    }
    for (const time of [0, 0.2, 0.5, 0.9]) {
      const shown = growthProgress(segments, mode, time)
      for (const piece of shown) {
        if (piece.parentId === null) continue
        piece.from.forEach((component, axis) => near(component, shown[piece.parentId].to[axis], 1e-9))
      }
    }
  }
})

test('From the base starts a child when its parent has finished, and siblings start together', () => {
  const { segments } = makeAsset({ branchingAssetGeneration: 2 })
  const { startAt, finishAt } = growthSchedule(segments, 'From the base')
  for (const segment of segments) {
    if (segment.parentId === null) near(startAt[segment.id], 0)
    else near(startAt[segment.id], finishAt[segment.parentId])
  }
  assert.ok(Math.max(...finishAt) <= 1 + 1e-9)
  near(Math.max(...finishAt), 1, 1e-9)
  const children = segments.filter((segment) => segment.parentId === 0)
  assert.ok(children.length > 1)
  assert.ok(children.every((segment) => startAt[segment.id] === startAt[children[0].id]))
})

test('Together and From the base differ halfway but scrubbing 0, 1, 0.5, 1 repeats exactly', () => {
  const { segments } = makeAsset()
  const half = (mode) => growthProgress(segments, mode, 0.5).map((piece) => piece.progress)
  assert.notDeepEqual(half('Together'), half('From the base'))
  const first = growthProgress(segments, 'From the base', 0.5)
  growthProgress(segments, 'From the base', 0)
  growthProgress(segments, 'From the base', 1)
  assert.deepEqual(growthProgress(segments, 'From the base', 0.5), first)
  assert.ok(half('Together').every((progress) => progress === 0.5))
})

// Step 7
test('LOD triangle counts fall with each level and match the geometry that is drawn', () => {
  const { segments } = makeAsset()
  const levels = buildLodSet(segments)
  assert.ok(levels[0].triangles > levels[1].triangles && levels[1].triangles > levels[2].triangles)
  levels.forEach((level, index) => {
    assert.equal(level.sides, LOD_SIDES[index])
    assert.equal(level.triangles, triangleCount(tubeIndex(level.segments.length, level.sides)))
  })
})

test('every LOD is cut from the same full asset: same trunk, same coordinates, nothing regenerated', () => {
  const { segments } = makeAsset({ branchingSeed: 11 })
  const levels = buildLodSet(segments)
  for (const level of levels.slice(1)) {
    for (const piece of level.segments) assert.equal(piece, segments[piece.id])
  }
  assert.deepEqual(levels[2].segments[0], segments[0])
  assert.ok(levels[2].segments.every((piece) => piece.depth <= 1))
  assert.ok(levels.every((level) => level.segments.length > 0))
  assert.deepEqual(makeAsset({ branchingSeed: 11 }).segments, segments)
})

test('level choice is monotonic in distance in both directions, and crossed thresholds stay ordered', () => {
  const distances = Array.from({ length: 300 }, (_, index) => index * 0.2)
  const levels = distances.map((distance) => chooseLod(distance, 8, 14))
  assert.ok(levels.every((level, index) => index === 0 || level >= levels[index - 1]))
  assert.deepEqual([...new Set(levels)], [0, 1, 2])
  const back = [...distances].reverse().map((distance) => chooseLod(distance, 8, 14))
  assert.ok(back.every((level, index) => index === 0 || level <= back[index - 1]))
  const crossed = distances.map((distance) => chooseLod(distance, 12, 6))
  assert.ok(crossed.every((level, index) => index === 0 || level >= crossed[index - 1]))
  assert.equal(chooseLod(7.99, 8, 14), 0)
  assert.equal(chooseLod(8, 8, 14), 1)
  assert.equal(chooseLod(14, 8, 14), 2)
})

// Step 8
function runWorld(options, seconds, onStep) {
  const world = createWorld(options)
  for (let step = 0; step < Math.round(seconds / TIME_STEP); step += 1) { stepWorld(world, TIME_STEP); onStep?.(world) }
  return world
}
const cellOf = (world) => world.residents.map((resident) => resident.cell.join(','))

test('two runs from the same description are independent copies and match when the work spot matches', () => {
  const first = createWorld({ workSpot: 'Middle' })
  const second = createWorld({ workSpot: 'Middle' })
  assert.notEqual(first.residents[0], second.residents[0])
  assert.notEqual(first.log, second.log)
  first.residents[0].cell[0] = 9
  assert.deepEqual(second.residents[0].cell, [2, 4])
  assert.equal(snapshot(runWorld({ workSpot: 'Middle' }, 12)), snapshot(runWorld({ workSpot: 'Middle' }, 12)))
  assert.equal(snapshot(runWorld({ workSpot: WORLD_A_SPOT }, 12)), snapshot(runWorld({ workSpot: 'Far end' }, 12)))
})

test('far work leaves everyone in place, near work moves two residents to pocket B and leaves one without a quiet pocket', () => {
  const far = runWorld({ workSpot: 'Far end' }, 20)
  assert.deepEqual(cellOf(far), ['2,4', '4,5', '5,3'])
  assert.equal(far.log.length, 0)
  const near = runWorld({ workSpot: 'Near the residents' }, 20)
  assert.deepEqual(cellOf(near), ['9,1', '8,1', '5,3'])
  assert.equal(statusOf(near, near.residents[2]), 'staying put')
  assert.equal(near.residents[2].reason, 'no pocket is quiet enough')
  const setOff = near.log.find((entry) => entry.text.includes('sets off'))
  assert.ok(setOff.time > 3.5 && setOff.time < 4, 'first move comes after the 3 second delay, not at once: ' + setOff.time)
  assert.notEqual(snapshot(near), snapshot(far))
})

test('with no pocket available a bothered resident stays and says why; nobody is deleted or moved through rock', () => {
  const world = runWorld({ workSpot: 'Near the residents', shelter: 'None' }, 20)
  assert.deepEqual(cellOf(world), ['2,4', '4,5', '5,3'])
  assert.ok(world.residents.every((resident) => resident.reason === 'no pocket has room'))
  assert.equal(world.residents.length, 3)
  assert.equal(findPath([2, 4], [0, 0]), null)
  assert.equal(chooseShelter(world, world.residents[0], 0.8).target, null)
})

test('every step of every walk is on a walkable cell, and a pocket cell never holds two residents', () => {
  const seen = new Set()
  runWorld({ workSpot: 'Middle' }, 20, (world) => {
    const cells = world.residents.map((resident) => resident.cell)
    for (const cell of cells) { assert.ok(isWalkable(cell), cell.join(',')); seen.add(cell.join(',')) }
    for (const resident of world.residents) for (const cell of resident.path) assert.ok(isWalkable(cell))
    for (const pocket of POCKET_CELLS) assert.ok(cells.filter((cell) => cell.join(',') === pocket.join(',')).length <= 1)
    for (const resident of world.residents) residentPosition(resident).forEach((value) => assert.ok(Number.isFinite(value)))
  })
  assert.ok(seen.size > 3)
})

test('the same fixed step gives the same run on a 30 Hz and a 144 Hz screen', () => {
  const frames = (hertz) => {
    const worlds = [createWorld({ workSpot: 'Near the residents' })]
    const clock = { accumulator: 0 }
    let steps = 0
    for (let frame = 0; frame < hertz * 20; frame += 1) steps += advanceFixed(worlds, clock, 1 / hertz)
    return { world: worlds[0], steps }
  }
  const slow = frames(30)
  const fast = frames(144)
  assert.ok(Math.abs(slow.steps - fast.steps) <= 1, slow.steps + ' vs ' + fast.steps)
  assert.deepEqual(cellOf(slow.world), cellOf(fast.world))
  assert.deepEqual(slow.world.log.map((entry) => entry.text), fast.world.log.map((entry) => entry.text))
})

test('noise fades when work stops, and a resident that was bothered notices', () => {
  const world = createWorld({ workSpot: 'Near the residents', shelter: 'None' })
  for (let step = 0; step < 30 * 5; step += 1) stepWorld(world, TIME_STEP)
  assert.ok(world.level > 0.99)
  world.working = false
  for (let step = 0; step < 30 * 5; step += 1) stepWorld(world, TIME_STEP)
  near(world.level, 0, 1e-9)
  assert.ok(world.log.some((entry) => entry.text.includes('is quiet again')))
})

test('the log reports real transitions: one set-off and one arrival for each walker', () => {
  const world = runWorld({ workSpot: 'Near the residents' }, 20)
  const count = (word) => world.log.filter((entry) => entry.text.includes(word)).length
  assert.equal(count('sets off'), 2)
  assert.equal(count('reaches pocket'), 2)
  assert.ok(world.log.every((entry, index) => index === 0 || entry.time >= world.log[index - 1].time))
  assert.deepEqual(Object.keys(WORK_SPOTS).length, 3)
})
