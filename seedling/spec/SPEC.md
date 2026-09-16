# Seedling — product and architecture spec

## 1. What this is

A hands-on site for learning procedural world building. A learner reads one small idea,
sees the real code behind it, changes a value, and watches the terrain respond.

**Primary audience:** someone with no programming background who wants to make
procedural worlds. They do not know what `useState` is. They do know what a mountain
looks like.

**Secondary audience:** the author, using the site to revise the course.

### Design goals

- **One idea per screen.** Cognitive load is the thing we are optimising against.
- **The result is always visible.** The 3D world is the background of the whole app,
  not a panel inside it.
- **The code is real.** Every snippet is extracted from a file that actually runs.
- **Help is one click away, in context.** The tutor always knows which step you are on
  and what you have selected.

### Non-goals

Write these down so we do not drift into them:

- Not a general programming course. JavaScript syntax is taught only where a lesson
  needs it, and that layer is deferred (see §8).
- Not mobile. Desktop only for now. Do not spend effort on responsive breakpoints
  below 1024px beyond "does not crash".
- Not multi-user. No accounts, no server-side progress, until every lesson is written.
- Not a code playground. Free-form editing exists only inside bounded practice tasks.
- Not a content management system. Lessons are files in git.

## 2. Content model

### Hierarchy

Two shapes are supported. A lesson picks one.

```
Flat (simple lessons)          Nested (complex lessons)
lesson                         lesson
└── step × 8–12                └── chapter × 2–3
                                   └── step × 8–12
```

Lesson 01 (Scene Anatomy) is flat. Lesson 02 (Creating Procedural Maps) is nested with
two chapters: `functions` and `simulation`.

**Step granularity rule:** one step states one conclusion and introduces at most one
new adjustable parameter. If a step needs two paragraphs to state its point, split it.
Target 8–12 steps per group — a flat lesson has 8–12 steps total, a chapter has 8–12
steps. A group with fewer than 6 or more than 14 is a signal the split is wrong.

Not every step has code. Not every step has practice. Most have neither.
Roughly: 100% have prose and a scene, ~40% have code, ~25% have practice.

### File layout

```
content/
├── lessons/
│   ├── 01-scene-anatomy/
│   │   ├── lesson.yaml
│   │   └── steps/
│   │       ├── 01-what-is-a-scene.mdx
│   │       └── …
│   └── 02-procedural-maps/
│       ├── lesson.yaml
│       └── chapters/
│           ├── 1-functions/
│           │   ├── chapter.yaml
│           │   └── steps/…
│           └── 2-simulation/
│               ├── chapter.yaml
│               └── steps/…
└── sources/          # documents explicitly copied in for the search index (see §7)
```

Step order comes from the numeric filename prefix, not from a manifest. Renumbering is
a rename. Slugs come from the filename with the prefix stripped.

### `lesson.yaml`

```yaml
slug: procedural-maps
number: "02"
title: Creating Procedural Maps
summary: Build maps two ways — functions that evaluate a position, and simulations
  that evolve stored state over time.
shape: nested        # flat | nested
estimatedMinutes: 55
```

`chapter.yaml` is the same minus `shape` and `number` (chapter order comes from the
directory prefix).

### Step frontmatter — full schema

```yaml
---
# Identity ----------------------------------------------------------------
title: Position, function, value        # sentence case, no trailing period
goal: Know why the same coordinate always produces the same value.
                                        # one sentence, what the learner can do after
keywords: [determinism, seed, pure function, coherent noise]
                                        # 3–6. Used by search, tutor retrieval
                                        # weighting, and end-of-chapter review cards.

# Scene -------------------------------------------------------------------
scene:
  demo: noise-terrain       # key in the demo registry; null for prose-only steps
  inset: noise-map          # 2D overlay card key, or omit
  unlock: [seed, frequency] # which controls are visible on this step
  resetCamera: false        # default false — never move the camera unasked
  compare:                  # optional A/B, see design.md §5
    label: Perlin vs Worley
    a: { params: { noiseType: perlin }, caption: Perlin }
    b: { params: { noiseType: worley }, caption: Worley }

# Code (optional) ---------------------------------------------------------
code:
  file: src/scene/demos/proceduralMaps/noiseMath.js
  fn: perlin2d              # preferred — AST extraction by function name
  # region: noise-octaves   # fallback — `// #region <name>` markers in the source
  highlight: [3, 4]         # line numbers RELATIVE to the extracted snippet
  editable: false           # true turns this into a live-edit block (phase 4+)

# Practice (optional) -----------------------------------------------------
practice:
  kind: match               # match | fill | implement — see ai-and-practice.md §5

# Retrieval ---------------------------------------------------------------
refs:
  - content/sources/threejs-react-scene.md#noise
---

Prose in Markdown. Two or three short paragraphs at most.

<Term id="seed">Seed</Term> is supported inline but deferred — see §8.
```

Every field except `title` and `goal` is optional.

### Writing rules for step prose

- 60–200 words. If it runs longer, the step is doing two jobs.
- Speak to someone who has never written code. Name things by what they do.
- The `goal` line is not a summary of the step, it is what the learner can do after it.
- Do not open with "In this step we will…". Start with the idea.
- Technical terms in English, always — the index is English-only.

## 3. Architecture

### Directory layout

```
seedling/
├── CLAUDE.md
├── spec/                     this directory
├── prompts/                  phase prompts for Claude Code
├── content/                  see §2
├── scripts/
│   ├── extract-code.mjs      AST + region extraction → src/generated/snippets.json
│   └── build-index.mjs       chunk + embed → public/rag-index.json
├── api/                      Vercel serverless functions (see ai-and-practice.md §4)
├── public/
│   └── rag-index.json        generated, git-ignored
└── src/
    ├── app/
    │   ├── AppLayout.jsx     canvas host + card + rail + tutor drawer
    │   ├── routes.jsx
    │   └── StepView.jsx      renders one step's MDX + code + practice
    ├── scene/
    │   ├── SceneHost.jsx     THE single <Canvas>. Mounts once.
    │   ├── demoRegistry.js   { [key]: { component, params, defaults } }
    │   └── demos/            per-demo scene components and math
    ├── content/
    │   ├── loader.js         import.meta.glob over content/**, builds the tree
    │   └── mdxComponents.jsx components available inside MDX
    ├── components/           StepCard, CodeBlock, Practice*, Tutor*, Outline…
    ├── store/                zustand stores
    ├── generated/            snippets.json — generated, git-ignored
    └── lessons/              LEGACY. Deleted lesson by lesson as they migrate.
```

### The single canvas (D1)

This is the load-bearing decision. Read it carefully.

```jsx
// AppLayout.jsx — mounted once, for the lifetime of the app
<div className="app">
  <SceneHost />                {/* fixed, full viewport, z-index 0 */}
  <StepCard />                 {/* z-index 10, over the canvas */}
  <TutorDrawer />              {/* z-index 20 */}
</div>
```

```jsx
// SceneHost.jsx
export default function SceneHost() {
  const demoKey = useSceneStore((state) => state.demoKey)
  const Demo = demoRegistry[demoKey]?.component

  return (
    <Canvas shadows camera={{ position: [8, 6, 8], fov: 45 }}>
      <OrbitControls makeDefault />
      {Demo && <Demo key={demoKey} />}
    </Canvas>
  )
}
```

Rules that follow from this:

1. **`<Canvas>` appears exactly once in the codebase.** Never inside a step, a demo, or
   a component. Adding a second one is a spec violation.
2. **Demos swap, the canvas persists.** Switching steps changes `demoKey`, which swaps
   the children. WebGL context, renderer, and camera survive.
3. **The camera is never reset on navigation** unless `scene.resetCamera: true`. If a
   learner has orbited to a nice angle, five steps later it is still that angle.
4. **Parameters live in the store, not in the step.** `scene.unlock` controls which
   sliders are *visible*, not which values exist. Every parameter always has a value.
   A learner who set `seed: 7` in step 3 still has `seed: 7` in step 9. Carrying state
   forward is pedagogically correct — the world is continuous.
5. **2D previews are separate.** `NoiseMapPreview` and friends use a 2D canvas context
   and render into the inset card. They are cheap and may mount and unmount freely.
   They read the same params from the store as the 3D demo, so the two always agree.

### Demo registry

```js
// scene/demoRegistry.js
export const demoRegistry = {
  'noise-terrain': {
    component: NoiseTerrainDemo,
    params: {
      seed:        { type: 'int',   min: 1,  max: 999, step: 1,    default: 42,
                     label: 'Seed' },
      frequency:   { type: 'float', min: 0.2, max: 4,  step: 0.05, default: 1,
                     label: 'Frequency' },
      // …
    },
  },
}
```

A step's `scene.unlock` is a list of these param keys. The control panel renders one
control per unlocked key, reading `type`/`min`/`max`/`label` from here. Steps never
describe what a control looks like.

### Stores (zustand)

| Store | Holds | Persisted |
|---|---|---|
| `sceneStore` | `demoKey`, `insetKey`, `params`, `unlocked`, `compare`, `isRunning` | no |
| `progressStore` | `completedStepIds`, `lastStepId`, `notes`, `practiceResults` | localStorage |
| `tutorStore` | `isOpen`, `messages`, `modelStatus`, `authStatus` | session only |

`progressStore` uses `zustand/middleware` `persist` with key `seedling.progress.v1`.
Version the key — a schema change bumps it rather than corrupting old data.

### Routing

```
/                                        → redirect to last visited step, else 01/first
/lesson/:lessonSlug                      → lesson overview, redirects to first step
/lesson/:lessonSlug/:stepSlug            → a step
```

**Chapters are not in the URL.** They exist in the outline and in the data, but a step
slug is unique within a lesson. This means moving a step between chapters does not
break a bookmark or a tutor citation link. Slugs are stable; treat renaming one as a
breaking change.

Prev/Next walk a flat, ordered array of steps for the lesson, crossing chapter
boundaries transparently. At the last step of a lesson, Next goes to the next lesson's
first step. At the very end, Next becomes a review link.

### Content loading

`content/loader.js` uses `import.meta.glob('../../content/lessons/**/*.mdx', { eager: true })`
plus a glob for the yaml files, and builds:

```js
{
  lessons: [{ slug, number, title, shape, chapters?, steps: [...] }],
  stepsBySlug: Map,        // `${lessonSlug}/${stepSlug}` → step
  flatOrder: [stepId],     // for prev/next
}
```

Frontmatter is parsed at build time by `remark-mdx-frontmatter`, exposed as a named
export `frontmatter` from each MDX module. Validate the frontmatter shape at load time
and throw a readable error naming the file — a typo in a step's yaml should be obvious,
not a blank screen.

## 4. Step rendering (M3)

Within a step card, top to bottom:

```
┌────────────────────────────────┐
│ Lesson 02 · Functions   3 / 11 │   context line + progress
│                                │
│ Position, function, value      │   title
│ Know why the same coordinate…  │   goal
│                                │
│ <prose>                        │   MDX body
│                                │
│ ┌────────────────────────────┐ │
│ │ perlin2d()      noiseMath.js│ │   code block — stacked, always visible
│ │ 1  function perlin2d(x, y) {│ │   when the step has one
│ │ …                           │ │
│ └────────────────────────────┘ │
│                                │
│ [ Try it ]                     │   practice — collapsed block, opens in place
│                                │
│ ┌────────────────────────────┐ │
│ │ Ask about this step      → │ │   I3 inline tutor input
│ └────────────────────────────┘ │
│                                │
│ ← Previous          Next →     │
└────────────────────────────────┘
```

Prose and code are stacked because they explain each other. Practice is a collapsed
disclosure so a step does not *look* long when the learner is not ready for it — but it
is in the flow, not behind a tab, so it cannot be missed.

## 5. Controls

Unlocked parameter controls live in a strip at the bottom of the viewport, over the
canvas and outside the card — because they act on the world, not on the text. When the
card is collapsed, the controls stay.

Each control shows label, current value, and the slider. A newly unlocked control
animates in once (a brief highlight, not a bounce) so the learner notices it appeared.

## 6. Progress and review

- A step is marked complete when the learner navigates away from it having spent >5s,
  or when its practice is passed.
- The outline shows completion per step and per group.
- End of a chapter/lesson: a review screen built from every step's `keywords` and
  `goal`. Front of card = goal phrased as a question, back = keywords + link to step.
  No spaced repetition scheduling. Just a pass through the chapter.

## 7. Search index sources (P-b)

The tutor indexes only what is inside `seedling/`. It never reaches into `../docs/`.

To make a course document searchable, copy it into `content/sources/` as a deliberate
act. `content/sources/README.md` records where each file came from and when it was
last synced. This keeps `docs/planning/backlog.md` and similar out of the index, where
it would only pollute retrieval.

## 8. Deferred

Recorded so they are not forgotten and not built early.

- **Syntax layer for absolute beginners (`<Term>`).** A glossary with hover definitions
  for `useState`, `=>`, `map()` and friends. The `<Term>` component and `keywords`
  field are designed to accommodate it. Build it after real learners have used the site
  and we know what actually confuses them.
- **Supabase accounts and cross-device progress.** After every lesson is written.
- **Mobile.** After the site is content-complete.