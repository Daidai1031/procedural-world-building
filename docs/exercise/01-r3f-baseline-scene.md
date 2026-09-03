# Exercise 01 — React Three Fiber Baseline Scene

**Date:** 2026-09-02  
**Project:** [`my-first-react`](../../my-first-react/)  
**Main implementation:** [`src/App.jsx`](../../my-first-react/src/App.jsx)  
**Status:** Baseline complete

## Exercise goal

Create a small full-window 3D scene and use it as a controlled baseline for comparing geometry, materials, lights, shadows, a spatial grid, and camera interaction.

This note records the implementation experience. The prerequisite concepts belong in [`docs/tutorials`](../tutorials/).

## Source files

| File | Why it matters in this exercise |
| --- | --- |
| [`index.html`](../../my-first-react/index.html) | Supplies the `#root` DOM node and loads `/src/main.jsx` |
| [`src/App.jsx`](../../my-first-react/src/App.jsx) | Defines the 3D scene, geometry, materials, lights, floor, grid, camera, and controls |
| [`src/main.jsx`](../../my-first-react/src/main.jsx) | Mounts `App` inside React `StrictMode` |
| [`src/index.css`](../../my-first-react/src/index.css) | Makes `html`, `body`, and `#root` fill the window and removes scrolling |
| [`src/App.css`](../../my-first-react/src/App.css) | Was still unused at the end of Exercise 01; Exercise 02 later replaced and imported it for the learning UI |
| [`src/assets/`](../../my-first-react/src/assets/) | Contains starter image/SVG assets that were not imported by this exercise |
| [`package.json`](../../my-first-react/package.json) | Records the React, Three.js, React Three Fiber, Drei, and Vite dependencies |

> **Historical note:** an exercise note records the code state when that exercise was completed. The links above intentionally open the evolving current files, so later exercises may have changed them. At the end of Exercise 01, `App.css` and the starter assets were unused. Exercise 02 then imported `App.css` and turned it into the learning-panel stylesheet.

The load path for this baseline was `index.html → main.jsx → App.jsx → Canvas`. In parallel, `main.jsx` imported `index.css` to give the page and Canvas a full-window parent size.

## What the exercise produced

The browser displays a full-window Three.js canvas with a dark blue-black background. Four objects stand on a fading reference grid:

- a matte red box on the left;
- a polished blue metallic sphere in the center;
- a yellow unlit cone on the right;
- a glossy green torus knot behind the sphere.

The mouse can orbit, zoom, and pan the camera. All four objects cast shadows onto an otherwise invisible floor.

## Implemented component structure

```text
App
└── Canvas
    ├── Background color
    ├── AmbientLight
    ├── HemisphereLight
    ├── DirectionalLight
    ├── SampleGeometry
    │   ├── Box
    │   ├── Sphere
    │   ├── Cone
    │   └── TorusKnot
    ├── Shadow-catching floor
    ├── Grid
    └── OrbitControls
```

The geometry was grouped in `SampleGeometry`, while the scene-level systems remained in `App`. This is a useful first separation, although the four objects are not yet reusable components.

## Geometry and material settings

| Object | Transform and shape | Material settings | Observed purpose |
| --- | --- | --- | --- |
| Box | Position `[-2.5, 0.75, 0]`; size `1.5 × 1.5 × 1.5` | Red standard material; roughness `0.65`; metalness `0.05` | Reads as a mostly non-metallic matte surface |
| Sphere | Position `[0, 1, 0]`; radius `1`; `48 × 48` segments | Blue standard material; roughness `0.15`; metalness `0.9` | Makes direct-light highlights easy to see; without an environment map the metal has limited reflections |
| Cone | Position `[2.5, 0.9, 0]`; radii `0/0.9`; height `1.8`; `32` segments | Yellow basic material | Stays consistently colored because `MeshBasicMaterial` ignores the scene lights |
| Torus knot | Position `[0, 1, -3]`; radius `0.6`; tube `0.2`; `160 × 32` segments | Green standard material; roughness `0.25`; metalness `0.4` | The curved surface exposes highlight changes more clearly than a flat face |

Practical detail: the cone uses `cylinderGeometry`. Setting the top radius to zero converts the cylinder profile into a cone.

## Lighting setup and observations

```jsx
<ambientLight intensity={0.4} />
<hemisphereLight args={['#bcd4ff', '#4a3b2a', 0.5]} />
<directionalLight
  position={[8, 12, 5]}
  intensity={2.5}
  castShadow
  shadow-mapSize={[2048, 2048]}
/>
```

- The ambient light prevents the dark sides of standard materials from becoming completely black.
- The hemisphere light adds cool influence from above and warm influence from below. It helps describe form but does not cast shadows.
- The directional light is the main/key light. From `[8, 12, 5]` it points toward its default target at the origin. Its position determines light direction, not distance falloff.
- The directional light is the only shadow-casting light in this exercise. A `2048 × 2048` map was chosen for reasonably sharp shadows, with a higher GPU cost than a smaller map.

## Shadow setup: the complete chain

Getting a visible shadow required all of these settings to be present:

1. `<Canvas shadows>` enables shadow rendering.
2. The directional light uses `castShadow`.
3. Each visible object uses `castShadow`.
4. A horizontal plane uses `receiveShadow`.
5. The plane uses `<shadowMaterial opacity={0.35} />`, so only the shadow is visible.

The box and sphere also use `receiveShadow`; the cone and torus knot do not. This difference is useful for later experiments involving one object shadowing another.

## Grid implementation

The Drei `Grid` provides scale and ground orientation without replacing the shadow floor.

| Parameter | Value | Practical effect |
| --- | --- | --- |
| `position` | `[0, 0.01, 0]` | Raises the grid slightly above the shadow plane to reduce z-fighting |
| `cellSize` | `0.5` | Minor grid interval |
| `sectionSize` | `2.5` | Major line every five minor cells |
| `infiniteGrid` | enabled | Makes the grid appear to continue beyond its base geometry |
| `fadeDistance` | `35` | Prevents distant lines from visually overwhelming the scene |

The grid communicates spatial scale; the transparent plane receives shadows. Keeping these as separate objects makes their responsibilities clear.

## Camera and controls

The `Canvas` creates a perspective camera:

```jsx
camera={{ position: [6, 5, 8], fov: 50, near: 0.1, far: 200 }}
```

- `[6, 5, 8]` starts above the ground, looking diagonally from the positive X and Z sides after the controls target is applied.
- A `50°` field of view gives a natural perspective without strong wide-angle distortion.
- The `0.1–200` clipping range is much larger than the current objects need, leaving room for later scene expansion.

`OrbitControls` uses:

```jsx
<OrbitControls
  makeDefault
  enableDamping
  dampingFactor={0.08}
  minDistance={3}
  maxDistance={40}
  maxPolarAngle={Math.PI / 2.05}
  target={[0, 0.75, 0]}
/>
```

Practical results:

- The camera orbits around `[0, 0.75, 0]`, not around its own position.
- The target is slightly above the floor, close to the visual center of the objects.
- Zoom is limited to `3–40` units so the camera cannot move extremely close or far away.
- Damping factor `0.08` gives the controls a smooth stop.
- The maximum polar angle is about `87.8°`, keeping the camera above the ground.
- Pan and zoom were not explicitly disabled, so their OrbitControls defaults remain available.

## Practical takeaways

1. Material comparisons are most informative when geometry and lighting remain fixed.
2. `MeshBasicMaterial` is a useful control case because it separates base color from light response.
3. Metallic standard materials need reflected surroundings to look fully convincing; adding an environment map is a natural next exercise.
4. Shadows fail silently when any link in the renderer–light–caster–receiver chain is missing.
5. The control target is as important as camera position when composing an orbiting view.
6. Raising the grid by `0.01` is a small but important fix for overlapping-surface flicker.

## Follow-up experiments on this baseline

- [ ] Change roughness and metalness one parameter at a time and record screenshots.
- [ ] Disable each light separately and note exactly which surfaces change.
- [ ] Move the directional light and predict the shadow direction before running the scene.
- [ ] Add an environment map and compare the metallic sphere before and after.
- [ ] Configure the directional-light shadow camera and visualize it with a helper.
- [ ] Extract each primitive into a reusable component with props.
- [ ] Animate one object with `useFrame`.
- [ ] Replace one primitive with a glTF model.
- [ ] Compare performance after reducing the sphere and torus-knot segment counts.

