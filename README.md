# Procedural World Building Project

This repository documents my work for DESIGN 4197/6197: Procedural World Building.

## Project Overview

This project will explore how procedural systems can be used to create interactive worlds, narratives, environments, or experiences. The direction will continue to evolve through research, experimentation, and prototyping during the semester.

## Repository Structure

- `docs/planning/` — project planning, feature ideas, and backlog
- `docs/tutorials/` — notes and documentation from tutorials
- `docs/analysis/` — analysis of references, precedents, and project experiments
- `docs/exercise/` — hands-on learning notes (a personal addition)

## Log

### Week 1 — Repository initialization (August 26–30, 2026)

<details>
<summary>View weekly details</summary>

- **Progress:** Initialized the repository, established the documentation structure, and created the initial feature backlog.
- **Key files:** `README.md`, `docs/planning/backlog.md`, `docs/tutorials/README.md`, `docs/analysis/README.md`
- **Keywords:** repository setup, project planning, documentation structure, feature backlog

</details>

### Week 2 — React Three Fiber fundamentals (August 31–September 6, 2026)

<details>
<summary>View weekly details</summary>

- **Progress:** Built an interactive React Three Fiber practice scene with geometry, materials, lighting, shadows, a world grid, and orbit camera controls. Added a reusable learning UI that connects DOM entity selection with the 3D scene, then documented both the prerequisite concepts and hands-on observations.
- **Key files:** `worldbuilding-guidebook/src/App.jsx`, `worldbuilding-guidebook/src/App.css`, `worldbuilding-guidebook/src/index.css`, `docs/tutorials/react-basics.md`, `docs/tutorials/threejs-react-scene.md`, `docs/exercise/01-r3f-baseline-scene.md`, `docs/exercise/02-scene-learning-ui.md`
- **Keywords:** React, JSX, CSS, Three.js, React Three Fiber, Drei, geometry, materials, lighting, shadows, camera, OrbitControls, DOM overlay, shared state, reusable UI

</details>

### Week 3 — Procedural maps: noise terrain and simulation-driven erosion (September 7–13, 2026)

<details>
<summary>View weekly details</summary>

- **Progress:** Built a function-based procedural map pipeline (grid → noise stack → 2D map → height field → 3D terrain) with White, Value, Perlin, and Cellular/Worley noise, plus adjustable frequency, octaves, persistence, and shaping controls, where the 2D map and 3D mesh read the same sampled values. Extended this into a simulation-driven map: a simplified hydraulic-erosion simulation that stores height, water, and sediment per cell, updates through double-buffered grids so every cell shares one definition of a timestep, and exposes Start/Pause/Step/Reset controls, a height-based material, and a wireframe toggle. Calibrated simulation resolution, terrain mesh resolution, world size, and height amplitude together to produce believable topography.
- **Key files:** `worldbuilding-guidebook/src/lessons/NoiseTerrainLesson.jsx`, `worldbuilding-guidebook/src/lessons/proceduralMaps/noiseMath.js`, `worldbuilding-guidebook/src/lessons/proceduralMaps/NoiseMapPreview.jsx`, `worldbuilding-guidebook/src/lessons/proceduralMaps/TerrainPreview.jsx`, `worldbuilding-guidebook/src/lessons/proceduralMaps/simulationMath.js`, `worldbuilding-guidebook/src/lessons/proceduralMaps/SimulationMapPreview.jsx`, `worldbuilding-guidebook/src/lessons/proceduralMaps/SimulationTerrainPreview.jsx`, `docs/exercise/03-interactive-terrain-playground.md`, `docs/exercise/04-simulation-driven-maps.md`
- **Keywords:** procedural maps, noise functions, Perlin noise, Worley/cellular noise, octave stack, height field, vertex displacement, hydraulic erosion simulation, double-buffered grid state, calibration, wireframe toggle

</details>

