# Phase 4B — practice task proposal

Eight tasks across 35 steps, plus three live-edit steps.

**Status: approved and built.** Five changes were required at approval and are folded in
below: the chapter guard compares the parsed chapter number (§3), the whitespace test
covers the asymmetric case (§2), `EditableCode` renders highlights so all three live-edit
steps keep the lines they teach (§5), the erosion live edit was gated on measured
throughput (§5), and `SPEC.md` §4 now describes how practice actually renders (§7).
`artifacts/phase4b/README.md` reports what the measurements came back as.

## 1. What each lesson can actually carry

The brief named three limits. Reading the machinery turned up four more. All seven
narrow the space before taste does.

| # | Limit | Where it comes from |
|---|---|---|
| L1 | `match` is chapter-1-only | `scripts/extract-code.mjs:131`; scoring needs `sampleProceduralMap` |
| L2 | `implement` needs a reference `fn` | `Practice.jsx:118` reads `task.reference.fn` |
| L3 | `code.editable` overrides maths functions only | `overrides.js:8`, `EditableCode.jsx:18` |
| L4 | **A step renders its own code block *and* its practice** | `StepCard.jsx:199-200` |
| L5 | **`editable` requires `code.fn`, never `code.region`** | `EditableCode.jsx` passes `reference.fn` to `evaluateOverride` |
| L6 | **`sampleProceduralMap` cannot be an editable target** | it calls `resolveFunction('sampleProceduralMap', …)` on its own first line |
| L7 | **One blank per line** | `CodeBlock.jsx:29` takes `blanks.find(…)` |

**L4 is the one that shapes this phase.** `StepCard` renders the step's read-only code
block and then the practice below it. If a `fill` reads from the same fragment the step
displays, the answer is sitting two inches above the dropdown, and if an `implement`
names the function the step displays, the task is a transcription exercise. So:

> **A task never reads from the fragment its own step displays.** It reads from the
> fragment the *previous* step displayed, or from a sibling fragment the learner has
> not been shown. This is what `ai-and-practice.md` §5 already means by "good for the
> step right after a concept lands", and it is why `implement` lands on steps that carry
> no code block at all.

Reading from a fragment shown *earlier in the course* is fine and unavoidable — the
course teaches the code before it asks for it. What the spec forbids is auto-revealing
the reference on the task's own step, and that is what L4 would have done.

**L6 is a trap, not a preference.** `sampleProceduralMap` begins by asking whether it
has been overridden. Apply its own unmodified source as an override and it calls
itself: infinite recursion, 2-second worker timeout, an error on a step where the
learner has changed nothing. It is struck off the editable list.

**So Lesson 01 can carry `fill` and nothing else**, and every Lesson 01 blank must read
from a region some *other* step displays.

Chaining L2, L3, L5 and L6, the editable targets available anywhere in the course are
exactly `valueNoise2D`, `perlin2d`, `shapeValue`, `fractalNoise` and
`stepHydraulicErosion`. Two of those five are wanted as `implement` references, which
leaves three. The editable set below is therefore forced, not chosen.

## 2. Verification: does `fill` work over JSX?

**It renders correctly. It scores correctly for every answer proposed below. It refuses
a whole class of JSX answers, and that needs a two-line fix.**

*Rendering.* `CodeBlock` joins a highlighted line's tokens, finds the answer by
substring, and splices the control across token boundaries. Run against the real Shiki
theme — which splits these lines into 9 to 15 tokens — the `jsx` grammar behaves:

```
sphere        line 1  ->  <mesh position={[BLANK]} castShadow receiveShadow>   (9 tokens)
box           line 3  ->      <boxGeometry [BLANK] />                          (9 tokens)
floor         line 1  ->  <mesh rotation={[-Math.PI / 2, 0, 0]} [BLANK]>      (13 tokens)
canvas-camera line 3  ->    camera={{ position: [6, 5, 8], fov: 50, [BLANK] }} (15 tokens)
```

*Scoring.* `normalizeWhitespace` tokenises with `acorn`, which is a JavaScript
tokeniser, not a JSX one. It nevertheless accepts attributes, braces, arrays and even
`/>` at the end of a self-closing tag, because the surrounding tokens leave the parser
expecting a division:

```
"args={[1.5, 1.5, 1.5]}"   -> "args = { [ 1.5 , 1.5 , 1.5 ] }"
"[0, 1, 0]"                -> "[ 0 , 1 , 0 ]"
"near: 0.1, far: 200"      -> "near : 0.1 , far : 200"
"<planeGeometry args={[60, 60]} />"  -> "< planeGeometry args = { [ 60 , 60 ] } / >"
```

*The bug.* An answer that *starts* where an expression is expected turns `/` into a
regular expression and throws:

```
"</mesh>"                            -> THREW: Unterminated regular expression (1:2)
"/>"                                 -> THREW: Unterminated regular expression (1:1)
"<mesh position={[0, 1, 0]}></mesh>" -> THREW: Unterminated regular expression (1:29)
```

`answerMatches` swallows the throw and returns `false`, so a blank whose answer is a
closing tag can never be passed — the correct answer is marked wrong, silently. None of
the blanks below trip it, but the next author's would.

**Fix:** `normalizeWhitespace` falls back to collapsing whitespace when the value is not
a JavaScript token stream. Both sides of every comparison go through the same function,
so a JSX answer is then compared on whitespace alone and a correct answer passes. Two
lines, covered by a new unit test.

## 3. A second bug: the chapter-1 guard never fires correctly

`extract-code.mjs:131` restricts `match` with `stepFile.includes('/chapters/01-')`. The
real directory is `chapters/1-functions`. Adding a `match` to `06-frequency.mdx` and
running the extractor:

```
content/lessons/02-procedural-maps/chapters/1-functions/steps/06-frequency.mdx:
  match practice is only supported in chapter 1
```

The guard rejects chapter 1 and would accept a chapter named `01-anything`. Its unit
test passes only because the fixture uses `chapters/01-functions` — the bug survived
because the fixture was written to match the broken code.

**Fix:** parse the chapter's numeric prefix and compare it as a number
(`Number(stepFile.match(/\/chapters\/(\d+)-/)?.[1]) !== 1`). The fixture is corrected to
the real directory names, `1-functions` and `2-simulation`, so the test would now catch
the original bug. A flat lesson has no chapter at all and still fails, which
`scripts/phase4b.test.mjs` covers.

## 4. The tasks

| Step id | Kind | What the learner does | Why this step | Notes |
|---|---|---|---|---|
| `scene-anatomy/entities-geometry-and-transform` | fill | Choose the sphere's `position` from `[0, 0.5, 0]` / `[0, 1, 0]` / `[0, 2, 0]` | The step has just derived the box's `0.75` from its 1.5 height. The sphere is the same rule on a new shape | Reads `region: sphere`; the step displays `region: box`. The radius is on the snippet's next line, so the blank is self-contained. Distractors are half-the-radius and the diameter |
| `scene-anatomy/moving-the-camera` | fill | Choose the camera's clipping pair: `near: 0.1, far: 200` / `near: 3, far: 40` / `near: 0.1, far: 40` | The step closes on "these are control limits, separate from the camera's clipping distances". This is the only blank that forces the learner to hold both ranges at once | Reads `region: canvas-camera`; the step displays `region: orbit-controls`, where `minDistance={3}` and `maxDistance={40}` are visible. One blank, two inferences (L7) |
| `procedural-maps/frequency` | match | Spread the landscape over twice as much ground | Frequency is the parameter the step introduces, and "twice as wide" is a goal, not a slider reading | `compare: [frequency]`, target `0.16`. No code block on this step |
| `procedural-maps/persistence` | match | Make the surface rougher without changing the size of the broad hills | `ai-and-practice.md` §5's own example. Two dials, and doing only one of them fails | `compare: [octaves, persistence]`, target `{5, 0.65}`. Both controls are already unlocked here |
| `procedural-maps/terraces-and-power` | implement | Write the `terracing` and `power` branches of `shapeValue`; the earlier branches are in the starter | The step's two ideas are exactly these two branches, and quantisation is arithmetic the prose describes but never spells out | Reference `fn: shapeValue`. No code block on this step. `visual: true` — a wrong band count is unmistakable in the difference map |
| `procedural-maps/values-become-height` | implement | Write the octave loop of `fractalNoise` | The chapter's closing step: "you now have the complete function pipeline". Every ingredient has been met — base noise (04, 05), frequency (06), octaves (07), persistence (08) | Reference `fn: fractalNoise`. Starter supplies the signature, the accumulators and the `baseNoise` call with its per-octave seed, which is a magic constant and not derivable. The learner writes the four accumulation lines |
| `procedural-maps/water-follows-surface-height` | fill | Rebuild the two lines that produce `surface`: water plus rain, then ground plus water | The step's own snippet compares `surface` against neighbours. Where `surface` comes from is the thing it depends on | Reads `region: rainfall` (displayed one step earlier at `rain-adds-water`); the step displays `region: downhill-flow`. Two blanks, two lines |
| `procedural-maps/carrying-sediment` | fill | Rebuild how the steepest downhill neighbour is chosen: the drop, and the comparison that keeps the largest one | Capacity is built from flow and drop; the step spends its words on the drop without showing how it is found | Reads `region: downhill-flow` (displayed one step earlier). No code block on this step. Distractors invert the subtraction and drop the running maximum |

Four `fill`, two `match`, two `implement`. `match` and `implement` cluster in Lesson 02
chapter 1 because that is the only place either can run — `match` by L1, `implement`
because the side-by-side difference map only exists for functions that produce a map.
Spreading them would mean inventing tasks for steps that do not want one.

**Eight, not twelve.** `SPEC.md` §2 says roughly a quarter of steps carry practice;
eight of 35 is 23%. Ten candidates were written and two were cut: a `receiveShadow`
blank on the floor (it asks which of two names applies, which is closer to a quiz than
to reasoning) and a fill on the four-neighbour offsets (recall of a list).

## 5. Live editing — three steps, all Lesson 02

| Step id | Target | Why editing is the lesson |
|---|---|---|
| `procedural-maps/white-to-value-noise` | `fn: valueNoise2D` | Replace `fade(x - x0)` with the raw distance and the smooth joins turn to creases. One token, and coherence stops being a word |
| `procedural-maps/perlin-versus-worley` | `fn: perlin2d` | Delete one corner's contribution, or drop the easing, and watch which half of the A/B compare moves. Worley does not call this function, so the contrast is live on screen |
| `procedural-maps/erosion-removes-terrain` | `fn: stepHydraulicErosion` | The erosion rule. Change what water picks up and the landscape that grows out of it is different ten seconds later |

All three already carry a `code` block, so no step gains one.

**`EditableCode` now renders highlights.** A live-edit block marks the lines it teaches
in `--summit`, exactly as the read-only block does, so every one of these steps keeps
the highlights it had. The editor is a CodeMirror decoration rebuilt from document
positions, so the mark stays on the right line as the learner types above it, and the
editor opens scrolled to the first marked line — without that, `stepHydraulicErosion`
would open on a doc comment thirty lines above the rule the step is about. Twenty-nine
lines in `CodeEditor.jsx`, against a budget of forty.

- `perlin-versus-worley` and `white-to-value-noise` already use `fn` and need only
  `editable: true`.
- `erosion-removes-terrain` changes from `region: erosion-deposition` to
  `fn: stepHydraulicErosion` — L5 — keeping the same five taught lines as highlights,
  remapped from the region's numbering to the function's. The step shows the whole
  timestep rather than the twenty lines it teaches, but opens on those twenty.
- `EditableCode` renders an editor with no instructions of its own, so each of the three
  steps gains a short sentence naming one edit worth trying. Prose ran 88, 91 and 96
  words against a 60–100 limit, so all three edits are replacements, not additions.

**Latency is measured, not assumed.** Overrides resolve through the worker, so each of
the three is checked after authoring: edit a value, press Apply, and record how long
until the scene moves and whether the intermediate state reads as responding or
flickering.

**The erosion live edit is gated on throughput.** Every timestep round-trips through the
worker while the simulation runs — `runSandbox` builds a fresh Worker per call — so the
step is kept only if it holds 80% of the rate the page achieves without an override, and
80% of the rate the learner configured. Below either floor, F3 comes off this step and
it reverts to the read-only `region: erosion-deposition` block. The result is reported,
not tuned around.

## 6. Tolerances, measured

Every number below comes from running the reference against near misses. Raw output
lands in `artifacts/phase4b/tolerances.json`, and each separation becomes a unit
assertion so a future edit to the maths cannot quietly widen it.

### `frequency` match — tolerance `0.015`

Mean absolute difference between two 64×64 grids, target `0.16`:

| frequency | 0.14 | 0.15 | **0.16** | 0.17 | 0.18 | 0.32 (arrival) |
|---|---|---|---|---|---|---|
| distance | 0.0254 | 0.0140 | **0** | 0.0140 | 0.0259 | 0.1120 |

`0.015` accepts one slider step either side and rejects two. The value the learner
arrives with is 7.5× the tolerance away.

### `octaves` + `persistence` match — tolerance `0.008`

Target `{octaves: 5, persistence: 0.65}`, measured across the full 6 × 13 grid:

| setting | distance | verdict |
|---|---|---|
| 5, 0.65 | 0.0000 | pass |
| 5, 0.60 / 5, 0.70 | 0.0056 / 0.0054 | pass |
| 6, 0.60 / 6, 0.65 | 0.0062 / 0.0062 | pass |
| 4, 0.65 | 0.0102 | fail |
| **6, 0.50 (more layers only)** | **0.0169** | **fail** |
| **4, 0.80 (louder layers only)** | **0.0155** | **fail** |
| 4, 0.50 (arrival) | 0.0206 | fail |
| 1, any | 0.0839 | fail |

Six octaves passes alongside five, and it should: with persistence at 0.65 the sixth
layer is quiet, and the prompt asks for a rougher surface, not for a slider position.
The two half-solutions — raise the layer count *or* raise their strength — are both
rejected, which is the point of the task.

### `shapeValue` implement — tolerance `0.000001`

Eight cases: `terracing` at `0.45` and `0.96`, `power` at `0.5` and `0.12`, and one case
for each branch the starter supplies, so deleting one of those fails too. The two
`terracing` values are chosen deliberately — at `0.37` a three-band answer and a
twelve-band answer both agree with six bands, and the task would pass them:

| implementation | max \|difference\| |
|---|---|
| correct | 0 |
| **`value ** 2` instead of `2.2`** | **3.24e-2** |
| `Math.round(value * 12) / 12` (twelve bands) | 8.33e-2 |
| `Math.round(value * 3) / 3` (three bands) | 1.67e-1 |
| `Math.floor(value * 6) / 6` | 1.67e-1 |
| drops the final `return value` | 2.00e-1 |
| `value ** 0.45` | 5.14e-1 |
| `value * 2.2` | 8.82e-1 |
| `Math.round(value) * 6` | 5.00e0 |

The tightest near miss is 32,000× the tolerance.

### `fractalNoise` implement — tolerance `0.000001`

Four cases: `['perlin', 0, 0, …]`, `['perlin', 1.7, -2.3, …]`, `['value', -3.1, 4.6, …]`
and a single-octave case. Max absolute difference from the reference:

| implementation | max \|difference\| |
|---|---|
| correct | 0 |
| **never applies persistence** | **1.74e-2** |
| forgets `frequency *= 2` | 1.68e-1 |
| divides by `octaves` instead of `amplitudeTotal` | 4.73e-1 |
| same seed every octave | 8.49e-2 |
| doubles the frequency before sampling instead of after | 3.76e-1 |
| adds each layer at full strength | 1.78e0 |

The tightest near miss is 17,000× the tolerance.

### Rejected: an `implement` on the erosion rule

`stepHydraulicErosion` was measured as an implement target before being given to F3
instead. A hand-built 4×4 state exercises all four branches in one update — 13 cells
erode, one deposits, two keep their water, and the height floor binds once:

| implementation | max \|difference\| |
|---|---|
| correct | 0 |
| **deposits the whole load instead of the excess** | **3.97e-3** |
| erodes without loading the sediment | 1.90e-2 |
| erode and deposit branches swapped | 8.80e-2 |
| no height floor | 1.61e-1 |

It separates cleanly at `0.000001`, so the task is measurable. It is not proposed,
because the starter would be eighty lines of code the learner did not write, and because
`visual: true` produces nothing here — `evaluateMap` samples the noise map, which no
erosion override touches, so both maps would be identical and the difference map black.
An `implement` with no difference map fails the brief's own test: *someone who has never
programmed should be able to tell their output is wrong by looking at the difference map
alone.* The two implements proposed above both produce real ones.

## 7. What this changes outside `content/`

Four files, listed so the review is not a surprise.

| File | Change |
|---|---|
| `src/practice/scoring.js` | `normalizeWhitespace` falls back to whitespace collapsing when the answer is not a JavaScript token stream (§2) |
| `src/practice/CodeEditor.jsx` | renders highlighted lines and opens on the first of them (§5) |
| `src/practice/EditableCode.jsx` | passes the step's `highlight` through |
| `scripts/extract-code.mjs` | chapter-1 guard compares the parsed chapter number (§3) |
| `scripts/extract-code.test.mjs` | fixture uses the real `1-functions` / `2-simulation` names (§3) |
| `scripts/phase4b.test.mjs` | new: tolerance separations, both fixes, and every blank checked right and wrong |
| `tests/phase4b.spec.js` | new: a `fill` over a JSX region end to end, both matches, both implements, and the three editable steps with their measured latency and throughput |
| `spec/SPEC.md` §4 | describes how practice actually renders, and what that costs authoring |
| `spec/ai-and-practice.md` §5 | records the same rule where task kinds are defined |

**Two earlier assertions have to change**, both written before any step carried
practice.

`scripts/scene-anatomy.test.mjs:60` asserts
`frontmatter.practice === undefined` for every Lesson 01 step — written when Lesson 01
had no practice, and directly contradicted by this phase. It is replaced by a stricter
assertion, not a weaker one: Lesson 01 practice, where present, is `kind: fill`, reads
from a region the step does not itself display, and `code.editable` stays `false`
throughout the lesson. That encodes L4 and the "no `match`, no `implement` in Lesson 01"
rule as a test.

`lesson02.spec.js:37` and `phase3b.spec.js:60` count `.code-block` on the page and expect
one per step that has code. A `fill` and an `implement` each render a code block of their
own, so both locators are scoped to the step's own block —
`.step-card__body > .code-block-anchor .code-block` — which is what they were written to
count. No assertion is weakened.

`lesson-content.test.mjs`'s `codeCount === 13` still holds: no Lesson 02 step gains or
loses a code block.

## 8. Not doing

- **No practice in Lesson 01 steps 01, 02, 04–08, 10.** Every blank considered there
  asked for a name rather than a reason.
- **No `match` on `07-octaves`**, though the brief lists it as an obvious home. Three
  consecutive match tasks on 06, 07 and 08 would teach the interface rather than the
  terrain; 08 asks about octaves anyway, alongside the parameter that makes them matter.
- **No fourth editable step.** The candidate list is exactly three long once L5 and L6
  are applied and the two implement references are set aside.
- **No collapsed "Try it" disclosure.** `SPEC.md` §4 draws practice as a disclosure that
  opens in place; `StepCard` renders it inline today. Changing that is a layout change,
  not a content one, and it would hide L4 rather than fix it.
