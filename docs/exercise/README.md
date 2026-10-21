# Hands-on Exercise Notes

This directory records knowledge gained **after implementing and testing code** in this repository.

It is intentionally separate from [`../tutorials/`](../tutorials/):

- **Tutorials** are preparation: concepts, terminology, API overviews, and material to study before coding.
- **Exercises** are field notes: what was actually built, which source files produced it, important implementation decisions, observed behavior, problems, and useful next experiments.

An exercise can begin with a clearly marked assignment plan; record implementation and observations only after they have happened.

## Exercise index

| Exercise | Project | Source files | Key practical lessons |
| --- | --- | --- | --- |
| [01 — React Three Fiber baseline scene](./01-r3f-baseline-scene.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | [`App.jsx`](../../worldbuilding-guidebook/src/App.jsx), [`main.jsx`](../../worldbuilding-guidebook/src/main.jsx), [`index.css`](../../worldbuilding-guidebook/src/index.css), [`package.json`](../../worldbuilding-guidebook/package.json) | React Three Fiber scene composition; geometry/material comparison; a three-light rig; the complete shadow setup chain; perspective-camera and orbit-control configuration |
| [02 — Scene learning UI](./02-scene-learning-ui.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | [`App.jsx`](../../worldbuilding-guidebook/src/App.jsx), [`App.css`](../../worldbuilding-guidebook/src/App.css) | DOM overlay on a WebGL canvas; reusable information groups; data-driven entity cards; shared React state connecting UI selection to 3D objects; responsive panel layout |
| [03 — Interactive terrain playground](./03-interactive-terrain-playground.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | [`NoiseTerrainLesson.jsx`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/NoiseTerrainDemo.jsx), [`noiseMath.js`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/noiseMath.js), [`NoiseMapPreview.jsx`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/NoiseMapPreview.jsx), [`TerrainPreview.jsx`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/TerrainPreview.jsx) | Lesson 2.1 assignment; grid → repeatable noise function → coherent noise stack → 2D grayscale map → displaced 3D height field; explorable noise and terrain controls |
| [04 — Simulation-driven maps](./04-simulation-driven-maps.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | [`simulationMath.js`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/simulationMath.js), [`SimulationMapPreview.jsx`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/SimulationMapPreview.jsx), [`SimulationTerrainPreview.jsx`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/SimulationTerrainPreview.jsx), [`NoiseTerrainLesson.jsx`](../../worldbuilding-guidebook/src/scene/demos/proceduralMaps/NoiseTerrainDemo.jsx) | Lesson 2.2 assignment; stored simulation grid with start/stop time stepping; hydraulic erosion rule; calibrating simulation, height field, and mesh resolution; height-based material and wireframe shortcut |
| [05 — Voxel terrain](./05-voxel-terrain.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | [`voxelMath.js`](../../worldbuilding-guidebook/src/scene/demos/voxels/voxelMath.js), [`marchingCubes.js`](../../worldbuilding-guidebook/src/scene/demos/voxels/marchingCubes.js), [`surfaceNets.js`](../../worldbuilding-guidebook/src/scene/demos/voxels/surfaceNets.js), [`chunks.js`](../../worldbuilding-guidebook/src/scene/demos/voxels/chunks.js), [`greedyMeshing.js`](../../worldbuilding-guidebook/src/scene/demos/voxels/greedyMeshing.js), [`lodChunks.js`](../../worldbuilding-guidebook/src/scene/demos/voxels/lodChunks.js) | Lesson 3 assignment; 3D density fields and cubic resolution cost; sequential CSG and operation order; Marching Cubes with a generated case table; Surface Nets and greedy meshing compared with measured face counts; chunk seams and the shared border; rebuilding only dirty chunks; camera-based level of detail and snapping its seams together |
| [06 — Shader studies](./06-shader-studies.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | [`04-shaders/`](../../worldbuilding-guidebook/content/lessons/04-shaders/), [`ShaderLabDemo.jsx`](../../worldbuilding-guidebook/src/scene/demos/shaders/ShaderLabDemo.jsx) | Lesson 4 concepts and assignment plan; flat-colour and height/slope shaders implemented and measured, water/sediment diagnostic pending |
| [07 — Scattering system](./07-scattering-system.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | [`05-distributions/`](../../worldbuilding-guidebook/content/lessons/05-distributions/) | **In progress.** Lesson 05 (Distributions) step-by-step implementation plan, 8 steps; Steps 01–02 scene built (practice deferred), 03 and 04 built with their fill practice, 05–08 not started (assets revised 2026-10-10: rock, tree, farmland, antenna, base): candidates and instances, seeds, noise masks, terrain rules and lattices, orientation, per-asset slope limits, layers and an anchored base, population |
| [08 — Spline layer](./08-spline-layer.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | [`06-paths/`](../../worldbuilding-guidebook/content/lessons/06-paths/) (lesson text only; no source yet) | **Plan only.** Lesson 06 (Paths) step-by-step implementation plan, 6 steps, all not started: ordered paths, Catmull–Rom splines, arc-length sampling, terrain projection, road deformation and route cost, generated spline layer |
| [09 — Particle system](./09-particle-system.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | [`07-particles/`](../../worldbuilding-guidebook/content/lessons/07-particles/) (scenes, panel and practice for all 8 steps) | **Built 2026-10-21.** Lesson 07 (Particles): one dust-from-a-dig story, 8 steps each with a right-hand activity, fill practice and tests: particle state, lifecycle, time stepping, forces, vector fields, field composition, trails, atmospheric-effect recipe |

## What every exercise note should contain

1. The exercise goal and the result that was actually produced.
2. Links to the original project and relevant source files.
3. The exact components and important parameters used.
4. Practical observations, including unexpected behavior and mistakes.
5. A small list of follow-up experiments that can be performed on the same code.

## Adding the next exercise

Create a numbered file such as `02-environment-map.md`, then add one row to the index above. Record the state of the code at the time of the exercise; do not turn the exercise note into a general API tutorial.


### Entry template

```markdown
# Exercise XX — Title

**Date:** YYYY-MM-DD
**Project:** project name and relative link
**Main implementation:** source-file name and relative link
**Status:** Planned / In progress / Complete

## Exercise goal
## Source files
## What the exercise produced
## Exact changes and parameters
## Observed behavior
## Problems and fixes
## Practical takeaways
## Follow-up experiments
```
