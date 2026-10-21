# System view redesign — implementation brief (D-049)

| | |
| --- | --- |
| **Audience** | Claude Code (or any developer) implementing the change in `terraforming-1380/` |
| **Status** | Design decided by the project owner on 2026-10-21. **Not implemented.** |
| **Decision record** | [`decisions.md` D-049](decisions.md) |
| **Requirements** | [`spec.md` §4.19 SYS-05 – SYS-14](spec.md) and tests SYS-T2 – SYS-T7 |
| **Visual reference** | [`system-view-concepts.html`](system-view-concepts.html) — open in a browser. **Concept A** is the structure to build; B's arcs and C's on-planet readouts are folded into it. It is a throwaway prototype with fake data: read it for look and feel, do not copy its code wholesale. |

---

## 0. How to work with this brief

1. **Read first:** `src/ui/SystemOverview.tsx`, `src/systems/system.ts`, `src/systems/signal.ts` (`travelTo`, `distantPlanets`), `src/state/planets.ts`, `src/views/OrbitCamera.tsx`, `src/views/DistantPlanetsView.tsx`, `src/views/SignalView.tsx`, `src/views/ScreenProjector.tsx`, `src/render/terrainMaterial.ts`, `src/App.tsx`, and the `main` / sidebar / `data-view='surface'` rules in `src/style.css`.
2. **Do not change simulation rules.** D-040 stays: funds are shared, an inactive planet is frozen, only the active planet simulates and bills. `travelTo(store, seed)` keeps its exact behavior. Robots, residents, economy, autopilot and signal logic are untouched.
3. **Work in the four phases of §7.** Stop after each phase, run `npm test` and `npm run build`, and summarize what you changed and what you could not verify.
4. **Colors come from `src/config/palette.ts`; numbers from `src/config/tuning.ts`.** Add the new tokens listed in §5.4. No hard-coded hex or magic numbers in new components.
5. **UI strings are English** and use the exact wording in §4.7.
6. **Keep `App.tsx` from growing by more than ~40 lines.** Put new behavior in new files.
7. Follow the repo's working agreement (`docs/README.md`): keep spec IDs, mark spec rows `done` only when implemented, record measured values in `tuning.md`, and prefix commits with the IDs they touch (for example `SYS-05: pull the camera back instead of opening a dialog`).
8. If something here conflicts with the code you find, **stop and ask** instead of guessing. Section 9 lists what is still open.

Suggested first prompt: *"Read `terraforming-1380/docs/system-view-brief.md` completely. Implement Phase 1 only, then stop and report."*

---

## 1. Goal in one paragraph

Replace the modal **System overview** dialog with a **camera pull-back** in the main scene. The player never leaves the world: the camera eases out from the active planet until every known world is visible in the same space, thin dashed arcs show which planet's signal answered which, and each world's state is drawn **on the planet itself** (ghost shell, plant dots, antenna ticks, resident glows, robot lights) instead of in a list. Traveling is a single **press-and-hold** gesture that replaces both the *Travel →* button and the confirmation dialog.

## 2. Decisions already made (do not re-ask)

| Question | Decision |
| --- | --- |
| Overall structure | **Concept A: pull back.** No dialog, no second Canvas. |
| Relationships | **Concept B's arcs:** dashed curves from a planet to the planets its signals found; a bright pulse runs along them on every broadcast. |
| Reading a planet | **Concept C's readouts:** drawn on the planet. The side list is deleted. |
| Traveling | **Press and hold** (900 ms, tunable) replaces the *Travel →* button and the confirm dialog. |
| Crew while pulled back | **Keeps running.** The active planet's robots keep moving; they read as small amber lights. Pulling back never pauses, resets or edits anything. |
| Planets only known from a signal | **Always wireframe** at their real radius until the player has visited them. Never show their terrain early. |
| Inactive visited planets | Drawn from their current edited chunk meshes (SYS-02 stays). Frozen, as today. |

## 3. Current state and what to remove or keep

| Item | Today | Action |
| --- | --- | --- |
| `ui/SystemOverview.tsx` | `<dialog>` with its own `<Canvas>`, a side list, and `describe()` | **Delete** after moving `mergeChunks` and `describe` (§5.1). |
| `.system-dialog`, `.system-body`, `.system-canvas`, `.system-hint`, `.system-list*`, `.system-swatch*` in `style.css` | styles for the dialog | **Delete.** |
| `travel` state + `<section className="travel-dialog">` in `App.tsx`; `.travel-dialog*` CSS | confirmation after clicking a distant or overview planet | **Delete.** Its message moves into the focus caption (§4.7). |
| `systemOpen` state and the *System overview ↗* button | opens the dialog | **Keep the button**, but it now starts the pull-back. |
| `views/DistantPlanetsView.tsx` | planets at fixed screen corners after 3 broadcasts, click → confirm dialog | **Keep as the discovery moment** in orbit view. Click now means "pull back and focus this planet". Hidden while pulled back. |
| `views/OrbitCamera.tsx` | fixed distance 8, right-drag orbit, **wheel = brush radius** | Extend (§5.3). Wheel stays the brush in orbit view. |
| `render/terrainMaterial.ts` | `createTerrainMaterial(clusters, baseRadius)` and global `showWorkArea()` | Reuse for other worlds. Call `showWorkArea(null)` when the pull-back starts. |
| `systems/signal.ts` `travelTo`, `state/planets.ts` registry | persistent planets (D-040) | **Unchanged.** |
| `WorldMap`, surface exploration | separate feature | **Unchanged.** The pull-back button is hidden during surface exploration, as today. |

## 4. Target behavior

### 4.1 State machine

```ts
type SystemPhase = 'orbit' | 'pulling' | 'system' | 'returning' | 'diving' | 'arriving'
interface SystemViewState {
  phase: SystemPhase
  pull: number            // 0 = normal orbit view, 1 = full system view; animated
  focus: string | null    // seed of the focused world
  hover: string | null    // seed under the pointer
}
```

Keep the fast-changing values (`pull`, camera pose) in a ref read inside `useFrame`; keep only `phase` (and `focus` for the DOM) in React state so the UI does not re-render every frame.

| From | Event | To | Notes |
| --- | --- | --- | --- |
| `orbit` | *System overview ↗* button, key `O`, or a click on a distant planet | `pulling` | If started by a distant planet, set `focus` to that planet once `system` is reached. |
| `pulling` | `pull` reaches 1 | `system` | `pullSeconds` ease-in-out cubic. |
| `system` | click a non-active world | `system` with `focus` set | Camera glides to it. Click the same world again, empty space, or `Esc` clears focus. |
| `system` | *Return to orbit* button, `O`, or `Esc` with no focus | `returning` → `orbit` | Reverse of pulling. |
| `system` with focus | hold completes | `diving` | §4.6. |
| `diving` | dive finished | `arriving` | Call `travelTo(store, seed)` at the moment the paper veil is fully opaque. |
| `arriving` | veil faded | `orbit` | New active planet, `pull = 0`, `focus = null`. |

Disable the pull-back entirely while `surfaceSite` is set, while the opening title is open, and when bankrupt (same guards as the old button).

### 4.2 Camera

* **Positions are relative to the active planet.** The active planet stays at the scene origin (as it is today). Every other world sits at `planetPosition(seed) − planetPosition(activeSeed)`. Do not scale the active planet or move its scene graph.
* `cameraPose(...)` (pure function, see §5.2): at `pull = 0` it returns exactly today's orbit pose (distance 8, target origin, current azimuth and polar). At `pull = 1` the target is the centroid of all known worlds and the distance is `systemDistance`. In between, interpolate target, distance and keep the player's azimuth and polar unchanged.
* `systemDistance = clamp((extent + margin) / tan(fov/2), min, max)`, where `extent` is the largest distance from the centroid to any world's far surface. With the current four-world layout this lands near 24–28.
* **Focus:** target = the focused world's position, distance = `focusDistanceFactor × its radius` (about 6.5 ×). Other worlds stay visible.
* **Orbit input in system view:** right-drag turns the camera (same as orbit view). **Wheel zooms** between `zoom.min` and `zoom.max`. Left click only picks a world. Tools do nothing while pulled back: pass `activeTool='explore'` to `PlanetView`.
* Make azimuth and polar one shared piece of state between `OrbitCamera` and the new system camera, so switching never jumps.

### 4.3 What is visible as `pull` grows

| Layer | Rule |
| --- | --- |
| Active planet and everything attached to it (structures, robots, residents, `PlanetView`) | Unchanged, never scaled or hidden. |
| `AtmosphereView` (dust points) of the active planet | Fade out over `fade.atmosphere` (default `pull` 0 → 0.45). |
| Other **visited** worlds | Fade in from the paper background over `fade.otherWorlds` (default `pull` 0.25 → 0.85). They use `createTerrainMaterial([], baseRadius)` with `baseRadius = planetConfig(seed).radius * VOXEL_WORLD_SIZE`, so contour lines match the active planet. Fade by mixing toward `palette.background` (preferred) or with opacity. |
| Other **unvisited** worlds | Wireframe icosahedron (`IcosahedronGeometry(radius, 1)`, `wireframe: true`) at the planet's real radius, same fade. Colors `palette.system.wire` / `wireHover`. Never terrain. |
| Readouts of visited worlds (§4.4) | Fade in over `fade.marks` (default `pull` 0.35 → 0.9). |
| Arcs (§4.5) | Draw in from parent to child as `pull` rises; fully drawn at the end of `fade.marks`. |
| Name tags | Fade in with the other worlds. |
| `DistantPlanetsView` | Hidden as soon as `pull > 0.02`. |
| Starfield (`ui/Starfield`) | Unchanged. |

### 4.4 Readouts drawn on the planet (replace the list)

Every **visited** world gets these. Use one `Points` / `LineSegments` object per kind per world; set `frustumCulled = false` (some may be empty). Draw points as soft round sprites (a small canvas texture), `sizeAttenuation: false`.

| Readout | Data source | Look | Cap |
| --- | --- | --- | --- |
| **Ghost shell** | `planetConfig(seed).radius × VOXEL_WORLD_SIZE` | `WireframeGeometry(IcosahedronGeometry(r, 3))`, `palette.system.ghost`, opacity `ghostOpacity` (~0.17) × focus. Shows where the original rock was. | 1 |
| **Plants** | `structures` of kind `plant` (`position`) | green dots, `palette.resource.life`, 4.6 px | `marks.plants` (60) |
| **Antennas** | `structures` of kind `antenna` (`position`, `normal`) | a short line along the normal (≈ 0.6 long) plus an amber tip, `palette.antenna.lamp`, 5.5 px | `marks.antennas` (8) |
| **Residents** | `residents[].position` | soft warm dot, `palette.system.residentGlow`, 10 px, gentle size pulse | `marks.residents` (16) |
| **Robots** | `robots`, `gardeners`, `builders` `[].position` | amber light, `palette.state.work`, 7 px. **Active planet:** blink with the robot's real phase (steady while moving, fast blink while working, dark when idle/paused). **Inactive planet:** dim, steady (they are paused). | `marks.robots` (12) |

Data sources:

* **Active planet:** read live from the store (`store.getState()`), each frame or on a short interval.
* **Inactive visited planets:** read once from `registry.snapshot(seed)` (frozen, D-040) and rebuild only if the snapshot object changes.

Implement the selection and capping in a **pure function** `planetMarks(state: RunState)` (see §5.2) so it can be unit-tested without three.js. Marks are planet-local coordinates; parent them to the same group as the world mesh.

Intensity: all readouts scale with a `focus` factor — `1` for the hovered or focused world, `0.7` otherwise — multiplied by the `fade.marks` curve above.

### 4.5 Signal arcs (concept B)

* One arc per **known world whose parent is also known**: from `parentSeed(seed)` (derived from the `…/signal-N` suffix; see §5.2) to the child. The home planet has no parent.
* Geometry: `QuadraticBezierCurve3(parent, midpoint + (0, arcLift, 0), child)`, 80 points, `LineDashedMaterial`, `palette.system.arc`, opacity `arcOpacity` (~0.55), dash ≈ 0.22 / gap ≈ 0.2. Depth test on, so the planets hide the ends naturally.
* **Idle:** one small amber dot drifts slowly along each arc.
* **On broadcast:** when `signal.broadcastCount` of the **active** planet increases (detect it the same way `SignalView` does), send a bright pulse (`palette.antenna.lamp`) along every arc that **starts at the active planet**, lasting `signal.pulseSeconds`. If the system view is not open, nothing extra is drawn.
* Arcs are descriptive only. They must not suggest a "best" planet or a goal (SYS-03 / D-036).

### 4.6 Picking, focus and hold-to-travel

* **Hover** a non-active world: its tag expands and the caption shows its description (§4.7); brighten it slightly (`uBright` or a color lerp).
* **Click** a non-active world: set `focus`, glide the camera. The active world cannot be focused.
* **Hold control:** when a non-active world is focused and `phase === 'system'`, show a pill button **below the planet** (`ui/HoldToTravel.tsx`): a 30 px progress ring and the text **Hold to travel**.
  * Pointer: `pointerdown` starts, `pointerup` / `pointerleave` / `pointercancel` cancels and resets the ring.
  * Keyboard: holding `Space` or `Enter` while the button has focus does the same; `keyup` cancels.
  * It completes after `holdMs` (default 900 ms).
  * Give it `aria-label="Hold to travel to {name}"`.
* **Dive** (`diveSeconds`, default 1.3 s): the camera flies into the focused world while a **paper-colored veil** (`palette.background`) fades in, reaching full opacity at ~80 % of the dive. At that moment call `travelTo`.
* **Arrive** (`arriveSeconds`, default 0.9 s): reset to the orbit pose around the new active planet and fade the veil out. Show a transient caption for ~3.2 s: `Arrived at {name}` (first visit: `Arrived at {name} · first visit`) followed by ` · {previous name} pauses until you return`.
* **Reduced motion** (`prefers-reduced-motion: reduce`): skip the pull, dive and arrival animations. Switch instantly with a 200 ms crossfade. The hold ring still fills.
* **Keyboard / screen-reader path for what the deleted list used to give:** render a visually-hidden `<ul>` (`.sr-only`) of the known worlds. Each item is a `<button>` that focuses that world (same as clicking it). Focus order follows `systemPlanets` order. The caption element is `aria-live="polite"`.

### 4.7 Text (exact strings)

Move the existing `describe()` from `SystemOverview.tsx` into `systems/system.ts` as `describePlanet(planet)` and keep its output **unchanged**:

* Unvisited: `{traits} · answered a signal, not visited yet`
* Visited: `{traits} · {N}% of the original rock` then, when present, ` · {n} resident(s)` (+ `, {k} looking for shelter`), ` · {p} plant(s), {a} antenna(s)`, and a crew status: active → `{n} robot(s) at work` or `Crew idle`; inactive → `Crew paused until you return` or `Quiet`. Parts are joined with ` · `.

UI text:

| Where | Text |
| --- | --- |
| Name tag (every world) | the planet name in small caps; the active world adds the second line `YOU ARE HERE` (amber) |
| Name tag when hovered or focused | adds one line: the planet's `traits` |
| Caption, nothing hovered, `pull < 0.5` | *(no caption)* |
| Caption, nothing hovered, system view | `Drag to turn · wheel to zoom · click a world to focus it` |
| Caption, hovered or focused | `{name} — {describePlanet}` |
| Caption, focused, second line | already visited: `As you left it. Your current planet pauses until you return. Funds travel with you.` · never visited: `A new site. Your current planet pauses until you return. Funds travel with you.` |
| Pull-back button in orbit view | `System overview ↗` (unchanged) |
| Same control in system view | `Return to orbit ↓` |
| Hold control | `Hold to travel` |
| Footer hints in system view | `Right drag` turn · `Wheel` zoom · `Click` focus · `Esc` back · `O` orbit view |

The caption and tags are plain text over the canvas (no card or box).

### 4.8 Layout (CSS)

`main` is a grid with `--rail-left`, `--rail-right` and `--layout-gap`, and `.world-canvas` sits in the middle column. Add `main[data-view='system']`, driven by `phase !== 'orbit'`:

* set `--rail-left: 0px; --rail-right: 0px; --layout-gap: 0px;` and add `transition: grid-template-columns 400ms var(--ease)` to `main`, so the canvas widens smoothly to the full width;
* `.left-sidebar` and the right sidebar fade and slide out (`opacity: 0; translate: ∓24px 0; pointer-events: none`, 400 ms) but stay mounted so nothing re-initializes;
* keep the top bar;
* show a floating control group at the canvas bottom-left: the `Return to orbit ↓` button and the footer hints;
* the pull-back button itself lives in the right sidebar's `.exploration-toolbar`, which has just slid out, so also render `Return to orbit ↓` in the floating group.

Do not use `<dialog>`, and do not use `inert` on `main`.

### 4.9 Input map

| Context | Input | Result |
| --- | --- | --- |
| Orbit view | wheel | brush radius (unchanged) |
| Orbit view | `O` or the button | start pull-back |
| System view | right-drag | turn camera |
| System view | wheel | zoom (`zoom.min` – `zoom.max`) |
| System view | left click on world | focus; click again or empty space → unfocus |
| System view | `Esc` | clear focus; if no focus, return to orbit |
| System view | `O` | return to orbit |
| Anywhere | `A` / `M` / `P` | **unchanged**; they still change mode (the crew keeps working). Do not block them while pulled back, but ignore tool-specific keys (`D`, `T`, `F`) |

The existing key handler returns early when `systemOpen`; replace that condition with `phase !== 'orbit'` and make it forward only `A`, `M`, `P`, `O`, `Esc`.

## 5. Code plan

### 5.1 Move, then delete

* Move `mergeChunks(world)` and the per-frame `meshVersion` refresh into `render/worldMesh.ts` (`useWorldGeometry(world)` or a plain function plus a ref pattern). **SYS-02/04 must keep working:** refresh only when `world.meshVersion` changes; dispose the previous geometry.
* Move `describe` to `systems/system.ts` as `describePlanet`.
* Then delete `ui/SystemOverview.tsx`.

### 5.2 New pure module `src/systems/systemView.ts` (no React, no three.js imports)

```ts
export function parentSeed(seed: string): string | null            // 'home/signal-2' → 'home'; 'home' → null
export interface SystemLayout { positions: Record<string, Vec3>; center: Vec3; extent: number }
export function systemLayout(planets: SystemPlanet[], activeSeed: string): SystemLayout
//   positions are relative to the active planet (active = [0,0,0]); extent = max distance from center + that world's radius
export interface Arc { from: string; to: string }
export function systemArcs(planets: SystemPlanet[]): Arc[]           // only where parentSeed(to) is also in `planets`
export interface PlanetMarks { plants: Vec3[]; antennas: [Vec3, Vec3][]; residents: Vec3[]; robots: { position: Vec3; phase: string }[] }
export function planetMarks(state: RunState, caps = tuning.system.marks): PlanetMarks
export function cameraPose(input: { pull: number; azimuth: number; polar: number; center: Vec3; distance: number;
                                     focus?: { position: Vec3; distance: number; amount: number } }): { position: Vec3; target: Vec3; distance: number }
export function systemDistance(extent: number, fovDegrees: number): number
export function holdProgress(elapsedMs: number, holdMs: number): number   // clamped 0..1
```

`systems/system.ts` keeps `systemPlanets`, `planetPosition`, `planetTraits`, and gains `describePlanet`. Do not change `SystemPlanet`'s existing fields; add `parent: string | null`.

### 5.3 New and changed React files

| File | Change |
| --- | --- |
| `views/SystemCamera.tsx` (new) | Owns the `SystemViewState` ref; per frame computes `cameraPose` and applies it. Replaces `OrbitCamera` while `phase !== 'orbit'`, or extend `OrbitCamera` — pick one, but keep **one shared azimuth/polar**. Handles right-drag, wheel zoom, and the animation timelines. |
| `views/SystemWorlds.tsx` (new) | For each non-active known world: group at its relative position, solid or wireframe body, ghost shell, readouts; pointer events (`onPointerOver/Out/Click`) only when `phase === 'system'`. |
| `views/SystemArcs.tsx` (new) | Arcs, idle dots, broadcast pulse. |
| `views/ActiveReadouts.tsx` (new) | Ghost shell and readouts for the **active** planet from live state, fading with `pull`. Same marker code as `SystemWorlds` (share a `PlanetReadouts` component). |
| `ui/SystemLabels.tsx` (new) | DOM tags positioned each frame from a projection ref (no React re-render per frame). Extend `ScreenProjector` with `projectSphere(position, radius) → { x, y, r }` for the hold control and tag offsets. |
| `ui/SystemCaption.tsx` (new) | Bottom-center caption, `aria-live="polite"`. |
| `ui/HoldToTravel.tsx` (new) | §4.6. |
| `App.tsx` | Replace `systemOpen` + `travel` with the system view state; render the new components; pass `activeTool='explore'` to `PlanetView` while pulled back; wire `DistantPlanetsView.onSelect` to "pull back and focus"; apply `data-view='system'`. |
| `views/AtmosphereView.tsx` | Multiply opacity by `1 − smoothstep(fade.atmosphere, pull)`. |
| `style.css` | §4.8, plus styles for tags, caption, hold control, veil, `.sr-only`. Delete the dialog styles. |

### 5.4 Config

Add to `config/palette.ts`:

```ts
system: { arc: '#454641', ghost: '#3b3a37', wire: '#8a887f', wireHover: '#3a3b36', residentGlow: '#e0b070' },
```

Add to `config/tuning.ts` (and mirror in `docs/tuning.md` under a new "System view (D-049)" heading; all values are `guess` until playtested):

```ts
system: {
  pullSeconds: 1.4, diveSeconds: 1.3, arriveSeconds: 0.9, holdMs: 900,
  focusDistanceFactor: 6.5,
  distance: { min: 14, max: 48, margin: 1.1 },
  zoom: { min: 12, max: 48, step: 0.08 },
  marks: { plants: 60, antennas: 8, residents: 16, robots: 12 },
  ghostOpacity: 0.17, arcOpacity: 0.55, arcLift: 2.2,
  fade: { otherWorlds: [0.25, 0.85], atmosphere: [0, 0.45], marks: [0.35, 0.9] },
},
```

Reuse `signal.pulseSeconds` for the broadcast pulse.

## 6. Documentation to update in the same change set

* `spec.md` §4.19: SYS-01 wording ("shown in the main scene by pulling the camera back"), mark SYS-05 – SYS-14 `done` as they land; add the SYS-T tests to the test table.
* `decisions.md`: set D-049 `implemented` and add the measured values. Note in D-040 that its "overview is a dialog" part is superseded; the persistence rules are not.
* `design.md` §10 (one sentence) and `tuning.md` (the block above).
* `ui/README.md`: remove `SystemOverview`, add the new files.

## 7. Phases (stop after each)

**Phase 1 — pull back and worlds.** `systemView.ts` with `parentSeed`, `systemLayout`, `cameraPose`, `systemDistance`; `SystemCamera`; `SystemWorlds` (visited = solid with contours, unvisited = wireframe); CSS `data-view='system'`; name tags; caption; hover; focus with camera glide; `O` / `Esc` / button. The old dialog still exists but is no longer reachable.
*Done when:* acceptance 1–7 below pass.

**Phase 2 — readouts and arcs.** `planetMarks`, `PlanetReadouts` for inactive and active planets, `AtmosphereView` fade, `SystemArcs` with idle dots and broadcast pulse.
*Done when:* acceptance 8–13 pass.

**Phase 3 — hold to travel.** `HoldToTravel`, dive / arrive timeline with veil, `travelTo` hook, remove the travel dialog, retarget `DistantPlanetsView`, delete `SystemOverview.tsx` and its CSS, `.sr-only` list.
*Done when:* acceptance 14–19 pass.

**Phase 4 — polish and measure.** Reduced motion, focus order, pointer-event conflicts, performance numbers recorded in `tuning.md`, docs from §6.

## 8. Acceptance criteria

Automated checks go in `tests/systemView.test.ts` (node:test via `tsx`, no browser). Items marked **manual** need a browser.

1. `cameraPose` at `pull = 0` equals the current orbit pose (distance 8, target origin) for any azimuth and polar. At `pull = 1` the target is the layout center. In between, distance and target change monotonically.
2. `systemLayout` puts the active planet at `[0, 0, 0]` and every other world at `planetPosition(seed) − planetPosition(active)`; the result does not depend on which planet is active except by that translation.
3. `parentSeed('a/signal-2') === 'a'`, `parentSeed('a') === null`, and `systemArcs` returns exactly one arc per known child whose parent is also known.
4. **Manual:** from orbit view, *System overview ↗* (or `O`) pulls the camera back in about `pullSeconds`; both sidebars slide away; no dialog opens; the page does not scroll or flash.
5. **Manual:** the active planet, its robots and its structures keep updating while pulled back, and the **crew keeps working** (start a Miner, pull back, return: its progress continued).
6. **Manual:** hovering a non-active world shows its caption in the exact format of §4.7; the active world shows `YOU ARE HERE`.
7. **Manual:** `Esc` clears focus first, then returns to orbit; wheel in orbit view still changes the brush radius.
8. `planetMarks` never exceeds the caps in `tuning.system.marks`, is deterministic for the same state, returns only positions taken from the state, and returns empty arrays for a state with none of them.
9. **Manual:** visited inactive worlds show a ghost shell and, where they have them, green plant dots, antenna ticks, resident glows and dim robot lights. Digging a large hole on a planet and returning to the system view shows the ghost shell clearly larger than the remaining rock.
10. **Manual:** unvisited worlds are wireframes at their true radius and stay wireframes while hovered or focused.
11. **Manual:** arcs connect a planet to the planets its signals found; none connect unrelated planets.
12. **Manual:** broadcasting from the active planet while pulled back sends a visible pulse along its outgoing arcs; broadcasting in orbit view draws nothing extra.
13. `visual.test.ts` still passes, with the new palette tokens present and used (no hex literal in the new components).
14. `holdProgress(0, 900) === 0`, `holdProgress(450, 900) === 0.5`, `holdProgress(2000, 900) === 1`.
15. **Manual:** holding for the full time travels; releasing early cancels and resets the ring with no state change. Works with the pointer and with `Space` / `Enter`.
16. **Manual:** after travel, the previous planet is paused, funds are unchanged, and the new planet is active at orbit distance. `travelTo` is called exactly once per travel.
17. **Manual:** no confirmation dialog appears anywhere; `travel-dialog` and `SystemOverview` no longer exist in the code.
18. **Manual:** with reduced motion enabled there is no flying animation; the switch still works.
19. `npm test` and `npm run build` pass with no new warnings.

Record, in `tuning.md`, the measured frame time with all four worlds visible on the user's laptop, and the cost of the LOD rebuild when pulling back and returning (the active world's LOD follows camera distance through `RemeshScheduler`).

## 9. Open items (ask before deciding)

* **Hold duration** (900 ms) and whether the dive should be shorter on a revisit.
* **Wheel to pull back** in Auto and Autopilot modes, where the wheel currently does nothing useful. Out of scope for now; the button and `O` are the only entry points.
* **Touch input** (pinch to zoom, tap to focus) is out of scope; pointer events should not make it harder later.
* **What the arcs mean after many signals** (up to `signal.maxPlanets` children per visited planet, so the system can grow beyond today's four). Today's layout is `planetPosition`; add overlap handling only if worlds start to collide.
* Whether returning to a visited planet should show a shorter caption.

## 10. Risks to watch

* **Click conflicts.** The active planet's `PlanetView` handles clicks for tools. While pulled back it must receive `activeTool='explore'`, and the system bodies must only react when `phase === 'system'`.
* **Several chunk meshes in one Canvas.** Each visited inactive world is up to a few thousand triangles after merging; merge once and refresh only on `meshVersion` change. Measure.
* **LOD churn.** `RemeshScheduler.setLodCamera` uses camera distance, so pulling back drops the active planet to a coarser LOD and returning rebuilds it. If this causes hitches, freeze LOD updates while `phase !== 'orbit'` and rebuild once on return.
* **Layout transition.** Animating `grid-template-columns` resizes the canvas each frame; check that the planet does not visibly jump and that `ScreenProjector` stays correct.
* **Stale marks.** Inactive planets are frozen, so snapshot-based marks never need live updates; the active planet's marks must.
