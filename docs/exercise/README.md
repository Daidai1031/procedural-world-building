# Hands-on Exercise Notes

This directory records knowledge gained **after implementing and testing code** in this repository.

It is intentionally separate from [`../tutorials/`](../tutorials/):

- **Tutorials** are preparation: concepts, terminology, API overviews, and material to study before coding.
- **Exercises** are field notes: what was actually built, which source files produced it, important implementation decisions, observed behavior, problems, and useful next experiments.

## Exercise index

| Exercise | Project | Source files | Key practical lessons |
| --- | --- | --- | --- |
| [01 — React Three Fiber baseline scene](./01-r3f-baseline-scene.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | [`App.jsx`](../../worldbuilding-guidebook/src/App.jsx), [`main.jsx`](../../worldbuilding-guidebook/src/main.jsx), [`index.css`](../../worldbuilding-guidebook/src/index.css), [`package.json`](../../worldbuilding-guidebook/package.json) | React Three Fiber scene composition; geometry/material comparison; a three-light rig; the complete shadow setup chain; perspective-camera and orbit-control configuration |
| [02 — Scene learning UI](./02-scene-learning-ui.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | [`App.jsx`](../../worldbuilding-guidebook/src/App.jsx), [`App.css`](../../worldbuilding-guidebook/src/App.css) | DOM overlay on a WebGL canvas; reusable information groups; data-driven entity cards; shared React state connecting UI selection to 3D objects; responsive panel layout |
| [03 — Interactive terrain playground](./03-interactive-terrain-playground.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | [`NoiseTerrainLesson.jsx`](../../worldbuilding-guidebook/src/lessons/NoiseTerrainLesson.jsx), [`noiseMath.js`](../../worldbuilding-guidebook/src/lessons/proceduralMaps/noiseMath.js), [`NoiseMapPreview.jsx`](../../worldbuilding-guidebook/src/lessons/proceduralMaps/NoiseMapPreview.jsx), [`TerrainPreview.jsx`](../../worldbuilding-guidebook/src/lessons/proceduralMaps/TerrainPreview.jsx) | Lesson 2.1 assignment; grid → repeatable noise function → coherent noise stack → 2D grayscale map → displaced 3D height field; explorable noise and terrain controls |
| [04 — Simulation-driven maps](./04-simulation-driven-maps.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | [`simulationMath.js`](../../worldbuilding-guidebook/src/lessons/proceduralMaps/simulationMath.js), [`SimulationMapPreview.jsx`](../../worldbuilding-guidebook/src/lessons/proceduralMaps/SimulationMapPreview.jsx), [`SimulationTerrainPreview.jsx`](../../worldbuilding-guidebook/src/lessons/proceduralMaps/SimulationTerrainPreview.jsx), [`NoiseTerrainLesson.jsx`](../../worldbuilding-guidebook/src/lessons/NoiseTerrainLesson.jsx) | Lesson 2.2 assignment; stored simulation grid with start/stop time stepping; hydraulic erosion rule; calibrating simulation, height field, and mesh resolution; height-based material and wireframe shortcut |
| [05 — Voxel terrain](./05-voxel-terrain.md) | [`worldbuilding-guidebook`](../../worldbuilding-guidebook/) | Planned; source files will be added after implementation | Lesson 3 assignment plan; 3D density fields and resolution; sequential CSG; Marching Cubes and alternative meshers; chunking and voxel optimization |

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
