import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Shape, ShapeGeometry } from 'three'
import { useSceneStore } from '../../../store/sceneStore.js'
import { readToken } from '../../../styles/readToken.js'
import { BRANCH_LENGTH, BRANCH_PROGRAM, buildShapedTree, DEPTH_TOKENS, growFork, nearestSegment } from './forkExample.js'
import { FIRST_LENGTH, FIRST_PROGRAM, LINE_GENERATIONS, LINE_LENGTH } from './lineExample.js'
import { useBranchingPlayback } from './playback.js'
import { interpretTree } from './tree.js'
import { AssetScene, GrowthScene, LodScene } from './AssetScenes.jsx'
import WorldScene from './WorldScene.jsx'
import { useWorldPlayback } from './worldPlayback.js'
import { interpret, parseInstructions } from './turtle.js'

// The drawing board stands in the shared canvas, facing the camera. The pen's
// start is its bottom centre, so growth reads upwards.
const BOARD = { width: 8, height: 6.4, centreY: 2.5 }
// Turns go left, so each drawing starts right of centre to keep its growth on the board.
const TURTLE_ORIGIN = [0.5, 0.5]
const REWRITE_ORIGIN = [1.5, 1.2]
const TREE_ORIGIN = [0, 0.3]
const MARKER_RADIUS = 0.13
const DASH = 0.14
const GAP = 0.1
const STROKE_WIDTH = 0.07
const GHOST_WIDTH = 0.16
const ARC_RADIUS = 0.5

// A geometry built from inputs and disposed when they change or the scene goes.
function useGeometry(factory, dependencies) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(factory, dependencies)
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

// Each segment becomes a thin rectangle, lengthened by half its width at both
// ends so two strokes meeting at a corner leave no notch. A segment may carry
// its own width.
function buildStrokeGeometry(segments, defaultWidth) {
  const positions = new Float32Array(segments.length * 12)
  const indices = []
  segments.forEach(({ from, to, width = defaultWidth }, index) => {
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    const size = Math.hypot(dx, dy) || 1
    const along = [(dx / size) * width / 2, (dy / size) * width / 2]
    const across = [-along[1], along[0]]
    const start = [from[0] - along[0], from[1] - along[1]]
    const end = [to[0] + along[0], to[1] + along[1]]
    const corners = [
      [start[0] + across[0], start[1] + across[1]], [start[0] - across[0], start[1] - across[1]],
      [end[0] - across[0], end[1] - across[1]], [end[0] + across[0], end[1] + across[1]],
    ]
    corners.forEach(([x, y], corner) => positions.set([x, y, 0], index * 12 + corner * 3))
    indices.push(index * 4, index * 4 + 1, index * 4 + 2, index * 4, index * 4 + 2, index * 4 + 3)
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  return geometry
}

function Strokes({ segments, width = STROKE_WIDTH, token, z = 0 }) {
  const geometry = useGeometry(() => buildStrokeGeometry(segments, width), [segments, width])
  return <mesh geometry={geometry} position={[0, 0, z]}>
    <meshBasicMaterial color={readToken(token)} />
  </mesh>
}

function Board() {
  const geometry = useGeometry(() => {
    const vertices = []
    const left = -BOARD.width / 2
    const bottom = BOARD.centreY - BOARD.height / 2
    for (let x = Math.ceil(left); x <= BOARD.width / 2; x += 1) vertices.push(x, bottom, 0, x, bottom + BOARD.height, 0)
    for (let y = Math.ceil(bottom); y <= bottom + BOARD.height; y += 1) vertices.push(left, y, 0, BOARD.width / 2, y, 0)
    const lines = new BufferGeometry()
    lines.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3))
    return lines
  }, [])
  return <group>
    <mesh position={[0, BOARD.centreY, -0.03]}>
      <planeGeometry args={[BOARD.width, BOARD.height]} />
      <meshBasicMaterial color={readToken('--paper-2')} />
    </mesh>
    <lineSegments geometry={geometry} position={[0, 0, -0.02]}>
      <lineBasicMaterial color={readToken('--line')} />
    </lineSegments>
  </group>
}

// Everything drawn by the pen sits in this group, so the pen's own (0, 0) is
// the start dot.
function Drawing({ origin, children }) {
  return <group position={[origin[0], origin[1], 0]}>
    <mesh position={[0, 0, 0.01]}>
      <circleGeometry args={[0.1, 24]} />
      <meshBasicMaterial color={readToken('--ink-dim')} />
    </mesh>
    {children}
  </group>
}

// The pen: a small arrow whose tip is the heading.
function Pen({ state }) {
  const geometry = useGeometry(() => {
    const shape = new Shape()
    shape.moveTo(0, 0.28)
    shape.lineTo(-0.15, -0.14)
    shape.lineTo(0.15, -0.14)
    shape.closePath()
    return new ShapeGeometry(shape)
  }, [])
  return <mesh geometry={geometry} position={[state.x, state.y, 0.04]} rotation={[0, 0, state.heading]}>
    <meshBasicMaterial color={readToken('--water-deep')} />
  </mesh>
}

// The angle the pen just turned through, as a slice of a ring around it.
function TurnArc({ before, after }) {
  const low = Math.min(before.heading, after.heading)
  const swept = Math.abs(after.heading - before.heading)
  const geometry = useGeometry(() => ringSlice(Math.PI / 2 + low, swept), [low, swept])
  return <mesh geometry={geometry} position={[after.x, after.y, 0.02]}>
    <meshBasicMaterial color={readToken('--clay-deep')} transparent opacity={0.55} />
  </mesh>
}

function ringSlice(thetaStart, thetaLength) {
  const steps = Math.max(2, Math.ceil(thetaLength / 0.1))
  const positions = []
  const indices = []
  for (let step = 0; step <= steps; step += 1) {
    const angle = thetaStart + (thetaLength * step) / steps
    positions.push(Math.cos(angle) * (ARC_RADIUS - 0.04), Math.sin(angle) * (ARC_RADIUS - 0.04), 0)
    positions.push(Math.cos(angle) * (ARC_RADIUS + 0.04), Math.sin(angle) * (ARC_RADIUS + 0.04), 0)
    if (step > 0) {
      const base = (step - 1) * 2
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(indices)
  return geometry
}

// Steps the Replay walk. It lives in the canvas loop so it pauses with it.
function ReplayClock({ total }) {
  useFrame((_, delta) => useBranchingPlayback.getState().tick(delta, total))
  return null
}

function TurtleScene() {
  const angleDegrees = useSceneStore((state) => state.params.branchingAngle)
  const cursor = useBranchingPlayback((state) => state.cursor)
  const trace = useMemo(() => interpret(FIRST_PROGRAM, { angleDegrees, length: FIRST_LENGTH }), [angleDegrees])
  const past = useMemo(() => trace.segments.filter((segment) => segment.tokenIndex < cursor - 1), [trace, cursor])
  const latest = useMemo(() => trace.segments.filter((segment) => segment.tokenIndex === cursor - 1), [trace, cursor])
  const turned = cursor > 0 && FIRST_PROGRAM[cursor - 1] !== 'F'
  return <Drawing origin={TURTLE_ORIGIN}>
    <ReplayClock total={FIRST_PROGRAM.length} />
    <Strokes segments={past} token="--ink" z={0.005} />
    <Strokes segments={latest} token="--clay-deep" z={0.006} />
    {turned && <TurnArc before={trace.states[cursor - 1]} after={trace.states[cursor]} />}
    <Pen state={trace.states[cursor]} />
  </Drawing>
}

function RewriteScene() {
  const angleDegrees = useSceneStore((state) => state.params.branchingAngle)
  const requested = useSceneStore((state) => state.params.branchingGeneration)
  const generation = Math.min(requested, LINE_GENERATIONS.strings.length - 1)
  const current = useMemo(
    () => interpret(parseInstructions(LINE_GENERATIONS.strings[generation]), { angleDegrees, length: LINE_LENGTH }),
    [angleDegrees, generation],
  )
  const previous = useMemo(
    () => generation === 0 ? null : interpret(parseInstructions(LINE_GENERATIONS.strings[generation - 1]), { angleDegrees, length: LINE_LENGTH }),
    [angleDegrees, generation],
  )
  return <Drawing origin={REWRITE_ORIGIN}>
    {previous && <Strokes segments={previous.segments} width={GHOST_WIDTH} token="--water-deep" z={0.003} />}
    <Strokes segments={current.segments} token="--ink" z={0.005} />
  </Drawing>
}

// A dashed line from one point to another, as short strokes. It shows a move
// that draws nothing.
function dashSegments(from, to) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const size = Math.hypot(dx, dy)
  const pieces = []
  for (let start = 0; start < size; start += DASH + GAP) {
    const end = Math.min(size, start + DASH)
    pieces.push({ from: [from[0] + (dx * start) / size, from[1] + (dy * start) / size], to: [from[0] + (dx * end) / size, from[1] + (dy * end) / size] })
  }
  return pieces
}

// A hollow ring where the pen saved a spot, with a short tick showing the
// heading it saved there.
function SavedMarkers({ stack }) {
  const ticks = useMemo(
    () => stack.map(({ x, y, heading }) => ({ from: [x, y], to: [x - Math.sin(heading) * 0.4, y + Math.cos(heading) * 0.4] })),
    [stack],
  )
  return <>
    {stack.map(({ x, y }, index) => <mesh key={index} position={[x, y, 0.03]}>
      <ringGeometry args={[MARKER_RADIUS - 0.035, MARKER_RADIUS, 24]} />
      <meshBasicMaterial color={readToken('--summit-deep')} />
    </mesh>)}
    <Strokes segments={ticks} width={0.04} token="--summit-deep" z={0.03} />
  </>
}

function HandForkScene() {
  const angleDegrees = useSceneStore((state) => state.params.branchingAngle)
  const cursor = useBranchingPlayback((state) => state.cursor)
  const trace = useMemo(() => interpretTree(BRANCH_PROGRAM, { angleDegrees, length: BRANCH_LENGTH }), [angleDegrees])
  const past = useMemo(() => trace.segments.filter((segment) => segment.tokenIndex < cursor - 1), [trace, cursor])
  const latest = useMemo(() => trace.segments.filter((segment) => segment.tokenIndex === cursor - 1), [trace, cursor])
  const symbol = cursor > 0 ? BRANCH_PROGRAM[cursor - 1] : null
  const returning = useMemo(
    () => symbol === ']' ? dashSegments([trace.states[cursor - 1].x, trace.states[cursor - 1].y], [trace.states[cursor].x, trace.states[cursor].y]) : [],
    [symbol, trace, cursor],
  )
  return <Drawing origin={TURTLE_ORIGIN}>
    <ReplayClock total={BRANCH_PROGRAM.length} />
    <Strokes segments={past} token="--ink" z={0.005} />
    <Strokes segments={latest} token="--clay-deep" z={0.006} />
    <Strokes segments={returning} width={0.05} token="--moss-deep" z={0.007} />
    {(symbol === '+' || symbol === '-') && <TurnArc before={trace.states[cursor - 1]} after={trace.states[cursor]} />}
    <SavedMarkers stack={trace.states[cursor].stack} />
    <Pen state={trace.states[cursor]} />
  </Drawing>
}

function ForkScene({ ruleName }) {
  const angleDegrees = useSceneStore((state) => state.params.branchingAngle)
  const generation = useSceneStore((state) => state.params.branchingForkGeneration)
  const { segments, length } = useMemo(() => {
    const grown = growFork(ruleName, generation)
    return { segments: interpretTree(parseInstructions(grown.text), { angleDegrees, length: grown.length }).segments, length: grown.length }
  }, [ruleName, generation, angleDegrees])
  return <Drawing origin={ruleName === 'One side' ? [0.8, 0.3] : TREE_ORIGIN}>
    <Strokes segments={segments} width={Math.min(STROKE_WIDTH, length * 0.28)} token="--ink" z={0.005} />
  </Drawing>
}

function BracketScene() {
  const rule = useSceneStore((state) => state.params.branchingRule)
  return rule === 'Hand-written' ? <HandForkScene /> : <ForkScene ruleName={rule} />
}

function DepthScene() {
  const generation = useSceneStore((state) => state.params.branchingForkGeneration)
  const angle = useSceneStore((state) => state.params.branchingAngle)
  const shape = useSceneStore((state) => state.params.branchingShape)
  const lengthRatio = useSceneStore((state) => state.params.branchingLengthRatio)
  const radiusRatio = useSceneStore((state) => state.params.branchingRadiusRatio)
  const byColour = useSceneStore((state) => state.params.branchingDepthColour)
  const selected = useBranchingPlayback((state) => state.selected)
  const segments = useMemo(() => buildShapedTree({
    branchingForkGeneration: generation, branchingAngle: angle, branchingShape: shape,
    branchingLengthRatio: lengthRatio, branchingRadiusRatio: radiusRatio,
  }), [generation, angle, shape, lengthRatio, radiusRatio])
  const levels = useMemo(
    () => DEPTH_TOKENS.map((token, depth) => ({ token, depth, segments: segments.filter((segment) => Math.min(segment.depth, DEPTH_TOKENS.length - 1) === depth) })),
    [segments],
  )
  const chosen = useMemo(() => segments.filter((segment) => segment.id === selected).map((segment) => ({ ...segment, width: segment.width + 0.1 })), [segments, selected])
  const pick = (event) => {
    const hit = nearestSegment(segments, event.point.x - TREE_ORIGIN[0], event.point.y - TREE_ORIGIN[1])
    useBranchingPlayback.getState().select(hit)
  }
  return <Drawing origin={TREE_ORIGIN}>
    <Strokes segments={chosen} token="--summit" z={0.002} />
    {byColour
      ? levels.filter((level) => level.segments.length > 0).map((level) => <Strokes key={level.depth} segments={level.segments} token={level.token} z={0.005 + level.depth * 0.001} />)
      : <Strokes segments={segments} token="--ink" z={0.005} />}
    <mesh position={[-TREE_ORIGIN[0], BOARD.centreY - TREE_ORIGIN[1], 0.02]} onClick={pick}>
      <planeGeometry args={[BOARD.width, BOARD.height]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  </Drawing>
}

export default function BranchingDemo() {
  const demo = useSceneStore((state) => state.demoKey)
  const shelter = useSceneStore((state) => state.params.branchingShelter)
  const workB = useSceneStore((state) => state.params.branchingWorkB)
  const working = useSceneStore((state) => state.params.branchingRobotWorking)
  useEffect(() => () => useBranchingPlayback.getState().reset(), [])
  // The worlds are built when the step opens and rebuilt when the pockets change;
  // moving world B's marker changes only B and never restarts anything.
  useEffect(() => {
    if (demo !== 'branching-worlds') return
    const { params } = useSceneStore.getState()
    useWorldPlayback.getState().restart({ workB: params.branchingWorkB, shelter, working: params.branchingRobotWorking })
    return () => useWorldPlayback.setState({ worlds: null, running: false })
  }, [demo, shelter])
  useEffect(() => { if (demo === 'branching-worlds') useWorldPlayback.getState().setWorkB(workB) }, [demo, workB])
  useEffect(() => { if (demo === 'branching-worlds') useWorldPlayback.getState().setWorking(working) }, [demo, working])
  if (demo === 'branching-asset') return <AssetScene />
  if (demo === 'branching-growth') return <GrowthScene />
  if (demo === 'branching-lod') return <LodScene />
  if (demo === 'branching-worlds') return <WorldScene />
  return <>
    <Board />
    {demo === 'branching-turtle' && <TurtleScene />}
    {demo === 'branching-rewrite' && <RewriteScene />}
    {demo === 'branching-brackets' && <BracketScene />}
    {demo === 'branching-depth' && <DepthScene />}
  </>
}
