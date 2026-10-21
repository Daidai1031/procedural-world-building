import { useSceneStore } from '../store/sceneStore.js'
import { BRANCHING_PRIMARY_KEYS } from '../scene/demos/branching/params.js'
import { BRANCH_LENGTH, BRANCH_PROGRAM, buildShapedTree, FORK_RULES, growFork } from '../scene/demos/branching/forkExample.js'
import { countSymbol } from '../scene/demos/branching/lsystem.js'
import {
  FIRST_LENGTH, FIRST_PROGRAM, INSTRUCTION_ACTIONS, LINE_GENERATIONS, LINE_RULES, MAX_GENERATION,
} from '../scene/demos/branching/lineExample.js'
import { useBranchingPlayback } from '../scene/demos/branching/playback.js'
import { interpretTree } from '../scene/demos/branching/tree.js'
import { interpret, parseInstructions } from '../scene/demos/branching/turtle.js'
import BranchingParameter from './BranchingParameter.jsx'
import { AssetSide, GrowthSide, LodSide, WorldSide } from './BranchingLabPanels.jsx'
import { applyDesign, worldActions } from './branchingActions.js'
import './BranchingPanel.css'

function Instructions({ program = FIRST_PROGRAM, length = FIRST_LENGTH }) {
  const angleDegrees = useSceneStore((state) => state.params.branchingAngle)
  const cursor = useBranchingPlayback((state) => state.cursor)
  const playing = useBranchingPlayback((state) => state.playing)
  const { next, reset, replay } = useBranchingPlayback.getState()
  const total = program.length
  const state = interpret(program, { angleDegrees, length }).states[cursor]
  const symbol = cursor > 0 ? program[cursor - 1] : null
  const saved = program.includes('[') ? ` · ${state.stack.length} saved ${state.stack.length === 1 ? 'spot' : 'spots'}` : ''
  const heading = Math.round(((state.heading * 180) / Math.PI) % 360)
  return <div className="branching-side">
    <ol className="branching-tokens" aria-label="Instructions">
      {program.map((token, index) => (
        <li
          key={index}
          className="branching-token"
          data-state={index < cursor - 1 ? 'done' : index === cursor - 1 ? 'current' : 'waiting'}
          aria-current={index === cursor - 1 ? 'step' : undefined}
        >{token}</li>
      ))}
    </ol>
    <div className="branching-buttons">
      <button type="button" className="branching-primary" onClick={() => next(total)} disabled={cursor >= total}>Next Instruction</button>
      <button type="button" onClick={replay} disabled={playing}>Replay</button>
      <button type="button" onClick={reset} disabled={cursor === 0 && !playing}>Reset</button>
    </div>
    <output className="branching-status" aria-live="polite">
      {symbol === null
        ? `Ready at the start, pointing up · 0 of ${total} instructions`
        : `${symbol} · ${INSTRUCTION_ACTIONS[symbol]} · pen at (${state.x.toFixed(2)}, ${state.y.toFixed(2)}) · heading ${heading}° · ${state.segmentCount} ${state.segmentCount === 1 ? 'segment' : 'segments'} drawn${saved} · ${cursor} of ${total} instructions`}
    </output>
  </div>
}

function Mapping({ generation }) {
  if (generation === 0) {
    return <div className="branching-mapping"><span className="branching-note">Generation 0 is the axiom as written: no rule has run yet.</span></div>
  }
  const old = LINE_GENERATIONS.strings[generation - 1]
  return <ol className="branching-mapping" aria-label={`How generation ${generation - 1} became generation ${generation}`}>
    {Array.from(old).map((symbol, index) => {
      const replacement = LINE_RULES[symbol] ?? symbol
      return <li key={index} className="branching-cell" data-replaced={symbol in LINE_RULES} aria-label={`${symbol} becomes ${replacement}`}>
        <span className="branching-cell__old">{symbol}</span>
        <span className="branching-cell__new">{replacement}</span>
      </li>
    })}
  </ol>
}

function Generations() {
  const requested = useSceneStore((state) => state.params.branchingGeneration)
  const setParam = useSceneStore((state) => state.setParam)
  const available = LINE_GENERATIONS.strings.length - 1
  const generation = Math.min(requested, available)
  const text = LINE_GENERATIONS.strings[generation]
  const drawn = countSymbol(text, 'F')
  const stopped = LINE_GENERATIONS.stopped
  return <div className="branching-side">
    <Mapping generation={generation} />
    <div className="branching-buttons">
      <button type="button" className="branching-primary" onClick={() => setParam('branchingGeneration', generation + 1)} disabled={generation >= Math.min(available, MAX_GENERATION)}>Next Generation</button>
      <button type="button" onClick={() => setParam('branchingGeneration', 0)} disabled={generation === 0}>Back to axiom</button>
    </div>
    <output className="branching-status" aria-live="polite">
      Generation {generation} · {text.length} symbols · {drawn} F (draw {drawn === 1 ? 'operation' : 'operations'}) · {text.length - drawn} turns
      {stopped ? ` · generation ${stopped.generation} refused: too many ${stopped.reason}` : ''}
    </output>
  </div>
}

// The rule is written out, so a rule change is never silent.
function Forks() {
  const rule = useSceneStore((state) => state.params.branchingRule)
  const generation = useSceneStore((state) => state.params.branchingForkGeneration)
  const angleDegrees = useSceneStore((state) => state.params.branchingAngle)
  if (rule === 'Hand-written') return <Instructions program={BRANCH_PROGRAM} length={BRANCH_LENGTH} />
  const grown = growFork(rule, generation)
  const { segments } = interpretTree(parseInstructions(grown.text), { angleDegrees, length: grown.length })
  const deepest = Math.max(...segments.map((segment) => segment.depth))
  return <div className="branching-side">
    <p className="branching-rule">Rule: <code>F → {FORK_RULES[rule].rule}</code></p>
    <output className="branching-status" aria-live="polite">
      Generation {grown.generation} · {grown.text.length} symbols · {segments.length} F · side branches nest {deepest} {deepest === 1 ? 'level' : 'levels'} deep
    </output>
  </div>
}

function Inspector() {
  const params = useSceneStore((state) => state.params)
  const selected = useBranchingPlayback((state) => state.selected)
  const segments = buildShapedTree(params)
  const chosen = segments.find((segment) => segment.id === selected)
  const deepest = Math.max(...segments.map((segment) => segment.depth))
  const outward = params.branchingShape === 'By depth' && params.branchingRadiusRatio > 1
  return <div className="branching-side">
    <output className="branching-status" aria-live="polite">
      {chosen
        ? `Segment ${chosen.id} · depth ${chosen.depth} · hangs from ${chosen.parentId === null ? 'the start' : `segment ${chosen.parentId}`} · length ${chosen.length.toFixed(2)} · thickness ${chosen.width.toFixed(2)}`
        : 'Click a branch to see its depth.'}
    </output>
    <output className="branching-status" aria-live="polite">
      Generation {params.branchingForkGeneration} · {segments.length} F · depths 0 to {deepest} · {params.branchingShape === 'Equal' ? 'every level the same size' : outward ? 'outward thickening: outer branches are thicker than the trunk' : 'each level smaller than the one before'}
    </output>
  </div>
}

export default function BranchingPanel() {
  const demo = useSceneStore((state) => state.demoKey)
  const rule = useSceneStore((state) => state.params.branchingRule)
  const shape = useSceneStore((state) => state.params.branchingShape)
  const requestCameraReset = useSceneStore((state) => state.requestCameraReset)
  const keys = BRANCHING_PRIMARY_KEYS[demo].filter((name) => !(demo === 'branching-brackets' && rule === 'Hand-written' && name === 'branchingForkGeneration'))
  return <section className="branching-panel" data-demo={demo} aria-label="Branching scene controls">
    <div className="branching-parameters">
      {keys.map((name) => <BranchingParameter key={name} name={name} onChange={name === 'branchingPreset' ? applyDesign : undefined} disabled={demo === 'branching-depth' && shape === 'Equal' && (name === 'branchingLengthRatio' || name === 'branchingRadiusRatio')} />)}
    </div>
    {demo === 'branching-turtle' && <Instructions />}
    {demo === 'branching-rewrite' && <Generations />}
    {demo === 'branching-brackets' && <Forks />}
    {demo === 'branching-depth' && <Inspector />}
    {demo === 'branching-asset' && <AssetSide />}
    {demo === 'branching-growth' && <GrowthSide />}
    {demo === 'branching-lod' && <LodSide />}
    {demo === 'branching-worlds' && <WorldSide actions={worldActions()} />}
    <button type="button" className="branching-recenter" onClick={requestCameraReset}>Recenter view</button>
  </section>
}
