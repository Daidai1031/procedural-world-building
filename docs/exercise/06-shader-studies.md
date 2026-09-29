# Exercise 06 — Shader Studies

**Date:** 2026-09-29  
**Course section:** Lesson 4 — Shaders  
**Project:** [`worldbuilding-guidebook`](../../worldbuilding-guidebook/)  
**Lesson content:** [`content/lessons/04-shaders/`](../../worldbuilding-guidebook/content/lessons/04-shaders/)  
**Status:** In progress — first flat-colour shader and a two-mode switcher implemented; other studies and visual observations pending

## Exercise goal

Make original shader studies on this project's terrain. Show how GPU visual rules can reveal simulation state and communicate a worldbuilding idea. Compare strategies on a dedicated Shaders section of the application, then record real results here.

The course assignment asks for four outcomes:

| Requirement | Planned evidence | Status |
| --- | --- | --- |
| Create your own shader studies | flat control, height/slope, water/sediment diagnostic; source and comparable captures | Flat study coded; captures and remaining studies pending |
| Demonstrate what shaders can do for simulations | live or stepped erosion values reach the GPU; explain what the visual result reveals | Pending implementation and observation |
| Consider what shaders to use or develop, and why | rationale and trade-offs below | Written; revisit after visual experiments |
| Implement a section dedicated to shaders with swappable strategies | navigable section, visible mode control, stable geometry/state while switching | Lesson 04 first step has standard/flat switch; more strategies pending |

**Completion rule:** The written lesson and this plan do not by themselves satisfy the implementation or visual-study requirements. Replace each pending status only after checking the running app and recording what happened.

## Starting point in the repository

- [`simulationMath.js`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/simulationMath.js) holds the erosion grid's height, water, and sediment values. [`SimulationTerrainPreview.jsx`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/SimulationTerrainPreview.jsx) turns sampled height into mesh geometry and a CPU-authored colour attribute; [`WaterSurface.jsx`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/WaterSurface.jsx) draws the water surface. These existing materials are useful **baselines**, not this exercise's custom shader studies.
- [`VoxelMeshDemo.jsx`](../../worldbuilding-guidebook/src/scene/demos/voxels/VoxelMeshDemo.jsx) colours the extracted voxel mesh by height with `vertexColors` and a standard material. [`VoxelTerrainDemo.jsx`](../../worldbuilding-guidebook/src/scene/demos/voxels/VoxelTerrainDemo.jsx) is the current baseline shown alongside the new conceptual lesson.
- [`demoRegistry.js`](../../worldbuilding-guidebook/src/scene/demoRegistry.js) maps demo names to scene components; [`demoParams.js`](../../worldbuilding-guidebook/src/scene/demoParams.js) describes controls; [`sceneStore.js`](../../worldbuilding-guidebook/src/store/sceneStore.js) carries active demo and parameter state; [`ControlStrip.jsx`](../../worldbuilding-guidebook/src/components/ControlStrip.jsx) renders controls. A dedicated shader lab should use these existing seams rather than create a second unrelated canvas.

> Verify these links and behaviour against the actual implementation when this note is updated; source files can evolve.

## First implementation — standard versus flat

[`ShaderLabDemo.jsx`](../../worldbuilding-guidebook/src/scene/demos/shaders/ShaderLabDemo.jsx) now builds one Marching Cubes mesh from the selected density shape and resolution. It keeps that `BufferGeometry` while the `shaderMode` control changes between the existing `MeshStandardMaterial` approach and an original GLSL `ShaderMaterial`. The vertex shader applies the model-view and projection matrices to the input position; the fragment shader outputs a constant `uColor`. This deliberately removes lighting response so the difference from the baseline is easy to study.

[`params.js`](../../worldbuilding-guidebook/src/scene/demos/shaders/params.js) defines the strategy selector and reuses voxel shape and resolution controls. [`demoRegistry.js`](../../worldbuilding-guidebook/src/scene/demoRegistry.js) registers the lab. [Lesson 04 step 01](../../worldbuilding-guidebook/content/lessons/04-shaders/steps/01-what-a-shader-does.mdx) opens it and explains what to compare.

**Initial values:** `shaderMode = standard`, `voxelShape = ground`, `voxelResolution = 16`, flat colour `#84a493`. A mode change does not resample density or rebuild the mesh; changing shape or resolution does. This is code-level verification, not a claim about observed pixels. `npm run build` passes; browser capture and visual inspection are still pending.

## Questions the studies should answer

1. What does a constant fragment colour show that the existing lit material does not? It tests the custom-material pipeline and makes a controlled comparison possible.
2. Does a **world-space** height/slope palette remain continuous across voxel chunks, and does it make caves, overhangs, soil, and cliffs easier to read?
3. When water or sediment changes in the Lesson 02 simulation, does the visual diagnostic update from the same underlying state? Is the range stable enough to compare successive frames?
4. Would a scan radius, resource mask, Fresnel selection rim, MatCap shape view, or cosmetic impact ripple help the eventual diggable planet? What data would each require?

## Proposed studies and rationale

| Mode | Source data | Rule / coordinate space | Reason to build | Expected limitation |
| --- | --- | --- | --- | --- |
| Standard baseline | existing normals, lights, material | current scene material | comparison against existing appearance | does not expose numeric state |
| Flat control | constant colour uniform | fragment colour | verifies custom pipeline | loses standard lighting unless recreated |
| Height + slope | world position and transformed world normal | altitude bands plus `1 - dot(normal, up)` | distinguishes soil, cliffs, high ground | slope on very coarse geometry is coarse; seams need checking |
| Water or sediment diagnostic | erosion grid channel sampled into attribute or texture | fixed data range with legend | shows where water accumulates or sediment deposits | cannot infer values unless uploaded; interpolation can hide small cells |
| Scan and resource overlay, optional | world probe position **and** resource field | radius mask plus separate resource signal | makes prospecting understandable | distance alone does not prove a resource exists |
| Fresnel / MatCap, optional | view vector, normal, MatCap image | view-based surface highlight | helps inspect forms and selection | not physical contact lighting |
| Impact ripple, optional | position, normal, time | small vertex offset | feedback for a tool strike | changes rendering, not density, collision, or mesh data |

**Minimum intended comparison:** standard baseline + the first three original strategies (flat, height/slope, water diagnostic). Keep optional effects out of the first implementation pass unless the core modes are working.

## Data flow and switching design

```text
Lesson 02 erosion grid ── height / water / sediment ──> shader lab geometry + GPU data
Lesson 03 voxel mesh ──── position / normal ───────────> same shader lab mode system
                                                       └─ mode selector → material strategy
```

The initial lab may focus on one terrain source to make comparisons fair. If it supports both the simulation and voxel mesh, unavailable data should disable or explain modes instead of inventing values. Keep the geometry, camera, and simulation step fixed while switching visual strategies. Do not start a second `<Canvas>` merely to create a shader section; the app already has a shared canvas.

Implementation sketch to refine when coding:

1. Add a shader lab demo component under `src/scene/demos/shaders/`, register it in `demoRegistry.js`, and add an explicit step or app navigation entry and a visible strategy control. The Lesson 04 content currently points at the **voxel baseline** and does not yet activate a shader lab.
2. Keep mode names and user-facing explanations together. For the `ShaderMaterial` variants, share a vertex/fragment data contract (`vWorldPosition`, `vWorldNormal`, and any simulation channel). The baseline can retain `MeshStandardMaterial`.
3. Pass scalar sliders and time as uniforms. Upload per-location water/sediment data with an appropriate attribute or data texture when the simulation advances; document the sampling and refresh path. Ensure all uniforms and varyings use matching coordinate spaces.
4. Preserve camera, scene state, and geometry during a mode switch. If separate materials are cached, dispose only materials that are no longer used. Do not rebuild the erosion grid because someone changes its palette.
5. Give each strategy a short legend and at least one adjustable, meaningful parameter. Verify shader compilation, chunk seams, low/high mesh resolution, and the effect of stepping the simulation.

Three.js `ShaderMaterial` uses the app's current WebGL/GLSL path. If later using `onBeforeCompile` to retain a standard material's lighting, document which program variants need unique cache keys. Do not assume a bare `ShaderMaterial` automatically receives the standard material's full lighting and shadow appearance.

## Study log — fill with actual observations

| Study | Same-scene capture or link | Parameter values and data source | What changed on screen? | Problem or decision |
| --- | --- | --- | --- | --- |
| Standard baseline | Pending visual capture | Ground, resolution 16, standard material colour `#84a493` | Pending browser inspection | Compare lighting with flat mode |
| Flat control | Pending visual capture | Same mesh; uniform `uColor = #84a493` | Pending browser inspection | Confirm constant colour and silhouette |
| Height + slope | Pending | Pending | Pending | Pending |
| Water / sediment diagnostic | Pending | Pending | Pending | Pending |

Record any compile errors and their fixes, plus one case where a visualization made a simulation behaviour easier to understand. A screenshot of a coloured mesh without its input rule and comparison does not demonstrate what the shader added.

## Acceptance checks for the coding stage

- [x] Lesson 04 has a first Shaders scene with a visible strategy selector.
- [x] Standard and flat modes choose different materials on the same mesh (code and build checked; visual check pending).
- [ ] At least three original shader studies have source code, labelled inputs, and comparable visual evidence.
- [ ] A shader mode displays genuine simulation data and changes when that data changes.
- [ ] The written analysis explains why each chosen study serves erosion, voxel terrain, or the future planet.
- [ ] Camera movement and neighboring chunks do not cause accidental coordinate discontinuities.
- [ ] Vertex displacement, if used, is identified as cosmetic unless terrain data and interaction are updated too.
- [ ] This note links implemented source files, exact parameters, observed results, problems, and next experiments.

## Learning resources

- [Three.js ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html) — vertex/fragment programs and uniform setup.
- [Three.js manual: Shadertoy](https://threejs.org/manual/pages/shadertoy.html) — moving a screen shader into a Three.js scene.
- [The Book of Shaders: Shaping Functions](https://thebookofshaders.com/05/) — `step`, `smoothstep`, and controlled curves.
- [Three.js Material](https://threejs.org/docs/pages/Material.html) — shader customization and program cache keys.

The lecture screenshots supplied for Lesson 4 also show flat colour, gradients, interpolation, Fresnel, slope, distance, ambient/contact cues, MatCap, and vertex deformation. The lesson turns those examples into proposed studies; it does not imply the screenshots came from this app.
