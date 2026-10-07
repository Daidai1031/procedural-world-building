# Exercise 08 — Spline Layer

**Date:** 2026-10-07  
**Course section:** Lesson 06 — Paths (Splines & Terrain)  
**Project:** [`worldbuilding-guidebook`](../../worldbuilding-guidebook/)  
**Lesson content:** [`content/lessons/06-paths/`](../../worldbuilding-guidebook/content/lessons/06-paths/)  
**Status:** Planned — lesson text written for all 6 steps; no scene, control, practice, or algorithm implemented yet

## Exercise goal

Build a spline layer whose meaning is stated, project it onto terrain, and show how the path and the terrain influence each other. The course assignment asks for:

| Requirement | Planned evidence | Status |
| --- | --- | --- |
| Explain what a spline layer or line represents | named nodes and direction (Step 01); stated meaning of the generated road (Step 06) | Not started |
| Project 2D lines onto 3D terrain | sampled, height-queried route (Step 04) | Not started |
| Explore influence between spline and mesh | road reshapes terrain; terrain cost chooses the route (Steps 05–06) | Not started |

**Completion rule:** the lesson text and this plan do not satisfy the assignment. Change a step's status only after the step is built, checked in the running app, and its observed result is written into that step's **Result** line.

## How this plan is used

- Start after Lesson 05 ([Exercise 07](./07-scattering-system.md)). Build one step at a time, only when the author asks; check, look, explain, stop.
- A large step may be split into sub-tasks; record the split under the step.
- Status values: **Not started** → **In progress** → **Done** (with a measured result).

## Step status

| Step | Lesson file | Status |
| --- | --- | --- |
| 01 · Points become paths | [`01-points-become-paths.mdx`](../../worldbuilding-guidebook/content/lessons/06-paths/steps/01-points-become-paths.mdx) | Not started |
| 02 · From lines to splines | [`02-from-lines-to-splines.mdx`](../../worldbuilding-guidebook/content/lessons/06-paths/steps/02-from-lines-to-splines.mdx) | Not started |
| 03 · Sampling a curve | [`03-sampling-a-curve.mdx`](../../worldbuilding-guidebook/content/lessons/06-paths/steps/03-sampling-a-curve.mdx) | Not started |
| 04 · Projecting onto terrain | [`04-projecting-onto-terrain.mdx`](../../worldbuilding-guidebook/content/lessons/06-paths/steps/04-projecting-onto-terrain.mdx) | Not started |
| 05 · Paths and terrain influence each other | [`05-paths-and-terrain-influence-each-other.mdx`](../../worldbuilding-guidebook/content/lessons/06-paths/steps/05-paths-and-terrain-influence-each-other.mdx) | Not started |
| 06 · Build a spline layer | [`06-build-a-spline-layer.mdx`](../../worldbuilding-guidebook/content/lessons/06-paths/steps/06-build-a-spline-layer.mdx) | Not started |

Each MDX file has only `title`, `goal`, `keywords`, and prose ending in a "planned but not built yet" line. Add `scene`, `code`, and `practice` frontmatter when the step is built, and remove that line.

## Starting point in the repository

Reusable:

- The scene seams, `scene.compare`, `scene.legend`, insets, code extraction, and `fill` practice described in [Exercise 07](./07-scattering-system.md#starting-point-in-the-repository).
- **The Lesson 05 terrain module** (suggested `src/scene/demos/distributions/terrain.js`, built in Exercise 07 Step 01) for `heightAt(x, z)`. Reuse it rather than writing a second height field. If Lesson 05 is not built when this starts, build that terrain module first.
- Three.js `CatmullRomCurve3`, `Curve.getPoints()`, `Curve.getSpacedPoints()`, `Curve.getLengths()` — no new dependency.

Not reusable without new work:

- **`match` practice** is wired to noise-map params only (see Exercise 07). Step 02 needs the general match path if Exercise 07 built one, or a different practice kind.
- **`implement` practice** has no scorer for routes. Step 06 is manual acceptance unless a scorer is added.

Constraints: one `<Canvas>`; prose in MDX only; prefix params with `path` (for example `pathSampleCount`) because `getDefaultParams()` rejects duplicate keys; the **path seed** stays separate from terrain and scatter seeds.

## Suggested file layout

All paths are **suggestions**:

| File | Purpose |
| --- | --- |
| `src/scene/demos/paths/pathMath.js` | ordering, curve build, sampling, spacing measurements, projection, route cost, terrain blend; pure functions |
| `src/scene/demos/paths/params.js` | control definitions |
| `src/scene/demos/paths/PathDemo.jsx` | nodes, polyline, spline, markers, projected route, reshaped terrain |
| `scripts/paths.test.mjs` | node tests |

Suggested demo key: `path-terrain`.

---

## Step 01 · Points become paths

**Status:** Not started

**Understand.** A path is an ordered connection. The same points in a different order make a different route. A line has no width, material, or junction rules until a system gives it meaning; an arrow is not a simulation.

**Planned scene and controls.** Three named nodes A, B, C on flat ground; **Order** (A→B→C / alternate); direction arrows.

**Learner does / observes.** Switch order: the same points, a different line and end point. Arrows show direction only.

**Practice (planned).** Kind: `fill`. Prompt: to travel from A through B to C, complete `[A, ____, C]`. Options: `B`; `A`; `C`. Hint: connectivity includes the order of the positions. Answer: `B`. Explanation: a list becomes a path when the system uses that order to connect or traverse it.

**Minimum implementation.** Node positions as data; a `Line` built from the ordered list; cone arrows at segment midpoints; node labels drawn as small 3D markers with names in the legend (keeping text off the canvas, as other lessons do). A `#region` around the ordered list for the fill.

**Depends on.** Scene seams only. Flat ground, no terrain yet.

**Files.** New (suggested): `pathMath.js`, `params.js`, `PathDemo.jsx`, `paths.test.mjs`. Modified: `demoRegistry.js`, `demoParams.js`, Step 01 MDX.

**Acceptance.**
- Test: the ordered list produces segments in that order; switching order changes the segment list but not the point set.
- Screenshot of both orders; `npm run lint`, `npm test`, `npm run build` pass.

**Result.** —

**Next step adds.** A Catmull–Rom spline over the same points, next to the polyline.

---

## Step 02 · From lines to splines

**Status:** Not started

**Understand.** A polyline joins points with straight segments; a Catmull–Rom spline passes through its control points; Bézier handles are not passed through. Moving one point changes two polyline segments but a curved region of the spline. Smoothing can overshoot.

**Planned scene and controls.** Polyline / spline comparison; offsets for a selected control point; control-polygon overlay; marked obstacle. Interpolation type fixed.

**Learner does / observes.** Move the middle point: the polyline changes two segments; the spline bends over a wider region; sharp turns show overshoot.

**Practice (planned).** Kind: `match`. Prompt: move the middle control point so the curve bends around the marked obstacle in the flat test scene. Hint: change the curve's defining data, not the camera. Answer: the displayed target point position, within tolerance. Explanation: a manual experiment in curve behaviour; procedural control points come in Step 06.

**Minimum implementation.** `CatmullRomCurve3` from the points; middle-point offset params `pathControlOffsetX`, `pathControlOffsetZ`; obstacle marker and target marker; overlay toggle.

**Depends on.** Step 01. A general `match` path (from Exercise 07) or a decision to defer the practice.

**Files.** Modify `pathMath.js`, `params.js`, `PathDemo.jsx`, Step 02 MDX, tests; practice files if match is generalised here.

**Acceptance.**
- Test: the spline passes through every control point (sample at the control-point parameters, error below 1e-6).
- Test: the curve's minimum distance to the obstacle centre exceeds the obstacle radius at the target offset.

**Result.** —

**Next step adds.** Placing markers along the curve by parameter and by arc length.

---

## Step 03 · Sampling a curve

**Status:** Not started

**Understand.** Equal parameter steps are not equal distances. Arc-length sampling (`getSpacedPoints`) is approximately even. N divisions give N + 1 points. Marker count is separate from control-point count. Projection can change ground spacing later.

**Planned scene and controls.** **Sampling** (Parameter / Arc length); **Marker count**; spacing measurements. No terrain projection.

**Learner does / observes.** On a tight curve, parameter markers bunch and spread; arc-length markers stay nearly even. The measured spacing spread shrinks in arc-length mode.

**Practice (planned).** Kind: `fill`. Prompt: select the call for more uniform marker spacing, `curve.____(20)`. Options: `getPoints`; `getSpacedPoints`. Hint: choose the method that accounts for distance along the curve. Answer: `getSpacedPoints`. Explanation: 20 divisions → 21 points including endpoints; uniform spacing on the source curve can change after projection onto uneven terrain.

**Minimum implementation.** Both sampling calls in a `#region`; markers as instanced spheres; spacing statistics (minimum, maximum, ratio) shown as a readout (suggested: legend item or `aria-live` label).

**Depends on.** Step 02 curve.

**Files.** Modify `pathMath.js`, `params.js`, `PathDemo.jsx`, Step 03 MDX, tests.

**Acceptance.**
- Test: both calls return count + 1 points; on the reference curve, the max/min spacing ratio is measurably lower for `getSpacedPoints` (record both numbers here).

**Result.** —

**Next step adds.** Terrain under the path, and projecting samples onto it.

---

## Step 04 · Projecting onto terrain

**Status:** Not started

**Understand.** Projection: sample the x–z path, query `heightAt(x, z)`, set y, add a small offset. Sparse samples cut through bumps. Height lookup works only for height fields; overhangs and spheres need raycasting. A spline through projected points must be rechecked.

**Planned scene and controls.** Unprojected / projected route; **Projection samples**; **Line offset**. Fixed terrain.

**Learner does / observes.** Few samples: segments dip into hills. More samples: the line hugs the ground. Unprojected line floats at y = 0 through terrain.

**Practice (planned).** Kind: `fill`. Prompt: complete the projected point, `new Vector3(x, ____, z)`. Options: `heightAt(x, z) + offset`; `offset`; `heightAt(x, y)`. Hint: the source path supplies x and z; the terrain supplies height. Answer: `heightAt(x, z) + offset`. Explanation: a constant offset cannot follow hills; sampling with y uses the wrong map coordinates.

**Minimum implementation.** Reuse the Lesson 05 terrain mesh and `heightAt`; `projectSamples(points, heightAt, offset)` in a `#region`; a measurement of the worst depth below the surface between samples (check midpoints of each segment against `heightAt`).

**Depends on.** Step 03; Exercise 07 Step 01 terrain module.

**Files.** Modify `pathMath.js`, `params.js`, `PathDemo.jsx`, Step 04 MDX, tests. Import (not copy) the terrain module.

**Acceptance.**
- Test: every projected sample has y = `heightAt(x, z) + offset`.
- Test: the worst below-surface depth at segment midpoints decreases as sample count rises (record values for at least three counts).

**Result.** —

**Next step adds.** The road changes the terrain, and terrain cost chooses between routes.

---

## Step 05 · Paths and terrain influence each other

**Status:** Not started

**Understand.** Following is not altering. Path → terrain: blend height toward a road profile with `lerp(originalHeight, roadHeight, influence)`, influence 1 inside the road, falling to 0 across the shoulder. Terrain → path: compare candidate routes by a cost and pick the cheaper one. A lowered channel does not make a river flow.

**Planned scene and controls.** Follow terrain / Reshape terrain (A/B); **Road width**; **Shoulder width**; route-cost overlay; two candidate routes with their scores.

**Learner does / observes.** In reshape mode the ground under the road flattens across its width but still climbs along it; wider shoulders soften the edge. The cost overlay shows why one route scores lower.

**Practice (planned).** Kind: `fill`. Prompt: blend the original height toward the road profile, `lerp(originalHeight, roadHeight, ____)`. Options: `influence`; `distanceToRoad`; `roadWidth`. Hint: the blend weight should be near 1 at the road and fade to 0 outside its influence band. Answer: `influence`, normalised to 0–1. Explanation: raw distance has the opposite tendency and the wrong range; this is one path-to-terrain effect, the route comparison shows terrain-to-path.

**Minimum implementation.** Distance from each terrain vertex to the sampled centerline (nearest segment); road profile = smoothed projected heights along the route; influence via `smoothstep` across the shoulder; a deformed copy of the terrain geometry (original kept for A/B); route cost = sum of absolute grade or total climb over samples.

**Depends on.** Step 04.

**Files.** Modify `pathMath.js`, `params.js`, `PathDemo.jsx`, Step 05 MDX, tests.

**Acceptance.**
- Test: influence = 1 within road width / 2, 0 beyond road width / 2 + shoulder width, monotonic between.
- Test: vertices outside the band are unchanged; the original height field is untouched.
- Test: the route with the lower cost is the one selected; record both scores.

**Result.** —

**Next step adds.** Routes generated from a seed and rules, with failure reporting.

---

## Step 06 · Build a spline layer

**Status:** Not started

**Understand.** Endpoints are sites; seeded lateral offsets propose intermediate points; a terrain cost chooses among candidates; attempts are limited and failure is reported. Generation, projection, and deformation stay separate stages. The spline stores shape; meaning comes from the system.

**Planned scene and controls.** **Path seed**; **Candidate routes**; **Maximum grade** or cost preference; **Projection samples**; **Road width** / **Shoulder width**; control-point and influence overlays.

**Learner does / observes.** Change the path seed: a new route from the same rules. Tighten maximum grade: some seeds fail with a visible "no valid route" state instead of a bad road.

**Practice (planned).** Kind: `implement` / Assignment 2. Task: build one rule-generated road spline; project its samples onto terrain; demonstrate a terrain-informed route decision; show local terrain modification around the road. Hint: keep generation, projection, and deformation as separate stages so each can be inspected. Acceptance criteria: explain the line's meaning; show control points and samples; demonstrate 2D-to-3D projection; demonstrate at least one direction of influence between spline and terrain; reproduce a route from its seed and settings. Graphs, junctions, and road networks are later extensions.

**Minimum implementation.** `generateRoutes({ seed, count, endpoints, offsetRange })`; `selectRoute(routes, cost, maxGrade)` returning a route or a failure reason; recheck on deformed ground. No new scorer: record this assignment as manual acceptance unless the author asks for one.

**Depends on.** Steps 01–05; seeded random from Exercise 07 (`random.js`, suggested).

**Files.** Modify `pathMath.js`, `params.js`, `PathDemo.jsx`, Step 06 MDX, tests, and this file (meaning statement and observations).

**Acceptance.**
- Test: same seed and settings → identical control points and selected route.
- Test: with an impossible maximum grade, selection returns failure within the attempt limit.
- Screenshots of the stages; meaning of the line written below.

**Result.** —

**Next step adds.** Lesson 06 complete; continue with [Exercise 09 — Particle system](./09-particle-system.md).

### Meaning of the line — fill when Step 06 is built

| Question | Answer |
| --- | --- |
| What does the line represent? | — |
| What does it change in the terrain? | — |
| What in the terrain changes it? | — |

## Learning resources

- [Three.js Curve](https://threejs.org/docs/pages/Curve.html) — parameter and arc-length sampling.
- [Three.js Raycaster](https://threejs.org/docs/pages/Raycaster.html) — surface queries for non-height-field meshes.
- [Three.js Vector3](https://threejs.org/docs/pages/Vector3.html) — vector operations.
