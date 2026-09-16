# Phase 3B step proposal

Approved and implemented with the four requested adjustments: introduce Selectable in step 03, keep StudioEnvironment as a sibling component, teach tag capitalization in step 02, and include sphere segments alongside cylinder and knot segments in step 06.

Keep all ten existing step slugs. Add one early step, **A scene file**, immediately after the opener. This makes eleven steps: the opener remains code-free and every other step carries an extracted block. Renumber filename prefixes only; existing URLs remain stable. No new controls or practice tasks are proposed.

`demo` below means `src/scene/demos/sceneAnatomy/SceneAnatomyDemo.jsx`.
`host` means `src/scene/SceneHost.jsx`.

| Proposed order | Step id | Extracted code target | What the block makes concrete |
| --- | --- | --- | --- |
| 01 | `scene-anatomy/what-is-a-scene` | None | Keep the visual orientation before introducing code. |
| 02 (new) | `scene-anatomy/a-scene-file` | `demo`, `fn: SceneAnatomyDemo` | The overall component: a named function returns JSX inside a fragment, containing the background, `StudioEnvironment`, lights, entities, and ground. Explain that the four named scene sections are defined in the same file and will be opened in the following steps. Explain that uppercase tags in this block are components defined in this file, while lowercase tags come from React Three Fiber. The shared Canvas lives in the host, not in this component. |
| 03 (existing 02) | `scene-anatomy/entities-geometry-and-transform` | `demo`, `region: box` | A complete literal mesh: `position={[-2.5, 0.75, 0]}`, three 1.5-unit geometry arguments, and the material nested inside it. Introduce `Selectable` as the imported selection wrapper on its first appearance. Explain the x/y/z order and the geometry/material/mesh nesting. Introduce named token colors in one sentence: `BOX_ORANGE` reads the site's color token. |
| 04 (existing 03) | `scene-anatomy/matte-and-metal` | `demo`, `region: matte-and-metal` | Box and sphere side by side in source: `meshStandardMaterial`, roughness 0.65 versus 0.15, metalness 0.05 versus 0.9, and sphere radius 1. Both use the same reflection intensity. Highlight the material values. |
| 05 (existing 04) | `scene-anatomy/unlit-surfaces` | `demo`, `region: cone` | `meshBasicMaterial` takes a color without roughness/metalness. `castShadow` belongs to the mesh independently of whether its material responds to lights. |
| 06 (existing 05) | `scene-anatomy/curved-geometry` | `demo`, `region: curved-geometry` | The sphere uses `[1, 48, 48]`: radius, width segments, and height segments. The literal cylinder arguments `[0, 0.9, 1.8, 32]` make a cone with zero top radius. The knot uses `[0.6, 0.2, 160, 32]`: radius, tube radius, and the two segment counts. Introduce those names while retaining the point about how curvature reveals a material. |
| 07 (existing 06) | `scene-anatomy/the-floor-and-the-grid` | `demo`, `region: floor-and-grid` | The 60-by-60 plane, its horizontal rotation, shadow reception and 0.35 shadow opacity; then `Grid` at y=0.01 with 0.5-unit cells, 2.5-unit sections, and a 35-unit fade distance. |
| 08 (existing 07) | `scene-anatomy/lights-that-cast-no-shadow` | `demo`, `region: fill-lights` | `ambientLight intensity={0.4}` and `hemisphereLight` with its two named token colors and intensity 0.5. Two tags express the two lighting roles. |
| 09 (existing 08) | `scene-anatomy/the-key-light-and-shadows` | `demo`, `region: key-light` | A directional light at `[8, 12, 5]`, intensity 2.5, `castShadow`, and a 2048-by-2048 shadow map. Connect these properties to the existing four-part shadow checklist. |
| 10 (existing 09) | `scene-anatomy/what-the-camera-sees` | `host`, `region: canvas-camera` | The real shared Canvas opening tag: camera position `[6, 5, 8]`, fov 50, near 0.1, far 200, and shadow rendering enabled. Label this as an opening tag excerpt; the following step shows its controls. |
| 11 (existing 10) | `scene-anatomy/moving-the-camera` | `host`, `region: orbit-controls` | Actual `OrbitControls`: damping 0.08, minimum/maximum distance 3/40, maximum polar angle, and the shared target. Explain that `DEFAULT_TARGET` is `[0, 0.75, 0]`, declared in the same file. |

## Prose and presentation

Each block will be introduced in the preceding prose, with 60–200 words per step. Trim repeated description where the code now supplies the numbers. Highlight only the lines that carry the current idea. Keep the four existing entity positions, material properties and tokens, camera behavior, and scene controls intact. All blocks are read-only; the Phase 4A override API is unchanged.

The new scene-file step introduces the enclosing structure without dumping the entire file into the card. Its `StudioEnvironment`, `SceneLights`, `SceneEntities`, and `SceneGround` sections are ordinary components in the same source file. Inside `SceneEntities`, all four meshes are written literally; no geometry or material dispatcher remains.

## Work already completed for review

- The extractor accepts JavaScript line-comment and JSX comment regions, strips nested markers, and still fails on missing or unclosed regions.
- `acorn-jsx` was already wired in through `Parser.extend(jsx())`; it was not merely an unused dependency. Added regression coverage for JSX-returning functions and fixed attached comments on `export default` functions.
- The environment helper and selection wiring are separate modules. Picker/plan metadata now contains only id, name, subtitle, color token, plan position and approximate plan radius.
- Camera values are visible on the single Canvas. Camera reset remembers that camera's initial position rather than keeping a second copy of the position numbers.
- All four 3D selection views and all four plan selections match their pre-refactor screenshots exactly. Evidence is in `artifacts/phase3b/`.

Implementation uses this eleven-step structure. Existing step slugs are unchanged, all ten steps after the opener carry real extracted code, and each step remains within 60?200 words. Named closing region markers let the sphere belong to both the materials and curved-geometry snippets without duplicating its JSX.
