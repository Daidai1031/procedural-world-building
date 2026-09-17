# Phase 3B evidence

Completed the approved eleven-step Lesson 01 structure and all four requested adjustments. The original ten step slugs are unchanged; only filename ordering changed. The new `a-scene-file` step follows the opener. Every step except the opener now carries a real extracted, read-only code block. All prose stays within 60–200 words.

No Lesson 02 content, Phase 4A override API, or existing Phase 3/4A browser test was edited.

## Approved adjustments

- Step 03 includes `Selectable` in its first mesh snippet and explains its imported selection behavior before the code.
- `StudioEnvironment` is defined in the same file and contains the actual `primitive`. It appears alongside `SceneLights`, `SceneEntities`, and `SceneGround` in the complete scene-component snippet.
- Step 02 explains that uppercase tags in this block name components defined in this file, while lowercase tags come from React Three Fiber. Later prose explicitly identifies imported `Selectable`, `Grid`, and `OrbitControls` components.
- Step 06 shows sphere `[1, 48, 48]`, cylinder `[0, 0.9, 1.8, 32]`, and knot `[0.6, 0.2, 160, 32]` geometry arguments together. It teaches size arguments followed by segment counts, with the three geometry lines highlighted.

## Extractor findings

`acorn-jsx` was already active through `Parser.extend(jsx())` before this phase. JSX-returning functions already parsed. The initial new tests failed because JSX comment regions were not recognized and an attached comment before an `export default` function was omitted. Both cases now pass.

The extractor accepts both line-comment and JSX-comment regions, strips nested markers, preserves source line numbers, and reports missing/unclosed regions. Named endings such as `{/* #endregion matte-and-metal */}` allow overlapping snippets: the same literal sphere appears in both the materials and curved-geometry blocks. No source code is duplicated to assemble these snippets.

## Scene changes

The four meshes use literal geometry arguments, positions, and material properties. Named colors read the existing tokens. `Selectable` clones the mesh to supply scale and click handling without adding a transform group. `useStudioEnvironment` is a separate module. `entities.js` now contains only plan-and-picker metadata, with explicitly approximate footprints and a manual synchronization comment.

The camera's literal values live on the single Canvas; reset retains its initial position without duplicating those numbers. Camera and controls excerpts come from `SceneHost.jsx`.

## Visual evidence

Before-refactor images were captured from the original Lesson 01 route in Chrome at 1440 x 1000, using the configured software WebGL renderer. Scene captures hide all UI overlays and descendants; the plan is captured separately. Each entity was selected in turn. After-refactor captures use the same route, camera, viewport, selections and reduced-motion setting.

All eight pairs are byte-identical PNGs and have **zero changed pixels**. See `screenshot-comparison.json` and `pixel-diff.json`.

- `scene-{box,sphere,cone,torus}-{before,after,diff}.png`
- `plan-{box,sphere,cone,torus}-{before,after,diff}.png`

`tests/phase3b.spec.js` checks the fixed baseline and navigates all eleven real steps without replacing the canvas. `step-02-code.png`, `step-03-code.png`, `step-06-code.png`, and `step-10-code.png` show the authored blocks and highlights. These screenshots were visually inspected.

## Content evidence

`content-audit.json` records each step's word count, code target, highlight lines and extracted source location. `proposed-snippets.json` contains the extracted source used to verify the approved targets. The build now extracts 23 snippets: 10 for Lesson 01 and the unchanged 13 for Lesson 02.

## Checks

- `npm run lint`: passed, no warnings.
- `npm run build`: passed; pre-existing Vite chunk-size and mixed static/dynamic-import advisories remain.
- `npm test`: 21 tests passed.
- `npm run test:browser`: 15 tests passed, including all existing Phase 3 and Phase 4A tests unchanged.
