# Phase 4B — evidence

Eight practice tasks and three live-edit steps, authored against
`spec/phase4b-practice-proposal.md`. Everything below is measured, not asserted.

## What is in here

| File | What it holds |
|---|---|
| `tolerances.json` | every match distance and implement near-miss, written by `scripts/phase4b.test.mjs` |
| `editable-latency.json` | Apply-to-scene timings for the three live-edit steps |
| `erosion-override-rate.json` | simulation throughput with and without a live edit, at 10 and 20 updates per second |
| `fill-jsx.png` | the Lesson 01 JSX fill, passed |
| `match-frequency.png` | the frequency match with its distance meter |
| `implement-*.png` | both implements after a correct answer, with the difference map |
| `erosion-editable.png` | the erosion timestep under a live edit |
| `walk/task-*.png` | each of the eleven tasks as the learner first meets it |

## 1. `fill` over a JSX region — verified, and one bug fixed

**Rendering is correct.** `CodeBlock` joins a line's syntax tokens, finds the answer by
substring, and splices the control across token boundaries. Against the real Shiki
theme these lines split into 9–15 tokens and the splice lands exactly:

```
1  <mesh position={[ Choose... ▾ ]} castShadow receiveShadow>
2    <sphereGeometry args={[1, 48, 48]} />
```

Verified in the browser (`walk/task-entities-geometry-and-transform.png`) and asserted
in `tests/phase4b.spec.js`: with the `<select>` removed, the line reads exactly
`<mesh position={} castShadow receiveShadow>`, so the answer appears only inside the
control.

**Scoring was broken for a class of JSX answers.** `normalizeWhitespace` tokenises with
`acorn`, a JavaScript tokeniser. It accepts attributes, braces, arrays and a trailing
`/>` — but an answer that *starts* where an expression is expected turns the slash into
a regular expression and throws:

```
"</mesh>"                            -> Unterminated regular expression (1:2)
"/>"                                 -> Unterminated regular expression (1:1)
"<mesh position={[0, 1, 0]}></mesh>" -> Unterminated regular expression (1:29)
```

`answerMatches` swallowed the throw and returned `false`, so a blank whose answer is a
closing tag could never be passed — the correct answer marked wrong, with no error. None
of the eight authored blanks trips it; the next author's would.

Fixed in `src/practice/scoring.js`: when the value is not a JavaScript token stream,
fall back to collapsing whitespace. Both sides of every comparison go through the same
function, so a JSX answer now matches itself.

The test covers the asymmetric case, where one side tokenises and the other does not,
so the current verdicts are deliberate rather than lucky:

| left | right | tokenises | verdict |
|---|---|---|---|
| `castShadow` | `castShadow </mesh>` | yes / no | different, correctly |
| `receiveShadow` | `</mesh>` | yes / no | different, correctly |
| `  </mesh>  ` | `</mesh>` | no / no | same — padding is still free |
| `</ mesh>` | `</mesh>` | no / no | different — JSX answers are spacing-strict |
| `state.water[index]+settings.rainfall` | `… + …` | yes / yes | same — spacing free inside a tokenised answer |

## 2. The chapter-1 guard never fired correctly

`extract-code.mjs` restricted `match` with `stepFile.includes('/chapters/01-')`. The real
directory is `chapters/1-functions`, so a `match` on a genuine chapter-1 step failed the
build:

```
content/lessons/02-procedural-maps/chapters/1-functions/steps/06-frequency.mdx:
  match practice is only supported in chapter 1
```

The guard rejected chapter 1 and would have accepted a chapter named `01-anything`. Its
unit test passed only because the fixture was written to match the broken code. The
guard now parses the chapter's numeric prefix and compares it as a number, and the
fixture uses the real `1-functions` / `2-simulation` names, so it would catch the
original bug. A flat lesson, which has no chapter at all, still fails.

## 3. Tolerances, measured

Full numbers in `tolerances.json`; each separation is a unit assertion, so a future edit
to the maths cannot quietly widen it.

**Frequency match — tolerance `0.015`.** One slider step either side passes, two fail:

| frequency | 0.14 | 0.15 | **0.16** | 0.17 | 0.18 | 0.32 (arrival) |
|---|---|---|---|---|---|---|
| distance | 0.0254 | 0.0140 | **0** | 0.0140 | 0.0259 | 0.1120 |

**Roughness match — tolerance `0.008`.** Both half-answers are rejected, which is the
whole point of the task:

| setting | distance | verdict |
|---|---|---|
| 5, 0.65 | 0.0000 | pass |
| 5, 0.60 / 5, 0.70 | 0.0056 / 0.0054 | pass |
| 6, 0.60 / 6, 0.65 | 0.0062 / 0.0062 | pass |
| 6, 0.50 — more layers only | 0.0169 | fail |
| 4, 0.80 — louder layers only | 0.0155 | fail |
| 4, 0.50 — arrival | 0.0206 | fail |
| 1, any | 0.0839 | fail |

A sweep of the whole 6 × 13 grid asserts that nothing below five octaves or below 0.60
persistence can pass.

**`shapeValue` implement — tolerance `0.000001`.** Tightest near miss 3.24e-2, which is
32,000× the tolerance:

| implementation | max \|difference\| |
|---|---|
| `value ** 2` instead of `2.2` | 3.24e-2 |
| twelve bands | 8.33e-2 |
| three bands | 1.67e-1 |
| `Math.floor` instead of `Math.round` | 1.67e-1 |
| drops the final `return value` | 2.00e-1 |
| `value ** 0.45` | 5.14e-1 |
| `value * 2.2` | 8.82e-1 |
| `Math.round(value) * 6` | 5.00e0 |

The two `terracing` cases are chosen to make band counts separable: at `0.37` a
three-band and a twelve-band answer both agree with six bands, so `0.45` and `0.96` are
used instead.

**`fractalNoise` implement — tolerance `0.000001`.** Tightest near miss 1.74e-2, 17,000×
the tolerance:

| implementation | max \|difference\| |
|---|---|
| never applies persistence | 1.74e-2 |
| same seed every octave | 8.49e-2 |
| forgets `frequency *= 2` | 1.68e-1 |
| doubles the frequency before sampling | 3.76e-1 |
| divides by `octaves` | 4.73e-1 |
| adds every layer at full strength | 1.78e0 |

**Rejected: an implement on the erosion rule.** Measured first, on a hand-built 4×4 state
that exercises all four branches in one update — 13 cells erode, one deposits, two keep
their water, and the height floor binds once. It separates cleanly (tightest near miss
3.97e-3, "deposits the whole load instead of the excess"), so the task was viable. It is
not shipped: the starter would be eighty lines the learner did not write, and
`visual: true` renders nothing here, because `evaluateMap` samples the noise map, which
no erosion override touches. The erosion rule went to F3 instead.

## 4. Live editing — highlights, latency, and the erosion gate

`EditableCode` previously rendered no highlights, so a live-edit block lost the marks the
read-only block carries. It now renders them, as a CodeMirror decoration rebuilt from
document positions, so a mark stays on its line as the learner types above it. Twenty-nine
lines in `CodeEditor.jsx`, against a budget of forty.

The editor also opens scrolled to the first marked line. Without that,
`stepHydraulicErosion` opened on a doc comment thirty lines above the rule the step is
about — the highlight existed but was off-screen, which is worse than none.
`walk/task-erosion-removes-terrain.png` shows it opening on lines 43–49.

**Latency**, from pressing Apply (`editable-latency.json`):

| step | evaluated | scene changed | intermediate frames |
|---|---|---|---|
| `white-to-value-noise` | 164 ms | 170 ms | none |
| `perlin-versus-worley` | 290 ms | 296 ms | none |
| `erosion-removes-terrain` | 79 ms | 175 ms (after one timestep) | none |

**It reads as responding, not flickering.** In every case the scene held the last good
field until the new one arrived, and no intermediate frame was ever sampled — the map
goes from the old field to the new one in a single change, under a third of a second.
Typing alone changes nothing; only Apply does, which is asserted. There is nothing here
to tune.

**The erosion throughput gate** (`erosion-override-rate.json`):

| configured | without override | with override | of configured | of achievable |
|---|---|---|---|---|
| 10 /s | 9.83 | 9.82 | 0.982 | 0.999 |
| 20 /s | 9.78 | 9.81 | 0.491 | 1.003 |

**F3 stays on the step.** At the rate the step arrives with, the live edit holds 98% of
the configured rate. A fresh Worker per timestep costs nothing measurable here.

**A separate, pre-existing finding, reported rather than fixed** (now recorded against
Phase 6 in `spec/roadmap.md`)**:** the lesson page tops out
at about 9.8 updates per second *with or without* an override, so the slider's upper half
does nothing. This is not caused by this phase — the 9.78 figure is the page with no
override at all — and Phase 4A's fixture reached 19.5 /s at the same setting (41 steps in
2.11 s, `artifacts/phase4a/browser-rate.json`), which points at the real page's per-step
work rather than the simulation. The gate therefore holds the override to what the page
actually achieves, and additionally to 80% of the configured rate at the default. Raising
that ceiling is its own task.

## 5. Walking Lesson 01 and chapter 1 as a learner

All 23 steps, front to back, no console errors. Each task screenshotted in `walk/`.

**What works.** The two matches are the strongest tasks in the set: the distance meter
gives a live warmer/colder reading while dragging, and on `persistence` the learner can
feel each half-answer fail. Both implements open with a black or flat map beside the
course map, so the first Run is already informative — `fractalNoise`'s starter returns
zero everywhere rather than `NaN`, which was a deliberate change after the first run
threw "Maps must contain finite numbers" and produced no map at all. The erosion editor
opening on its highlighted rule turns a 91-line function into a focused block.

**What does not, and is reported rather than papered over:**

1. ~~**A `fill` has no prompt.**~~ **Fixed in Phase 4C.** As shipped in 4B, the learner met
   a code block with a dropdown in it and a "Check answers" button, and nothing said what
   was being asked; the blank's `hint` appeared only after a wrong answer. `fill` now
   takes a required `practice.prompt`, rendered above the code block and before any
   control, with the same meaning as `match`'s `prompt` and `implement`'s `brief`. All
   four fills carry one, and a `fill` without one fails the build and is refused by the
   loader with the file named. The `walk/task-*.png` captures show the current rendering.

2. **Lesson 01's first fill asks about the sphere while the step's prose is about the
   box.** That is forced: the step displays the box region, so a blank in it would print
   its own answer. The sphere snippet is self-contained — the radius is on the line below
   the blank — and the transfer is the lesson. But the seam is visible, and it is the one
   place where the no-leak rule cost something pedagogically.

3. **`moving-the-camera` is the weakest of the four fills.** The reasoning is real — the
   controls hold the learner between 3 and 40 units, so clipping must start nearer and end
   further — but it is a single choice among three, and a learner who has not followed the
   argument can still land on it. It survived the cut because both other Lesson 01
   candidates (a `receiveShadow` blank on the floor, a fill on the four-neighbour offsets)
   were plainly worse: they ask which name applies, not why.

4. **The match tasks score only their compared parameters**, so a learner who changed the
   seed earlier sees a terrain that is not quite the one being scored. The meter still
   guides them, and the compare list is what `ai-and-practice.md` §5 specifies, but the
   prompt's "this landscape" is a small lie for such a learner.

## 6. Earlier tests

`npm run lint`, `npm run build`, `npm test` (27) and `npm run test:browser` (24) all pass.

Two earlier assertions changed, both written before any step carried practice, and both
approved:

- `scripts/scene-anatomy.test.mjs:60` asserted `frontmatter.practice === undefined` for
  every Lesson 01 step. Replaced with a stricter rule: Lesson 01 practice is `fill`, reads
  from a fragment the step does not display, every blank sits on its line with a hint that
  does not give the answer away, and `code.editable` stays `false` throughout.
- `lesson02.spec.js:37` and `phase3b.spec.js:60` counted `.code-block` on the page. A
  `fill` and an `implement` each render one of their own, so both locators are scoped to
  `.step-card__body > .code-block-anchor .code-block`, which is the step's own block —
  what they were written to count.

Nothing else in any earlier test changed.
