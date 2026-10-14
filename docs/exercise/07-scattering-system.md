# Exercise 07 — Scattering System

**Date:** 2026-10-07  
**Course section:** Lesson 05 — Distributions (Scattering & Populations)  
**Project:** [`worldbuilding-guidebook`](../../worldbuilding-guidebook/)  
**Lesson content:** [`content/lessons/05-distributions/`](../../worldbuilding-guidebook/content/lessons/05-distributions/)  
**Status:** In progress — Steps 01–02 have a scene, controls, and tests (practice deferred); Steps 03 and 04 are built with their fill practice; Steps 05–08 are lesson text only (revised 2026-10-10 for the asset roster below)

## Exercise goal

Populate a terrain with several asset types, each placed by an explicit, inspectable protocol. The course assignment asks for:

| Requirement | Planned evidence | Status |
| --- | --- | --- |
| Populate terrain with different assets | trees, rocks, farmland, antennas, and a base on one terrain (Steps 03–08; Steps 01–03 use rocks) | Not started |
| Independent control layers and asset protocols | per-layer settings and a written protocol per layer (Steps 04–08) | Not started |
| Terrain-driven size, colour, density, or other variation | noise-driven probability, moisture-driven scale and colour (Steps 03, 07, 08) | Not started |

**Completion rule:** the lesson text and this plan do not satisfy the assignment. Change a step's status only after the step is built, checked in the running app, and its observed result is written into that step's **Result** line.

## Asset roster (design revision 2026-10-10)

The lesson now places the assets the game world needs, and each asset is where a different distribution technique is taught. This revision changed the lesson text of Steps 04–08 and this plan only; no code or scene was changed. Steps 01–03 keep their built rock scenes.

| Asset | Role in the game world | Candidates from | Technique it teaches | Step |
| --- | --- | --- | --- | --- |
| Rock | Surface debris; also the first asset used in Steps 01–03 | Random points | Instances, seeds, aligning to the surface, a high slope limit | 01–03, 05, 06 |
| Tree | Vegetation in forest patches | Random points, accepted by a noise patch mask | Noise-driven patches; upright orientation; moisture-driven scale | 03, 05, 07 |
| Farmland | Cultivated land near water | Lattice cells | A lattice for area assets; a rule that reads terrain maps (distance to water); a nearly flat slope limit | 04, 05, 06 |
| Antenna | Relay mast or launch platform, tall and sparse | Sparse random points | The strictest slope limit; minimum spacing | 06, 08 |
| Base | Silent Shore: Extraction Terminal, Bioscan Lab, Terraform Console, Deep Echo Array | One anchor (the flattest of N candidates) | An anchored layer with fixed offsets and an exclusion zone for the other layers | 07, 08 |

Assumptions to confirm with the author:
- **Antenna** is a scattered mast or launch platform. The game's Deep Echo Array is one of the four base buildings, not the scattered layer. The game docs mention an antenna only in SIG-05 (removing it stops further exposure), so the antenna's role beyond that is this lesson's own.
- Trees and farmland do not appear in the game docs. They are lesson assets chosen to cover the techniques, and may be renamed or replaced.
- Lesson limits (rock 60°, tree 33°, farmland 8°, antenna 5°) are authored lesson values, not game values. The game's own slope numbers live in its `tuning.md`.
- Step 03's built scene uses rocks. Showing forest patches there needs a Rock / Tree asset switch, and the tree mesh is only built in Step 05 as planned. This is **not decided**: either build the tree mesh early as a sub-task 03b, or leave Step 03 on rocks. Nothing was changed for it.
- Lesson 05's `estimatedMinutes` (40) was not changed and is probably too low now.

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
| 03 · Noise creates patches | [`03-noise-creates-patches.mdx`](../../worldbuilding-guidebook/content/lessons/05-distributions/steps/03-noise-creates-patches.mdx) | Done (built and checked 2026-10-07) |
| 04 · Reading terrain maps | [`04-reading-terrain-maps.mdx`](../../worldbuilding-guidebook/content/lessons/05-distributions/steps/04-reading-terrain-maps.mdx) | Done (built and checked 2026-10-10) |
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

**Status:** Done — built, tested, and checked in the running app (2026-10-07).

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

**Decisions made at this step (2026-10-07).**
- Mask noise: `fractalNoise('perlin', …)` with its own seed (5), 3 octaves, persistence 0.5, sampled in world units. Measured over 20,000 random points the raw value sits between about 0.35 and 0.7 (5th–95th percentile 0.37–0.66 at frequency 0.5), so it is stretched with `(raw - 0.35) / 0.35` and clamped to 0–1; without that, density 1 would still fill only about half of the brightest patches.
- Acceptance values come from a separate generator (`seed + 7919`), so drawing them never moves a candidate, and candidate i keeps its value whatever the frequency or density are.
- Uniform placement is the noise map fixed at 1, so both A/B sides run the same `placementProbability` and `acceptanceTest` code.
- Controls: **Noise frequency** 0.2–1.2 (default 0.5) and **Density** 0–1 (default 1, so Steps 01–02 still accept every candidate). The Uniform / Noise-driven switch is the step's compare toggle; its side A sets Candidate count 300 and Density 0.8 each time A is selected, so a learner's own slider value for those two resets when they switch back to A (the compare mechanism has no one-time starting values).
- The corner inset `distribution-map` is a 2D canvas of the ground from above: brightness is probability, accepted candidates are larger grey dots with an ink outline, rejected ones small clay dots, matching the 3D colours. With a compare it shows both sides split by the divider.
- Code shown: `placementProbability`. Practice `fill` reads the separate `acceptanceTest` region (`randomValue < probability`); options `probability`, `1 - probability`, `noiseFrequency`. The prompt and hint avoid the word "probability" because the practice test forbids giving the answer away.
- Rejected candidates stay drawn as dots in the 3D scene; accepted ones are covered by their rock.

**Result.** Built and checked. `scripts/distributions.test.mjs` now has 14 tests, all passing: density 0 accepts nothing; density 1 on a flat map accepts all 300; the mask stays in [0, 1] and reaches below 0.1 and above 0.9; probability is noise × density; raising density only adds accepted candidates; changing frequency moves no candidate; with noise on, the mean mask value at accepted candidates is more than 0.1 higher than with uniform placement. `phase4b.test.mjs` passes with the new fill. Screenshots at 1440 × 900: the uniform side fills the ground evenly, the noise side leaves dense and empty areas that match the bright and dark areas of the corner map, density 0.2 leaves only a few rocks, and frequency 1.2 gives finer patches than 0.2 on the map. No console errors. `npm run lint` and `npm run build` pass; `npm test` has the one Lesson 02 failure that predates this work.

**Not checked.** Only part of the terrain is visible behind the lesson card at the default camera, so some patches are easier to see on the corner map than in the 3D view.

**Next step adds.** Rules that read terrain data (moisture, distance to water, height) instead of a free noise mask.

---

## Step 04 · Reading terrain maps

**Status:** Done — built, tested, and checked in the running app (2026-10-10). Asset changed from reeds to farmland.

**Understand.** Terrain data can be a stored grid or a function. A placement rule reads conditions at each candidate. Farmland is the asset: it covers an area, so its candidates come from a **lattice** (one per grid cell) instead of random points, and a tile is accepted only when `distanceToWater < irrigationBand && height > waterLevel`. Noise moisture is an artistic control, not a physical model. Slope is not filtered yet.

**Planned scene and controls.** Farmland tile asset (a flat, low slab with two-tone furrow stripes). Height / moisture / distance-to-water overlays; **Irrigation band** (maximum distance to water); **Water level**; **Cell size**; Random versus Lattice candidates via `scene.compare`, using the same rule and the same candidate count.

**Learner does / observes.** Lattice: accepted tiles sit side by side in rows. Random: the same count leaves gaps and overlaps. Widen the irrigation band → fields spread inland. Raise the water level → the band moves with the shoreline; no tile appears below the water surface.

**Practice (planned).** Kind: `fill`. Prompt: finish the rule `distanceToWater < irrigationBand ____ height > waterLevel`. Options: `&&`; `||`. Hint: both conditions must be true for a tile to appear. Answer: `&&`. Explanation: OR would accept a tile far from water because it is above water level, or a submerged candidate because it is close to water.

**Minimum implementation.**
1. `terrain.js` gains `moistureAt` (noise, own seed) and `distanceToWaterAt`. Suggested method: a distance grid computed once from the water mask (for example a two-pass distance transform), recomputed when water level changes.
2. `scatter.js` gains `generateLatticeCandidates({ cellSize, size })`: one candidate at each cell centre, y from `heightAt`.
3. A water plane (possibly reusing the look of [`WaterSurface.jsx`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/WaterSurface.jsx)), the farmland tile mesh, an overlay selector, and the `#region` for the fill.

**Depends on.** Steps 01–03.

**Files.** Modify `terrain.js`, `scatter.js`, `params.js`, `ScatterDemo.jsx`, Step 04 MDX, tests. Possibly a new tile mesh file beside `rock.js`.

**Acceptance.**
- Test: lattice count equals `floor(size / cellSize)²`, neighbouring centres are exactly `cellSize` apart, every y equals `heightAt`.
- Test: no accepted tile has `height <= waterLevel`; none has distance ≥ the irrigation band; the OR variant fails both checks.
- Test: tiles whose footprint is no larger than the cell never overlap on the lattice; the random layout of the same count has at least one overlapping pair at the default settings (measured, not assumed).
- Distance-to-water overlay is 0 at the shoreline and grows inland (sampled values, not just a picture).

**Decisions made at this step (2026-10-10).**
- A separate demo key, `scatter-farmland`, with its own params, so the Step 01–03 rock scene and its saved values are untouched. It shares `scatterSeed` with them. Shared pieces were split out: `instancing.js` (instance capacity and matrix hooks), `ScenePieces.jsx` (terrain mesh with an optional overlay colour, candidate dots), `useScatterLayout.js` is unchanged.
- **Cell size is a fixed constant (0.6), not a control.** The plan listed it as a control; the control strip would have held four sliders beside the compare toggle and run past a 1440 px window. The lattice is 9 × 9 = 81 candidates.
- Controls: **Irrigation band** 0.2–2 (default 0.6), **Water level** 1.3–2.2 (default 1.7), **Ground overlay** (Height / Moisture / Distance to water). Random versus Lattice is the compare toggle. Water level range comes from measured terrain heights: minimum 1.27, median 2.09, maximum 2.91 over a 0.05 grid; 1.7 floods about 10 % of the grid (1,599 of 16,384 cells).
- Random candidates use the same count as the lattice (81), so the two sides are a fair comparison.
- Distance to water: an exact Euclidean distance transform on a 128 × 128 grid (Felzenszwalb and Huttenlocher, two passes), built once per water level and read with bilinear interpolation. Water is any grid cell whose ground height is at or below the water level.
- Moisture is a stretched noise map with its own seed (11), shown as an overlay only; the rule in this step does not read it. Step 07 uses it for scale and colour.
- Overlays paint the top surface only; the cut-away walls keep the height colours. The water is a translucent sheet at the water level.
- Tiles: a flat slab, 0.92 of a cell wide, with three light and dark furrow stripes from a canvas texture. Rejected candidates stay drawn as dots; accepted ones are covered by their tile.
- Slope is not filtered and tiles are not tilted, so on a hillside a level tile sticks out on its downhill side. That is intended for now: Step 05 aligns tiles to the surface and Step 06 adds the slope limit.
- Code shown: `generateLatticeCandidates`. Practice `fill` reads the separate `irrigationRule` region (`distanceToWater < irrigationBand ____ height > waterLevel`, options `&&` and `||`).

**Result.** Built and checked. `scripts/distributions.test.mjs` now has 21 tests, all passing; the 7 new ones check: the lattice has floor(size / cell)² candidates, neighbours exactly one cell apart, centred, every y from `heightAt`; distance to water is about 0 in water and matches a brute-force nearest-water search within 1.5 grid cells at 200 random points; the distance grows as the water level falls (maximum distance larger at level 1.3 than at 2.2); moisture stays in [0, 1] and reaches below 0.1 and above 0.9; at 12 combinations of water level and band every accepted tile is above the water and inside the band, and the accepted flag equals the AND rule exactly; the OR rule accepts both a submerged candidate and a candidate far from water; widening the band only adds tiles and a higher water level removes the tiles it covers; lattice tiles never overlap while 81 random tiles at the same size do. `phase4b.test.mjs` passes with the new fill. Screenshots at 1440 × 900: random points leave gaps and overlapping tiles, the lattice gives tiles in rows with paths between them, distance and moisture overlays recolour the ground and add a legend row, water level 2.1 floods a large lake and moves the tiles to higher ground. No console errors. `npm run lint` and `npm run build` pass; `npm test` has the one Lesson 02 failure that predates this work (82 pass, 1 fail).

**Not checked.** Behaviour in a narrow window, and the tiles' look at other cell sizes (the control is not exposed). The default camera hides part of the terrain behind the lesson card.

**Next step adds.** Orientation of accepted objects: rocks and tiles surface-aligned, trees upright.

---

## Step 05 · Surface orientation

**Status:** Not started (lesson text revised 2026-10-10; assets are now rock, tree, farmland tile)

**Understand.** The surface normal gives a direction to align with. Position, tilt, and yaw are separate transform parts. Rocks and farmland tiles follow the surface; trees stay upright. Yaw rotates around the chosen up axis. Farmland yaw stays at 0 so the rows keep lining up; rocks and trees may take a random yaw.

**Planned scene and controls.** Asset selector (Rock / Tree / Farmland tile); **Upright / Surface aligned**; normal arrows; **Yaw range**. Slope filter off. The tree asset (low-poly trunk and canopy) is built here.

**Learner does / observes.** Switch alignment on a slope: rocks and tiles tilt, trees do not; positions are unchanged. Raise yaw range: rocks and trees turn but do not tip; tiles stay in rows.

**Practice (planned).** Kind: `implement`. Task: set rocks and tiles to follow the surface and trees to stay upright; give rocks and trees a random yaw. Hint: position, tilt, and yaw are separate parts of the transform. Acceptance: aligned objects have their local up equal to the normal; trees use world up in this planar demo; yaw rotates around the selected up direction; every object stays anchored to its sampled point; checked on at least one slope, never on flat ground alone.

**Minimum implementation.** `normalAt(x, z)` from height-field finite differences; a transform builder: quaternion from world up to the chosen up, then yaw around that up; normal arrows (one `LineSegments`); the tree mesh. The implement practice needs a new check, because the current scorer only handles `shapeValue`/`fractalNoise`. Options: extend the scorer to compare instance up vectors against a reference, or record this practice as manual acceptance and ship a `fill` on the quaternion line instead. **Decide at this step.**

**Depends on.** Step 01 terrain; Step 04 only for the tile asset.

**Files.** Modify `terrain.js`, `scatter.js`, `params.js`, `ScatterDemo.jsx`, Step 05 MDX, tests; new tree mesh file; practice files if the scorer is extended.

**Acceptance.**
- Test: on a sloped sample, an aligned instance's up vector equals the normal (within 1e-6); an upright one equals (0, 1, 0); yaw leaves the up vector unchanged.
- Test: positions are identical in both modes; farmland yaw is 0 whatever the yaw range.
- Screenshot on a slope in both modes, for all three assets.

**Result.** —

**Next step adds.** A slope filter that removes candidates, with a separate limit for each asset, kept separate from orientation.

---

## Step 06 · Filtering by slope

**Status:** Not started (lesson text revised 2026-10-10; per-asset limits and the antenna are new)

**Understand.** Filtering decides existence; orientation decides facing. Eligible when `dot(normal, up) >= cos(maxSlope)`, with normalised vectors and the angle in radians. Each asset has its own limit: rock 60° (cos ≈ 0.500), tree 33° (≈ 0.839), farmland 8° (≈ 0.990), antenna 5° (≈ 0.996). This differs from the shader lesson's `1 - dot(normal, up)` steepness measure. The antenna is a tall mast on a small platform: a thin cylinder with a dish and a flat base disc.

**Planned scene and controls.** Asset selector (Rock / Tree / Farmland / Antenna); **Max slope** (degrees, starting at the selected asset's limit); slope overlay; accepted / rejected dots; candidate and accepted counts. Trees stay upright. How the per-asset limit is stored (four prefixed params, or one slider that resets on asset change) is **decided at this step**.

**Learner does / observes.** Lower Max slope → more rejected dots, accepted count drops. Switch asset on the same candidates: the antenna keeps the fewest sites, the rock the most; trees on remaining sites still upright.

**Practice (planned).** Kind: `fill`. Prompt: complete `normal.dot(up) ____ Math.cos(maxSlopeRadians)`. Options: `>=`; `<=`. Hint: a flat patch has a dot product close to 1; a steeper patch has a smaller value. Answer: `>=`. Explanation: at 33° the threshold is about 0.839; convert degrees to radians before cosine; do not pass degrees into the shader lesson's `1 - dot` measure.

**Minimum implementation.** Slope test in `scatter.js` inside a `#region`; a per-asset default limit table; rejected candidates drawn in a second colour; count readout (suggested: in the legend or a small `aria-live` label); the antenna mesh.

**Game link.** The game's Development Readiness counts a surface sample as buildable when its slope is at most `slopeMax` ([`spec.md`](../../terraforming-1380/docs/spec.md) §5.1, BuildableArea). This step is the same test, applied to scattering. The game's value is its own `TUNE` number; do not copy these lesson limits into it.

**Depends on.** Step 05 `normalAt`.

**Files.** Modify `scatter.js`, `params.js`, `ScatterDemo.jsx`, Step 06 MDX, tests; antenna mesh file.

**Acceptance.**
- Test: `Math.cos(33 * Math.PI / 180)` ≈ 0.8387, and 60°, 8°, 5° give ≈ 0.5000, 0.9903, 0.9962; max slope 90° accepts all; 0° accepts only flat samples.
- Test: accepted + rejected = candidate count at several settings, for every asset.
- Test: on the same candidates the accepted counts satisfy antenna ≤ farmland ≤ tree ≤ rock.

**Result.** —

**Next step adds.** Several asset layers with their own rules, a base that reserves ground for the others, and terrain-driven appearance.

---

## Step 07 · Layers and variation

**Status:** Not started (lesson text revised 2026-10-10; adds the base as an anchored layer with an exclusion zone)

**Understand.** A layer = asset + rules + own seed. Layers share terrain data but not settings. The base is a different kind of layer: an **anchor** (the flattest of N candidates) plus fixed offsets for its buildings, and an **exclusion zone** the other layers must respect, so the base layer is evaluated first. Terrain can drive appearance: `baseScale = lerp(0.8, 1.2, moisture)`, then a seeded multiplier in [0.95, 1.05]; wetter field tiles are darker. Authored world rules.

**Planned scene and controls.** Layers: Trees (noise patches × moisture, ≤ 33°, upright), Rocks (random, ≤ 60°, aligned), Farmland (lattice near water, ≤ 8°, aligned), Antennas (sparse random, ≤ 5°, upright), Base (anchored). A switch per layer, **Base exclusion radius**, moisture overlay, variation source (Random only / Terrain-driven) via `scene.compare`. The base's four buildings are the game's Silent Shore systems (Extraction Terminal, Bioscan Lab, Terraform Console, Deep Echo Array), drawn as four different primitives, not instances of one mesh. Whether each layer gets its own sliders or one layer selector shares them is **decided at this step**.

**Learner does / observes.** Toggle one layer: the others do not move. Raise the exclusion radius: trees, rocks, and tiles clear out around the base while the base stays put. Switch variation source: same positions, but terrain-driven scale and colour follow the moisture map.

**Practice (planned).** Kind: `fill`. Prompt: make wetter sites produce a larger base tree, `lerp(____, ____, moisture)`. Options: `(0.8, 1.2)`; `(1.2, 0.8)`; `(1.0, 1.0)`. Hint: moisture 0 selects the first endpoint; moisture 1 the second. Answer: `(0.8, 1.2)`. Explanation: reversed makes wet sites smaller; equal endpoints remove the moisture effect.

**Minimum implementation.** A layer description object (asset, seed, density, slope limit, mask, candidate source) and one `InstancedMesh` per layer; per-instance colour via `instanceColor`; `findBaseAnchor(candidates, normalAt)` (smallest slope among N candidates that are above water and away from the edge); fixed building offsets in the anchor's frame; layers evaluated in a fixed order with the base first; the fill region around the lerp line. Layer params need prefixed keys (`scatterTreeDensity` …).

**Game link.** Silent Shore is the game's base hub ([`design.md`](../../terraforming-1380/docs/design.md) §4.3). The anchor search is a toy version of the game's buildable-area test; the game will use its own generator.

**Depends on.** Steps 03, 04, 06.

**Files.** Modify `scatter.js`, `params.js`, `ScatterDemo.jsx`, Step 07 MDX, tests. New `layers.js` and mesh files for the antenna and base buildings (suggested).

**Acceptance.**
- Test: switching a layer off leaves the other layers' transforms byte-identical; moisture 0 → scale in [0.76, 0.84], moisture 1 → [1.14, 1.26].
- Test: no tree, rock, tile, or antenna lies within the exclusion radius of the anchor; the anchor's slope is the smallest among the N candidates; the same terrain and seeds give the same anchor, and moving the anchor moves the four buildings by the same offset.
- Screenshot pair, random-only versus terrain-driven, same positions.

**Result.** —

**Next step adds.** Minimum spacing for the sparse antennas, saved configurations, and the assignment write-up.

---

## Step 08 · Build a population

**Status:** Not started (lesson text revised 2026-10-10; five layers, spacing applies to antennas)

**Understand.** A protocol states where candidates come from, what accepts them, how they are oriented, and what changes their appearance. Minimum spacing is another acceptance rule, and it depends on test order: candidates are tested in index order so the layout stays repeatable.

**Planned scene and controls.** All lesson controls; per-layer accepted counts; mask overlays; **Minimum spacing** for the antenna layer; reset; save configuration if implemented.

**Learner does / observes.** Build the five layers; turn on spacing for the antennas and see their accepted count drop while the terrain is still suitable; change the terrain seed and see the same rules produce a new, still consistent population.

**Practice (planned).** Kind: `implement` / Assignment 1. Task: a population of trees, rocks, farmland, antennas, and a base with independent controls; an explicit appearance protocol per layer; terrain data drives at least one property (size, colour, or probability). Hint: start with one working layer, duplicate its structure, change its rules rather than copying positions. Acceptance criteria: at least three distinguishable asset types (the full set is five); independent layer controls; repeatable layout; at least one terrain-based acceptance rule; at least one terrain-driven appearance or probability variation; documented protocol per layer; candidate versus accepted counts shown. Presets or exports are optional supporting features, not course requirements.

**Minimum implementation.** Spacing check (suggested: a uniform grid hash so the check stays near-linear); per-layer counts; protocol table written in this file. Saving configurations may reuse the pattern of [`compositeLabStore.js`](../../worldbuilding-guidebook/src/store/compositeLabStore.js), only if the author asks.

**Depends on.** Steps 01–07.

**Files.** Modify `scatter.js`, `params.js`, `ScatterDemo.jsx`, Step 08 MDX, tests, and this file (protocol table and observations).

**Acceptance.**
- Test: no two accepted antennas are closer than the spacing; raising the spacing never raises the accepted count.
- Same seeds and settings → identical population after reload.
- Protocol table below filled in from the running app, with screenshots.

**Result.** —

**Next step adds.** Lesson 05 complete; continue with [Exercise 08 — Spline layer](./08-spline-layer.md).

### Protocol table — planned values, to be replaced by observed values when Step 08 is built

| Layer | Candidates from | Accepted when | Orientation | Appearance driven by |
| --- | --- | --- | --- | --- |
| Trees | Random points; acceptance by noise patches | `noise × density` test, slope ≤ 33°, moist ground | Upright, random yaw | Moisture → scale and colour |
| Rocks | Random points | Slope ≤ 60° | Surface aligned, random yaw | Seeded random scale |
| Farmland | Lattice cells | Within the irrigation band, above water, slope ≤ 8° | Surface aligned, yaw 0 | Moisture → tile colour |
| Antennas | Sparse random points | Slope ≤ 5°, minimum spacing | Upright | Fixed scale |
| Base | One anchor: the flattest of N candidates | Above water; others excluded within the radius | Upright, facing the anchor | Four fixed building types |

## Learning resources

- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) — shared geometry and material with different transforms.
- [Three.js MathUtils](https://threejs.org/docs/pages/MathUtils.html) — seeded random and interpolation.
- [Three.js Vector3](https://threejs.org/docs/pages/Vector3.html) — vector and dot-product operations.
