# Exercise 07 — Scattering System

**Date:** 2026-10-07  
**Course section:** Lesson 05 — Distributions (Scattering & Populations)  
**Project:** [`worldbuilding-guidebook`](../../worldbuilding-guidebook/)  
**Lesson content:** [`content/lessons/05-distributions/`](../../worldbuilding-guidebook/content/lessons/05-distributions/)  
**Status:** In progress — Steps 01–02 have a scene, controls, and tests (practice deferred); Steps 03–08 are lesson text only

## Exercise goal

Populate a terrain with several asset types, each placed by an explicit, inspectable protocol. The course assignment asks for:

| Requirement | Planned evidence | Status |
| --- | --- | --- |
| Populate terrain with different assets | trees, bushes, and rocks on one terrain (Steps 01, 07, 08) | Not started |
| Independent control layers and asset protocols | per-layer settings and a written protocol per layer (Steps 04–08) | Not started |
| Terrain-driven size, colour, density, or other variation | noise-driven probability, moisture-driven scale and colour (Steps 03, 07, 08) | Not started |

**Completion rule:** the lesson text and this plan do not satisfy the assignment. Change a step's status only after the step is built, checked in the running app, and its observed result is written into that step's **Result** line.

## How this plan is used

- Steps are built **one at a time, in order**, and only when the author asks for that step. After each step: run checks, look at the scene, explain the result, then stop.
- A step that is too large may be split into sub-tasks (for example 01a scene, 01b practice). Record the split under the step.
- Status values: **Not started** → **In progress** → **Done** (with a measured result). Nothing in this file is Done yet.
- Lesson 05 is built before Lesson 06 ([Exercise 08](./08-spline-layer.md)) and Lesson 07 ([Exercise 09](./09-particle-system.md)).

## Step status

| Step | Lesson file | Status |
| --- | --- | --- |
| 01 · From one asset to many | [`01-from-one-asset-to-many.mdx`](../../worldbuilding-guidebook/content/lessons/05-distributions/steps/01-from-one-asset-to-many.mdx) | In progress (scene done, practice deferred) |
| 02 · Randomness and seeds | [`02-randomness-and-seeds.mdx`](../../worldbuilding-guidebook/content/lessons/05-distributions/steps/02-randomness-and-seeds.mdx) | In progress (scene done, practice deferred) |
| 03 · Noise creates patches | [`03-noise-creates-patches.mdx`](../../worldbuilding-guidebook/content/lessons/05-distributions/steps/03-noise-creates-patches.mdx) | Not started |
| 04 · Reading terrain maps | [`04-reading-terrain-maps.mdx`](../../worldbuilding-guidebook/content/lessons/05-distributions/steps/04-reading-terrain-maps.mdx) | Not started |
| 05 · Surface orientation | [`05-surface-orientation.mdx`](../../worldbuilding-guidebook/content/lessons/05-distributions/steps/05-surface-orientation.mdx) | Not started |
| 06 · Filtering by slope | [`06-filtering-by-slope.mdx`](../../worldbuilding-guidebook/content/lessons/05-distributions/steps/06-filtering-by-slope.mdx) | Not started |
| 07 · Layers and variation | [`07-layers-and-variation.mdx`](../../worldbuilding-guidebook/content/lessons/05-distributions/steps/07-layers-and-variation.mdx) | Not started |
| 08 · Build a population | [`08-build-a-population.mdx`](../../worldbuilding-guidebook/content/lessons/05-distributions/steps/08-build-a-population.mdx) | Not started |

Each MDX file currently has only `title`, `goal`, `keywords`, and prose ending in a "planned but not built yet" line. It has no `scene`, `code`, or `practice` frontmatter, so the app shows the text with an empty canvas. When a step is implemented, add its frontmatter and remove that closing line.

## Starting point in the repository

Reusable as-is (checked 2026-10-07):

- **Scene seams.** [`demoRegistry.js`](../../worldbuilding-guidebook/src/scene/demoRegistry.js) maps a demo key to a component; [`demoParams.js`](../../worldbuilding-guidebook/src/scene/demoParams.js) holds control definitions; [`sceneStore.js`](../../worldbuilding-guidebook/src/store/sceneStore.js) carries params; [`ControlStrip.jsx`](../../worldbuilding-guidebook/src/components/ControlStrip.jsx) renders `float`, `select`, and `boolean` params. A step opens a demo with `scene.demo` and exposes controls with `scene.unlock`.
- **A/B comparison.** `scene.compare` (used by Voxels Step 02 and Shader Step 07) switches between two param sets. Usable for uniform-versus-noise (Step 03) and random-versus-terrain variation (Step 07).
- **Legend panel.** `scene.legend` with colour-token swatches, for overlay keys and accepted/rejected dot colours.
- **Insets.** [`insetRegistry.js`](../../worldbuilding-guidebook/src/scene/insetRegistry.js) and [`insets/NoiseMap.jsx`](../../worldbuilding-guidebook/src/scene/insets/NoiseMap.jsx) show a 2D map beside the 3D scene; a model for the distribution-map overlay.
- **Terrain and noise.** `sampleProceduralMap(x, y, settings)` and `DEFAULT_MAP_SETTINGS` in [`noiseMath.js`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/noiseMath.js) give a seeded 0–1 height or mask value; `elevationColors` / `heightColor` in [`worldPalette.js`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/worldPalette.js) colour terrain from design tokens.
- **Code extraction.** `#region` markers in source plus `code:` in frontmatter ([`extract-code.mjs`](../../worldbuilding-guidebook/scripts/extract-code.mjs)). Learner code must come from real source, never hand-copied.
- **`fill` practice** works for any real `#region` (`practice.from`, `blanks`, `options`, `explanation`, `hint`). [`phase4b.test.mjs`](../../worldbuilding-guidebook/scripts/phase4b.test.mjs) checks every fill against its source, and requires `practice.from` to differ from the step's `code` region.

Not reusable without new work:

- **`match` practice** in [`Practice.jsx`](../../worldbuilding-guidebook/src/practice/Practice.jsx) reads only noise-map `map*` params through `mapSettingsFromParams` and `matchDistance`; `phase4b.test.mjs` only accepts match tasks in Lesson 02 chapter 1. Steps 01 and 02 need a general "match these scene params" path, or a different practice kind. **Decide this at Step 01.**
- **`implement` practice** only scores `shapeValue` and `fractalNoise`. Steps 05 and 08 need their own checks, or are recorded as manual acceptance (see those steps).
- **Seeded random.** `hash2D` in `noiseMath.js` is private. A small seeded generator is new code.

Constraints to keep:

- One `<Canvas>` for the whole app; the new demo mounts under `SceneHost`.
- Lesson text stays in MDX; no teaching sentences in `src/`.
- `getDefaultParams()` throws if two demos define the same param key differently. Prefix every new key, for example `scatterCandidateCount`.
- Keep terrain seed, scatter seed, and (later) path seed separate. Use a small fixed height-field terrain; spherical-planet adaptation stays in wrap-ups.

## Suggested file layout

All paths are **suggestions** until Step 01 is built:

| File | Purpose |
| --- | --- |
| `src/scene/demos/distributions/random.js` | seeded generator (for example mulberry32) |
| `src/scene/demos/distributions/terrain.js` | fixed height field: `heightAt(x, z)`, `normalAt(x, z)`, later moisture and water distance |
| `src/scene/demos/distributions/scatter.js` | candidates, acceptance rules, transforms; pure functions only |
| `src/scene/demos/distributions/params.js` | control definitions |
| `src/scene/demos/distributions/ScatterDemo.jsx` | terrain mesh, candidate dots, instanced assets |
| `scripts/distributions.test.mjs` | node tests for the pure functions |

Register the demo in `demoRegistry.js` and its params in `demoParams.js` (demo key suggestion: `scatter-terrain`).

---

## Step 01 · From one asset to many

**Status:** In progress — scene, controls, code snippet, and tests built (2026-10-07). Practice deferred to a later sub-task 01b by the author's choice; the step text says so.

**Understand.** An asset is the reusable object; an instance is one placed copy with its own position, rotation, and scale. Candidate count and asset scale are independent. Candidates are uniform in the x–z footprint, which is not uniform over true surface area on slopes.

**Planned scene and controls.** Fixed terrain and fixed layout seed. Candidate dots; a rocks on/off toggle; **Candidate count**; **Asset scale** (uniform). No filters.

**Learner does / observes.** Raise Candidate count with Asset scale fixed: more dots and rocks appear, every rock the same size. Each rock's base sits on its dot.

**Practice (planned).** Kind: `match`. Prompt: place 200 rocks without changing the size of any rock. Hint: change the number of candidate positions, not the transform of the asset. Answer: Candidate count = 200, scale at its starting value. Explanation: position count and object scale control different properties; the fixed terrain gives valid height samples for every candidate.

**Minimum implementation.**
1. `random.js`: seeded generator returning values in [0, 1).
2. `terrain.js`: `heightAt(x, z)` from `sampleProceduralMap` with fixed settings, plus a terrain mesh built from it.
3. `scatter.js`: `generateCandidates({ count, seed, size })` → x, z uniform over the footprint; y = `heightAt(x, z)`.
4. `ScatterDemo.jsx`: terrain mesh, candidate dots, one `InstancedMesh` of a simple rock with its base offset so it rests on the point.
5. Params: `scatterCandidateCount`, `scatterAssetScale`, `scatterShowAssets`. Register demo and params.
6. Step 01 frontmatter: `scene.demo`, `scene.unlock`, a legend for dot and rock.
7. Practice: decide between generalising `match` to arbitrary param targets or deferring the practice to a sub-task 01b. Either way, no dead button.

**Depends on.** Nothing new; reuses `noiseMath.js`, the scene seams, and `worldPalette.js`.

**Files.** New (suggested): `random.js`, `terrain.js`, `scatter.js`, `params.js`, `ScatterDemo.jsx`, `scripts/distributions.test.mjs`. Modified: `demoRegistry.js`, `demoParams.js`, `05-distributions/steps/01-from-one-asset-to-many.mdx`. If `match` is generalised: `Practice.jsx`, `scoring.js`, `phase4b.test.mjs`.

**Acceptance.**
- Node test: `count` candidates come back; same seed → identical positions; every y equals `heightAt(x, z)`.
- Changing Candidate count leaves every instance scale unchanged (checked from instance matrices, not by eye).
- Screenshot at two counts: rocks rest on the ground, none floating or buried.
- `npm run lint`, `npm test`, `npm run build` pass; other lessons still open.

**Decisions made at this step (2026-10-07).**
- Practice: **deferred** (author's choice), so `match` was not generalised yet. The step closes with "The practice for this step is planned but not built yet."
- Terrain: the Lesson 03/04 ground (`groundHeight` in `voxelMath.js`, world size 6), read directly as a height field instead of through a voxel grid, so every candidate gets the exact height. Drawn as a 96 × 96 grid plus four walls down to y = 0, coloured with the same elevation ramp.
- Rock: one procedural low-poly rock (icosahedron, detail 1, noise-pushed vertices, flattened, flat-shaded) shared by every instance; switch to a glTF model if it does not look good enough. Its base is sunk by 25 % of its height so the downhill side does not show a gap on slopes. New colour token `--scatter-rock`.
- Candidates are drawn inside 94 % of the footprint so no rock overhangs a wall. Candidate count 0–400 (step 10, default 50); Asset scale 0.5–2 (default 1).
- Instanced meshes are allocated once at 400 and drawn with `mesh.count`, so changing the count never rebuilds a mesh.
- Code snippet: `generateCandidates` in `scatter.js`.
- Shared fix: the control strip was capped at half the viewport width by `left: 50%`, so the fourth control scrolled out of view; `width: max-content` added in `ControlStrip.css`.

**Result.** Built; practice still open. `scripts/distributions.test.mjs` (7 tests) passes: the requested count comes back, every y equals `heightAt(x, z)`, instance matrices keep scale 1.3 and the candidate position at counts 10, 200, and 400. Screenshots at 1440 × 900 with counts 50 and 200 and scale 1 and 2: more rocks appear at 200 with no size change, every rock sits on the ground with none floating or buried, and turning off **Show rocks** leaves only the candidate dots. No console errors. `npm run lint` and `npm run build` pass; `npm test` has 1 failure, the Lesson 02 content test that already failed before this change.

**Next step adds.** A visible scatter seed, separate from the terrain seed, and the rule that layouts are rebuilt only when inputs change.

---

## Step 02 · Randomness and seeds

**Status:** In progress — scene, controls, code snippet, and tests built (2026-10-07). Practice deferred, as for Step 01.

**Understand.** A seed makes a random sequence repeatable. Reproducing a layout also needs the same algorithm, settings, and draw order. Terrain seed and scatter seed are separate inputs. Random values are drawn on rebuild, never per frame. A stable draw order lets extra candidates add to a layout instead of reshuffling it.

**Planned scene and controls.** **Scatter seed**; **Regenerate**; **Restore reference seed**. Terrain seed locked. Candidate dots optional.

**Learner does / observes.** Change only the scatter seed: rocks move, hills do not. Restore seed 42: the reference layout returns. Raise the candidate count: the first candidates stay where they were.

**Practice (planned).** Kind: `match`. Prompt: reproduce the reference layout using seed 42, with the original count and terrain. Hint: restore the inputs to the generator, not the camera angle. Answer: Scatter seed = 42, original parameters restored. Explanation: a seed alone is not a saved scene; repeatability also depends on the algorithm and the order in which values are consumed.

**Minimum implementation.** `scatterSeed` param and a reference-seed action. Draw x then z for each candidate in a fixed order so a larger count extends the same sequence; if rotation or scale draws are added later, take them from a separate stream or in a fixed position so they do not shift positions. Rebuild candidates in `useMemo` keyed on seed and count only.

**Depends on.** Step 01 generator and demo. A general `match` path if Step 01 built one.

**Files.** Modify `scatter.js`, `params.js`, `ScatterDemo.jsx`, Step 02 MDX, `distributions.test.mjs`.

**Acceptance.**
- Test: seed 42 twice → identical arrays; seed 43 → different; count 200 starts with the same 100 positions as count 100.
- Terrain mesh vertices unchanged when the scatter seed changes.
- No random call inside `useFrame` (code review).

**Decisions made at this step (2026-10-07).**
- No Regenerate or Restore button: the strip has no button control type, so **Scatter seed** is a 1–100 slider with its value shown, defaulting to the reference seed 42. Dragging back to 42 restores the layout.
- The terrain has no seed control; it is fixed in `voxelMath.js`.
- Unlocks Scatter seed, Candidate count, and Show rocks. Code snippet: `createRandom` (mulberry32) in `random.js`.

**Result.** Built; practice still open. Tests: seed 42 twice gives identical candidates, seed 43 a different set, the first 100 of count 200 equal count 100, and the terrain vertices are unchanged after generating with another seed. Random values are drawn only inside `useMemo` keyed on count and seed; there is no `useFrame` in the demo. Screenshots at seed 42 and 43: the rocks move and the hills do not.

**Next step adds.** An acceptance probability that varies across space (noise mask).

---

## Step 03 · Noise creates patches

**Status:** Not started

**Understand.** A noise map turns a constant acceptance chance into a spatially related one. `probability = noise × density`; a candidate is accepted when `randomValue < probability`. Frequency sets patch size; density sets how much of each patch fills.

**Planned scene and controls.** Uniform / noise A/B comparison (`scene.compare`); distribution-map overlay; **Noise frequency**; **Density**. Both sides use the same candidates and the same acceptance random values.

**Learner does / observes.** Lower frequency → larger patches. Raise density → more accepted, patches stay put. Overlay shows the clusters sit on bright areas of the map.

**Practice (planned).** Kind: `fill`. Prompt: complete the acceptance test `randomValue < ____`. Options: `probability`; `1 - probability`; `noiseFrequency`. Hint: a larger placement probability should accept more values from the 0–1 random interval. Answer: `probability`. Explanation: frequency controls pattern size, not acceptance; the complement would populate low-probability regions more.

**Minimum implementation.** A separate seeded mask noise (own seed) sampled with `sampleProceduralMap`/`fractalNoise`; a second random stream for acceptance values, fixed per candidate so A/B is fair; accepted versus candidate counts; `#region` around the acceptance test for the fill; a map inset or ground overlay.

**Depends on.** Steps 01–02. Reuses `fractalNoise`, `scene.compare`, the inset registry, and the existing `fill` practice.

**Files.** Modify `scatter.js`, `params.js`, `ScatterDemo.jsx`, Step 03 MDX (`scene`, `code`, `practice`). Suggested new inset: `src/scene/insets/DistributionMap.jsx`, registered in `insetRegistry.js`.

**Acceptance.**
- Test: density 0 → 0 accepted; density 1 with noise ≡ 1 → all accepted; the same candidate keeps the same acceptance value across frequency changes.
- Screenshot of both A/B sides with the same candidate count; patches visible on the noise side only.
- `phase4b.test.mjs` passes with the new fill.

**Result.** —

**Next step adds.** Rules that read terrain data (moisture, distance to water, height) instead of a free noise mask.

---

## Step 04 · Reading terrain maps

**Status:** Not started

**Understand.** Terrain data can be a stored grid or a function. A placement rule reads conditions at each candidate. Reeds: accept only when `distanceToWater < shoreBand && height > waterLevel`. Noise moisture is an artistic control, not a physical model.

**Planned scene and controls.** Height / moisture / distance-to-water overlays; **Shore band** (maximum shore distance); **Water level**; unrestricted versus near-water placement.

**Learner does / observes.** Widen the shore band → reeds spread inland. Raise the water level → the band moves with the shoreline; no reed appears below the water surface.

**Practice (planned).** Kind: `fill`. Prompt: finish the rule `distanceToWater < shoreBand ____ height > waterLevel`. Options: `&&`; `||`. Hint: both conditions must be true for a reed to appear. Answer: `&&`. Explanation: OR would accept a reed far from water because it is above water level, or a submerged candidate because it is close to water.

**Minimum implementation.** `terrain.js` gains `moistureAt` (noise, own seed) and `distanceToWaterAt`. Suggested method: a distance grid computed once from the water mask (for example a two-pass distance transform), recomputed when water level changes. A water plane, a reed asset, an overlay selector.

**Depends on.** Steps 01–03. Possibly reuses the water-plane look of [`WaterSurface.jsx`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/WaterSurface.jsx).

**Files.** Modify `terrain.js`, `scatter.js`, `params.js`, `ScatterDemo.jsx`, Step 04 MDX, tests.

**Acceptance.**
- Test: no accepted reed has `height <= waterLevel`; none has distance ≥ shore band; the OR variant fails both checks.
- Distance-to-water overlay is 0 at the shoreline and grows inland (sampled values, not just a picture).

**Result.** —

**Next step adds.** Orientation of accepted objects (upright versus surface-aligned).

---

## Step 05 · Surface orientation

**Status:** Not started

**Understand.** The surface normal gives a direction to align with. Position, tilt, and yaw are separate transform parts. Rocks follow the surface; trees stay upright. Yaw rotates around the chosen up axis.

**Planned scene and controls.** Tree / rock asset; **Upright / Surface aligned**; normal arrows; **Yaw range**. Slope filter off.

**Learner does / observes.** Switch alignment on a slope: rocks tilt, trees do not; positions are unchanged. Raise yaw range: objects turn but do not tip.

**Practice (planned).** Kind: `implement`. Task: set rocks to follow the surface and trees to stay upright; give both a random yaw. Hint: position, tilt, and yaw are separate parts of the transform. Acceptance: rocks align local up with the normal; trees use world up in this planar demo; yaw rotates around the selected up direction; both stay anchored to their sampled points; checked on at least one slope, never on flat ground alone.

**Minimum implementation.** `normalAt(x, z)` from height-field finite differences; a transform builder: quaternion from world up to the chosen up, then yaw around that up; normal arrows (one `LineSegments`). The implement practice needs a new check, because the current scorer only handles `shapeValue`/`fractalNoise`. Options: extend the scorer to compare instance up vectors against a reference, or record this practice as manual acceptance and ship a `fill` on the quaternion line instead. **Decide at this step.**

**Depends on.** Step 01 terrain; Step 04 is not required.

**Files.** Modify `terrain.js`, `scatter.js`, `params.js`, `ScatterDemo.jsx`, Step 05 MDX, tests; practice files if the scorer is extended.

**Acceptance.**
- Test: on a sloped sample, an aligned instance's up vector equals the normal (within 1e-6); an upright one equals (0, 1, 0); yaw leaves the up vector unchanged.
- Test: positions are identical in both modes.
- Screenshot on a slope in both modes.

**Result.** —

**Next step adds.** A slope filter that removes candidates, kept separate from orientation.

---

## Step 06 · Filtering by slope

**Status:** Not started

**Understand.** Filtering decides existence; orientation decides facing. Eligible when `dot(normal, up) >= cos(maxSlope)`, with normalised vectors and the angle in radians. 33° gives about 0.839. This differs from the shader lesson's `1 - dot(normal, up)` steepness measure.

**Planned scene and controls.** **Max slope** (degrees, default 33); slope overlay; accepted / rejected dots; candidate and accepted counts. Trees stay upright.

**Learner does / observes.** Lower Max slope → more rejected dots, accepted count drops; trees on remaining sites still upright.

**Practice (planned).** Kind: `fill`. Prompt: complete `normal.dot(up) ____ Math.cos(maxSlopeRadians)`. Options: `>=`; `<=`. Hint: a flat patch has a dot product close to 1; a steeper patch has a smaller value. Answer: `>=`. Explanation: at 33° the threshold is about 0.839; convert degrees to radians before cosine; do not pass degrees into the shader lesson's `1 - dot` measure.

**Minimum implementation.** Slope test in `scatter.js` inside a `#region`; rejected candidates drawn in a second colour; count readout (suggested: in the legend or a small `aria-live` label).

**Depends on.** Step 05 `normalAt`.

**Files.** Modify `scatter.js`, `params.js`, `ScatterDemo.jsx`, Step 06 MDX, tests.

**Acceptance.**
- Test: `Math.cos(33 * Math.PI / 180)` ≈ 0.8387; max slope 90° accepts all; 0° accepts only flat samples.
- Accepted + rejected = candidate count at several settings.

**Result.** —

**Next step adds.** Several asset layers with their own rules, and terrain-driven appearance.

---

## Step 07 · Layers and variation

**Status:** Not started

**Understand.** A layer = asset + rules + own seed. Layers share terrain data but not settings. Terrain can drive appearance: `baseScale = lerp(0.8, 1.2, moisture)`, then a seeded multiplier in [0.95, 1.05]. Authored world rule.

**Planned scene and controls.** Tree / bush / rock layers, each with density and slope; moisture overlay; variation source (Random only / Terrain-driven) via `scene.compare`. Example protocols: trees on moist gentle ground, bushes in a broader moisture band, rocks on rocky material.

**Learner does / observes.** Toggle one layer: the others do not move. Switch variation source: same positions, but terrain-driven scale and colour follow the moisture map.

**Practice (planned).** Kind: `fill`. Prompt: make wetter sites produce a larger base tree, `lerp(____, ____, moisture)`. Options: `(0.8, 1.2)`; `(1.2, 0.8)`; `(1.0, 1.0)`. Hint: moisture 0 selects the first endpoint; moisture 1 the second. Answer: `(0.8, 1.2)`. Explanation: reversed makes wet sites smaller; equal endpoints remove the moisture effect.

**Minimum implementation.** A layer description object (asset, seed, density, slope, mask) and one `InstancedMesh` per layer; per-instance colour via `instanceColor`; the fill region around the lerp line. Layer params need prefixed keys (`scatterTreeDensity` …), which adds many controls; consider one layer selector plus shared sliders. **Decide at this step.**

**Depends on.** Steps 03, 04, 06.

**Files.** Modify `scatter.js`, `params.js`, `ScatterDemo.jsx`, Step 07 MDX, tests. Possibly new `layers.js` (suggested).

**Acceptance.**
- Test: switching a layer off leaves the other layers' transforms byte-identical; moisture 0 → scale in [0.76, 0.84], moisture 1 → [1.14, 1.26].
- Screenshot pair, random-only versus terrain-driven, same positions.

**Result.** —

**Next step adds.** Minimum spacing, saved configurations, and the assignment write-up.

---

## Step 08 · Build a population

**Status:** Not started

**Understand.** A protocol states where candidates come from, what accepts them, how they are oriented, and what changes their appearance. Minimum spacing is another acceptance rule.

**Planned scene and controls.** All lesson controls; per-layer accepted counts; mask overlays; optional **Minimum spacing**; reset; save configuration if implemented.

**Learner does / observes.** Build three layers; turn on spacing for one and see its accepted count drop; change the terrain seed and see the same rules produce a new, still consistent population.

**Practice (planned).** Kind: `implement` / Assignment 1. Task: trees, bushes, and rocks with independent controls; an explicit appearance protocol per layer; terrain data drives at least one property (size, colour, or probability). Hint: start with one working layer, duplicate its structure, change its rules rather than copying positions. Acceptance criteria: three distinguishable asset types; independent layer controls; repeatable layout; at least one terrain-based acceptance rule; at least one terrain-driven appearance or probability variation; documented protocol per layer; candidate versus accepted counts shown. Presets or exports are optional supporting features, not course requirements.

**Minimum implementation.** Spacing check (suggested: a uniform grid hash so the check stays near-linear); per-layer counts; protocol table written in this file. Saving configurations may reuse the pattern of [`compositeLabStore.js`](../../worldbuilding-guidebook/src/store/compositeLabStore.js), only if the author asks.

**Depends on.** Steps 01–07.

**Files.** Modify `scatter.js`, `params.js`, `ScatterDemo.jsx`, Step 08 MDX, tests, and this file (protocol table and observations).

**Acceptance.**
- Test: no two accepted instances in the spaced layer are closer than the spacing.
- Same seeds and settings → identical population after reload.
- Protocol table below filled in from the running app, with screenshots.

**Result.** —

**Next step adds.** Lesson 05 complete; continue with [Exercise 08 — Spline layer](./08-spline-layer.md).

### Protocol table — fill when Step 08 is built

| Layer | Candidates from | Accepted when | Orientation | Appearance driven by |
| --- | --- | --- | --- | --- |
| Trees | — | — | — | — |
| Bushes | — | — | — | — |
| Rocks | — | — | — | — |

## Learning resources

- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) — shared geometry and material with different transforms.
- [Three.js MathUtils](https://threejs.org/docs/pages/MathUtils.html) — seeded random and interpolation.
- [Three.js Vector3](https://threejs.org/docs/pages/Vector3.html) — vector and dot-product operations.
