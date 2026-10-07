# Exercise 09 — Particle System

**Date:** 2026-10-07  
**Course section:** Lesson 07 — Particles (Vector Fields & Motion)  
**Project:** [`worldbuilding-guidebook`](../../worldbuilding-guidebook/)  
**Lesson content:** [`content/lessons/07-particles/`](../../worldbuilding-guidebook/content/lessons/07-particles/)  
**Status:** Planned — lesson text written for all 8 steps; no scene, control, practice, or simulation implemented yet

## Exercise goal

Implement a particle system, move it with vector fields, and calibrate it to an atmospheric phenomenon without a fixed shape. The course assignment asks for:

| Requirement | Planned evidence | Status |
| --- | --- | --- |
| Implement a particle system | state, lifecycle, time-stepped motion, forces (Steps 01–04, 08) | Not started |
| Calibrate weather or phenomena without fixed geometry | one atmospheric effect with stated protocol (Step 08) | Not started |
| Explore particles in vector fields | velocity field, uniform + vortex + perturbation (Steps 05–06, 08) | Not started |
| Explore trails and creative representation | points, sprites, trails, colour and fade mappings (Steps 07–08) | Not started |

**Completion rule:** the lesson text and this plan do not satisfy the assignment. Change a step's status only after the step is built, checked in the running app, and its observed result is written into that step's **Result** line.

## How this plan is used

- Start after Lessons 05 and 06 ([Exercise 07](./07-scattering-system.md), [Exercise 08](./08-spline-layer.md)). Build one step at a time, only when the author asks; check, look, explain, stop.
- A large step may be split into sub-tasks; record the split under the step.
- Status values: **Not started** → **In progress** → **Done** (with a measured result).

## Step status

| Step | Lesson file | Status |
| --- | --- | --- |
| 01 · What is a particle? | [`01-what-is-a-particle.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/01-what-is-a-particle.mdx) | Not started |
| 02 · Emit, age, disappear | [`02-emit-age-disappear.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/02-emit-age-disappear.mdx) | Not started |
| 03 · Position changes over time | [`03-position-changes-over-time.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/03-position-changes-over-time.mdx) | Not started |
| 04 · Forces change velocity | [`04-forces-change-velocity.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/04-forces-change-velocity.mdx) | Not started |
| 05 · Reading a vector field | [`05-reading-a-vector-field.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/05-reading-a-vector-field.mdx) | Not started |
| 06 · Uniform flow, vortex, turbulence | [`06-uniform-flow-vortex-turbulence.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/06-uniform-flow-vortex-turbulence.mdx) | Not started |
| 07 · Trails and visual variation | [`07-trails-and-visual-variation.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/07-trails-and-visual-variation.mdx) | Not started |
| 08 · Build an atmospheric effect | [`08-build-an-atmospheric-effect.mdx`](../../worldbuilding-guidebook/content/lessons/07-particles/steps/08-build-an-atmospheric-effect.mdx) | Not started |

Each MDX file has only `title`, `goal`, `keywords`, and prose ending in a "planned but not built yet" line. Add `scene`, `code`, and `practice` frontmatter when the step is built, and remove that line.

## Starting point in the repository

Reusable:

- The scene seams, `scene.compare`, `scene.legend`, insets, code extraction, and `fill` practice described in [Exercise 07](./07-scattering-system.md#starting-point-in-the-repository).
- **Start / stop / step pattern.** Lesson 02's erosion simulation keeps time-stepped state in [`simulationState.js`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/simulationState.js) with controls in [`SimulationControls.jsx`](../../worldbuilding-guidebook/src/components/SimulationControls.jsx). Use it as the model for pause and one-step advance; do not merge particle state into the erosion store.
- **Perturbation noise.** `fractalNoise` / `perlin2d` in [`noiseMath.js`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/noiseMath.js) for Step 06.
- **Terrain.** The Lesson 05 terrain module (suggested `distributions/terrain.js`) for the ground check in Step 08.
- **Live per-frame uniforms.** If any particle material is a raw `ShaderMaterial`, update uniforms through the material ref, not the `uniforms` prop (the R3F behaviour recorded for the shader lab). `PointsMaterial` / `SpriteMaterial` avoid this.

Not reusable without new work:

- **`match` practice** is wired to noise-map params only. Steps 02 and 06 need the general match path (if Exercise 07 built one) or a different kind.
- **`implement` practice** has no scorer for particle state. Steps 01 and 08 are manual acceptance unless a scorer is added.

Constraints: one `<Canvas>`; prose in MDX only; prefix params with `particle` (for example `particleEmissionRate`); every animated scene gets **pause**, **one-step advance**, and **reset**; simulation uses a fixed `dt` with an accumulator so results do not depend on frame rate.

## Suggested file layout

All paths are **suggestions**:

| File | Purpose |
| --- | --- |
| `src/scene/demos/particles/particleSystem.js` | typed-array state (position, velocity, age, lifetime, alive), emit, step, recycle; pure functions |
| `src/scene/demos/particles/fields.js` | uniform, vortex, perturbation, sum |
| `src/scene/demos/particles/particleState.js` | pause / step / reset store |
| `src/scene/demos/particles/params.js` | control definitions |
| `src/scene/demos/particles/ParticleDemo.jsx` | points, sprites, trails, arrows |
| `scripts/particles.test.mjs` | node tests |

Suggested demo key: `particle-field`.

---

## Step 01 · What is a particle?

**Status:** Not started

**Understand.** A particle is state (position, velocity, age, lifetime, attributes). Its look is a representation choice: point, camera-facing sprite, or trail tip. Changing representation must not touch state.

**Planned scene and controls.** **Representation** (Points / Sprites); **Particle size**; pause; inspected particle state. Motion off. Both representations read the same state array.

**Learner does / observes.** Switch Points ↔ Sprites while paused: every particle stays in place; the inspected particle's position and age do not change.

**Practice (planned).** Kind: `implement`. Task: switch representation without resetting particle positions or ages. Hint: change the renderer, not the simulation state. Acceptance: positions and ages preserved across the switch; size or texture alters appearance without becoming a movement rule; a sprite and a trail are representations, not separate state definitions.

**Minimum implementation.** `createParticles(capacity, seed)` filling typed arrays; `Points` with a `BufferAttribute` that shares the position array; sprites drawn as `Points` with a soft round texture, or as an instanced quad facing the camera (choose at this step; document which); state kept outside the representation component so a switch does not rebuild it. The practice is manual acceptance (no scorer yet).

**Depends on.** Scene seams only.

**Files.** New (suggested): `particleSystem.js`, `particleState.js`, `params.js`, `ParticleDemo.jsx`, `particles.test.mjs`. Modified: `demoRegistry.js`, `demoParams.js`, Step 01 MDX.

**Acceptance.**
- Test: positions and ages are identical (same array contents) before and after a representation switch.
- Screenshot of both representations at the same camera.
- `npm run lint`, `npm test`, `npm run build` pass.

**Result.** —

**Next step adds.** An emitter, ageing, and recycling, with a live count.

---

## Step 02 · Emit, age, disappear

**Status:** Not started

**Understand.** Emitter creates particles over time; age grows to lifetime; then remove or reuse the slot. Steady live count ≈ rate × lifetime without cap or early death. Fractional births accumulate across updates.

**Planned scene and controls.** **Emission rate**; **Lifetime**; fixed maximum capacity; live count; reset; pause / step. A visible "capacity reached" indicator.

**Learner does / observes.** From reset the count climbs, then levels near rate × lifetime. Double lifetime or double rate: similar counts, different behaviour. At capacity the indicator shows.

**Practice (planned).** Kind: `match`. Prompt: after the system settles, maintain about 200 live particles with a 5-second lifetime. Hint: divide the target count by the time each particle stays alive. Answer: about 40 particles per second. Explanation: compare over a short time window, not frame by frame; emission must accumulate fractional births so it does not depend on frame rate.

**Minimum implementation.** `emissionAccumulator += rate × dt`; emit `floor(accumulator)`; free-slot reuse; fixed `dt` stepping with accumulator; averaged live count over a window (suggested 1 s).

**Depends on.** Step 01 state; a general `match` path (or defer practice).

**Files.** Modify `particleSystem.js`, `particleState.js`, `params.js`, `ParticleDemo.jsx`, Step 02 MDX, tests.

**Acceptance.**
- Test: rate 40, lifetime 5, large capacity → mean live count after 15 s within ±5 % of 200.
- Test: the same total time with 30 Hz and 144 Hz frame deltas gives the same birth count (fixed-step accumulator).
- Test: count never exceeds capacity.

**Result.** —

**Next step adds.** Velocity moves particles: `position += velocity × dt`.

---

## Step 03 · Position changes over time

**Status:** Not started

**Understand.** Velocity = direction + speed, in units per second; `dt` in seconds. Per-frame fixed moves make speed depend on frame rate. Fixed steps help comparison but do not guarantee identical results for all simulations.

**Planned scene and controls.** Single-particle mode; velocity components; pause; **Step interval**; travelled-distance readout.

**Learner does / observes.** Pause, step a known interval, read the displacement: speed × time.

**Practice (planned).** Kind: `fill`. Prompt: complete `position += velocity * ____`. Options: `dt`; `1 / dt`; `age`. Hint: units per second times seconds should give distance. Answer: `dt`. Explanation: age is total time alive, not the current update's duration; in code with `Vector3` use `position.addScaledVector(velocity, dt)`, the expression is mathematical pseudocode.

**Minimum implementation.** Position update in a `#region` in `particleSystem.js`; single-particle mode with velocity params; displacement readout.

**Depends on.** Step 02 stepping loop.

**Files.** Modify `particleSystem.js`, `params.js`, `ParticleDemo.jsx`, Step 03 MDX, tests.

**Acceptance.**
- Test: velocity (2, 0, 0), 0.5 s in any number of fixed steps → displacement 1 unit (within floating error).

**Result.** —

**Next step adds.** Acceleration changes velocity before velocity changes position.

---

## Step 04 · Forces change velocity

**Status:** Not started

**Understand.** Acceleration = force / mass (mass omitted; acceleration set directly). Semi-implicit Euler: velocity first, then position. Constant acceleration is not constant wind velocity. Removing acceleration does not stop motion.

**Planned scene and controls.** **Gravity**; **Lateral acceleration**; initial velocity; speed readout; reset; pause / step.

**Learner does / observes.** Gravity alone → curved fall, rising speed. Lateral alone → sideways bend. Both → combined curve. Forces off → straight line at current speed.

**Practice (planned).** Kind: `fill`. Prompt: complete `velocity += acceleration * ____`. Options: `dt`; `lifetime`; `position`. Hint: use the same interval that measures this simulation step. Answer: `dt`. Explanation: velocity updates first, then position; without acceleration existing velocity still moves the particle.

**Minimum implementation.** Velocity update before position update, in a separate `#region` from Step 03's (the fill must not read the region shown above it); acceleration params; speed readout.

**Depends on.** Step 03.

**Files.** Modify `particleSystem.js`, `params.js`, `ParticleDemo.jsx`, Step 04 MDX, tests.

**Acceptance.**
- Test: constant gravity g, after time t with v0 = 0: v = g·t (within floating error); position matches the semi-implicit sum (record the small difference from ½·g·t²).
- Test: acceleration set to zero mid-run keeps the speed constant.

**Result.** —

**Next step adds.** A velocity field read at each particle's position.

---

## Step 05 · Reading a vector field

**Status:** Not started

**Understand.** A field gives a vector per position (grid or function). Velocity field: `position += field(position) × dt`. Acceleration field: changes velocity first. The arrows do not say which; the type must be explicit. Grid interpolation avoids jumps. A field is not collision or fluid conservation.

**Planned scene and controls.** Arrow overlay; **Field** (Uniform / Spatially varying); **Flow strength**; points; pause. Optional inset comparing velocity-field and acceleration-field updates.

**Learner does / observes.** Uniform field: all particles move alike. Varying field: particles diverge because each reads its own location.

**Practice (planned).** Kind: `fill`. Prompt: sample the field at `____` to find the particle's local flow. Options: `particle.position`; `emitter.position`; `camera.position`. Hint: a spatial field is queried where the moving particle currently is. Answer: `particle.position`. Explanation: sampling at the emitter misses local differences once particles move away.

**Minimum implementation.** `fields.js` with a field function `(x, y, z) → vector`; arrows on a coarse grid as one `InstancedMesh` or `LineSegments`; a `fieldMode` switch between velocity and acceleration interpretation, labelled in the legend.

**Depends on.** Steps 03–04.

**Files.** New (suggested) `fields.js`; modify `particleSystem.js`, `params.js`, `ParticleDemo.jsx`, Step 05 MDX, tests.

**Acceptance.**
- Test: in a uniform field two particles at different positions get the same displacement; in a varying field they get different ones.
- Arrow directions match field values at their grid points (sampled in a test).

**Result.** —

**Next step adds.** Composing uniform flow, a vortex, and a noise perturbation.

---

## Step 06 · Uniform flow, vortex, turbulence

**Status:** Not started

**Understand.** Uniform = same everywhere; vortex = turning around a centre, planar direction `(-(z - cz), 0, x - cx)` with a safe strength profile; perturbation = noise variation, called "turbulence" artistically. Fields add; they can cancel. Fluid solvers are later.

**Planned scene and controls.** Uniform flow; **Vortex centre** / **strength** / **radius**; **Perturbation strength** / **scale**; arrows; pause. Velocity-field interpretation throughout.

**Learner does / observes.** Add a vortex: arrows curl near the centre, drift continues elsewhere. Add perturbation: irregular wobble.

**Practice (planned).** Kind: `match`. Prompt: keep the overall left-to-right flow while producing one visible local swirl, with perturbation off. Hint: keep a positive uniform-flow contribution and add only enough vortex strength to curve nearby trajectories. Answer: match the reference preset's flow and vortex parameters within tolerance. Explanation: the task checks independent contributions, not whether a swirl looks attractive. Show the target arrow field and a trail preview.

**Minimum implementation.** `uniformField`, `vortexField` (strength falls off beyond the radius and is finite at the centre, for example `r / (r² + radius²)`), `perturbationField` from `fractalNoise`, and a sum. A reference preset for the match.

**Depends on.** Step 05. General `match` path.

**Files.** Modify `fields.js`, `params.js`, `ParticleDemo.jsx`, Step 06 MDX, tests.

**Acceptance.**
- Test: vortex field is finite at its centre and tangent to circles around it (dot with the radial direction = 0).
- Test: with perturbation strength 0, the summed field equals uniform + vortex exactly.

**Result.** —

**Next step adds.** Trails, and appearance driven by speed and age.

---

## Step 07 · Trails and visual variation

**Status:** Not started

**Understand.** A trail is capped position history; clear it on recycle. Speed → colour, normalised age → opacity. Mappings change communication, not motion. Record history at fixed simulation intervals.

**Planned scene and controls.** **Representation** (Dots / Sprites / Trails); **History points**; **Colour by speed** / **Fade with age**; normalised colour legend; pause. Motion identical in every view.

**Learner does / observes.** Trails reveal direction and curvature; respawned particles start fresh trails with no jump line; fade makes old particles transparent.

**Practice (planned).** Kind: `fill`. Prompt: fade from fully visible at birth to transparent at death, `opacity = clamp(____, 0, 1)`. Options: `1 - age / lifetime`; `age / lifetime`; `speed`. Hint: at age 0 the result is 1; at age = lifetime it is 0. Answer: `1 - age / lifetime`, with positive lifetime. Explanation: the other age mapping fades in; speed can drive appearance but does not describe lifecycle progress.

**Minimum implementation.** Ring buffer of history per particle (capacity × history points); trail drawn as one `LineSegments` geometry updated in place; per-vertex colour/alpha; history cleared on recycle.

**Depends on.** Steps 02 (recycling), 05–06 (motion worth showing).

**Files.** Modify `particleSystem.js`, `params.js`, `ParticleDemo.jsx`, Step 07 MDX, tests.

**Acceptance.**
- Test: history never exceeds the cap; a recycled particle's history length resets to 0 or 1.
- Test: switching representation does not change any position.
- Screenshot of the three representations on the same field.

**Result.** —

**Next step adds.** One calibrated atmospheric effect, with terrain and boundary rules.

---

## Step 08 · Build an atmospheric effect

**Status:** Not started

**Understand.** Protocol = emission, lifetime, movement, representation. Bounded emitter, gentle field, fade with age. Terrain and boundary rules are separate from the field. Capacity limit and recycling keep it running.

**Planned scene and controls.** Emission rate; lifetime; size; field controls; representations; fade / colour mapping; terrain interaction; live count; pause / step; reset; optional preset saving.

**Learner does / observes.** Calibrate dust (or another phenomenon) until it reads as intended; compare points, sprites, and trails; see particles that hit the ground removed.

**Practice (planned).** Kind: `implement` / Assignment 3. Task: build one atmospheric effect; calibrate lifecycle and motion; explore a vector field; display trails; compare at least two visual representations. Hint: make the phenomenon legible with a small particle count before increasing detail. Acceptance criteria: explain emission, lifetime, movement, and representation; bound live count; show a field-driven variant; inspect a trail variant; calibrate to the intended phenomenon. Weather realism and a fluid solver are not required; an abstract phenomenon is valid when its rules and intent are clear.

**Minimum implementation.** Box emitter above the terrain; ground removal using the Lesson 05 `heightAt`; region boundary rule (remove or wrap; document which); preset values recorded below. Manual acceptance unless a scorer is added.

**Depends on.** Steps 01–07; Exercise 07 terrain module.

**Files.** Modify `particleSystem.js`, `fields.js`, `params.js`, `ParticleDemo.jsx`, Step 08 MDX, tests, and this file.

**Acceptance.**
- Test: no live particle has y below `heightAt(x, z)` after a step; live count ≤ capacity over a long run.
- Protocol table below filled in from the running app, with screenshots of two representations.

**Result.** —

**Next step adds.** Lesson 07 complete. Optional wrap-up (not an extra assignment): a road spline with a distance mask excluding trees, while dust follows a wind field above it, each system inspectable on its own.

### Protocol table — fill when Step 08 is built

| Decision | Value and reason |
| --- | --- |
| Phenomenon | — |
| Emission (where, rate) | — |
| Lifetime | — |
| Movement (field type and parts) | — |
| Representation | — |
| Terrain and boundary rule | — |

## Learning resources

- [Three.js Points](https://threejs.org/docs/pages/Points.html) — point-cloud representation.
- [Three.js Sprite](https://threejs.org/docs/pages/Sprite.html) — camera-facing image representation.
- [Three.js Vector3](https://threejs.org/docs/pages/Vector3.html) — `addScaledVector` and vector operations.
