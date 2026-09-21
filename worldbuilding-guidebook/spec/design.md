# World Building Guidebook — design spec

## 1. Direction

The subject is terrain: elevation, water, sediment, contour. The visual language comes
from **topographic survey** — map legends, elevation bands, field notebooks — printed
on paper rather than lit on a dark screen. The 3D world fills the viewport and the
interface sits on top of it the way a legend sits on a map: small, precise, deferring
to the thing it explains.

The interface recedes. The terrain does not. Every colour decision is tested against
one question: does this compete with the world behind it?

**Colour is flat.** There are no gradients anywhere in the interface — not on a
surface, not on a button, not behind text, not as a scrim over the canvas. A colour is
one colour. Where something must separate from what is under it, it does so with a
border, a solid fill, or the single shadow in §4, never with a ramp. The only place a
gradient may exist is inside the 3D scene, where elevation genuinely is continuous.

### Anti-goals

Do not produce: a near-black page with one acid-green accent; a deep-blue or navy
interface of any kind; a cream page with a serif display and a terracotta accent; any
gradient fill, glow, or coloured blur; a grid of same-size cards in the same colour
with the same soft shadow; tracked-out ALL-CAPS eyebrow labels; meta strings joined
with middle dots; arrows appended to button text; monospace used decoratively for
small labels.

## 2. Colour

The ground is paper and the ink is near-black. The accents are the terrain's own
hypsometric ramp at full saturation, used as **solid blocks of colour** — the way a map
legend prints its elevation bands — never as tints, washes, or gradients.

```css
:root {
  /* Surfaces — paper, not grey */
  --paper:   #FFFFFF;   /* card, rail, control strip; 0.94 alpha over the canvas */
  --paper-2: #F5F5F9;   /* raised: code blocks, practice panels */
  --paper-3: #EBEBF2;   /* hover, pressed, inset caption */
  --line:    #E2E2EC;   /* borders and dividers — a real colour, never black-alpha */

  /* Ink */
  --ink:       #101014;
  --ink-dim:   #55555F;
  --ink-faint: #626270;

  /* Accents — the elevation ramp, saturated. These FILL. */
  --water:  #C3B2F5;    /* water */
  --moss:   #24D67B;    /* mid ground; practice passed */
  --meadow: #CFF58C;    /* low ground */
  --summit: #FFE05C;    /* high ground; current step, primary action */
  --clay:   #FBA5D0;    /* flagged; practice not yet passing */

  /* Deeps — the same five hues, dark enough to be read. These WRITE. */
  --water-deep:  #2A5FC4;
  --moss-deep:   #086E3C;
  --meadow-deep: #4F7A12;
  --summit-deep: #8A6A00;
  --clay-deep:   #A33470;
}
```

Rules:

- **Accents fill; deeps write.** A `--water` block with `--ink` text on it is correct.
  `--water` as text is not — coloured text and thin coloured strokes take the deep
  variant, which clears AA on paper. This one rule is what keeps a light interface
  legible without inventing a second palette.
- `--ink` on any accent block clears 9.9:1. That is why emphasis here is a fill rather
  than a coloured outline: a 2px `--summit` border is nearly invisible on paper, and a
  `--summit` block is unmissable.
- `--summit` marks the current thing — the current step, the primary action. It is the
  only accent that carries state. The other four carry identity and may repeat freely,
  which is what makes a wall of coloured blocks read as a legend rather than as noise.
- Borders use `--line`. Never `rgba(0,0,0,0.08)` — over a moving colourful canvas,
  black-alpha borders muddy and look dirty.
- Card backgrounds use `--paper` at `0.94` alpha with `backdrop-filter: blur(20px)`. A
  flat alpha is not a gradient. **There is no scrim.** At that opacity `--ink` clears
  16:1 over the darkest terrain and 19:1 over the brightest, so nothing needs to be
  ramped across the canvas to make prose readable — which was the only reason a scrim
  ever existed.
- Body text must clear 7:1 against the card background. Check it, do not assume it.

`TerrainPreview.jsx` and the simulation preview read `--water`, `--moss`, and `--summit` through `readToken.js`. Their legend uses those same tokens. The string, number, and comment text colors were darkened in Phase 3 to clear 4.5:1 on solid `--summit` highlight rows as well as `--paper-2`.

## 3. Type

One superfamily, four roles. IBM Plex is technical without being a default, and its
serif is comfortable for the long prose a beginner needs.

| Role | Family | Use |
|---|---|---|
| Display | **IBM Plex Sans**, 600 | step title, lesson title |
| Prose | **IBM Plex Serif** | goal line, body paragraphs |
| Chrome | **IBM Plex Sans** | outline, buttons, control labels, tabs, tutor UI |
| Data | **IBM Plex Mono** | code, numeric readouts, parameter values |

Self-host via `@fontsource-variable/ibm-plex-*`. No CDN font requests.

```css
--text-xs:  12px;  /* control values, captions */
--text-sm:  14px;  /* chrome, outline */
--text-base:15px;  /* UI default */
--text-body:17px;  /* prose — serif, line-height 1.65 */
--text-lg:  20px;  /* goal line */
--text-xl:  28px;  /* step title */
--text-2xl: 38px;  /* lesson overview title */
```

- Prose measure caps at **64 characters**. The card can be dragged wider than that;
  the prose column does not follow past 64ch, it stays put and the extra width goes to
  code blocks and diagrams. Wide serif prose is unreadable.
- Sentence case everywhere. No ALL-CAPS labels, including the lesson kicker — set
  `Lesson 02` and the chapter title as two separate pieces in Plex Sans at
  `--text-sm`, `--ink-dim`, separated by space and weight rather than a middle dot.
- **The title/goal pair is the signature move**: a plain sans title with a serif italic
  line directly under it. The sans states the thing, the italic serif explains it. Use
  it on the step card and on a lesson overview heading. Do not reach for it a third
  time on the same screen — repeated, it stops being a voice and becomes a template.
- The goal line is set in serif italic at `--text-lg`, `--ink-dim`. It is the one
  typographic flourish in the card; everything else is plain.

## 4. Space and shape

```css
--space-1: 4px;  --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
--space-5: 24px; --space-6: 32px;  --space-7: 48px;  --space-8: 64px;
--radius-sm: 6px;   /* controls, inline code */
--radius-md: 12px;  /* code blocks, practice panels */
--radius-lg: 24px;  /* the card, the inset, the drawer, colour blocks */
```

Three radii, assigned by elevation, not applied uniformly. Pills — nav items, tags, age
chips — are `border-radius: 999px`; that is a shape, not a fourth radius, and it never
applies to a surface holding more than one line of text.

One shadow, used only on elements that float over the canvas:
`--shadow-float: 0 8px 32px rgba(16,16,20,0.10)`. Nothing inside the card gets a
shadow, and **no colour block anywhere gets one** — a block separates by being a
different colour, which is the entire reason to use blocks.

## 5. Layout (N3)

```
┌──────────────────────────────────────────────────────────────┐
│                                                   ┌────────┐ │
│  ┌────────────────────┐                           │ 2D map │ │
│  │ Lesson 02 · 3/11   │                           │ inset  │ │
│  │                    │      3D terrain fills     └────────┘ │
│  │ Step title         │      the entire viewport             │
│  │ goal line          │                                      │
│  │                    │                                      │
│  │ prose              │                                      │
│  │ code block         │                                      │
│  │ [Try it]           │                                      │
│  │ ask about this →   │                                      │
│  │                    │▕                                     │
│  │ ← Prev    Next →   │▕ ← drag handle                       │
│  └────────────────────┘                                      │
│                                                              │
│   [ seed 42 ─●───  frequency 1.0 ──●── ]      control strip  │
└──────────────────────────────────────────────────────────────┘
      ▲ outline rail (collapsed by default, hover or ⌘B)
```

### The card

- Position: left, `--space-5` from the edge, vertically `--space-5` top and bottom.
- Width: default `440px`, draggable `360–760px` via a handle on its right edge.
  Persisted to localStorage (`worldbuilding-guidebook.ui.cardWidth`).
- Collapse: `⌘\` or a chevron collapses the card to a 44px vertical strip showing only
  the step number and prev/next arrows. Persisted. The control strip stays visible.
- The card scrolls internally. **The page never scrolls.** `body { overflow: hidden }`.
- Drag and collapse must both be keyboard-operable and announced (`aria-expanded`,
  and the drag handle as an `role="separator"` with arrow-key resizing).

### The inset (2D map)

- Top-right, `220px` square plus a caption strip, `--radius-lg`, `--shadow-float`.
- Present only when the step declares `scene.inset`. Fades in over 180ms.
- Clicking it swaps it with the background: the 2D map goes full-bleed and the 3D
  terrain becomes the inset. This is a real teaching moment — the two are the same
  numbers — so make the swap a smooth 300ms transform, not a cut.

### The control strip

- Bottom centre, over the canvas, outside the card. Horizontal, `--paper` at 0.94,
  `--radius-lg`.
- One control per unlocked parameter. Label in Plex Sans `--text-xs` `--ink-dim`,
  value in Plex Mono `--text-xs` `--ink`.
- When a step unlocks a new parameter, that control fades in and its label pulses to a
  solid `--summit` fill once over 600ms — a fill, not a text colour, because a yellow
  word on paper does not read. Once. This is the only attention-grabbing motion in the
  app.
- The strip always renders now, even with no unlocked parameters, because the
  viewport toolbar below lives in the same pill. Its own controls still only appear
  once a step unlocks them; a hairline divider separates the two groups, and only
  shows when both are present.

### The viewport toolbar

- The first group in the control strip, before the divider. Acts on the one shared
  canvas rather than a lesson's params, so it is identical and always present on
  every step of every lesson — Rhino's viewport toolbar, not a per-demo control.
- Four toggle-style buttons, same chip styling as the compare toggle and simulation
  controls: **Perspective / Orthographic** (one button, label names the current
  state, click switches to the other), **Wireframe**, **Axes**, and **Recenter** (a
  plain action, not a toggle — it re-fires `cameraResetToken`, the same mechanism a
  step's frontmatter can request).
- Switching projection keeps the framing continuous: the idle camera tracks the
  active one every frame, so toggling back and forth never snaps to a stale pose.
  Wireframe flips every material's `wireframe` flag scene-wide; axes toggles a
  5-unit `axesHelper` at the origin.

### The entity panel

- Right edge, `--space-5` from the edge, same `220px` width as the inset so the two
  read as one column when both are present. Stacks below the inset when the inset is
  in its corner slot this step; otherwise sits at `--space-5` from the top.
- Lesson 01 (scene-anatomy) only, shown once a step unlocks `selectedEntity`. Lists
  every entity with its colour swatch and a one-line property, so the mapping to the
  2D plan's dots is immediate. Clicking a row selects that entity, exactly like
  clicking the mesh itself or its dot on the plan. A per-row eye toggle hides an
  entity from the 3D scene and the plan, to see past it.
- `--paper` at 0.94, `--radius-lg`, `--shadow-float`, same floating treatment as the
  inset and the control strip. `--z-panel` (13) sits between the inset (12) and the
  control strip (15).

### The outline rail

- Left edge, 48px collapsed, 280px expanded on hover or `⌘B` (pinnable).
- Two levels for nested lessons, one for flat. The current step sits on a solid
  `--summit` block; completed steps carry a small filled `--moss` dot.
- Numbering is used because steps genuinely are a sequence. Do not number anything
  that is not.

## 6. Comparison (Q3)

No split-screen, no dual viewport. A step with `scene.compare` gets:

- A two-position toggle in the control strip labelled with the captions (`Perlin` /
  `Worley`). Clicking, or pressing `←`/`→` while it is focused, swaps the params.
- Between the two states the 3D geometry morphs over 400ms rather than cutting, so the
  learner sees *what changed* rather than two unrelated pictures.
- If the step also has an inset, the inset gets a draggable vertical split showing A on
  the left of the divider and B on the right, implemented with CSS `clip-path` over two
  stacked 2D canvases. The 2D map is where side-by-side comparison actually works.

## 7. Code blocks

- Surface `--paper-2`, `--radius-md`, no shadow, no border.
- Header line: function name in Plex Mono `--ink`, source filename right-aligned in
  Plex Sans `--text-xs` `--ink-faint`. The filename is a quiet claim that this code
  is real — do not decorate it.
- Line numbers in `--ink-faint`, `user-select: none`.
- Highlighted lines get a solid `--summit` background across the full line width.
  Non-highlighted lines are not dimmed — dimming makes context unreadable, and context
  is why we show a whole function.
- Syntax theme: build a custom Shiki theme from these tokens rather than shipping
  `github-light`. Keywords `--water-deep`, strings `--moss-deep`, numbers
  `--clay-deep`, comments `--ink-faint` italic, identifiers `--ink`. All five read on
  `--paper-2` and on a `--summit` highlight row — check the highlight row, it is the
  one that catches people out.
- Selecting text inside a code block raises the "Explain this" affordance (see
  `ai-and-practice.md` §3). It appears at the selection, not in a corner.

## 8. Motion

One orchestrated moment: the step transition.

- Card content cross-fades and rises 8px over 220ms, `cubic-bezier(0.2, 0, 0, 1)`.
- The canvas does not transition. It is continuous. That continuity is the point.
- Everything else is response-to-action only: disclosure opening, drawer sliding,
  compare morphing, inset swapping.
- No hover transitions on cards. No entrance animations on sections.
- `@media (prefers-reduced-motion: reduce)` removes all of it, including the compare
  morph (which becomes a cut) and the inset swap.

## 9. Quality floor

Non-negotiable, and not announced in the UI:

- Visible keyboard focus on every interactive element, using `--ink` at 2px width and
  2px offset. Not `--summit` — a yellow ring vanishes on paper, and the ring has to
  hold up on every surface in the app, including the accent blocks, where `--ink`
  clears 9.9:1.
- Full keyboard navigation: `←`/`→` for prev/next step, `⌘B` outline, `⌘\` card,
  `⌘K` tutor, `Esc` closes any overlay.
- All colour pairings checked against WCAG AA; body prose against AAA.
- No text over raw canvas. Every word in the app sits on `--paper` or on an accent
  block — that, not a scrim, is how contrast is guaranteed here.