# Exercise 10 — Branching Systems

**Date:** 2026-10-21  
**Course section:** Lesson 08 — Branching Systems  
**Project:** [`worldbuilding-guidebook`](../../worldbuilding-guidebook/)  
**Lesson content:** [`content/lessons/08-branching-systems/`](../../worldbuilding-guidebook/content/lessons/08-branching-systems/)  
**Status:** Built, not yet reviewed by the author — all eight steps implemented on 2026-10-21 with source excerpts, fill practices and browser checks: 2D instruction playback, rewrite generations, bracket stack and forks, depth shaping, a seeded 3D asset lab, growth animation, three detail levels with real triangle counts, and a two-world resident experiment. Microscope was not played.

## Exercise goal and agreed scope

Move from drawing instructions to an original procedural asset, then use an independent small world experiment to explore alternative outcomes. The learner is a complete beginner. The first plan said left-column prose is Chinese with English terms. Steps 01–02 were written in English instead, because `worldbuilding-guidebook/CLAUDE.md` fixes learner-facing content to English (the search index is English-only) and Lessons 01–07 are English. All eight steps are English. Implementation notes stay in this document.

| Part | Included in the first implementation | Deferred |
| --- | --- | --- |
| Steps 01–04: understand the rules | 2D instruction playback, parallel rewriting, bracket stack, branch-depth length/thickness controls | Unrestricted grammar editor, arbitrary executable rules |
| Step 05: design an asset | Same generator, solid representation, bounded seeded variation, simple 3D branching; three exploratory presets | Asset-library UI, save/export pipeline, integration into game populations |
| Step 06: show time | Reveal one fixed structure using two animation modes | Biological growth, seasons, resource consumption, adaptive growth |
| Step 07: manage detail | Three versions of one mature asset, camera-distance switching, actual triangle counts | LOD crossfade, large forest benchmark, planet terrain LOD |
| Step 08: compare worlds | Two identical small habitat patches, one robot each, work-distance disturbance, reachable quieter shelter choices | Full game residents, real acoustic propagation, destructible terrain, persistent planets, economy and authored endings |
| Optional reflection | A documented Microscope session if actually played | Mandatory group play or invented session results |

**This change is documentation only.** Implement one step at a time when requested, inspect the result, record evidence, then explain the change before moving on. Earlier lesson text is not evidence that its runtime exists; Lesson 08 must not require unbuilt Lesson 06 or 07 scenes.

## Course requirements and evidence plan

Source basis: the uploaded Branching Systems slide screenshots and the lecture transcript supplied on 2026-10-21. Neither source is committed here. The transcript clarifies that Microscope is highly encouraged, not mandatory. The following learner experiments and numerical defaults are our design decisions, not additional teacher requirements.

| Lecture / assignment direction | Planned evidence | Status |
| --- | --- | --- |
| Explore L-systems for procedural geometry, including cases beyond trees | Explain axiom, productions, rewrite generations and interpretation; design an original alien asset, Steps 01–05 | Built (see Steps 01–05 results) |
| Consider multiple LODs and their role in frame rate | Same mature asset at three detail levels; actual rendered triangle counts and a distance-transition comparison, Step 07 | Built; counts recorded in Step 07 |
| Consider procedural world building with multiple possible outcomes | Same initial patch and rules, only robot work location differs; observed state and causal explanation, Step 08 | Built; timings recorded in Step 08 |
| Consider playing Microscope with classmates | Optional session notes describing a real contribution and its effect on the project | Optional; not played as part of this change |

**Completion rule:** text and plans do not complete an exercise. Mark a step Done only after implementation, checks in the running app, and a filled Result entry. No invented measurements, screenshots, game integrations or classroom activities.

## Step status

| Step | Lesson file | Status |
| --- | --- | --- |
| 01 · Follow Instructions | [01-follow-instructions.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/01-follow-instructions.mdx) | Built; checked in browser 2026-10-21 |
| 02 · Rewrite & Repeat | [02-rewrite-and-repeat.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/02-rewrite-and-repeat.mdx) | Built; checked in browser 2026-10-21 |
| 03 · Create Branches | [03-create-branches.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/03-create-branches.mdx) | Built; checked in browser 2026-10-21 |
| 04 · Shape the Branches | [04-shape-the-branches.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/04-shape-the-branches.mdx) | Built; checked in browser 2026-10-21 |
| 05 · Design an Alien Asset | [05-design-an-alien-asset.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/05-design-an-alien-asset.mdx) | Built; checked in browser 2026-10-21 |
| 06 · Animate Growth | [06-animate-growth.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/06-animate-growth.mdx) | Built; checked in browser 2026-10-21 |
| 07 · Detail at a Distance | [07-detail-at-a-distance.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/07-detail-at-a-distance.mdx) | Built; checked in browser 2026-10-21 |
| 08 · Branching Worlds | [08-branching-worlds.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/08-branching-worlds.mdx) | Built; checked in browser 2026-10-21 |

## Shared learning and canvas contract

- **One step, one conclusion.** Introduce controls in sequence. Step 04 teaches length first, then thickness; Step 05 is the combined asset lab. Do not expose the entire parameter panel in Step 01.
- **Explain the visible change.** The active token, turtle heading, saved position, depth or disturbance overlay must visibly match the sentence being explained. Learner-visible labels include Chinese explanations and the English term.
- **Use the same asset through Steps 01–07.** Step 02 intentionally changes the instruction source to rewriting; Step 03 changes to a branching production. Explain those transitions and preserve other compatible settings. A restore-example action must not silently overwrite the learner's configuration.
- **Keep drawings comparable.** Fixed origin, unit length and scale during rewrite comparisons; allow explicit Fit View rather than silently reframing every generation. Use a front-on teaching view before introducing 3D in Step 05.
- **Separate teaching and preview.** Heading arrows, instruction labels, depth colours and ghost skeletons aid explanation; Preview hides helpers. Use gray/off-white, low saturation, coarse material and an original silhouette for the finished assets. Colour must not be the only way to identify a layer.
- **One shared Canvas.** Follow the existing [SceneHost](../../worldbuilding-guidebook/src/scene/SceneHost.jsx); comparisons must not mount extra WebGL canvases. Plan camera changes so leaving the planar view restores the shared orbit controls.
- **Motion is controllable.** Pause, replay/reset and one-step advance for playback/simulation; scrub time for the growth animation. No forced autoplay is needed. Instruction navigation must also work through accessible DOM buttons.
- **Keep meaning and state separate.** A camera move, material toggle or teaching overlay must not regenerate the asset or reset simulation state.
- **Honest practice.** Use a short prediction or comparison, with an explanation after the attempt. Keep observation/design questions manually reviewed; do not claim automatic grading based on whether a silhouette is attractive.
- **Read real code later.** Current MDX has only title, goal, keywords and prose. Add `scene`, `code` and `practice` frontmatter only when their implementations exist. Extract actual source then; do not insert invented executable snippets or reuse an unrelated scorer.

Suggested implementation home: `src/scene/demos/branching/`. Suggested modules are `lsystem.js` (rewrite/validation), `turtle.js` (interpretation and graph), `assetGeometry.js`, `growth.js`, `lod.js`, `worldExperiment.js`, `branchingState.js`, `params.js`, and view components. These paths are proposals, not existing source links. Reuse the guidebook's registries, controls and source-extraction conventions when each step is built.

Suggested parameter prefix: `branching`. Store generated structure separately from camera, overlays and animation progress. Step 08 uses separate experiment state. Config/account persistence, if added later, needs an explicit schema/version and must not imply that a seed stores edits or runtime history.

## Algorithm decisions for implementation

1. **Rewrite first, interpret second.** Use a new output string each generation; all matches read the previous generation. Unmatched symbols survive. Trim display whitespace; permit only supported symbols. Initially expose curated productions, not JavaScript or an unrestricted text editor.
2. **Bound work before allocation.** Proposed initial limits: generation slider 0–4, maximum 20,000 symbols and 4,096 drawn segments. Stop before exceeding either limit, keep the last valid result, and show the reason. These are teaching defaults to tune, not universal limits.
3. **Bracket stack.** Save and restore position, orientation, depth and current parent attachment. Reject unmatched brackets; do not draw a return segment. Restored attachment prevents a new trunk segment from attaching to a side-branch tip.
4. **Distinguish counters.** `generation` counts whole-string rewrites. `depth` counts nested open brackets. Store segment ID, parent ID, start/end, depth and radius. Depth alone cannot encode connected growth order. For the basic depth rule, segment length is `baseLength * lengthRatio ** depth`; continuing along a trunk does not increment depth.
5. **Deterministic variation.** Keep the zero-variation result exactly reproducible. Use stable seeded per-segment random values scaled by the variation amplitude. Camera, LOD, preview mode and animation time must not consume generator randomness. Record generation version if presets are later persisted.
6. **3D is a separate change.** Thickness gives a planar graph volume; it does not make the graph branch out of plane. In Step 05, introduce a bounded local-frame out-of-plane branch orientation. At spread zero, retain the planar graph. Save/restore full orientation in the stack.
7. **Connected animation.** Generate the graph once; reveal it without rewriting. For simultaneous growth, derive child starts from their parent's displayed endpoint so pieces remain attached. For from-base growth, derive start times from parent completion, allowing siblings to grow together. Both finish at the identical full graph.
8. **LOD derives from one identity.** Build detail variants once from the same full seeded graph; preserve root, transform, major branches and overall scale. Prune minor structure and reduce radial faces; a lower rewrite generation alone is not an acceptable mature-asset LOD. Count the selected rendered geometry, accounting for indexing/instances; exclude helpers from the asset count. Changing LOD must not reroll the asset.
9. **Two worlds, one controlled difference.** Clone immutable initial experiment data into independent mutable runs; hold seed, geometry, residents, rules and fixed timestep equal. Only work location differs. Noise is a distance-based disturbance proxy, not a sound solver. Use an explicit walkable graph/grid, finite shelter capacity and reachable targets. No route means visible waiting, not teleportation.

## Step 01 · Follow Instructions

**Status:** Built (2026-10-21)

**Understand.** A turtle is a drawing pen with position and heading. `F` draws; `+` and `-` rotate without translation.

**Canvas / controls.** Front-on 2D diagram; token strip `F + F - F`; Next Instruction, Replay and Reset; angle initially 45°, then a bounded angle control. Segment length fixed. Highlight the current token, corresponding Chinese action label, heading arrow and turn arc. Replay resets the drawing cursor, not the chosen angle.

**Learner action / planned practice.** Compare 30° and 90° with the same tokens. Ask whether `+` adds a segment. Feedback: it changes heading only; the subsequent `F` uses that heading. Manual visual comparison; no new scorer in this documentation change.

**Minimum implementation / acceptance.** Exactly three drawing operations for `F+F-F`; rotation steps leave position and drawn-segment count unchanged. In a two-dimensional coordinate convention starting upward, the 90° example shows up, left, up. Confirm token highlights align with the playback state.

**Project inspiration.** Inspect a generated skeleton before investing in its material or mesh.

**Result.** Built in `src/scene/demos/branching/` (`turtle.js`, `lineExample.js`, `playback.js`, `BranchingDemo.jsx`) with `BranchingPanel.jsx` replacing the control strip. Measured with `scripts/branching.test.mjs` and `tests/lesson08.spec.js`: `F + F - F` at 90° ends at (0, 1.2) → turn → (-1.2, 1.2) → turn → (-1.2, 2.4) with 3 segments; the two turn instructions leave position and segment count unchanged (heading 0° → 90° → 0°). Replay reaches 5 of 5 on its own at 0.8 s per instruction. Segment length is fixed at 1.2 units. The step asks for the 30° / 90° comparison in prose; the test checks that the two end points differ, not the learner's reasoning. Added `scene.cameraPose: front` so the shared canvas faces the flat drawing; the panel's Recenter view button returns to it (added 2026-10-21 with Step 05; the other lesson panels have no such button).

## Step 02 · Rewrite & Repeat

**Status:** Built (2026-10-21)

**Understand.** Axiom `F`; production `F → F+F`; generation 0 is unchanged input. Replacements happen in parallel from the old string, never recursively within the same pass.

**Canvas / controls.** Add Next Generation and generation 0–4; pair the old/new token strips with old/new drawings at the same scale. Animate one old token mapping into a group of new tokens; then interpret the complete output. Fit View is explicit. Show draw-operation count, since segments can overlap.

**Learner action / planned practice.** Predict generation 3's `F` count before revealing it. Expected answer: 8, because each old `F` produces two new `F`s. Rotations can cause overlap, so count instructions rather than visible disconnected strokes.

**Minimum implementation / acceptance.** Generations 0–3 contain 1, 2, 4, 8 `F`s; generation 2 is `F+F+F+F`. Plus signs survive. Verify limit rejection preserves the last valid result and presents a readable explanation.

**Project inspiration.** Save a rule family to create related assets; do not treat more generations as automatically better design.

**Result.** Rewrite is `generate` / `rewrite` in `lsystem.js`, limits 20,000 symbols and 4,096 F. Measured generations 0–4 hold 1, 2, 4, 8, 16 F (read from the panel in the browser, and from the generator in the tests); generation 2 is `F+F+F+F`; `+` survives; `rewrite('F', { F: 'FF' })` gives `FF`, so replacement reads the old string only. At 45° generation 3 closes a regular octagon and generation 4 draws it twice over (16 F, 8 distinct edges), which is the overlap the step warns about. The limit path was tested with `F → FFFFFFFF`: generation 4 (4,096 F) is kept and generation 5 is refused for symbols; a 100-F cap refuses generation 7 for segments and keeps generation 6. The slider only reaches 4, so the refusal message is never shown in the UI for this rule. Segment length 0.6; at the 15° minimum, generation 4 spans x −3.1…1.5 and y −0.3…3.8 on the board and stays inside it. No explicit Fit View button: Recenter view restores the front view but does not zoom.

## Step 03 · Create Branches

**Status:** Built (2026-10-21)

**Understand.** `[` saves and `]` restores position, heading and attachment; nested records return in reverse order.

**Canvas / controls.** First replay `F[+F]F` slowly. Hollow saved-position marker, current heading and a dashed non-drawing return cue. Then unlock single-sided `F → F[+F]F` and double-sided `F → F[+F]F[-F]F` presets and generations 0–3. Label the rule change rather than silently applying it.

**Learner action / planned practice.** Compare the presets with angle/length/generation fixed; point out where a side branch starts and where the pen returns. Feedback highlights the saved heading as well as the position.

**Minimum implementation / acceptance.** For `F[+F]F` at 90°, the final trunk continues straight from the first segment's endpoint; no line connects the side tip to the trunk tip. Check nested stack restoration, parent IDs and mismatched-bracket rejection. Save all turtle state that will later affect depth, radii and 3D orientation.

**Project inspiration.** Explore root-like, mineral-like and attached-life skeletons without requiring realistic trees.

**Result.** Brackets are in `turtle.js` (`save`, `restore`, validation in `parseInstructions`); `tree.js` adds segment ids, parents and depth; `forkExample.js` holds the presets. Measured with `scripts/branching.test.mjs` and `tests/lesson08.spec.js`: `F[+F]F` at 90° gives segments (0,0)→(0,1.2), (0,1.2)→(−1.2,1.2) and (0,1.2)→(0,2.4) with parents none, 0, 0 and depths 0, 1, 0, so the second trunk piece continues from the first segment and no line joins the side tip to the trunk tip. `]` leaves the segment count unchanged and restores position, heading, depth and parent; nested `F[+F[+F]F]F` gives depths 0, 1, 2, 1, 0 with at most 2 saved spots. `F]`, `F[+F` and `]F[` are refused before drawing. The one-sided rule `F → F[+F]F` has 1, 3, 9, 27 F at generations 0–3 and the two-sided rule `F → F[+F]F[-F]F` has 1, 5, 25, 125 F (311 symbols at generation 3). Segment length is divided by the number of trunk pieces per rewrite (2 or 3) so every generation reaches the same 4.2-unit trunk, which means drawings at different generations are not at a fixed segment length, unlike Step 02. The saved-spot ring, heading tick, dashed return cue and turn arc were checked in screenshots. Practice is a fill on `restore`; no new scorer.

## Step 04 · Shape the Branches

**Status:** Built (2026-10-21)

**Understand.** Branch depth and rewrite generation are different. Each nested bracket increases depth; restoring the stack restores it. A length ratio of 0.7 produces 1, 0.7, 0.49 at depths 0, 1, 2.

**Canvas / controls.** Keep the same graph connections. First expose length ratio, then thickness ratio, then their combination; use click-to-inspect depth and labelled depth colours. An Equal / By Depth comparison demonstrates the mapping. Suggested exploration ranges: length ratio 0.4–1.0; radius ratio 0.4–1.2, with the above-1 region labelled as outward thickening. Cap radii for stable rendering.

**Learner action / planned practice.** Compare fine tips with thick outer tips while holding productions and seed fixed. Ask which features communicate plant-like versus unfamiliar forms; discuss the mapping, without grading taste.

**Minimum implementation / acceptance.** Confirm the expected lengths at depths 0–2; demonstrate multiple depths within the same rewrite generation. Length changes move descendant attachment positions but retain connectivity. Colour/thickness changes do not alter the graph's connections. Colour off preserves a legible silhouette.

**Project inspiration.** Define a species through proportions and silhouette rather than colour alone.

**Result.** Length is `length * lengthRatio ** depth` in `interpretTree` and thickness is `radiusAtDepth`, capped at 0.1. Measured in tests: with a 0.7 ratio the lengths at depths 0, 1, 2 are 1, 0.7, 0.49; changing the ratio from 1 to 0.4 leaves every segment's id, parent and depth unchanged, and every child still starts at its parent's end. Generation 2 of the two-sided rule already contains depths 0, 1, 2, so one generation holds several depths; generation 3 contains depths 0–3. Equal ignores both ratios (all segments share one width and length). A thickness ratio above 1 thickens outward and the panel says so. Click-to-inspect was checked in the browser by clicking the trunk: segment 60, depth 0, parent segment 54, length 0.16, thickness 0.09 at the defaults. Colour off keeps a readable silhouette in the screenshot; colour is drawn per depth with the layers at slightly different depths so overlaps do not flicker. Limits seen: at ratio 1.2 the outer tips become short thick blocks, which is the effect the step asks about, not a bug. Practice is a fill on `radiusAtDepth`.

## Step 05 · Design an Alien Asset

**Status:** Built (2026-10-21)

**Understand.** Rule family and parameters define the main character; bounded seeded variation differentiates individuals. Solid thickness and out-of-plane spread are distinct controls.

**Canvas / controls.** Carry over the asset. Introduce Skeleton / Solid first, spatial spread second, then variation amplitude and seed. Add three same-species seed thumbnails at matching scale. Existing angle/decay controls become available together only in this lab. Teaching overlays can be hidden in Preview. No persistence or export UI required yet.

**Exploratory presets.** Cave Fan: low, fan-shaped attached life; Stone Coral: short, thick, compact mineral-like structure; Whisper Root: long, sparse, root-like structure. Use the same generator with visibly different silhouettes, not hard-coded unrelated meshes. These are working design names, not approved resident species. The game's rock-like cave residents remain distinct from environmental branching assets.

**Learner action / planned practice.** Lock seed, change angle to design compact/open versions; then change seed and compare whether each remains recognisable. Feedback asks which parameter made the main difference and whether variation obscured it.

**Minimum implementation / acceptance.** Identical configuration/version/seed reproduces identical segment data. Skeleton/Solid reads the same endpoints. Zero spatial spread remains planar; nonzero spread visibly leaves that plane. Camera moves do not reroll. Preset thumbnails fit consistent bounds without hiding scale differences through arbitrary individual zoom.

**Project inspiration.** A future Asset Lab could save rule/config/seed, then feed selected assets to Lesson 05's population system. This step produces no game integration.

**Result.** `asset.js` (`generateAsset`, generator version 1), `assetGeometry.js` (tubes, skeleton), `AssetScenes.jsx`. One 3D pen walks the same instruction strings as the 2D lab; each `[` rolls the pen about its heading by spread × 137.5° × branch count, so spread 0 stays flat. Every random number comes from one seeded generator, consumed in instruction order, so camera, look and helpers never touch it. Measured in tests: the same configuration, version and seed give identical segment data; another seed does not; at variation 0 every seed gives the same asset; at spread 0 and variation 0 the asset matches the planar lab's endpoints with z = 0; at spread 0.7 some segments sit more than 0.05 off the plane; every side branch still starts at its parent's end in 3D; a 0.2 variation keeps every length within ±20% of the unvaried one. In the browser the canvas bytes for seed 5 were identical before and after visiting seed 6. Designs at generation 3, 27 segments each, size (width × depth × height, then widest side over height): Cave Fan 1.11 × 0.81 × 1.40 (0.79), Stone Coral 0.42 × 0.49 × 1.21 (0.40), Whisper Root 0.27 × 0.64 × 3.06 (0.21). Cave Fan uses a third rule, `F → F[+F][-F]`, which forks at the tip; its size is measured from the finished shape and scaled to its height, because trunk-based sizing does not work for it. The two fork-style rules could not make a wide fan, which is why. Three small copies (seeds 1–3, scale 0.45) stand beside the main asset at one shared scale. Preview hides only the floor grid. Choosing a design writes its angle, ratios, spread and variation; the 3D lab has its own angle and ratio settings so the 2D lab's values are not overwritten. Cave Fan is wide rather than low. No save, export or game integration.

## Step 06 · Animate Growth

**Status:** Built (2026-10-21)

**Understand.** Animate a precomputed structure; do not claim biological simulation. Parent attachment, not depth alone, determines connected growth.

**Canvas / controls.** Compare Together and From the Base using identical final geometry and a shared 0–1 timeline. Play, Pause, Replay, scrub and Show Full Skeleton. Together extends every local segment at once while retaining attachments; From the Base starts a child after its parent finishes. Use equal-duration timelines for comparison, documenting the schedule.

**Learner action / planned practice.** Pause halfway and describe what has appeared. Feedback reveals parent connections and explains why finished structures match even though intermediate shapes differ.

**Minimum implementation / acceptance.** At time 1 both modes match the original graph exactly; child starts remain on displayed parent endpoints. Scrubbing 0 → 1 → 0.5 → 1 gives the same final result; playback cannot consume randomness or trigger rewriting each frame. No gaps or disconnected floating side branches.

**Project inspiration.** Optional reveal/awakening after excavation; seasonal change and environment-adaptive growth stay deferred.

**Result.** `growth.js` (`growthSchedule`, `growthProgress`), `GrowthScene` in `AssetScenes.jsx`. The asset is generated once; time only chooses how much shows, and nothing in the animation is random. Measured in tests: at time 1 both modes equal the full graph (to 1e-9); at times 0, 0.2, 0.5, 0.9 every piece starts at the end its parent is showing; in From the base each piece starts exactly when its parent finishes, siblings start together and the last finish is at 1; at time 0.5 Together shows every piece at progress 0.5 while From the base differs; scrubbing 0 → 1 → 0.5 gives the same pieces as 0.5 first. In the browser (Cave Fan, 27 segments): at 0.5 From the base reports 7 of 27 pieces finished; at time 1 both modes report 27 of 27 finished and 0 growing; at time 0, 0 of 27. Play takes 4 seconds. Pieces are redrawn into fixed buffers each frame; no regeneration. Not measured: frame time.

## Step 07 · Detail at a Distance

**Status:** Built (2026-10-21)

**Understand.** LOD is multiple render versions of one asset, not age, species, or style. Triangle count measures geometry scale, not total frame time.

**Canvas / controls.** First compare LOD 0/1/2 side by side at the same scale. Then use one asset with camera-driven switching; distance, current LOD, actual selected triangle count, optional distance bands, Auto / Lock LOD and two ordered thresholds. Start with visibly abrupt switching so popping is explainable. A small repeated cluster is a final optional demonstration, not a forest benchmark.

**Learner action / planned practice.** Move the transition close enough to see the change, then farther away; explain the silhouette/detail tradeoff. Lock each LOD at the same camera for honest comparison. No promised percentage FPS improvement.

**Minimum implementation / acceptance.** Record actual counts with LOD 0 > LOD 1 > LOD 2; preserve root and major silhouette at matching scale. Move camera across both thresholds in both directions; ensure monotonic level selection and no seed change. Initially LOD 0 may use full branches and 8 radial sides, LOD 1 fewer minor branches and 4 sides, LOD 2 a coarse silhouette proxy; tune these proposals after inspection. Dispose replaced GPU resources. Crossfade is optional later work.

**Project inspiration.** Asset LOD can support surface populations. The live solar-system terrain overview is a separate game requirement; this lesson's LOD demo does not implement it.

**Result.** `lod.js` (`buildLodSet`, `chooseLod`), `LodScene`. All levels are cut from the one seeded asset: LOD 1 drops the finest branches and LOD 2 keeps the trunk and first side branches, so every kept segment is the identical segment object. Cave Fan defaults: LOD 0 has 27 segments, 8 sides, 432 triangles; LOD 1 has 19 segments, 4 sides, 152 triangles; LOD 2 has 7 segments, 3 sides, 42 triangles. Triangle counts come from the index length of the same tube geometry that is drawn. Level choice is monotonic over distance 0–60 in both directions, switches exactly at the thresholds (below 8 → LOD 0, 8 up to 14 → LOD 1, 14 and beyond → LOD 2), and stays ordered even if the far slider is dragged below the near one. In the browser: camera distance 5 draws LOD 0 with 432 triangles, 11 draws LOD 1 with 152, 25 draws LOD 2 with 42; Level locked to LOD 1 keeps LOD 1 at any distance. Switching is abrupt on purpose, so popping can be seen. The camera distance slider moves the camera; zooming with the mouse updates the readout. Not done: distance bands drawn on the floor, the small repeated cluster, any frame-time measurement, crossfade. Geometries are disposed by effect cleanup when the asset changes; that was not inspected on the GPU.

## Step 08 · Branching Worlds

**Status:** Built (2026-10-21)

**Understand.** A branching narrative can author alternatives in advance. A rule-based environment experiment generates consequences from state. Neither automatically uses an L-system. Multiplicity does not require nondeterminism: identical input can reproduce the same run.

**Canvas / controls.** Two identical small habitat patches shown in the shared Canvas, representing the same starting planet. One connected cave with alternative sheltered pockets, a few residents, one robot and a walkable floor graph. Keep detailed voxel terrain outside scope. Add a simple outline to help the learner identify each patch; visually identical initial inhabitants and shelter capacity.

Move only world B's work marker; Play / Pause / Step and Synchronous Reset affect both runs. World View shows residents, Noise Overlay shows the distance-based disturbance proxy, and Change Log reports transitions from the actual simulation state. Pause does not reset; Sync Reset restores initial state while keeping the selected work markers. A separate Restore Example resets the whole example.

**Minimum rule set.** Work generates bounded distance-falloff disturbance, fading when work stops. Residents wait through brief disruption, then after sustained exposure may select a reachable quieter sheltered pocket with capacity. Use one documented threshold, exposure delay and cooldown; no full social or emotional model. A target must improve conditions enough to justify a move. Navigate the walkable graph instead of moving straight through rock. No target/route means visible bounded waiting; never delete or teleport the resident. Do not claim to reproduce all game habitat rules.

**Learner action / planned practice.** Compare nearby work with distant work, reset and rerun. Explain observed differences using the overlay and log. Then try a no-alternative-shelter case: staying put can be a valid result. Feedback distinguishes low exposure, insufficient duration and unavailable routes. Do not force a different outcome just to make the comparison dramatic.

**Minimum implementation / acceptance.** Independent state copies with the same initial seed/config. With the same work location and equal simulated time, both runs match. In the default reachable-alternative example, sustained nearby work changes resident state/location compared with distant work; record timing and actual values. Every path step stays on walkable cells, target capacity is respected, and repeated runs reproduce. Only the work marker may differ in the controlled comparison. Test noise-overlay toggling leaves state unchanged; compare 30 Hz/144 Hz frame delivery through the same fixed-step accumulator. Logs must reflect real state transitions.

**Project inspiration.** Directly explores [the game's procedural chain](../../terraforming-1380/docs/procedural-system.md): starting conditions → robot work → environment change → resident response → outcome. The game uses habitat fit, disturbance and nearby companions for its first species; this lesson isolates disturbance and reachability. Promotion into the game requires actual edited-density shelter checks and the current [specification](../../terraforming-1380/docs/spec.md), not copying this teaching patch as a complete resident implementation. Keep money and win/lose labels outside the demo.

**Result.** `worldExperiment.js` (pure simulation), `worldPlayback.js`, `WorldScene.jsx`, `WorldSide` in `BranchingLabPanels.jsx`. A 13 × 7 cave with three floor rows, four one-resident pocket cells (A at x 2–3, B at x 8–9 above the corridor), three residents at (2,4), (4,5), (5,3). Noise falls linearly to 0 at 6 cells from the robot and the robot's level rises 0.5 per second and falls 0.25 per second. A resident above 0.3 for 3 seconds (cooldown 8 s after a move) picks a pocket cell that has room, has noise at most 0.3, and is at least 0.15 quieter than where it stands, then walks a shortest path at 1.5 cells per second; otherwise it stays and logs why. Fixed step 1/30 s, no randomness. Measured over 20 simulated seconds: world A (robot at the far end) never changes; world B with the robot near the residents: residents 1 and 2 set off at 3.73 s and 3.80 s, reach pocket B at 10.4 s and 9.13 s, resident 3 stays at (5,3) because no pocket is quiet enough (logged at 3.97 s); Middle: residents 3 and 2 set off at 3.97 s and 4.30 s and reach pocket A at 7.30 s and 7.63 s while resident 1 stays calm; Far end: nothing happens and the log is empty; Quiet pockets None: all three bothered residents stay with 'no pocket has room' at 3.73–3.97 s. Tests also confirm: two runs are independent copies and match when the work spot matches; every cell and path step is walkable; a pocket cell never holds two residents; 30 Hz and 144 Hz frame delivery give the same final cells and log (step counts within 1); noise fades and a bothered resident logs 'is quiet again' after work stops; each log set-off has an arrival. In the browser: pausing leaves the log unchanged; toggling the noise overlay leaves the status text unchanged; Sync Reset empties the log; Restore Example resets the work spot and the pockets. World B's marker is chosen from a menu, not by clicking. A different route-blocked case is only tested through the path function because this map has none. These are teaching rules, not the game's resident rules. No Microscope session was played.

## Evidence summary

| Record | Values / observations |
| --- | --- |
| Asset intent and reference characteristics | Three exploratory designs, not game species: Cave Fan (wide fork), Stone Coral (short, thick), Whisper Root (tall, sparse). Sizes in Step 05. No reference images were collected. |
| Axiom, productions, generation and limits | Axiom `F`; `F → F+F` (Step 02); `F → F[+F]F`, `F → F[+F]F[-F]F`, `F → F[+F][-F]`; 20,000 symbols and 4,096 F; sliders reach generation 4 (2D) and 3 (forks, assets). |
| Angle, length/radius ratios, spatial spread and variation | Defaults in `params.js`; designs write their own values (`ASSET_PRESETS`). Radius cap 0.1. Spread rolls each `[` by spread × 137.5°; variation up to ±50%. |
| Seed and generator version | Seeds 1–99, default 1; thumbnails use 1, 2, 3; generator version 1. |
| Growth schedule and comparison | Shared 0–1 timeline played over 4 s; Together vs From the base; numbers in Step 06. |
| LOD 0 / 1 / 2 actual triangle counts and thresholds | 432 / 152 / 42 triangles (Cave Fan, 27 / 19 / 7 segments, 8 / 4 / 3 sides); thresholds 8 and 14. |
| Initial world layout / residents / walkable routes / capacities | 13 × 7 patch, three residents, two pockets of two cells, one resident per cell, 4-direction shortest paths. |
| Disturbance falloff, threshold, delay, fade and cooldown | Linear to 0 at 6 cells; threshold 0.3; delay 3 s; improvement 0.15; cooldown 8 s; level rise 0.5/s, fall 0.25/s. |
| Controlled work positions, timestep and comparison duration | World A at (11,3); World B at (3,4), (7,4) or (11,3); step 1/30 s; 20 simulated seconds. |
| Actual resident transitions and any no-route outcome | Times in Step 08. No route-blocked case occurs on this map; it is only covered by the path function test. |
| Screenshots / recordings and source references | `worldbuilding-guidebook/artifacts/lesson08/`; source in `src/scene/demos/branching/`; tests `scripts/branching.test.mjs` and `tests/lesson08.spec.js`. No recordings. |
| Problems, fixes and next experiment | Found by looking: drawings left the board at small angles, thick strokes blocked, a slider snapped back because it followed the measured distance, world B hid behind the legend, trunk-based sizing could not make a fan. Next: Fit View, a click-to-place work marker, a route-blocked world, LOD frame timing. |

## Optional Microscope reflection

Only fill this after a real session: participants/date, shared premise, beginning/end boundaries, permitted/excluded elements, one contribution from another participant, and how it changed the world proposal. Distinguish the classroom's adapted spatial rules from any other version used. No extra software feature is required.

## Validation when each step is built

Use focused pure-function checks for rewrite/stack/seed/attachment/LOD/world invariants above, then inspect the actual canvas at the stated comparison conditions. Run the guidebook's `npm run lint`, `npm test`, and `npm run build`. Add actual-source snippets and practice metadata only after their renderer/scorer support exists. A successful build verifies content integration, not visual or behavioural completion.

## Follow-up experiments and project order

1. Prioritise the Step 08 causal experiment for the game's planned one-species resident slice.
2. Use Step 05 to explore environmental assets while keeping the resident body design open.
3. Apply asset LOD once repeated surface assets justify it; measure the actual scene.
4. Later consider constrained ivy/path growth, seasons, LOD crossfade, saved asset presets and full game integration. These are extensions, not prerequisites for this exercise.
