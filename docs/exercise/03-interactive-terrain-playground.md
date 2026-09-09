# Exercise 03 — Interactive Terrain Playground

**Date:** 2026-09-09  
**Course section:** Lesson 2.1 — Functions  
**Project:** [`seedling`](../../seedling/)  
**Main implementation:** [`src/lessons/NoiseTerrainLesson.jsx`](../../seedling/src/lessons/NoiseTerrainLesson.jsx)  
**Status:** In progress

## Exercise goal

Build a function-based procedural map step by step. Start with a grid, sample a
noise function into a 2D map, and then interpret the same values as a 3D height
field.

```text
grid → positions → noise stack → 2D map → height field → 3D terrain
```

## Source files

| File | Why it matters in this exercise |
| --- | --- |
| [`src/lessons/NoiseTerrainLesson.jsx`](../../seedling/src/lessons/NoiseTerrainLesson.jsx) | React state, noise/terrain controls, and the linked 2D/3D previews |
| [`src/lessons/proceduralMaps/noiseMath.js`](../../seedling/src/lessons/proceduralMaps/noiseMath.js) | Repeatable hash, white/value/Perlin/cellular noise, and the octave stack |
| [`src/lessons/proceduralMaps/NoiseMapPreview.jsx`](../../seedling/src/lessons/proceduralMaps/NoiseMapPreview.jsx) | Draws the sampled values as a 2D grayscale map |
| [`src/lessons/proceduralMaps/TerrainPreview.jsx`](../../seedling/src/lessons/proceduralMaps/TerrainPreview.jsx) | Displaces mesh vertices to show the same map as 3D terrain |
| [`src/lessons/index.js`](../../seedling/src/lessons/index.js) | Registers this lesson as `02 — Creating Procedural Maps` in the navigation |

## Required

- [ ] Create a grid with a deliberate resolution.
- [ ] Use each grid position as input to a repeatable noise function.
- [ ] Build a coherent noise stack with adjustable frequency, octaves, and persistence.
- [ ] Display the sampled values as a 2D grayscale map.
- [ ] Interpret the 2D map as a height field.
- [ ] Displace grid vertices to display the height field as 3D terrain.
- [ ] Provide controls that make the important noise and terrain parameters explorable.

## What the exercise produced

Lesson 2.1 currently includes linked 2D and 3D previews for White, Value, Perlin,
and Cellular/Worley noise, plus noise-stack and shaping controls. The 2D map and
the 3D mesh read the same sampled values, so changing a control updates both
views together. The assignment brief above remains the reference for evaluating
the complete exercise.

## Terms to understand while building

- **Grid:** an ordered set of sample positions arranged in rows and columns.
- **Vertex:** one editable point in the 3D grid geometry.
- **Resolution:** the number of samples or vertices available to represent detail.
- **Noise function:** a repeatable mapping from a position and seed to a value.
- **Coherent noise:** noise whose nearby samples change smoothly rather than independently.
- **Noise stack:** multiple noise octaves combined at different frequencies and amplitudes.
- **2D map:** one stored or displayed value for every X/Z position.
- **Height field:** a 2D value map interpreted as elevation.
- **Vertex displacement:** moving each grid vertex according to its height value.
- **Shaping:** remapping noise values into ridges, terraces, billows, or other designed forms.

## Follow-up experiments

- [ ] Sample the same seed at two grid resolutions and compare the 2D maps.
- [ ] Change frequency, octaves, and persistence one at a time and record screenshots.
- [ ] Add a shaping mode (ridged, terraced, billow) and note how the height field changes.
- [ ] Interpret one noise channel as a moisture map instead of elevation.
- [ ] Reuse the height field as the starting state for the Lesson 2.2 simulation.
