# Interactive 3D Canvas with Three.js + React (Beginner)

> For the Delirious NYC project: this builds the "basic Three.js scene, camera, lighting, and controls" item in `docs/planning/backlog.md`. The scene you build here becomes the stage the procedural city is later generated onto.

## The Exercise

| # | Requirement | What you will use |
|---|-------------|-------------------|
| 1 | Create an orbit camera | `<Canvas camera>` + `<OrbitControls />` |
| 2 | Create some sample geometry in the scene | `<mesh>` + `<boxGeometry>`, `<sphereGeometry>`, … |
| 3 | Include a light | `<ambientLight>` + `<directionalLight>` |
| 4 | Specify the color and type of material | `<meshStandardMaterial color=… />` |
| 5 | A "world grid" that fades on distance | `<Grid fadeDistance={…} />` from drei |
| 6 | Define the background color of your scene | `<color attach="background" />` |

Every requirement maps to a few lines of JSX. The full assembled file is in Section 9.

## Prerequisites

| Skill | Required? | Notes |
|-------|-----------|-------|
| React basics | Required | Components, JSX, props — see [React Basics](./react-basics.md) |
| `useState` / `useRef` | Recommended | Only needed for the animation bonus |
| Three.js | Not required | We start from zero |
| 3D math | Not required | You only need to know that positions are `[x, y, z]` |

---

## 1. Setup

### Install the packages *inside the project folder*

The three 3D packages must live in the same folder as `package.json` of your Vite app. From the repo root:

```bash
cd dd699/my-first-react
npm install
npm install three @react-three/fiber @react-three/drei
npm run dev
```

> **Common mistake:** running `npm install three …` one level too high (in `dd699/` instead of `dd699/my-first-react/`). Vite will then fail with `Failed to resolve import "@react-three/fiber"`. If that happened, delete the stray `dd699/node_modules/` and `dd699/package.json`, then re-run the commands above from inside `my-first-react`.

### What each package does

| Package | Role |
|---------|------|
| `three` | The 3D engine itself — cameras, meshes, materials, the WebGL renderer |
| `@react-three/fiber` (R3F) | A React **renderer** for Three.js. Lets you describe a 3D scene with JSX instead of imperative code |
| `@react-three/drei` | A helper library of ready-made components: `OrbitControls`, `Grid`, `Environment`, and ~100 more |

You are not "learning two frameworks." R3F is just React whose output happens to be a 3D scene graph instead of DOM nodes.

---

## 2. The Mental Model

In plain Three.js you write imperative setup code:

```js
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: "orange" });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
```

In R3F you write the same thing declaratively:

```jsx
<mesh>
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial color="orange" />
</mesh>
```

Three translation rules cover almost everything:

1. **A lowercase JSX tag = a Three.js class.** `<mesh>` → `THREE.Mesh`, `<boxGeometry>` → `THREE.BoxGeometry`, `<directionalLight>` → `THREE.DirectionalLight`. Capitalized tags (`<Grid>`, `<OrbitControls>`) are React components from drei.
2. **`args={[...]}` = constructor arguments.** `new THREE.BoxGeometry(2, 1, 3)` becomes `<boxGeometry args={[2, 1, 3]} />`. `args` is only read once, on creation.
3. **Any other prop = a property assignment.** `mesh.position.set(0, 1, 0)` becomes `position={[0, 1, 0]}`. Nested properties use dashes: `shadow-mapSize={[2048, 2048]}` sets `light.shadow.mapSize`.

Nesting means "attach to the parent." A `<boxGeometry>` inside a `<mesh>` becomes that mesh's `geometry`. When the target property isn't guessable, say so explicitly with `attach` — that is why the background color is written `<color attach="background" />` (it assigns to `scene.background`).

---

## 3. The Canvas and the Background Color

`<Canvas>` creates the renderer, the scene, and a default camera, and it runs the render loop for you. Everything 3D must live inside it; everything outside it is normal DOM.

```jsx
// src/App.jsx
import { Canvas } from "@react-three/fiber";

export default function App() {
  return (
    <Canvas>
      <color attach="background" args={["#11151c"]} />
    </Canvas>
  );
}
```

**Requirement 6 done.** `args={["#11151c"]}` is the argument to `new THREE.Color("#11151c")`, and `attach="background"` assigns it to `scene.background`.

### Make the canvas fill the window

`<Canvas>` sizes itself to its parent element, and Vite's starter CSS constrains that parent — so without this step you get a small canvas or a blank strip. Replace the contents of `src/index.css`:

```css
* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
```

At this baseline stage, delete the starter rules in `src/App.css` (or delete the file and remove its import from `App.jsx`). When you later add ordinary DOM UI, create purposeful `App.css` rules for that interface instead of restoring the starter styles.

### Why the JSX and CSS are both necessary here

`App.jsx` and the stylesheets control different layers:

- `App.jsx` creates `<Canvas>`, the Three.js objects inside it, and any DOM interface outside it.
- `index.css` gives the browser page and React root a measurable full-window size. Because `<Canvas>` inherits its parent's size, this global CSS affects whether the scene is visible.
- `App.css` is useful for app-specific DOM elements such as a HUD or learning panel. CSS does not create Three.js meshes, lights, or cameras.

The runtime path is:

```text
index.html → main.jsx → App.jsx → Canvas / DOM UI
                    ├→ index.css (global page size)
                    └→ App.css   (app UI layout)
```

In other words, JSX creates the canvas and UI structure; CSS controls the size and placement of the DOM boxes that contain or overlap that canvas.

---

## 4. The Orbit Camera

Two separate pieces: **where the camera starts**, and **what lets the user move it**.

```jsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

<Canvas camera={{ position: [6, 5, 8], fov: 50, near: 0.1, far: 200 }}>
  {/* ...scene contents... */}
  <OrbitControls makeDefault />
</Canvas>;
```

The `camera` prop configures R3F's default perspective camera:

| Property | Meaning |
|----------|---------|
| `position` | `[x, y, z]`. Y is up, so `[6, 5, 8]` is up and off to one side — a three-quarter view |
| `fov` | Field of view in degrees. 50 is a natural lens; 75 (the default) feels wide-angle |
| `near` / `far` | Clipping range. Objects nearer than `near` or farther than `far` are not drawn |

`<OrbitControls>` adds the interaction: **left-drag orbits, right-drag pans, scroll zooms.** Useful props:

```jsx
<OrbitControls
  makeDefault              // let other drei helpers know this is the active control
  enableDamping            // smooth glide after you release (on by default)
  dampingFactor={0.08}
  minDistance={3}          // how close you can zoom in
  maxDistance={40}         // how far you can zoom out
  maxPolarAngle={Math.PI / 2.05}  // stops the camera going below the ground
  target={[0, 0.75, 0]}    // the point the camera orbits around
/>
```

`maxPolarAngle` is the one worth understanding: the polar angle runs from `0` (directly overhead) to `Math.PI` (directly underneath). Capping it just under `Math.PI / 2` keeps the user above the horizon, which for a city view stops them from flying under the streets.

**Requirement 1 done.**

---

## 5. Sample Geometry

A visible object is a `<mesh>` with two children: a **geometry** (the shape) and a **material** (how it responds to light).

```jsx
<mesh position={[-2.5, 0.75, 0]}>
  <boxGeometry args={[1.5, 1.5, 1.5]} />
  <meshStandardMaterial color="#e2574c" />
</mesh>
```

Note that geometries are centered on their origin, so a box of height `1.5` must sit at `y = 0.75` to rest on the ground plane rather than sink halfway through it.

Common geometries and their `args`:

| Tag | `args` | Notes |
|-----|--------|-------|
| `<boxGeometry>` | `[width, height, depth]` | The workhorse — a city block, a building |
| `<sphereGeometry>` | `[radius, widthSegments, heightSegments]` | Use 32×32 segments for a smooth look |
| `<cylinderGeometry>` | `[radiusTop, radiusBottom, height, radialSegments]` | Set `radiusTop` to 0 for a cone |
| `<planeGeometry>` | `[width, height]` | Flat, single-sided; rotate `[-Math.PI / 2, 0, 0]` to lie flat |
| `<torusKnotGeometry>` | `[radius, tube, tubularSegments, radialSegments]` | A good stress test for materials and lighting |

**Requirement 2 done.**

---

## 6. Lights

`meshStandardMaterial` is physically based: with no lights in the scene, it renders pure black. Almost every "my scene is blank" bug is a missing light.

A three-light setup that reads well and costs little:

```jsx
{/* Fills the whole scene evenly — lifts the shadows so nothing is pure black */}
<ambientLight intensity={0.4} />

{/* Sky color from above, bounced ground color from below — adds subtle realism */}
<hemisphereLight args={["#bcd4ff", "#4a3b2a", 0.5]} />

{/* The "sun": parallel rays from one direction. The only one casting shadows */}
<directionalLight
  position={[8, 12, 5]}
  intensity={2.5}
  castShadow
  shadow-mapSize={[2048, 2048]}
/>
```

| Light | Behavior | Cost |
|-------|----------|------|
| `ambientLight` | Uniform, directionless. Flattens everything | Free |
| `hemisphereLight` | Gradient from a sky color to a ground color | Free |
| `directionalLight` | Parallel rays, like the sun. Position sets *direction*, not distance | Cheap |
| `pointLight` | Radiates from a point, falls off with distance — a lamp | Moderate |
| `spotLight` | A cone with a soft edge | Moderate |

For `directionalLight`, `position` only establishes the direction the light travels from — moving it from `[8, 12, 5]` to `[80, 120, 50]` changes nothing about the brightness.

### Shadows

Shadows need three opt-ins, and missing any one silently produces no shadow:

1. `<Canvas shadows>` — enable the shadow pass
2. `castShadow` on the light **and** on each mesh that should cast
3. `receiveShadow` on whatever the shadow lands on

Since the grid is not a solid surface, add an invisible plane to catch the shadows. `shadowMaterial` draws *only* the shadow and stays transparent everywhere else:

```jsx
<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
  <planeGeometry args={[60, 60]} />
  <shadowMaterial opacity={0.35} />
</mesh>
```

`planeGeometry` is created standing up in the XY plane, so `rotation={[-Math.PI / 2, 0, 0]}` (−90° about X) lays it flat as a floor. Rotations are in **radians**, not degrees.

**Requirement 3 done.**

---

## 7. Materials: Color and Type

The material determines how a surface responds to light. Picking the type is a real decision — it sets both the look and the cost.

```jsx
<meshStandardMaterial color="#e2574c" roughness={0.6} metalness={0.1} />
```

| Material | Reacts to light? | Use it for |
|----------|------------------|------------|
| `meshBasicMaterial` | **No** — flat color always | Debug shapes, UI markers, anything that must stay readable |
| `meshLambertMaterial` | Yes, diffuse only | Cheap matte surfaces, large numbers of objects |
| `meshPhongMaterial` | Yes, with a shiny highlight | The older, cheaper way to get gloss |
| `meshStandardMaterial` | Yes, physically based | **The default choice.** Realistic and predictable |
| `meshPhysicalMaterial` | Yes, PBR + extras | Clearcoat, transmission, real glass — the most expensive |
| `meshNormalMaterial` | No — colors by surface direction | Debugging geometry; needs no lights at all |

The two knobs that matter on `meshStandardMaterial`:

- **`roughness`** (0–1): `0` is a mirror, `1` is chalk. Most real surfaces sit between `0.4` and `0.8`.
- **`metalness`** (0–1): treat this as a switch, not a dial. Real materials are either metal (`1`) or not (`0`); intermediate values are for transitions like worn paint over steel.

A polished metal needs something to reflect, or it just looks black. Either add drei's `<Environment preset="city" />` (it downloads an HDR image on first load) or keep `metalness` low.

Color accepts anything Three.js understands: `"orange"`, `"#e2574c"`, `"rgb(226, 87, 76)"`.

**Requirement 4 done.**

---

## 8. The World Grid That Fades on Distance

You could build this from `<gridHelper>`, but it has no fade — the lines run to the horizon and turn into shimmering moiré noise. drei's `<Grid>` solves exactly this: it is drawn in a shader that dissolves the lines as they get farther from the center, giving you a ground plane that reads as infinite without a hard edge.

```jsx
import { Grid } from "@react-three/drei";

<Grid
  position={[0, 0.01, 0]}
  args={[10, 10]}
  infiniteGrid
  cellSize={0.5}
  cellThickness={0.6}
  cellColor="#3a4250"
  sectionSize={2.5}
  sectionThickness={1.2}
  sectionColor="#5c7cfa"
  fadeDistance={35}
  fadeStrength={1}
/>;
```

| Prop | What it does |
|------|--------------|
| `infiniteGrid` | The grid follows the camera and never ends. Without it, `args={[w, h]}` sets a finite size |
| `cellSize` / `cellColor` / `cellThickness` | The fine lines |
| `sectionSize` / `sectionColor` / `sectionThickness` | The heavier lines every N units — makes scale readable |
| **`fadeDistance`** | Distance (in world units) at which the grid has fully faded out. **This is the requirement** |
| `fadeStrength` | How sharply it fades. `1` is a smooth falloff; lower values keep distant lines visible longer |
| `followCamera` | If `true`, the grid also tracks the camera vertically. Usually leave it `false` |

`position={[0, 0.01, 0]}` lifts the grid a hair above the shadow plane at `y = 0`. Two coplanar surfaces produce **z-fighting** — a flickering stripe pattern where the GPU cannot decide which is in front. A 1 cm offset is invisible and fixes it.

Set `sectionSize` to something meaningful in your world's units. If one unit is one meter and a city block is 80 m, a `sectionSize` of 80 makes the grid a legible measuring tool rather than decoration.

**Requirement 5 done.**

---

## 9. The Complete Scene

Replace `src/App.jsx` with this. It satisfies all six requirements.

```jsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";

function SampleGeometry() {
  return (
    <>
      {/* Box — matte red */}
      <mesh position={[-2.5, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#e2574c" roughness={0.65} metalness={0.05} />
      </mesh>

      {/* Sphere — polished metal */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#7fb2f0" roughness={0.15} metalness={0.9} />
      </mesh>

      {/* Cone — flat color, ignores lighting entirely */}
      <mesh position={[2.5, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0, 0.9, 1.8, 32]} />
        <meshBasicMaterial color="#f2c14e" />
      </mesh>

      {/* Torus knot — glossy, to show off the highlights */}
      <mesh position={[0, 1, -3]} castShadow>
        <torusKnotGeometry args={[0.6, 0.2, 160, 32]} />
        <meshStandardMaterial color="#63d297" roughness={0.25} metalness={0.4} />
      </mesh>
    </>
  );
}

export default function App() {
  return (
    <Canvas
      shadows
      camera={{ position: [6, 5, 8], fov: 50, near: 0.1, far: 200 }}
    >
      {/* 6 — background color */}
      <color attach="background" args={["#11151c"]} />

      {/* 3 — lights */}
      <ambientLight intensity={0.4} />
      <hemisphereLight args={["#bcd4ff", "#4a3b2a", 0.5]} />
      <directionalLight
        position={[8, 12, 5]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* 2 + 4 — geometry and materials */}
      <SampleGeometry />

      {/* Invisible floor that catches shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <shadowMaterial opacity={0.35} />
      </mesh>

      {/* 5 — world grid with distance fade */}
      <Grid
        position={[0, 0.01, 0]}
        args={[10, 10]}
        infiniteGrid
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#3a4250"
        sectionSize={2.5}
        sectionThickness={1.2}
        sectionColor="#5c7cfa"
        fadeDistance={35}
        fadeStrength={1}
      />

      {/* 1 — orbit camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0.75, 0]}
      />
    </Canvas>
  );
}
```

Run `npm run dev` and open `http://localhost:5173`. Drag to orbit, scroll to zoom, right-drag to pan.

---

## 10. Bonus: Animation with `useFrame`

`useFrame` runs its callback on **every rendered frame** (~60 times a second). This is the one place where React's usual rules are deliberately set aside: you mutate the Three.js object directly through a ref instead of calling `setState`, because re-rendering React 60 times a second would be far too slow.

```jsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

function SpinningKnot() {
  const ref = useRef();

  useFrame((state, delta) => {
    ref.current.rotation.y += delta * 0.5;
    ref.current.rotation.x += delta * 0.2;
  });

  return (
    <mesh ref={ref} position={[0, 1, -3]} castShadow>
      <torusKnotGeometry args={[0.6, 0.2, 160, 32]} />
      <meshStandardMaterial color="#63d297" roughness={0.25} metalness={0.4} />
    </mesh>
  );
}
```

Always multiply by `delta` (seconds since the previous frame) rather than adding a fixed amount. Without it, the animation runs at a different speed on a 144 Hz monitor than on a 60 Hz one.

**`useFrame` only works in a component rendered inside `<Canvas>`.** Calling it from `App` — which renders the Canvas rather than living inside it — throws `R3F: Hooks can only be used within the Canvas component!`. The same applies to `useThree`.

---

## 11. Quick Reference

| Concept | One-line summary |
|---------|------------------|
| `<Canvas>` | Creates renderer + scene + camera; everything 3D goes inside |
| Lowercase tag | A Three.js class — `<mesh>`, `<boxGeometry>`, `<pointLight>` |
| Capitalized tag | A React component — `<Grid>`, `<OrbitControls>` |
| `args={[...]}` | Constructor arguments; read once, at creation |
| `attach="x"` | Assign this object to the parent's `.x` property |
| `<mesh>` | Geometry + material = one visible object |
| `position` / `rotation` / `scale` | `[x, y, z]`; rotation is in radians |
| `useFrame` | Per-frame callback; mutate via refs, never `setState` |
| `useThree` | Read the camera, renderer, scene, or viewport size |

Units are arbitrary — `1` means whatever you decide. Pick a convention early (1 unit = 1 meter is the usual choice) and hold to it, because lighting, camera clipping, and shadow quality are all tuned relative to your scale.

---

## 12. Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Everything is black | No lights, or materials are `meshStandard` with nothing lighting them |
| Blank / tiny canvas | The parent element has no height — see the CSS in Section 3 |
| `Failed to resolve import "@react-three/fiber"` | Packages installed in the wrong folder — see Section 1 |
| No shadows | Missing one of: `<Canvas shadows>`, `castShadow` on light **and** mesh, `receiveShadow` on the floor |
| Flickering stripes on the ground | Z-fighting — offset one surface slightly on Y |
| `Hooks can only be used within the Canvas component!` | `useFrame` / `useThree` called outside `<Canvas>` |
| Object half-buried in the floor | Geometry is centered on its origin — raise it by half its height |
| Metal object looks black | Metals reflect their surroundings; add `<Environment />` or lower `metalness` |

Docs: [R3F](https://r3f.docs.pmnd.rs/) · [drei](https://drei.docs.pmnd.rs/) · [Three.js](https://threejs.org/docs/)

---

## 13. Next Steps Toward Delirious NYC

The scene you just built is the foundation for the backlog's procedural geography work:

1. **Replace the sample geometry with district blocks** — an array of district objects rendered with `.map()`, exactly like the district list in the React Basics tutorial, but returning `<mesh>` instead of `<li>`.
2. **Drive material color from data** — `<meshStandardMaterial color={rentToColor(d.rent)} />` makes the city visibly react to its own simulation state.
3. **Scale height from data** — `scale={[1, d.population / 1000, 1]}` turns population into skyline.
4. **Add click handling** — `<mesh onClick={() => setSelectedId(d.id)}>`. R3F handles the raycasting; you get a normal React event handler.
5. **Overlay the UI** — render your React panels as ordinary DOM *outside* `<Canvas>`, positioned above it with CSS. Keep simulation state in a shared parent so both the 3D scene and the panels read from one source of truth.

That fifth point is the architectural decision worth making now: **React owns the state, the 3D scene and the DOM panels are both just views of it.**

A minimal version of that layering looks like this:

```jsx
<main className="app-shell">
  <div className="scene-canvas">
    <Canvas>{/* 3D objects */}</Canvas>
  </div>
  <aside className="learning-panel">{/* normal DOM UI */}</aside>
</main>
```

```css
.app-shell { position: relative; width: 100%; height: 100%; }
.scene-canvas { position: absolute; inset: 0; }
.learning-panel { position: absolute; top: 18px; right: 18px; }
```

`className` is the contract between these two files: JSX declares which class an element has, and CSS supplies the rules for that class. Put shared selection state in `App`, then pass the value and setter to both the scene and panel when either one needs to update the other.
