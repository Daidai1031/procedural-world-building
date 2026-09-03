# Exercise 02 — Scene Learning UI

**Date:** 2026-09-02  
**Project:** [`my-first-react`](../../my-first-react/)  
**Implementation:** [`src/App.jsx`](../../my-first-react/src/App.jsx), [`src/App.css`](../../my-first-react/src/App.css)  
**Status:** Complete

## Exercise goal

Add an on-screen reference that explains the live 3D scene without hiding the scene itself. The UI needs to expose every visible entity, the world/background, lights, camera, and controls. It should also demonstrate a repeatable way to add another information group.

## What was implemented

The app now has a glass-style learning panel over the right side of the 3D canvas. Its collapsible groups cover:

1. entities and their geometry/material settings;
2. background, shadow floor, and grid;
3. ambient, hemisphere, and directional lights;
4. perspective-camera and OrbitControls parameters;
5. a copyable example for adding a new UI group.

The panel can be closed and reopened. On narrow screens it becomes a bottom panel with a limited height, leaving part of the 3D view available.

## Architecture used in the real implementation

```text
App (owns selectedEntity)
├── scene-canvas
│   └── Canvas / Three.js scene
│       └── SampleGeometry
│           └── SelectableMesh × 4
├── scene-hud
└── LearningPanel
    └── InfoGroup × 5
        ├── InfoRow
        └── custom group content
```

The panel is normal React DOM placed as a sibling of `Canvas`, not as a child inside the Three.js scene. CSS absolute positioning layers both surfaces inside `.app-shell`. This keeps text layout and accessibility in the DOM while WebGL remains responsible for 3D rendering.

## How the source files cooperate in this exercise

```text
index.html
    └── /src/main.jsx
          ├── index.css  → global full-window root
          └── App.jsx    → UI structure, state, events, and 3D scene
                └── App.css → panel, cards, responsive layout, and visual states
```

The files have different jobs:

- JSX creates elements and controls behavior. For example, `<aside className="learning-panel">` creates the learning panel, while `useState` and click handlers control its interaction.
- CSS cannot create that panel. `.learning-panel { ... }` only finds the JSX element through its class name and gives it size, placement, color, and scrolling behavior.
- `index.css` remains deliberately small and global. Its 100% heights make the root and WebGL canvas fill the browser.
- `App.css` is app-specific. It is imported directly by `App.jsx`, so Vite includes it in the build.
- The starter files in `src/assets/` are still unused because no JSX or CSS file imports them.

Some concrete JSX/CSS contracts introduced by this exercise are:

| JSX class | CSS responsibility |
| --- | --- |
| `app-shell` | Creates the shared positioning context for WebGL and DOM layers |
| `scene-canvas` | Stretches the Canvas across the full application |
| `learning-panel` | Places, sizes, styles, and scrolls the information panel |
| `info-group` / `is-open` | Styles reusable groups and their expanded state |
| `entity-card` / `is-selected` | Styles entity choices and selected feedback |

Removing an element from JSX removes it from the interface. Removing its CSS leaves the content present but unstyled. This distinction made it possible to change the panel design without changing scene selection logic.

## Reusable UI pieces

### `InfoGroup`

`InfoGroup` owns its own `isOpen` state. It receives a number, title, short description, optional initial open state, and arbitrary children. It is responsible only for the shared accordion frame and behavior.

### `InfoRow`

`InfoRow` displays a label/value pair and can optionally show a color swatch. It prevents every group from duplicating the same parameter-row markup.

### `ENTITIES`

The four entity descriptions are stored in one data array. The picker buttons and the selected detail card are generated from this data. Adding informational metadata no longer requires duplicating four card layouts.

### `SelectableMesh`

Each primitive is wrapped in `SelectableMesh`. Clicking it updates the shared selection, and the selected object scales to `1.08` as a visual confirmation.

## State connection between DOM and 3D

`App` owns the shared state:

```jsx
const [selectedEntity, setSelectedEntity] = useState('box')
```

The same value and setter are passed to `SampleGeometry` and `LearningPanel`. Therefore either surface can update one source of truth:

```text
UI entity button ─┐
                  ├─ setSelectedEntity(id) ─► App state
3D mesh click ────┘                              │
                                                ├─► selected UI card/details
                                                └─► selected mesh scale
```

This is the key implementation lesson: keep state in the closest parent shared by every consumer, then pass it down through props.

## How to add a new UI group

Inside `LearningPanel`, add another `InfoGroup` next to the existing groups:

```jsx
<InfoGroup
  number="06"
  title="Animation"
  description="Frame updates"
>
  <InfoRow label="Hook" value="useFrame" />
</InfoGroup>
```

Use `InfoRow` for simple parameters. Put custom JSX inside the group when the content is a chart, list, button, or code example.

The new group needs state from `App` only if it must read or change the 3D scene. Pure explanatory content can remain completely local to `LearningPanel`.

## Practical details and decisions

- Scene constants such as `BACKGROUND_COLOR` and `CAMERA` are reused by the renderer and UI, reducing the risk that the displayed reference disagrees with the scene.
- Entity selection is intentionally always retained; orbiting on empty canvas should not unexpectedly clear the current explanation.
- The panel has its own scroll container, so long learning content does not make the whole page scroll.
- Buttons include focus styles and `aria-expanded` for keyboard and assistive-technology feedback.
- A mobile media query moves the panel from the right edge to the bottom and limits it to `58vh`.
- The old starter `App.css` was replaced because it described a page that no longer exists.

## Verification

- `npm.cmd run build`: passed.
- `npm.cmd run lint`: passed.
- Production build still reports Vite's existing large-chunk warning because the Three.js bundle is over 500 kB; this does not prevent the build.
- Browser screenshot validation was unavailable in the current environment.

## Follow-up experiments

- [ ] Let UI controls edit roughness, metalness, and light intensity live.
- [ ] Read the real camera position with `useThree` instead of showing only its configured starting position.
- [ ] Add a reset-camera button.
- [ ] Highlight selected meshes with an outline instead of scale.
- [ ] Move the entity descriptions into a shared scene configuration used to generate both meshes and UI.
- [ ] Add an Animation group and display live elapsed time or rotation speed.
