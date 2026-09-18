# Exercise 04 — Simulation-Driven Maps

**Date:** 2026-09-09  
**Course section:** Lesson 2.2 — Simulation  
**Project:** [`worldbuilding-guidebook`](../../worldbuilding-guidebook/)  
**Main implementation:** [`src/lessons/proceduralMaps/simulationMath.js`](../../worldbuilding-guidebook/src/lessons/proceduralMaps/simulationMath.js)  
**Status:** Complete

## Exercise goal

Extend the procedural map app with a simulation-based map, then calibrate the
simulation, height field, and terrain resolution so they produce believable
topography together.

## Source files

| File | Why it matters in this exercise |
| --- | --- |
| [`src/lessons/proceduralMaps/simulationMath.js`](../../worldbuilding-guidebook/src/lessons/proceduralMaps/simulationMath.js) | State creation, erosion step, bilinear grid sampling, and statistics |
| [`src/lessons/proceduralMaps/SimulationMapPreview.jsx`](../../worldbuilding-guidebook/src/lessons/proceduralMaps/SimulationMapPreview.jsx) | 2D state view of height and water |
| [`src/lessons/proceduralMaps/SimulationTerrainPreview.jsx`](../../worldbuilding-guidebook/src/lessons/proceduralMaps/SimulationTerrainPreview.jsx) | 3D height field and height-based material |
| [`src/lessons/NoiseTerrainLesson.jsx`](../../worldbuilding-guidebook/src/lessons/NoiseTerrainLesson.jsx) | React state, timer, controls, wireframe shortcut, and concept explanations |

## Required

- [x] Create a height field driven by your noise stack.
- [x] Add a simulation map section to your app that starts and stops the simulation.
- [x] Calibrate your maps and terrain resolution to achieve believable topography.

## Optional / Ideas

- [x] Create a material or shader that changes based on height.
- [ ] Create an infinite map scroller that uses the keyboard to navigate the map.
- [x] Create a shortcut to toggle wireframe on and off.

## What the exercise produced

Lesson 2.2 now runs a simplified hydraulic-erosion simulation. The terrain begins
as the seeded noise stack from Exercise 03. Every cell then stores three values:

- `height`: the current terrain elevation;
- `water`: water available to flow this timestep;
- `sediment`: terrain material currently carried by water.

The interface shows the same state in two forms. The left canvas draws the 2D
height-and-water map, while the right Three.js mesh samples the updated height
grid and displaces its vertices. Start, Pause, Step once, and Reset make the
time dimension visible instead of hiding it inside an animation loop.

## Terms to understand while building

- **Simulation map:** a map whose values are stored and updated over time.
- **State:** all values currently stored in the simulation grid.
- **Time step:** one update from the current grid to the next grid.
- **Local neighborhood:** the nearby cells read by a cell's update rule.
- **Emergence:** large-scale structure produced by repeated local rules.
- **Calibration:** tuning map scale, simulation behavior, and mesh resolution so the result works as one terrain system.

## Knowledge points mapped to code

| Concept | Implementation |
| --- | --- |
| Simulation map | `createErosionState` creates stored typed-array grids; the 2D preview reads them directly. |
| State | `height`, `water`, `sediment`, and `iteration` together describe the current system. |
| Time step | `stepHydraulicErosion` reads the old arrays and writes separate next arrays. |
| Local neighborhood | Each cell compares north, east, south, and west, then flows toward the steepest drop. |
| Emergence | Repeated rain, flow, erosion, transport, deposition, and evaporation create channels without a channel-drawing rule. |
| Calibration | Independent controls expose simulation resolution, mesh resolution, world size, and height amplitude. |

The two-buffer update is important. If the loop modified one grid in place,
cells near the end would read newer data than cells near the beginning. Reading
`grid(t)` and writing `grid(t+1)` gives every cell the same definition of one
timestep.

## Hydraulic erosion rule

For each cell and timestep:

1. Add rainfall to stored water.
2. Compare `height + water` with the four side neighbors.
3. Send some water toward the largest downhill drop.
4. Compute sediment capacity from water flow and slope.
5. Erode when the water can carry more; deposit when it carries too much.
6. Move sediment with the water and evaporate part of the remaining water.

This is a teaching model rather than a full fluid solver. Its purpose is to
make state, neighborhood rules, and repeated updates inspectable.

## Calibration guide

- **Simulation resolution** changes how many cells execute the erosion rule.
  More cells reveal smaller channels but cost more work per timestep.
- **Terrain mesh resolution** changes how many vertices display the state. A
  denser mesh smooths interpolation but cannot invent missing simulated detail.
- **World size** changes cell spacing. The UI reports
  `world size / (simulation resolution - 1)` so the scale is explicit.
- **Height amplitude** changes vertical exaggeration only; it does not alter the
  normalized simulation values.

Start with the provided 48 × 48 simulation, 64 × 64 terrain mesh, 10-unit world,
and 2.4 height amplitude. Keep terrain resolution at least as high as simulation
resolution, then change one parameter at a time.

## Observed behavior

Press `W` outside an input, or use the panel button, to toggle wireframe. The
infinite scroller remains an optional future extension.

## Verification

- `npm.cmd run build`: passed.
- `npm.cmd run lint`: passed.
- A 250-step numerical run kept height, water, and sediment values finite.
- The existing Vite large-chunk warning remains; it does not block the build.

## Follow-up experiments

- [ ] Add the keyboard infinite-map scroller from the optional list.
- [ ] Expose rainfall, evaporation, and sediment capacity as live controls.
- [ ] Compare channel patterns across three simulation resolutions at a fixed seed.
- [ ] Feed a shaped noise field (ridged) into the simulation and observe erosion.
- [ ] Record height/water/sediment statistics over time and plot them.
