# Exercise 10 — Branching Systems

**Date:** 2026-10-21  
**Course section:** Lesson 08 — Branching Systems  
**Project:** [`worldbuilding-guidebook`](../../worldbuilding-guidebook/)  
**Lesson content:** [`content/lessons/08-branching-systems/`](../../worldbuilding-guidebook/content/lessons/08-branching-systems/)  
**Status:** Planned — eight learner-facing steps written; no branching scene, controls, practice scorer, asset generator, LOD renderer, or resident simulation implemented by this change.

## Exercise goal and agreed scope

Move from drawing instructions to an original procedural asset, then use an independent small world experiment to explore alternative outcomes. The learner is a complete beginner. Left-column prose is Chinese with English technical terms introduced in context; implementation notes stay in this document.

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
| Explore L-systems for procedural geometry, including cases beyond trees | Explain axiom, productions, rewrite generations and interpretation; design an original alien asset, Steps 01–05 | Not started |
| Consider multiple LODs and their role in frame rate | Same mature asset at three detail levels; actual rendered triangle counts and a distance-transition comparison, Step 07 | Not started |
| Consider procedural world building with multiple possible outcomes | Same initial patch and rules, only robot work location differs; observed state and causal explanation, Step 08 | Not started |
| Consider playing Microscope with classmates | Optional session notes describing a real contribution and its effect on the project | Optional; not played as part of this change |

**Completion rule:** text and plans do not complete an exercise. Mark a step Done only after implementation, checks in the running app, and a filled Result entry. No invented measurements, screenshots, game integrations or classroom activities.

## Step status

| Step | Lesson file | Status |
| --- | --- | --- |
| 01 · Follow Instructions | [01-follow-instructions.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/01-follow-instructions.mdx) | Not started |
| 02 · Rewrite & Repeat | [02-rewrite-and-repeat.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/02-rewrite-and-repeat.mdx) | Not started |
| 03 · Create Branches | [03-create-branches.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/03-create-branches.mdx) | Not started |
| 04 · Shape the Branches | [04-shape-the-branches.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/04-shape-the-branches.mdx) | Not started |
| 05 · Design an Alien Asset | [05-design-an-alien-asset.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/05-design-an-alien-asset.mdx) | Not started |
| 06 · Animate Growth | [06-animate-growth.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/06-animate-growth.mdx) | Not started |
| 07 · Detail at a Distance | [07-detail-at-a-distance.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/07-detail-at-a-distance.mdx) | Not started |
| 08 · Branching Worlds | [08-branching-worlds.mdx](../../worldbuilding-guidebook/content/lessons/08-branching-systems/steps/08-branching-worlds.mdx) | Not started |

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

**Status:** Not started

**Understand.** A turtle is a drawing pen with position and heading. `F` draws; `+` and `-` rotate without translation.

**Canvas / controls.** Front-on 2D diagram; token strip `F + F - F`; Next Instruction, Replay and Reset; angle initially 45°, then a bounded angle control. Segment length fixed. Highlight the current token, corresponding Chinese action label, heading arrow and turn arc. Replay resets the drawing cursor, not the chosen angle.

**Learner action / planned practice.** Compare 30° and 90° with the same tokens. Ask whether `+` adds a segment. Feedback: it changes heading only; the subsequent `F` uses that heading. Manual visual comparison; no new scorer in this documentation change.

**Minimum implementation / acceptance.** Exactly three drawing operations for `F+F-F`; rotation steps leave position and drawn-segment count unchanged. In a two-dimensional coordinate convention starting upward, the 90° example shows up, left, up. Confirm token highlights align with the playback state.

**Project inspiration.** Inspect a generated skeleton before investing in its material or mesh.

**Result.** —

## Step 02 · Rewrite & Repeat

**Status:** Not started

**Understand.** Axiom `F`; production `F → F+F`; generation 0 is unchanged input. Replacements happen in parallel from the old string, never recursively within the same pass.

**Canvas / controls.** Add Next Generation and generation 0–4; pair the old/new token strips with old/new drawings at the same scale. Animate one old token mapping into a group of new tokens; then interpret the complete output. Fit View is explicit. Show draw-operation count, since segments can overlap.

**Learner action / planned practice.** Predict generation 3's `F` count before revealing it. Expected answer: 8, because each old `F` produces two new `F`s. Rotations can cause overlap, so count instructions rather than visible disconnected strokes.

**Minimum implementation / acceptance.** Generations 0–3 contain 1, 2, 4, 8 `F`s; generation 2 is `F+F+F+F`. Plus signs survive. Verify limit rejection preserves the last valid result and presents a readable explanation.

**Project inspiration.** Save a rule family to create related assets; do not treat more generations as automatically better design.

**Result.** —

## Step 03 · Create Branches

**Status:** Not started

**Understand.** `[` saves and `]` restores position, heading and attachment; nested records return in reverse order.

**Canvas / controls.** First replay `F[+F]F` slowly. Hollow saved-position marker, current heading and a dashed non-drawing return cue. Then unlock single-sided `F → F[+F]F` and double-sided `F → F[+F]F[-F]F` presets and generations 0–3. Label the rule change rather than silently applying it.

**Learner action / planned practice.** Compare the presets with angle/length/generation fixed; point out where a side branch starts and where the pen returns. Feedback highlights the saved heading as well as the position.

**Minimum implementation / acceptance.** For `F[+F]F` at 90°, the final trunk continues straight from the first segment's endpoint; no line connects the side tip to the trunk tip. Check nested stack restoration, parent IDs and mismatched-bracket rejection. Save all turtle state that will later affect depth, radii and 3D orientation.

**Project inspiration.** Explore root-like, mineral-like and attached-life skeletons without requiring realistic trees.

**Result.** —

## Step 04 · Shape the Branches

**Status:** Not started

**Understand.** Branch depth and rewrite generation are different. Each nested bracket increases depth; restoring the stack restores it. A length ratio of 0.7 produces 1, 0.7, 0.49 at depths 0, 1, 2.

**Canvas / controls.** Keep the same graph connections. First expose length ratio, then thickness ratio, then their combination; use click-to-inspect depth and labelled depth colours. An Equal / By Depth comparison demonstrates the mapping. Suggested exploration ranges: length ratio 0.4–1.0; radius ratio 0.4–1.2, with the above-1 region labelled as outward thickening. Cap radii for stable rendering.

**Learner action / planned practice.** Compare fine tips with thick outer tips while holding productions and seed fixed. Ask which features communicate plant-like versus unfamiliar forms; discuss the mapping, without grading taste.

**Minimum implementation / acceptance.** Confirm the expected lengths at depths 0–2; demonstrate multiple depths within the same rewrite generation. Length changes move descendant attachment positions but retain connectivity. Colour/thickness changes do not alter the graph's connections. Colour off preserves a legible silhouette.

**Project inspiration.** Define a species through proportions and silhouette rather than colour alone.

**Result.** —

## Step 05 · Design an Alien Asset

**Status:** Not started

**Understand.** Rule family and parameters define the main character; bounded seeded variation differentiates individuals. Solid thickness and out-of-plane spread are distinct controls.

**Canvas / controls.** Carry over the asset. Introduce Skeleton / Solid first, spatial spread second, then variation amplitude and seed. Add three same-species seed thumbnails at matching scale. Existing angle/decay controls become available together only in this lab. Teaching overlays can be hidden in Preview. No persistence or export UI required yet.

**Exploratory presets.** Cave Fan: low, fan-shaped attached life; Stone Coral: short, thick, compact mineral-like structure; Whisper Root: long, sparse, root-like structure. Use the same generator with visibly different silhouettes, not hard-coded unrelated meshes. These are working design names, not approved resident species. The game's rock-like cave residents remain distinct from environmental branching assets.

**Learner action / planned practice.** Lock seed, change angle to design compact/open versions; then change seed and compare whether each remains recognisable. Feedback asks which parameter made the main difference and whether variation obscured it.

**Minimum implementation / acceptance.** Identical configuration/version/seed reproduces identical segment data. Skeleton/Solid reads the same endpoints. Zero spatial spread remains planar; nonzero spread visibly leaves that plane. Camera moves do not reroll. Preset thumbnails fit consistent bounds without hiding scale differences through arbitrary individual zoom.

**Project inspiration.** A future Asset Lab could save rule/config/seed, then feed selected assets to Lesson 05's population system. This step produces no game integration.

**Result.** —

## Step 06 · Animate Growth

**Status:** Not started

**Understand.** Animate a precomputed structure; do not claim biological simulation. Parent attachment, not depth alone, determines connected growth.

**Canvas / controls.** Compare Together and From the Base using identical final geometry and a shared 0–1 timeline. Play, Pause, Replay, scrub and Show Full Skeleton. Together extends every local segment at once while retaining attachments; From the Base starts a child after its parent finishes. Use equal-duration timelines for comparison, documenting the schedule.

**Learner action / planned practice.** Pause halfway and describe what has appeared. Feedback reveals parent connections and explains why finished structures match even though intermediate shapes differ.

**Minimum implementation / acceptance.** At time 1 both modes match the original graph exactly; child starts remain on displayed parent endpoints. Scrubbing 0 → 1 → 0.5 → 1 gives the same final result; playback cannot consume randomness or trigger rewriting each frame. No gaps or disconnected floating side branches.

**Project inspiration.** Optional reveal/awakening after excavation; seasonal change and environment-adaptive growth stay deferred.

**Result.** —

## Step 07 · Detail at a Distance

**Status:** Not started

**Understand.** LOD is multiple render versions of one asset, not age, species, or style. Triangle count measures geometry scale, not total frame time.

**Canvas / controls.** First compare LOD 0/1/2 side by side at the same scale. Then use one asset with camera-driven switching; distance, current LOD, actual selected triangle count, optional distance bands, Auto / Lock LOD and two ordered thresholds. Start with visibly abrupt switching so popping is explainable. A small repeated cluster is a final optional demonstration, not a forest benchmark.

**Learner action / planned practice.** Move the transition close enough to see the change, then farther away; explain the silhouette/detail tradeoff. Lock each LOD at the same camera for honest comparison. No promised percentage FPS improvement.

**Minimum implementation / acceptance.** Record actual counts with LOD 0 > LOD 1 > LOD 2; preserve root and major silhouette at matching scale. Move camera across both thresholds in both directions; ensure monotonic level selection and no seed change. Initially LOD 0 may use full branches and 8 radial sides, LOD 1 fewer minor branches and 4 sides, LOD 2 a coarse silhouette proxy; tune these proposals after inspection. Dispose replaced GPU resources. Crossfade is optional later work.

**Project inspiration.** Asset LOD can support surface populations. The live solar-system terrain overview is a separate game requirement; this lesson's LOD demo does not implement it.

**Result.** —

## Step 08 · Branching Worlds

**Status:** Not started

**Understand.** A branching narrative can author alternatives in advance. A rule-based environment experiment generates consequences from state. Neither automatically uses an L-system. Multiplicity does not require nondeterminism: identical input can reproduce the same run.

**Canvas / controls.** Two identical small habitat patches shown in the shared Canvas, representing the same starting planet. One connected cave with alternative sheltered pockets, a few residents, one robot and a walkable floor graph. Keep detailed voxel terrain outside scope. Add a simple outline to help the learner identify each patch; visually identical initial inhabitants and shelter capacity.

Move only world B's work marker; Play / Pause / Step and Synchronous Reset affect both runs. World View shows residents, Noise Overlay shows the distance-based disturbance proxy, and Change Log reports transitions from the actual simulation state. Pause does not reset; Sync Reset restores initial state while keeping the selected work markers. A separate Restore Example resets the whole example.

**Minimum rule set.** Work generates bounded distance-falloff disturbance, fading when work stops. Residents wait through brief disruption, then after sustained exposure may select a reachable quieter sheltered pocket with capacity. Use one documented threshold, exposure delay and cooldown; no full social or emotional model. A target must improve conditions enough to justify a move. Navigate the walkable graph instead of moving straight through rock. No target/route means visible bounded waiting; never delete or teleport the resident. Do not claim to reproduce all game habitat rules.

**Learner action / planned practice.** Compare nearby work with distant work, reset and rerun. Explain observed differences using the overlay and log. Then try a no-alternative-shelter case: staying put can be a valid result. Feedback distinguishes low exposure, insufficient duration and unavailable routes. Do not force a different outcome just to make the comparison dramatic.

**Minimum implementation / acceptance.** Independent state copies with the same initial seed/config. With the same work location and equal simulated time, both runs match. In the default reachable-alternative example, sustained nearby work changes resident state/location compared with distant work; record timing and actual values. Every path step stays on walkable cells, target capacity is respected, and repeated runs reproduce. Only the work marker may differ in the controlled comparison. Test noise-overlay toggling leaves state unchanged; compare 30 Hz/144 Hz frame delivery through the same fixed-step accumulator. Logs must reflect real state transitions.

**Project inspiration.** Directly explores [the game's procedural chain](../../terraforming-1380/docs/procedural-system.md): starting conditions → robot work → environment change → resident response → outcome. The game uses habitat fit, disturbance and nearby companions for its first species; this lesson isolates disturbance and reachability. Promotion into the game requires actual edited-density shelter checks and the current [specification](../../terraforming-1380/docs/spec.md), not copying this teaching patch as a complete resident implementation. Keep money and win/lose labels outside the demo.

**Result.** —

## Evidence to fill after implementation

| Record | Values / observations |
| --- | --- |
| Asset intent and reference characteristics | — |
| Axiom, productions, generation and limits | — |
| Angle, length/radius ratios, spatial spread and variation | — |
| Seed and generator version | — |
| Growth schedule and comparison | — |
| LOD 0 / 1 / 2 actual triangle counts and thresholds | — |
| Initial world layout / residents / walkable routes / capacities | — |
| Disturbance falloff, threshold, delay, fade and cooldown | — |
| Controlled work positions, timestep and comparison duration | — |
| Actual resident transitions and any no-route outcome | — |
| Screenshots / recordings and source references | — |
| Problems, fixes and next experiment | — |

## Optional Microscope reflection

Only fill this after a real session: participants/date, shared premise, beginning/end boundaries, permitted/excluded elements, one contribution from another participant, and how it changed the world proposal. Distinguish the classroom's adapted spatial rules from any other version used. No extra software feature is required.

## Validation when each step is built

Use focused pure-function checks for rewrite/stack/seed/attachment/LOD/world invariants above, then inspect the actual canvas at the stated comparison conditions. Run the guidebook's `npm run lint`, `npm test`, and `npm run build`. Add actual-source snippets and practice metadata only after their renderer/scorer support exists. A successful build verifies content integration, not visual or behavioural completion.

## Follow-up experiments and project order

1. Prioritise the Step 08 causal experiment for the game's planned one-species resident slice.
2. Use Step 05 to explore environmental assets while keeping the resident body design open.
3. Apply asset LOD once repeated surface assets justify it; measure the actual scene.
4. Later consider constrained ivy/path growth, seasons, LOD crossfade, saved asset presets and full game integration. These are extensions, not prerequisites for this exercise.
