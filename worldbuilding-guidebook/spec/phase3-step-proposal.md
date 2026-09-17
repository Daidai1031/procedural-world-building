# Phase 3 step proposal — approved and implemented

The user approved this breakdown. Both chapters are implemented with 12 steps each. Slugs remain unique within the lesson, and `chapter.yaml` uses only flat, single-line values.

All function steps use `noise-terrain`; all simulation steps use `simulation-terrain`. Both chapters use their matching 2D inset. The `map*` parameters are deliberately shared between demos; simulation-only parameters use `erosion*` names.

## 1-functions — Functions

| Step | Proposed title | Teaching focus and interaction | Extracted source |
| --- | --- | --- | --- |
| 01 | Grid positions, cells, and vertices | Locate samples; distinguish cells from vertices; adjust mesh resolution. | — |
| 02 | Position, function, value | Deterministic sampling and changing the seed. | `hash2D` |
| 03 | From samples to a 2D map | Read grayscale values; swap map and terrain. | — |
| 04 | From white noise to value noise | Independent samples versus interpolated values. | `valueNoise2D` |
| 05 | Perlin versus Worley | Corner gradients versus feature-point distances; Q3 toggle and split inset. | `perlin2d` |
| 06 | Frequency sets feature size | Separate feature scale from grid resolution. | — |
| 07 | Octaves add smaller detail | Layer increasing frequencies. | `noise-octaves` region |
| 08 | Persistence sets each layer’s strength | Balance fine detail against broad forms. | — |
| 09 | Shape the output | Compare ridged, billow, and turbulence outputs. | `shapeValue` |
| 10 | Terraces and power curves | Stepped elevations versus biased height distributions. | — |
| 11 | Warp the sampling positions | Change input coordinates to bend features. | `domain-warp` region |
| 12 | Values become terrain height | Amplitude, elevation legend, wireframe, and the function pipeline. | — |

## 2-simulation — Simulation

| Step | Proposed title | Teaching focus and interaction | Extracted source |
| --- | --- | --- | --- |
| 01 | A map that remembers | Stored state versus evaluating a function. | — |
| 02 | Seed the height field | Initialize terrain, water, and sediment. | `createErosionState` |
| 03 | Advance one timestep | Start, pause, step, and reset shared simulation state. | — |
| 04 | Read the neighborhood | Four adjacent cells; distinguish local updates from flood fill. | `four-neighbors` region |
| 05 | Rain adds water | Rainfall per timestep. | `rainfall` region |
| 06 | Water follows surface height | Terrain plus water drives downhill flow. | `downhill-flow` region |
| 07 | Moving water carries sediment | Slope, flow, and carrying capacity. | — |
| 08 | Erosion removes terrain | Capacity and erosion strength. | `erosion-deposition` region |
| 09 | Deposition returns sediment | Where excess sediment settles. | — |
| 10 | Transport and evaporation | Move sediment, remove water, inspect the map overlay. | `evaporation` region |
| 11 | Calibrate the scales | World size, simulation cells, mesh resolution, height amplitude. | `sampleSimulationGrid` |
| 12 | Read the evolved landscape | Inspect changes from the initial state, measurements, wireframe, and the simulation pipeline. | — |

Completed: 85–98 words per step, frontmatter and extracted source highlights, actual nested lesson navigation verification, and removal of `src/lessons/` and its integration layer. Practice and live editing remain in their later roadmap phases.
