# Exercise 09 — Particle System

**Date:** 2026-10-07 (plan redesigned 2026-10-21)  
**Course section:** Lesson 07 — Particles (Dust, Wind & Motion)  
**Project:** [`worldbuilding-guidebook`](../../worldbuilding-guidebook/)  
**Lesson content:** [`content/lessons/07-particles/`](../../worldbuilding-guidebook/content/lessons/07-particles/)  
**Status:** Built — all 8 steps have a scene, panel controls, a code excerpt and a fill practice (2026-10-21). Not yet checked by the author in the browser.

## Exercise goal

Implement a particle system, move it with vector fields, and calibrate it to an atmospheric phenomenon without a fixed shape. The course assignment asks for:

| Requirement | Planned evidence | Status |
| --- | --- | --- |
| Implement a particle system | state, lifecycle, time-stepped motion, forces (Steps 01–04, 08) | Built |
| Calibrate weather or phenomena without fixed geometry | one atmospheric effect with stated recipe (Step 08) | Tool built; the learner's own calibrated effect is still the assignment |
| Explore particles in vector fields | velocity field, uniform + vortex + perturbation (Steps 05–06, 08) | Built |
| Explore trails and creative representation | points, sprites, trails, colour and fade mappings (Steps 07–08) | Built |

**Completion rule:** the lesson text and this plan do not satisfy the assignment. Change a step's status only after the step is built, checked in the running app, and its observed result is written into that step's **Result** line.

## What changed in the 2026-10-21 redesign

The first plan was correct but written for a reader who already knows the vocabulary. The author is writing for people with no programming background, so the redesign changes how each step teaches, not what the lesson covers. The eight steps, the keywords and the assignment are unchanged.

1. **One story through all eight steps.** Lesson 06 ended with a resident choosing a shelter when work nearby is noisy. Lesson 07 makes that noise *visible*: a robot digs, dust rises, wind carries it toward the cave. Every right-hand scene is a piece of that one dust effect.
2. **Purpose first, then mechanism** (a standing preference for this author). Each step opens with the problem it solves, then a picture from everyday life, then the one rule. Formulas stay in the code panel, not in the prose.
3. **Every step has one thing to do on the right.** A learner should be able to change one control, see an immediate result, and say what happened in one sentence.
4. **Jargon is either explained in a sentence or dropped.** "Semi-implicit Euler" survives as one named aside; "unnormalised direction", "height field" and "capacity" are rewritten in plain words.
5. **A bug is shown on purpose** (Step 07: a trail that is not cleared on respawn draws a stray line). Seeing the failure teaches the rule better than stating it.

### Plain-word picture used by each step

| Step | Everyday picture | One-sentence takeaway |
| --- | --- | --- |
| 01 | A notebook page per speck; the look is a costume | State and look are separate |
| 02 | A shop: arrivals per minute × minutes stayed ≈ people inside | Live count settles near rate × lifetime |
| 03 | Two runners on a slow and a fast screen | Move by speed × dt, not a fixed step per frame |
| 04 | A skateboard push | A push changes speed first; speed then moves you |
| 05 | A wind map with one arrow per spot | Read the arrow under the speck, and say what the arrow means |
| 06 | Breeze + whirlpool + gusts, added up | Layers add; opposite arrows can cancel |
| 07 | The wake behind a boat | A trail makes invisible wind visible; forget history on respawn |
| 08 | A four-question recipe | Where born, how long, what moves it, how drawn |

## How this plan is used

- Start after Lessons 05 and 06 ([Exercise 07](./07-scattering-system.md), [Exercise 08](./08-spline-layer.md)). Build one step at a time, only when the author asks; check, look, explain, stop.
- A large step may be split into sub-tasks; record the split under the step.
- Status values: **Not started** → **In progress** → **Done** (with a measured result).

## How the lesson connects to Terraforming Contractor

The game docs ([`procedural-system.md`](../../terraforming-1380/docs/procedural-system.md) §8) give particles one job: *disturbance, debris and visual emphasis, separate from behaviour rules*. Checked 2026-10-21, the game has no dig dust or drifting-particle system yet. Its atmosphere ([`atmosphere.ts`](../../terraforming-1380/src/render/atmosphere.ts)) is about 4,200 seeded points that drift by the clock and ignore terrain edits. Resident behaviour (roadmap S1) is planned and not started.

| Lesson step | Game use it prepares (planned, not built) | Related requirement |
| --- | --- | --- |
| 01–02 | Dust puffs from a Miner's dig: a burst emitter with a capped count | HAB-02 (work disturbance), visual only |
| 03–04 | Rubble thrown out of a pit, falling under gravity | Visual debris |
| 05–06 | Planet wind: a per-planet breeze with a local dust devil; replaces the clock-driven drift of the atmosphere points | D-027 atmosphere C4 |
| 07 | Trails for robot paths, scan echoes or signal feedback | Lesson 06 paths |
| 08 | A "dig dust" recipe the game can reuse, and a cave-mouth plume that reads disturbance | RES-03 (visible retreat cue) |

Two rules from the game docs are repeated in the lesson on purpose: a vector field does not stop particles at the ground (Step 05, Step 08), and dust only *shows* the disturbance number, it never decides what a resident does (Step 08). Nothing here changes the game; porting is a separate task after the lesson step exists.

## Step status

| Step | Lesson file | Status |
| --- | --- | --- |
| 01 · What is a particle? | [`01-what-is-a-particle.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/01-what-is-a-particle.mdx) | Done |
| 02 · Emit, age, disappear | [`02-emit-age-disappear.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/02-emit-age-disappear.mdx) | Done |
| 03 · Position changes over time | [`03-position-changes-over-time.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/03-position-changes-over-time.mdx) | Done |
| 04 · Forces change velocity | [`04-forces-change-velocity.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/04-forces-change-velocity.mdx) | Done |
| 05 · Reading a vector field | [`05-reading-a-vector-field.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/05-reading-a-vector-field.mdx) | Done |
| 06 · Uniform flow, vortex, turbulence | [`06-uniform-flow-vortex-turbulence.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/06-uniform-flow-vortex-turbulence.mdx) | Done |
| 07 · Trails and visual variation | [`07-trails-and-visual-variation.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/07-trails-and-visual-variation.mdx) | Done |
| 08 · Build an atmospheric effect | [`08-build-an-atmospheric-effect.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/08-build-an-atmospheric-effect.mdx) | Done |

Each MDX file has only `title`, `goal`, `keywords`, and 145–180 words of prose ending in a "planned but not built yet" line (the step test allows 60–200). The prose already names the right-hand controls (**Look**, **Rate**, **Lifetime**, **Screen speed**, **Forces off**, **Arrow means**, **Clear trail on respawn**); when a step is built, keep those labels or edit the prose to match. Add `scene`, `code`, and `practice` frontmatter when the step is built, and remove the "planned" line.

## Starting point in the repository

Reusable:

- The scene seams, `scene.compare`, `scene.legend`, insets, code extraction, and `fill` practice described in [Exercise 07](./07-scattering-system.md#starting-point-in-the-repository). Per the author's diagram preference, put explanations in the right-hand legend and the left card, not as text on the canvas.
- **A custom panel for a lesson-specific scene.** Lesson 06 added [`PathPanel.jsx`](../../worldbuilding-guidebook/src/components/PathPanel.jsx) with its own playback store (`playback.js`), a fixed-step `Clock` using `useFrame`, Play / Step forward / Restart buttons and a status line. Copy that pattern for a particle panel rather than extending the erosion store. (Lesson 06 files are still uncommitted in the working tree as of 2026-10-21.)
- **Start / stop / step pattern.** Lesson 02's erosion simulation keeps time-stepped state in [`simulationState.js`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/simulationState.js) with controls in [`SimulationControls.jsx`](../../worldbuilding-guidebook/src/components/SimulationControls.jsx).
- **Perturbation noise.** `fractalNoise` / `perlin2d` in [`noiseMath.js`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/noiseMath.js) for Step 06.
- **Terrain.** The Lesson 05 terrain module (suggested `distributions/terrain.js`) for the ground and cave-mouth backdrop and the ground check in Step 08.
- **Live per-frame uniforms.** If any particle material is a raw `ShaderMaterial`, update uniforms through the material ref, not the `uniforms` prop. `PointsMaterial` / `SpriteMaterial` avoid this.

Not reusable without new work:

- **`match` practice** is wired to noise-map params only. Steps 02 and 06 need the general match path (if Exercise 07 built one) or a different kind.
- **`implement` practice** has no scorer for particle state. Steps 01 and 08 are manual acceptance unless a scorer is added.

Constraints: one `<Canvas>`; prose in MDX only; prefix params with `particle` (for example `particleEmissionRate`); every animated scene gets **pause**, **one-step advance**, and **reset**; simulation uses a fixed `dt` with an accumulator so results do not depend on frame rate.

## Shared scene: "the dig site"

All eight steps reuse one small terrain patch with a dig pit, so the learner sees the same place grow richer step by step. This also keeps the one-canvas rule and lets the camera stay put between steps (`resetCamera` only where a step needs a new view).

| Piece | Appears from | Notes |
| --- | --- | --- |
| Ground patch with a pit (emitter marker) | Step 01 | Flat-token colours, no text on the canvas |
| Cave mouth on one side | Step 05 | Where the dust is heading; matches the Lesson 06 shelter |
| Wind arrows on a coarse grid | Step 05 | One `LineSegments` or `InstancedMesh` |
| Particles (dots, puffs, trails) | Step 01 | One state array; representation switch never rebuilds it |

Legend panel entries use the existing `swatch` / `shape` vocabulary (`dot` for a speck, `block` for ground, `grid` for the arrow map).

## Suggested file layout

All paths are **suggestions**:

| File | Purpose |
| --- | --- |
| `src/scene/demos/particles/particleSystem.js` | typed-array state (position, velocity, age, lifetime, alive), emit, step, recycle; pure functions |
| `src/scene/demos/particles/fields.js` | uniform, vortex, perturbation, sum |
| `src/scene/demos/particles/playback.js` | pause / step / reset store; readouts copied at most 10 times a second |
| `src/scene/demos/particles/simulations.js` | one simulation per step demo, the fixed-step `advanceFixed`, and the race |
| `src/scene/demos/particles/trails.js` | per-speck history ring, fade with age |
| `src/scene/demos/particles/particleLook.js`, `particleSelection.js` | geometry sharing the state array; Step 01 selection |
| `src/scene/demos/particles/params.js` | control definitions |
| `src/scene/demos/particles/ParticleDemo.jsx` | points, sprites, trails, arrows |
| `src/components/ParticlePanel.jsx` (+ `.css`) | right-hand controls, readouts and, in Step 02/03, the level bar and race readout (follow `PathPanel.jsx`) |
| `scripts/particles.test.mjs` | node tests |

Built demo keys, one per step: `particle-state`, `particle-lifecycle`, `particle-time`, `particle-forces`, `particle-field`, `particle-layers`, `particle-trails`, `particle-recipe` (`PARTICLE_DEMOS`). Registering a demo key requires `demoRegistry.js` and `demoParams.js` entries; the file-count rule (about 6 files per change) means each step should be a separate change.

---

## Step 01 · What is a particle?

**Status:** Done (2026-10-21)

**Understand.** A particle is state (position, velocity, age, lifetime, attributes). Its look is a representation choice. Changing representation must not touch state.

**Right-hand activity: "Open the notebook page."** Motion is off. A cloud of specks sits over the pit. **Click** any speck to open its notebook page (position, velocity, age, lifetime) in the panel and highlight the speck. **Look** toggles Dot / Puff; **Size** slider. Legend: dot = one particle, ring = the selected one.

**Learner does / observes.** Select a speck, note its numbers, switch Look: shape changes, every number stays identical.

**Practice (planned).** Kind: `implement` (manual acceptance). Task: switch representation without resetting positions or ages. Hint: change the renderer, not the simulation state.

**Minimum implementation.** `createParticles(capacity, seed)` filling typed arrays; `Points` sharing the position array; sprites as `Points` with a soft round texture (or instanced quads facing the camera; choose here and document); state kept outside the representation component. A raycast or nearest-point pick for the click.

**Acceptance.**
- Test: positions and ages are identical before and after a representation switch.
- Screenshot of both looks at the same camera, with one speck selected.
- `npm run lint`, `npm test`, `npm run build` pass.

**Result.** Built as planned, with these choices. Demo key `particle-state`; files `particleSystem.js` (typed-array state, seeded 90-speck cloud, dig-site ground), `particleLook.js` (geometry that shares the state's position array), `ParticleDemo.jsx`, `ParticlePanel.jsx/.css`, `params.js`, `particleSelection.js`, and wiring in `AppLayout.jsx`, `demoRegistry.js`, `demoParams.js`. Sprites are `Points` with a soft round texture (not instanced quads). Picking uses R3F's click on `Points` (threshold 0.07); the panel's Previous/Next speck buttons give a keyboard route to the same selection. Practice is a `fill` (`state.position`) rather than the manual `implement` first planned, because `implement` has no scorer. Checked: `npm test` 102 pass, `npm run lint`, `npm run build`, and `tests/lesson07.spec.js` (page text is identical before and after switching Look; the fill passes; no page errors). Screenshots in `artifacts/lesson07/`: Dot and Puff both render, the selected speck shows a blue ring, the pit reads as a dark dip. Not tested: picking a speck by clicking the canvas (the spec uses the arrow buttons), and nothing was measured on touch devices.

**Next step adds.** An emitter, ageing, and recycling, with a live count.

---

## Step 02 · Emit, age, disappear

**Status:** Done (2026-10-21)

**Understand.** Emitter creates particles over time; age grows to lifetime; then the slot is reused. Steady live count ≈ rate × lifetime without cap or early death. Fractional births accumulate across updates.

**Right-hand activity: "Fill the room."** **Rate** and **Lifetime** sliders; a vertical **level bar** showing the live count with a tick at rate × lifetime, and a "room full" marker at capacity. Play / Step / Restart. A **Burst** button emits once (the dig puff) beside the default steady stream.

**Learner does / observes.** From restart the bar climbs and settles on the tick. Doubling rate or lifetime doubles the level, but looks different (fast fizz vs slow haze). Push the rate high enough to hit capacity.

**Practice (planned).** Kind: `match`. Prompt: after the system settles, keep about 120 specks alive when each lives 4 seconds. Hint: divide the crowd by how long each stays. Answer: about 30 per second. Explanation: the shop picture — arrivals × stay = inside. (Fallback if the general match path is missing: `fill` on the births-per-update line.)

**Minimum implementation.** `emissionAccumulator += rate × dt`; emit `floor(accumulator)`; free-slot reuse; fixed `dt` stepping; live count averaged over a short window (suggested 1 s).

**Acceptance.**
- Test: rate 30, lifetime 4, large capacity → mean live count after 15 s within ±5 % of 120.
- Test: the same total time with 30 Hz and 144 Hz frame deltas gives the same birth count.
- Test: count never exceeds capacity.

**Result.** Demo `particle-lifecycle`, capacity 300. Specks are placed in the cloud above the pit and do not move (motion starts in Step 03). Panel: Rate, Lifetime, Play / Step forward / Restart, **Burst** (40 at once), a level bar with a red tick at rate × lifetime, and "Room full" at capacity. Practice is a `fill` on `pool.accumulator += rate * dt`, not the planned `match`, because `match` only scores noise-map params. Measured in tests: rate 30, lifetime 4 → mean live count over the last second after 15 s within ±6 of 120; 30 Hz and 144 Hz frame deltas give the same birth count; the count never passes capacity; half a speck carries over to the next update. In the browser the default (20 × 3 = 60) reaches about 45–55 after 3 s.

**Next step adds.** Velocity moves particles: `position += velocity × dt`.

---

## Step 03 · Position changes over time

**Status:** Done (2026-10-21)

**Understand.** Velocity = direction + speed, in units per second; `dt` in seconds. A fixed move per frame ties speed to frame rate.

**Right-hand activity: "Two runners."** Two specks start together and run along the ground. One uses "fixed step per frame", the other `velocity × dt`. **Screen speed** toggles 30 / 144 frames per second (simulated with a different frame length, not by throttling the page). Footprints mark each update. Readouts: distance of each runner after the same real time. Step forward / Pause / Restart.

**Learner does / observes.** At 30 fps the fixed-step runner falls behind (or runs ahead at 144); the dt runner finishes at the same time on both. Step forward by one update and read distance = speed × dt.

**Practice (planned).** Kind: `fill`. Prompt: complete `position += velocity * ____`. Options: `dt`; `1 / dt`; `age`. Hint: units per second times seconds gives distance. Answer: `dt`. Explanation: age is total time alive, not this update's duration.

**Minimum implementation.** Position update in a `#region` in `particleSystem.js`; two-runner mode; footprint dots; a simulated frame-length switch that drives the same fixed-step clock with different `delta` values.

**Acceptance.**
- Test: velocity (2, 0, 0), 0.5 s in any number of fixed steps → displacement 1 unit (within floating error).
- Test: the fixed-step runner's distance differs between 30 and 144 fps; the dt runner's does not.

**Result.** Demo `particle-time`. Two runners on lanes in front of the pit, 5 m from start to finish at 1 m/s. The blue runner moves by `stepMotion` (velocity × frame length); the pink one adds 1/60 m per frame. Screen speed changes the simulated frame length (1/30 or 1/144 s) and restarts the race; it does not throttle the page. The race starts paused. Measured in the browser: at 30 fps the blue runner reaches 5.00 m and the pink one about 2.75 m; at 144 fps both reach 5.00 m, the pink one early. Unit tests: (2, 0, 0) m/s for 0.5 s gives 1 m whether split into 1, 5 or 30 steps.

**Next step adds.** Acceleration changes velocity before velocity changes position.

---

## Step 04 · Forces change velocity

**Status:** Done (2026-10-21)

**Understand.** Acceleration = force / mass (mass omitted; acceleration set directly). Semi-implicit Euler: velocity first, then position. Removing acceleration does not stop motion.

**Right-hand activity: "Rubble from the pit."** A **Burst** throws specks out of the pit. **Gravity** and **Sideways push** sliders; a **Forces off** button that sets both to zero mid-flight; a speed readout; dots dropped each update so the bend is visible.

**Learner does / observes.** Gravity alone → curved fall and rising speed. Sideways alone → a bend sideways. Press Forces off mid-flight → the speck keeps its speed and flies straight.

**Practice (planned).** Kind: `fill`. Prompt: complete `velocity += acceleration * ____`. Options: `dt`; `lifetime`; `position`. Hint: use the same interval that measures this simulation step. Answer: `dt`. Explanation: velocity updates first, then position.

**Minimum implementation.** Velocity update before position update, in a separate `#region` from Step 03's (the fill must not read the region shown above it); acceleration params; "Forces off" as a param reset.

**Acceptance.**
- Test: constant gravity g, after time t with v0 = 0: v = g·t; position matches the semi-implicit sum (record the small difference from ½·g·t²).
- Test: setting acceleration to zero mid-run keeps the speed constant.

**Result.** Demo `particle-forces`. A burst of 24 pieces leaves the pit; a new burst follows 0.8 s after the last piece lands. Rubble is removed when it reaches the ground (said in the legend; Step 08 teaches the rule). Path dots are recorded every 4 steps. The first piece of each burst wears a blue ring and its speed is shown. **Forces off** sets gravity and sideways push to 0. Code shows the `forces-step` region rather than `stepMotion`, because `stepMotion` contains this step's fill answer. Measured: after Forces off and five single steps the ringed piece's speed readout is unchanged; unit tests give v = g·t, and a drop equal to the semi-implicit sum g·dt²·n(n+1)/2, slightly more than ½·g·t².

**Next step adds.** A velocity field read at each particle's position.

---

## Step 05 · Reading a vector field

**Status:** Done (2026-10-21)

**Understand.** A field gives a vector per position. Velocity field: `position += field(position) × dt`. Acceleration field: changes velocity first. The arrows do not say which; the type must be explicit. A field is not collision or fluid conservation.

**Right-hand activity: "Drop a leaf."** The ground shows a coarse wind-arrow map and a cave mouth on one side. **Click the ground** to drop a leaf. **Field** (Uniform / Varying) and **Flow strength**. **Arrow means** toggles Speed (velocity field) / Push (acceleration field); the legend states the current meaning. Optional inset comparing the two paths from the same drop point.

**Learner does / observes.** Uniform: all leaves drift alike. Varying: leaves dropped at different spots diverge. Switch Arrow means: the same map gives a drifting leaf versus one that gains speed. Leaves can drift through the ground, which is the point of the final sentence of the prose.

**Practice (planned).** Kind: `fill`. Prompt: sample the field at `____` to find the particle's local flow. Options: `particle.position`; `emitter.position`; `camera.position`. Hint: a spatial field is queried where the moving particle currently is. Answer: `particle.position`.

**Minimum implementation.** `fields.js` with `(x, y, z) → vector`; arrows as one `LineSegments`; `fieldMode` switch with a legend label; click-to-drop via a ground raycast.

**Acceptance.**
- Test: in a uniform field two particles at different positions get the same displacement; in a varying field they get different ones.
- Arrow directions match field values at their grid points (sampled in a test).

**Result.** Demo `particle-field`. A 13 × 13 arrow grid, a cave arch at x = 2.7, and a starting row of 7 leaves; click the ground or press **Drop leaves** (keyboard route). Field: Uniform (flow, 0, 0) or Varying (direction turns with x and z). Arrow means: Speed (carries the leaf) or Push (added to acceleration). Leaves float 0.3 above the ground at the drop point and are removed past the region edge (±3.2). Measured: in a uniform field two leaves move identically; in the varying field they diverge; Speed gives 1 m after 1 s at strength 1 with no stored velocity, Push gives a velocity of 1 m/s and less distance.

**Next step adds.** Composing breeze, whirlpool, and gusts.

---

## Step 06 · Uniform flow, vortex, turbulence

**Status:** Done (2026-10-21)

**Understand.** Uniform = same everywhere; vortex = turning around a centre; perturbation = smooth noise variation ("turbulence" is artistic). Fields add; they can cancel.

**Right-hand activity: "Mix the wind."** Three layer cards (Breeze, Whirlpool, Gusts) each with an on/off switch and one or two sliders. **Drag the whirlpool centre** on the ground. The arrow map shows the sum. A steady stream of leaves flows through so the result is visible. Velocity-field interpretation throughout.

**Learner does / observes.** Breeze alone: parallel arrows. Add Whirlpool: arrows curl near the centre while the drift continues elsewhere. Add Gusts: irregular wobble. Place the whirlpool against the breeze to find a calm patch.

**Practice (planned).** Kind: `match`. Prompt: keep the overall left-to-right flow while producing one visible swirl, with gusts off. Hint: keep a positive breeze and add only enough whirlpool to curve nearby paths. Answer: match the reference preset within tolerance. Explanation: the task checks independent contributions, not whether a swirl looks attractive.

**Minimum implementation.** `uniformField`, `vortexField` (direction `(-(z - cz), 0, x - cx)`; strength falls off beyond the radius and stays finite at the centre, for example `r / (r² + radius²)`), `perturbationField` from `fractalNoise`, and a sum. The formula lives in the code panel only, not in the prose.

**Acceptance.**
- Test: vortex field is finite at its centre and tangent to circles around it (dot with the radial direction = 0).
- Test: with gusts off, the summed field equals breeze + whirlpool exactly.

**Result.** Demo `particle-layers`. Three layers with on/off switches and strengths; the whirlpool also has radius and centre X/Z sliders, and a blue handle on the ground that can be dragged (orbit controls are disabled while dragging). Leaves stream from the left edge at 10 per second. Vortex strength is `2 · s · R / (r² + R²)` times the turning direction, so it is finite at the centre and peaks at r = R. Practice is a `fill` on the line that adds the three x components, not the planned `match`. Measured: the vortex is finite at its centre and tangent to circles round it; with gusts off the sum equals breeze + whirlpool exactly; equal and opposite breezes cancel.

**Next step adds.** Trails, and appearance driven by speed and age.

---

## Step 07 · Trails and visual variation

**Status:** Done (2026-10-21)

**Understand.** A trail is capped position history; clear it on recycle. Speed → colour, normalised age → opacity. Mappings change communication, not motion. Record history at fixed simulation intervals.

**Right-hand activity: "Make the wind visible."** **Look** (Dots / Puffs / Trails); **History points**; **Colour by speed** and **Fade with age** switches; a small colour key in the legend. A **Clear trail on respawn** switch that learners can turn off to see the bug: a long stray line jumps from the death point to the respawn point. Motion is identical in every look.

**Learner does / observes.** Trails reveal direction and curvature that dots hide. Fade makes old specks transparent. With Clear trail off, stray lines flash across the scene; switching it back on removes them.

**Practice (planned).** Kind: `fill`. Prompt: fade from fully visible at birth to transparent at death, `opacity = clamp(____, 0, 1)`. Options: `1 - age / lifetime`; `age / lifetime`; `speed`. Hint: at age 0 the result is 1; at age = lifetime it is 0. Answer: `1 - age / lifetime`, with positive lifetime.

**Minimum implementation.** Ring buffer of history per particle (capacity × history points); trail drawn as one `LineSegments` geometry updated in place; per-vertex colour/alpha; history cleared on recycle, with the clear switch exposed only in this step as a teaching toggle (default on).

**Acceptance.**
- Test: history never exceeds the cap; a recycled particle's history length resets to 0 or 1 when clearing is on, and a jump segment appears when it is off.
- Test: switching look does not change any position.
- Screenshot of the three looks on the same field, and one with the stray line.

**Result.** Demo `particle-trails`. Dust is emitted in the pit at 30 per second, living 3.2–4.8 s, carried by a fixed teaching wind (breeze 0.6 + whirlpool 0.5 at (1.2, 0.5)) so it drifts to the cave whatever Step 06 was left at. History is recorded every 3 steps, capped by History points (4–40). Trails fade to 30% at their oldest point so a stray line stays visible. Measured: with clearing on, the newest stored point is always within 0.2 m of the speck; with it off, gaps over 1 m appear (the stray line, seen in `artifacts/lesson07/step07-stray-lines.png`); positions are identical for Dots, Puffs and Trails with different colour and fade settings.

**Next step adds.** One calibrated atmospheric effect, with terrain and boundary rules.

---

## Step 08 · Build an atmospheric effect

**Status:** Done (2026-10-21)

**Understand.** The recipe = where born, how long they live, what moves them, how they are drawn. Terrain and boundary rules are separate from the field. Capacity limit and recycling keep it running. Dust is a picture of the game's disturbance, not the cause of resident behaviour.

**Right-hand activity: "Write the recipe."** **Presets** (Dust, Mist, Rain, Spores) fill every control. A **recipe card** with the four questions is filled live from the current controls, plus a fifth line for the ground rule (**Remove at ground** on/off, plus a region-edge rule). Live count and capacity bar. Look switch to compare at least two representations. Pause / Step / Restart. A **Save recipe** option is optional.

**Learner does / observes.** Start from Dust, adjust until it reads as intended; compare Trails (for studying flow) with Puffs (for the final look); turn Remove at ground off and watch specks sink into the terrain.

**Practice (planned).** Kind: `implement` / Assignment 3. Task: build one atmospheric effect; calibrate lifecycle and motion; explore a vector field; display trails; compare at least two visual representations. Hint: make the phenomenon legible with a small particle count before increasing detail. Acceptance criteria: explain emission, lifetime, movement, and representation; bound live count; show a field-driven variant; inspect a trail variant. Weather realism and a fluid solver are not required; an abstract phenomenon is valid when its rules and intent are clear.

**Minimum implementation.** Box emitter above the terrain; ground removal using the Lesson 05 `heightAt`; region boundary rule (remove or wrap; document which); preset values recorded below. Manual acceptance unless a scorer is added.

**Acceptance.**
- Test: no live particle has y below `heightAt(x, z)` after a step; live count ≤ capacity over a long run.
- Recipe table below filled in from the running app, with screenshots of two representations.

**Result.** Demo `particle-recipe`, capacity 600. Presets Dust / Mist / Rain / Spores write emitter, rate, lifetime, look, size, the three wind strengths, gravity, fade, colour, ground and edge rules; the preset is applied again each time the step opens. The recipe card fills in from the current settings. The ground rule is the `fill`; the assignment itself stays manual (prose and the card), because `implement` has no scorer. Measured: for every preset, over 12 s, no live speck is below `digSiteGround` and the live count stays within capacity; Rain with the ground rule off has more than 10 specks below ground after 3 s. Screenshots: `step08.png` (Dust) and `step08-rain.png`.

**Next step adds.** Lesson 07 complete. Optional wrap-up (not an extra assignment): a road spline with a distance mask excluding trees, while dust follows a wind field above it, each system inspectable on its own.

### Recipe table — fill when Step 08 is built

| Decision | Value and reason |
| --- | --- |
| Phenomenon | Dust from a dig (the Dust preset; values from `PARTICLE_PRESETS`) |
| Emission (where, rate) | A disc of radius 0.7 above the pit, 0.08–0.68 above the ground, 30 per second, rising at 0.25 m/s |
| Lifetime | 4 s ± 20%, so about 120 alive at once |
| Movement (field type and parts) | Velocity field: breeze 0.5 + whirlpool 0.5 (centre and radius from Step 06) + gusts 0.3; no gravity |
| Representation | Puffs, fading with age; Trails for studying the flow |
| Terrain and boundary rule | Removed below `digSiteGround`; removed past ±3.2 (Mist wraps instead, and a wrap clears the trail) |

## Proposed build order and why

1. **Steps 01–02 first.** They create the state array, the fixed-step clock and the shared dig-site scene that every later step reuses.
2. **Steps 03–04** reuse the clock and add only controls.
3. **Steps 05–06** are the largest: the arrow grid, click-to-drop and the layer cards. Consider splitting Step 06.
4. **Steps 07–08** add trail geometry and the recipe card; Step 08 mostly recombines earlier controls.

This is a proposal only; the author decides when each step starts.

## Learning resources

- [Three.js Points](https://threejs.org/docs/pages/Points.html) — point-cloud representation.
- [Three.js Sprite](https://threejs.org/docs/pages/Sprite.html) — camera-facing image representation.
- [Three.js Vector3](https://threejs.org/docs/pages/Vector3.html) — `addScaledVector` and vector operations.

## Verification — 2026-10-21

- `npm run lint` clean; `npm test` 121 pass, 0 fail (22 in `scripts/particles.test.mjs`); `npm run build` passes.
- `npx playwright test tests/lesson07.spec.js tests/lesson06.spec.js tests/lesson05.spec.js`: 16 pass. The Lesson 07 spec visits all eight steps on one canvas, passes each fill, and checks the step-specific behaviour listed in each Result.
- Screenshots in `worldbuilding-guidebook/artifacts/lesson07/` were looked at; fixes made after looking: bigger leaves and path dots, Step 04 re-bursts so the scene is never empty, Step 07 uses a fixed wind so dust reaches the cave, trail tails kept at 30% so the stray line shows, race lanes moved to the front of the pit.
- Not checked: touch devices, phone width, dragging the whirlpool by hand (the sliders are tested instead), clicking a speck or the ground with a real mouse, frame rate with 600 trails on a slow machine.
