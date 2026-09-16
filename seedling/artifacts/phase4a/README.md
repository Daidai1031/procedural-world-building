# Phase 4a evidence

Machinery only: the three throwaway tasks live in `tests/fixtures/phase4a.jsx`. No lesson tasks were added.

## Architecture

- `functionOverrides.js` resolves internal noise calls. `sceneStore` owns step-scoped override descriptors; nothing from that table enters persistence.
- Learner functions execute only in a fresh native Vite module worker. Each run has a two-second deadline, termination, cancellation and structured-clone inputs/results. Network capabilities are removed from the worker and its prototype chain. Dynamic import, eval, function constructors and string timers are unavailable.
- Map overrides evaluate the real maths at the inset, mesh and simulation seed coordinates. Both views publish the same validated result table at once. Comparison variants are evaluated separately in the same batch. There is no main-thread learner compilation or per-pixel worker messaging.
- On a parameter edit, the last published field remains visible until its replacement passes. A newly resized mesh temporarily samples the nearest point in that previous field. Completed evaluations use the actual view coordinates. Stale completions cannot cross a step change. Refresh runs independently of whether the code card is expanded.
- `stepHydraulicErosion` edits run in the same sandbox. Both simulation views use the returned shared simulation state. Invalid later timesteps preserve the last state, pause playback and restore the previous rule. The normal erosion path remains synchronous and does not start workers.
- `match` compares two 64 x 64 grids using only the named parameters. It ignores scene overrides and is rejected outside chapter 1 during extraction.
- `fill` uses the Phase 3 extractor and Shiki `CodeBlock`, replacing answer spans with accessible controls. Whitespace normalization uses JavaScript tokens so whitespace inside strings remains significant. Malformed input is an incorrect answer, not a render error.
- `implement` runs learner and extracted course source on identical cases. Visual results are three 2D canvases. Three failures make the reference-reveal button available; the code remains hidden until chosen.
- CodeMirror uses `codeTheme.js` and the existing CSS tokens. Read-only and editable code use the same 16px data font and line height.
- `seedling.progress.v2` stores attempts, failures, pass state and current work. Tutor buttons contain context objects and remain disabled. Navigation is independent of practice.

## Added noise exports

`fractalNoise`, `shapeValue`, `valueNoise2D`, and `perlin2d` are the supported internal function targets for practice references and live edits. No other private noise helpers were exported. `sampleProceduralMap` and `DEFAULT_MAP_SETTINGS` were already public.

## Performance

`node scripts/benchmark-practice.mjs` compares the current no-override sampler with the version at HEAD, interleaving warmed measurements. See `performance.json` for the recorded machine-specific results:

- 48 x 48 noise grid: 1.42 ms baseline, 1.76 ms with resolution indirection; approximately 0.33 ms added at initialization/reset.
- Erosion timestep: approximately 0.15 ms, or 0.30% of the 50 ms budget at the maximum 20 Hz setting. No noise resolver calls occur inside the erosion timestep.
- `browser-rate.json` records playback at the maximum configured rate under Chrome with software WebGL. This is a browser timing check, not just a math microbenchmark.

## Verification

Passed: `npm run lint` (no warnings), `npm run build`, `npm test` (15 tests), `npm run test:browser` (13 tests). Vite still reports the large application chunk and notes that the math source module is both statically and dynamically imported; neither is a build failure.

Unit coverage includes resolver fallback/overrides/clearing, masked scoring, finite-value comparisons, whitespace handling, shared extraction and chapter restriction. Browser coverage includes page responsiveness during infinite loops, the two-second deadline, network escape attempts, structured cloning, the actual terrain heights and inset pixels, runtime/syntax/timeout retention, mesh changes, navigation/reload clearing, all three practice kinds, persistence, explicit reference reveal and simulation playback. Existing Phase 3 and lesson navigation regressions also run.

Screenshots: `override.png`, `implement.png`, `simulation.png`. `sandbox.json` records timeout timing and page heartbeat ticks.
