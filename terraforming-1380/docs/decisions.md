# Terraforming Contractor #1380 — Decisions

| | |
| --- | --- |
| **Purpose** | The memory of the project. Every time the design or spec changes, the *reason* goes here, so we can tell later whether a change was a good idea. |
| **Last updated** | 2026-10-20 |

## How to use this file

1. **Something changes** (a playtest, a technical wall, a new idea). Add an entry below with the next `D-` number. Never edit an old entry's decision; if you reverse it, add a new entry and set the old one's status to `superseded by D-xxx`.
2. **Then** update `design.md` and/or `spec.md`, and put the `D-` number in their change log or in the commit message.
3. **Open questions** live in the second half. When one is answered, move it into a decision.

Statuses: `accepted` · `proposed` (needs your yes) · `superseded` · `rejected`.

### Entry template

```markdown
### D-000 Short title
- **Date:** YYYY-MM-DD
- **Status:** proposed | accepted | superseded by D-xxx | rejected
- **Context:** What forced the question? What did we see?
- **Decision:** What we will do.
- **Why:** The reasons, and what we gave up.
- **Affects:** design §x, spec IDs, code areas.
```

---

## Decisions

### D-001 Ship the game in the same repository, as a separate app
- **Date:** 2026-09-29
- **Status:** accepted
- **Context:** The course repo already holds `worldbuilding-guidebook/`. The game has a different structure (full-screen, first person, own state).
- **Decision:** The game lives in `terraforming-1380/`, a sibling folder. Docs live in `terraforming-1380/docs/`. Reusable code is copied, not linked.
- **Why:** Keeps the course story visible in one repo, avoids cross-app import and build problems, and lets the game's docs travel with its code.
- **Affects:** repo layout, TECH-05.

### D-002 Terrain is a density field meshed with Marching Cubes
- **Date:** 2026-09-29 (carried from GDD v0.5)
- **Status:** accepted
- **Context:** The pitch needs the planet to remember every edit and to be smooth like Astroneer, not blocky.
- **Decision:** 3D scalar density field, chunked, meshed with Marching Cubes, dirty-chunk remesh only.
- **Why:** Matches guidebook Lesson 03 (already built and measured). Gives real, editable geometry that the shape analysis can read.
- **Affects:** TERR-01–05, CLS-02.

### D-003 Language: TypeScript with `allowJs`
- **Date:** 2026-09-29
- **Status:** accepted
- **Context:** The GDD says TypeScript. The guidebook code is JavaScript. We want to reuse the voxel modules quickly.
- **Decision:** Start the game as a Vite `react-ts` project with `allowJs: true`. Copy guidebook JS as-is, convert to TS only when a file needs real changes.
- **Why:** Types help most in the state store and the rules (classification, metrics), where design churn is highest. Reuse stays cheap.
- **Affects:** TECH-03.
- **Validation (2026-09-30):** TypeScript checking and the Vite production build pass with the copied JavaScript modules and `allowJs: true`.

### D-004 One Terrain Tool with three modes
- **Date:** 2026-09-29 (carried from GDD v0.5)
- **Status:** accepted
- **Context:** An earlier idea had a separate "Depositor" tool that was hard to explain.
- **Decision:** A single tool: Dig / Add Terrain / Flatten.
- **Why:** Simpler to teach, easier to bind to inputs, fewer states.
- **Affects:** TOOL-01–04.

### D-005 Rock and soil share one material unit
- **Date:** 2026-09-29 (carried)
- **Status:** accepted
- **Decision:** Both go into the canister as the same unit and build the same. They differ only in look, feel, and dig speed.
- **Why:** Avoids recipes and a second economy; keeps the MVP focused.
- **Affects:** TOOL-02, TOOL-03, GEN-03.

### D-006 Development Readiness is separate from Capital
- **Date:** 2026-09-29 (carried)
- **Status:** accepted
- **Decision:** Capital = money already made. Development Readiness = potential for future development, from buildable area × accessibility × stability.
- **Why:** Creates the "dig it out for cash now" versus "keep it buildable" conflict, which is the core trade-off of the game.
- **Affects:** MET-05, MET-07, §5.1.

### D-007 Rename `habitability` to `developmentReadiness`
- **Date:** 2026-09-29
- **Status:** accepted
- **Context:** The Chinese GDD's body text used Development Readiness but the state variable list still said `habitability`.
- **Decision:** Use `developmentReadiness` everywhere in code and docs.
- **Why:** Consistency; "habitability" implied life-friendliness, which is Biosphere's job.
- **Affects:** spec §3.

### D-008 Exposure thresholds stay hidden from the player
- **Date:** 2026-09-29 (carried)
- **Status:** accepted
- **Decision:** The UI never displays Cosmic Exposure or its thresholds. Only positive company feedback is shown.
- **Why:** The choice to broadcast should feel meaningful, not like number optimization. The #1379 archive is the only warning.
- **Affects:** SIG-02, SIG-07, MET-10.

### D-009 MVP first person is limited to one connected surface patch
- **Date:** 2026-09-29 (carried)
- **Status:** superseded by D-022
- **Decision:** Walkable region = around Silent Shore plus its caves. Full-sphere walking with spherical gravity is a stretch goal.
- **Why:** Spherical gravity and character orientation are a large cost that does not serve the core pillars.
- **Affects:** NAV-05, NAV-06.

### D-010 Data-driven classifications and tuning
- **Date:** 2026-09-29
- **Status:** accepted
- **Context:** The design will keep changing while the game is built.
- **Decision:** Classifications, notices, and all balance numbers are data (`src/content`, `src/config`), hot-reloadable. Logic reads them; it does not contain them.
- **Why:** Lets us change the design without touching game logic, and makes playtest tuning fast.
- **Affects:** CLS-04, DBG-08, spec §7.

### D-011 Build in vertical slices
- **Date:** 2026-09-29
- **Status:** accepted
- **Decision:** Development follows the milestones in `roadmap.md`. Each milestone is playable end to end, however rough, and ends with a playtest note.
- **Why:** Lets the design be tested early and changed cheaply, instead of discovering problems at the end.

---

### D-012 M0 standalone preview and deployment boundary
- **Date:** 2026-09-30
- **Status:** accepted
- **Context:** M0 must validate the copied voxel engine while both apps remain independently built at different paths on one site. The noise source path in the original spec is stale.
- **Decision:** Use React Three Fiber, Three.js and Zustand. Keep Vite base at `/game/`; combining build outputs and Firebase routing are a separate task. Copy voxelMath, marchingCubes and chunks unchanged into `src/world/voxels/`, and noiseMath plus its functionOverrides dependency from `src/scene/demos/proceduralMaps/` into `src/world/proceduralMaps/`. Preserve their relative imports.
- **Decision:** Start with 64 samples per axis and 16-sample chunks plus two-sample borders (64 allocated chunks). Use a string seed hash and layered 3D noise. Keep negative-inside density as required by TERR-01; correct TERR-02's reversed sphere formula. Center the field at (0, 3, 0) inside the copied six-unit volume and recenter only the rendered view.
- **Decision:** RunState is the spec section 3 data shape, with full budgets/canister capacity from tuning, intact biosphere/stability and planetRemaining, zero earnings/discoveries/exposure, and an intact-sphere morphology placeholder. Modules default to Deep Scanner and Wide Drill. ResourceCluster reserves only id/category and remains an empty array; its generation schema is deferred to M3. No metric, tool, navigation or classification rules are implemented.
- **Later update:** D-018 supersedes the empty resource array for M1.5 with seeded point proxies; the full M3 schema is still open (OQ-14).
- **Why:** Confirms local engine reuse and TypeScript compatibility without prematurely building gameplay. Same seed tests compare actual mesh positions and normals; a whole-volume comparison verifies the chunk borders. These checks do not close the later performance or gameplay determinism requirements.
- **Affects:** TECH-02-05, TECH-07 (planet only), TERR-01-03 (preview only), DBG-01, DBG-02 (fps/seed/allocated chunks only), M0 roadmap.
- **Open items:** No connected browser was available for visual/FPS verification. The GDD archive was present at `docs/archive/gdd-v0.5.md` by final review and was left unchanged. Firebase integration remains deferred; OQ-10 remains unmeasured on target hardware.

---

### D-013 Shared Hosting assembly lives outside both apps
- **Date:** 2026-09-30
- **Status:** accepted
- **Context:** After M0, the user authorized same-site build assembly and Firebase /game/ routing. Existing CI published only the guidebook.
- **Decision:** Add an independent deployment/ directory with a Node build script, Hosting-only firebase.json and build/preview/deploy commands. Build each app separately, then copy guidebook/dist to deployment/public and game/dist to deployment/public/game. Configure /game and /game/** before the root SPA fallback. Both GitHub Hosting workflows use this assembly and entryPoint: deployment, retaining existing secrets.
- **Why:** Keeps source, dependencies and build configurations separate while publishing one complete site. No root firebase.json or guidebook source/config edits are needed. The shared deploy command publishes Hosting only, preserving existing Firestore and Authentication settings.
- **Affects:** TECH-05, deployment/, .github/workflows/, repository and game README. Completes D-012's deferred deployment configuration; does not introduce gameplay.
- **Validation:** Both builds passed. Firebase Hosting emulator served seven expected routes and four JS/CSS assets correctly. Live deployment and CI execution have not been performed. Chrome visual inspection was denied by Computer Use; visual confirmation remains pending.
- **Operational note:** Use the shared command; the legacy guidebook-only deploy would remove the game's files from Hosting. OQ-13/14 remain unchanged; no new game-design questions.

---

### D-014 Terrain edits follow the negative-inside sign rule
- **Date:** 2026-09-30
- **Status:** accepted
- **Context:** TERR-01 and the copied voxel engine define density below zero as solid, but TOOL-02/03 described the opposite edit directions (OQ-13).
- **Decision:** Dig raises signed density toward or above zero; Add Terrain lowers it toward or below zero. Flatten may remove and add in the same operation, using the same sign rule in each affected region. Determine removed or added mass from the change in solid volume, not from the raw sum of density deltas.
- **Why:** The mesh, future collision queries, and mass accounting need one consistent meaning for the zero threshold. A density value can change without crossing zero, so its numeric change alone is not removed mass.
- **Affects:** TERR-01, TERR-09, TOOL-02–04, spec §4.3, M1.

### D-015 Persistent terrain mode with optional one-click modifiers
- **Date:** 2026-09-30
- **Status:** accepted
- **Context:** Browsers or operating systems may intercept Alt+Click and Ctrl+Click; all three terrain actions need a dependable mouse-and-keyboard path (OQ-06).
- **Decision:** When the Terrain Tool is active, `F` cycles the stored `terrainMode` Dig → Add Terrain → Flatten → Dig on keydown (ignore key repeat). Plain left click uses that mode. Alt+left click temporarily uses Add Terrain; Ctrl+left click temporarily uses Flatten; neither changes the stored mode. If Alt and Ctrl are both held, make no terrain edit. Show the stored mode and the mode used for an action in the terrain UI. Only handle these inputs in the game viewport, not in editable text or other UI controls.
- **Why:** Every mode is reachable with `F` plus plain left click even when a modifier combination is unavailable. Temporary overrides keep familiar shortcuts without changing the player's selection unexpectedly.
- **Affects:** TOOL-01–04, spec §6, future `src/config/controls.ts`, M1. Test the optional shortcuts in supported browsers during M1; the `F` path is the guaranteed fallback.

### D-016 M1 orbit and brush scale
- **Date:** 2026-09-30
- **Status:** accepted
- **Context:** The user asked for a stationary planet, right-mouse rotation, and left-click terrain actions. The M0 preview rotated automatically. Tuning's 2.0-unit default brush radius was almost the full radius of the six-unit guidebook planet.
- **Decision:** Keep the terrain mesh still; right-drag orbits the camera around the planet. Left click on the mesh applies the selected Terrain Tool mode, with D-015's temporary modifier overrides. Mouse wheel and a UI slider adjust brush radius. Set M1 radius min/default/max to 0.18/0.38/0.9 world units, with 0.08 per wheel step. Keep the UI showing the selected mode and Planet Remaining.
- **Decision:** M1 edits a single sample grid and remeshes only touched chunks over frames. Rock/soil canister consumption and the budget remain for M2/M3 as scheduled, so M1 Add Terrain is unrestricted while testing the core terrain interaction. The initial solid-sample count is the mass baseline; `planetRemaining` is the current count divided by it, capped at 1 for the public 0–1 metric.
- **Why:** This lets the terrain toy be evaluated now without spending the whole planet in one click or introducing the later economy before it is designed. The user can inspect one side indefinitely without motion changing the target under the pointer.
- **Affects:** VIEW-01, TERR-04, TERR-09, TOOL-01–05, MET-02, VIS-02, spec §6, tuning §2, M1. Browser feel and target-device performance remain to be checked with a human playtest.

### D-017 Flatten stamps a horizontal plane
- **Date:** 2026-09-30
- **Status:** accepted
- **Context:** The user observed that the M1 Flatten brush still felt spherical. It aimed toward a horizontal level but restricted edits to a 3D ball and showed a sphere preview.
- **Decision:** Use the clicked surface height as a horizontal target plane. In an XZ circular footprint of the selected brush radius, move nearby density samples toward the plane's signed field (`y - targetY`). Limit changes to a local vertical band of the same radius; keep the inner 75% flat and feather the horizontal and vertical edges. Mark chunks intersecting this cylinder, including their sample borders. Preview Flatten as a translucent horizontal disc and ring; Dig and Add Terrain retain spherical brushes.
- **Why:** A planar footprint produces a level platform instead of a rounded depression or mound, while the limited vertical band avoids changing an entire column through the planet. Edge feathering keeps the platform from ending in a hard wall.
- **Affects:** TOOL-04, TERR-04, VIS-02, tuning §2, M1. Browser playtest still needs to judge whether the platform width and edge transition feel right.

---

### D-018 Add a local Detector separate from the Scanner
- **Date:** 2026-09-30
- **Status:** accepted
- **Context:** The player needs to inspect a selected patch of the planet and see resources hidden below the surface. The planned Scanner deliberately gives only coarse direction, distance band, and strength.
- **Decision:** Add a Detector tool. A left click in orbit anchors one local spherical scan to the clicked surface. Only that bounded region shows a terrain wireframe and the actual Mineral, Life, and Memory target positions. The reveal uses world-space distance from the scan point with a smooth falloff, following the guidebook's Distance and Fresnel lesson; it does not use camera-dependent Fresnel. Buried targets are invisible in ordinary view and become normally visible only when terrain exposes them. `D` equips Detector; `T` returns to Terrain Tool. The M1.5 targets are seeded point proxies, including three surface teaching targets, while M3 owns irregular deposits, discovery, mining, and action cost.
- **Why:** A small, deliberate inspection is readable without turning the whole planet into a resource map. It also keeps the Scanner's later coarse prospecting role intact. Seeded target data makes the overlay truthful to the same world the player can dig.
- **Affects:** DET-01–04, GEN-01/04/07, TECH-07, RunState, design §7, spec §4.4, tuning §3, roadmap M1.5/M3.

---

### D-019 Flatten has planet-relative and world-level planes
- **Date:** 2026-09-30
- **Status:** accepted
- **Context:** The horizontal Flatten of D-017 only makes platforms parallel to one global plane, which is awkward on the sides and underside of a spherical planet.
- **Decision:** Keep one Flatten terrain mode with two selectable plane orientations. Default **Planet Surface**: the target plane passes through the clicked point and is perpendicular to the line from the planet center to that point. **Horizontal** preserves D-017's global-Y plane through the clicked point. Both use the same circular footprint measured within their plane, a local band along the plane normal, and the existing flat center and feathered edge. The hover disc follows the selected plane. Ctrl-click uses the selected orientation without changing the stored Terrain Tool mode.
- **Why:** Planet Surface makes a local terrace wherever the player clicks; Horizontal remains useful for shared world-level platforms. The two buttons make the difference visible and preserve the previous behavior when chosen.
- **Affects:** TOOL-04, RunState loadout, terrain preview, M1, spec §4.3/§6, README. D-017 remains the origin of the planar stamp; this decision changes its default orientation.

---

### D-020 Resources start embedded and glow through the terrain
- **Date:** 2026-09-30
- **Status:** accepted
- **Context:** M1.5 placed three teaching targets floating above the surface, all in one gray tint, and buried targets showed nothing until scanned.
- **Decision:** Every target starts embedded in the solid sphere (teaching targets shallow, others deeper). Mineral, Life, and Memory use yellow, green, and pink (`config/resourceColors.ts`). The terrain shader tints the surface around each target with a world-space distance falloff, `1 - smoothstep(0, glow.radius, distance(worldPosition, resourcePoint))` squared, so shallow targets glow visibly and deep ones do not. DET-03, GEN-04, and VIS-03 in the spec are rewritten to match, and relaxes the design "almost no colored glow" rule for resources only.
- **Why:** Resources read as part of the planet, and the glow gives a diegetic hint without a resource map. Detector still owns the full marker reveal.
- **Affects:** DET-03, GEN-04, VIS-03, `tuning.glow`, terrain material.

---

### D-021 Add camera-distance chunk LOD to the editable planet
- **Date:** 2026-09-30
- **Status:** accepted
- **Context:** The game already remeshes nearby chunks after an edit, but renders every visible chunk at full sample density. TERR-06 was deferred as stretch work; the user requested it now.
- **Decision:** Keep the 64³ density grid as the sole editable world state. Render each vertical chunk column at full, half, or quarter sample spacing according to camera distance. Prepare new meshes across frames and switch levels together. Snap fine boundary vertices and normals onto the neighboring coarse surface, using the guidebook LOD method adapted to this grid. Invalidate a chunk's cached levels after an edit and rebuild the current view from the changed density.
- **Why:** Distant terrain uses fewer triangles without reducing edit resolution. Column-level selection avoids vertical level transitions; snapping closes the remaining mixed-level seams.
- **Affects:** TERR-06, `tuning.lod`, planet meshing, debug overlay, tests. Browser appearance and target-device frame time still need checking.

---

### D-022 Prioritize procedural robot terraforming and keep mechanics simple
- **Date:** 2026-10-14
- **Status:** accepted
- **Context:** Teacher feedback asked what happens if the game plays itself. The user chose to lead robots and then explicitly prioritized procedural/automated processes over complex management.
- **Decision:** Player selects robots, defines work areas/goals, starts work and adjusts it. The next prototype is one autonomous Miner: bounded scan, nearest discovered mineral, hovering to an entry, progressive excavation, collect and reselect using current terrain. Show state and stop reasons. Then test multiple Miners and one second procedural behavior.
- **Decision:** Retain Miner/Builder/Gardener as the three-role direction, but implement incrementally. Robots hover in empty space; mining opens paths into solid terrain. Player and robots can both scan locally.
- **Decision:** Preserve manual terrain tools, seeded voxel engine, local Detector, LOD, low-saturation art, corporate satire, life/memory, audit and signal narrative. Broadcasting remains a deliberate player choice.
- **Decision:** Later funds buy robots and expand limited deployment slots; electricity incurs ongoing costs and near-insolvency forces departure. These agreed directions are deferred, without invented prices or thresholds. Fixed cycles/non-replenishable energy are superseded.
- **Decision:** Defer first person, trapped/escape mechanics, backpack, loadouts, hauling, complex metrics and questionnaire. Strategy UI and the second behavior remain open.
- **Decision:** Use the user-selected subtitle: “We’re here to put a dent in the universe.”
- **Why:** Rule-driven actors should visibly change a world without repeated manual digging. Additional game systems must not gate that proof.
- **Affects:** design, spec AUT-01–14, roadmap R1–R3, tuning, content and READMEs.
- **Implementation status:** documentation only; no robot, economy or subtitle UI code is implemented by this change.

---

### D-023 Define the R1 Miner: sphere work area, hover shell, radial tunnels
- **Date:** 2026-10-14
- **Status:** accepted
- **Context:** D-022 chose one autonomous Miner as the next prototype. Before building it the user settled the remaining details.
- **Decision:** One Miner spawns above a seeded random surface point (`seed:miner:0`); its work area starts under it. The count is fixed at 1 in R1 but robots are stored as a list, so later purchases and R2 need no rewrite.
- **Decision:** The work area is a **sphere** centered on a clicked surface point, with a radius slider. Clicking the planet in the Miner tab places the Miner (hovering there, not flying) and its area at that point, and discards the current task (the robot waits for Start); the spawn point is only the first default; the slider only resizes it. Targets must lie inside the sphere, so its radius also limits depth.
- **Decision:** The Miner discovers Minerals within the scan range of its own position, or inside a Detector scan. A robot far from its area first flies to hover above the area center, then scans. Only Minerals are mined; Life and Memory are never collected by the robot.
- **Decision:** Travel follows a hover shell, a fixed height above the outermost solid sample along each direction. It climbs radially out of any tunnel, then glides along the shell. The entry for a target is the surface point on the radial line through it; the tunnel is carved along that line, one bounded dig step per tick, advancing only into empty density. A tick budget per phase stops `blocked` work.
- **Decision:** The resource markers stay seeded points for now; veins or clusters (seed for configuration, noise for density) come later and need only a new target shape, not new robot logic. A short low-saturation debris effect and a path line from the robot to the target are visual feedback only; the cave comes from voxel edits.
- **Why:** The user wanted the automatic process to be readable, with feedback that never replaces real terrain change.
- **Affects:** AUT-01–12, `src/systems/miner.ts`, `src/config/tuning.ts` (`miner`), run state (`robots`, `simTick`), Miner tab UI, MinerView/MinerRunner, `collectExposedResources` category filter.
- **Implementation status:** simulation, controls and visuals are implemented and covered by `tests/miner.test.ts`. Speed values, FPS and feel are unplaytested.

---

### D-024 Split the UI into Auto and Manual modes; give it a playful type pairing
- **Date:** 2026-10-14
- **Status:** accepted
- **Context:** After the first Miner playthrough the user asked for a redesigned interface, with automatic and manual play separated and a more playful font.
- **Decision:** A two-way switch at the top centre chooses **Auto** (the Miner panel: place, size, Start/Pause, phase track, target, stop notice) or **Manual** (Terrain and Detector tools). Keys `A` and `M` switch modes; `D`, `T`, `F` work only in Manual. The robot, its path, debris and work area are drawn only in Auto, and the simulation freezes while Manual is active (no hidden digging); it resumes when the player returns to Auto. Switching back to Manual restores the last manual tool.
- **Decision:** Planet remaining and the warehouse move to a **Site report** card on the right, visible in both modes. The debug overlay moves to the bottom right. Key hints at the bottom are per mode.
- **Decision:** Type: **Fraunces** (soft, wonky display serif) for the title, subtitle and big numbers; **Bricolage Grotesque** for all interface text; both self-hosted through `@fontsource-variable` packages. The colour palette is unchanged (warm paper, graphite, three resource accents); playfulness comes from the type, rounded cards, pills and short press/slide motion, not from new colours.
- **Why:** The two modes answer different questions ("what do I tell the crew" and "what do I do myself"), so they should not share a panel. Type is the cheapest way to add character without breaking the restrained art direction (design §14).
- **Affects:** `src/App.tsx`, `src/ui/` (ModeSwitch, AutoPanel, ManualPanel, SitePanel), `src/style.css`, `src/main.tsx`, `package.json`; design §13 UI description. Not playtested for readability on small screens.

---

### D-025 Add a Gardener that plants and raises antennas by terrain shape
- **Date:** 2026-10-14
- **Status:** accepted
- **Context:** R3 (AUT-14) left the second behavior open. The user asked for a robot that places antennas and plants, and chose: one robot doing both in turn; placement that follows the terrain; plants that grow and spread; the Miner destroys what it digs through.
- **Decision:** One **Gardener** with its own spherical work area, placed by clicking the planet (Auto mode has a Miner / Gardener switch; the click places the selected robot). Jobs follow the pattern plant, plant, antenna. If the pattern's job has no room (antennas need 0.9 spacing) it tries the other job; three empty surveys in a row, or both caps reached, stop it with `no-sites`.
- **Decision:** Each survey samples 30 seeded ground points in the area. A point qualifies when it is solid ground with air above, gentle enough (plants ≤ 0.35 rad from the planet-centred sphere, antennas ≤ 0.6 rad) and far enough from other structures. Plants take the flattest qualifying point; antennas take the highest. The robot hovers to the point on the same hover shell as the Miner, works for 24 ticks, then the structure appears.
- **Decision:** Plants grow through three stages (300 ticks each). A mature plant seeds a neighbour within 0.3–0.7 every 450 ticks, on ground that passes the same plant rule, up to 60 plants. Antennas do nothing yet beyond standing there; their later role (signal) stays with the narrative work.
- **Decision:** Any terrain edit (the Miner's dig steps and the player's tools) removes every structure whose ground is no longer solid or whose top is buried. There is no repair loop: the Gardener only builds where the rules allow and plants only spread onto suitable ground, so a tunnel mouth stays bare until its rim qualifies.
- **Decision:** Structures are part of the planet and stay visible in Manual mode; the robots and their areas show only in Auto. The simulation still freezes in Manual. All systems run in one fixed step: Miners, Gardener, plant growth (`stepSimulation`).
- **Why:** Placement read from slope and height makes the rule visible on the planet; growth and destruction make mining and gardening interact without new economy rules.
- **Affects:** AUT-14–16, `src/systems/` (gardener, structures, geometry, simulation), run state (`gardeners`, `structures`, `structureCounter`, `loadout.autoRobot`, tool id `auto`), Auto panel, GardenerView, StructuresView, Site report counts, `tests/gardener.test.ts`.
- **Implementation status:** implemented and tested; sizes, rates and readability unplaytested.

---

### D-026 Add a Builder that cuts and fills toward one level, using the Miner's soil
- **Date:** 2026-10-14
- **Status:** accepted
- **Context:** D-022 kept Miner, Builder and Gardener as the three roles; D-025 built the Gardener. The user asked for the Builder (terrain shaping: fill and flatten) and chose: alternate flattening and filling; fill with soil the Miner digs out; leave plants and antennas alone; keep away from a tunnel a Miner is digging.
- **Decision:** One **Builder** with its own spherical work area, placed from Auto mode like the others (Miner / Gardener / Builder switch). When work starts it measures the area's **level**: the mean ground height of 60 seeded samples. It then alternates **flatten** (the highest surveyed ground more than 0.06 above the level: a radial Flatten at the level that only cuts, radius 0.35) and **fill** (the lowest ground more than 0.06 below: an Add at the ground, radius 0.18). If one job has nothing to do it does the other. Three empty surveys stop it with `level`, or `no-soil` when only fills remain and the stock is short.
- **Decision:** **Soil stock:** rock removed by Miners is added to a shared stock (density samples). A fill needs at least 28 samples in stock and spends what it actually adds. Rock the Builder cuts also returns to the stock, since it is the same material; the player's own digging does not. Planet Remaining therefore still falls when the Builder cuts more than it fills.
- **Decision:** The Builder skips ground within its brush radius plus 0.15 of any plant or antenna, and ground within 0.45 plus its radius of a working Miner or of the radial line to that Miner's target. Finished tunnels can be filled. This needed one engine change: `PlanetWorld.edit` takes an optional `cutOnly` flag so Flatten removes rock above the plane without filling below it.
- **Why:** Levelling toward one height is a single visible rule that produces a platform, which in turn is flat ground the Gardener prefers. Paying for fills with mined soil ties the Builder to the Miner without a new economy.
- **Affects:** `src/systems/builder.ts`, `planet.ts` (`cutOnly`), Miner soil, run state (`builders`, `soil`), tuning `builder`, Auto panel, BuilderView, Site report, `tests/builder.test.ts`.
- **Implementation status:** implemented and tested; rates and readability unplaytested.

---

### D-027 Adopt the component board: voxel robots, contour terrain, point atmosphere
- **Date:** 2026-10-14
- **Status:** accepted
- **Context:** Before (and alongside) the robot logic, the user compared visual options for every on-planet component over five rounds on a component board (`docs/component-board.html`, each option a 3D model at true game scale) and chose one per component.
- **Decision:** **Robots** share one hollow voxel orb (0.02 cells, radius 3.7 cells, ~Ø0.15) with a 2 × 2 status light; each role has its own silhouette and band color. Miner **E** (voxel orb, tilted ring of 26 cubes, stepped drill, graphite band). Gardener **G3** (seed pannier behind, two voxel arms that move while working, moss band). Builder **B1** (two ochre brackets carrying a voxel roller that turns while moving or working). Silhouette, not color, tells them apart at ~28 px in orbit.
- **Decision:** **Status light** (AUT-10): scan = pulsing scan-white, move = steady amber, work = fast amber blink, collect = mineral gold, plant = soft green, stopped = slow rust blink; idle and paused = dim steady scan-white.
- **Decision:** **Plants** are vegetation A + D together: a lichen patch of flat low-saturation discs with an L-system branch growing out of it; each growth stage shows more branch levels and a wider patch; three branch shapes are picked per plant id. **Antennas** are A: a 0.45 three-leg lattice mast with a dish and a blinking amber lamp.
- **Decision:** **Minerals** are drawn as small crystal clusters (resource B), sized to the existing target radius. This is visual only; D-023 keeps targets as seeded points, and real multi-crystal deposits remain a later generation change.
- **Decision:** **Terrain** is surface C: value from low gray to limestone by height, darker on steep slopes, and graphite contour lines every 0.045 world units (every fifth stronger), all in world space so edits bend the lines. The existing resource glow (VIS-03) is kept. The **work area** is style D: inside the selected robot's sphere the contours double in density and darken, its intersection with the ground is a single contour-weight line, and no wireframe sphere is drawn.
- **Decision:** **Atmosphere** is C4 in cool gray at 23%: ~4200 points whose height starts at the initial terrain below them, density masked by low-frequency noise with a 15% floor, two shells drifting at different speeds, an irregular faint halo, and the planet's limb tinted toward the atmosphere color. It is seeded from the initial surface and does not follow edits.
- **Decision:** Rendering language is **solid** (no outlines). Lighting becomes one soft key light plus a warm hemisphere fill. Debris is small voxel cubes. Path lines take the robot's band color. All colors live in `src/config/palette.ts`; a test fails if a model uses a color outside it.
- **Why:** The user wanted the components settled before automation and chose a restrained archive look in which robots read by shape, the planet reads by contour and value, and dust reads as points (design §14 point / line / surface).
- **Affects:** design §14 (component styles), spec VIS-01/11–14, tuning (visual), `src/config/palette.ts`, `src/render/` (terrainMaterial, atmosphere, models), Miner/Gardener/Builder/Structures/Detector/Atmosphere views, App lighting, `tests/visual.test.ts`. No simulation rule changed.
- **Implementation status:** implemented and covered by `tests/visual.test.ts`; frame rate with 60 plants and the atmosphere, and contour readability on the user's laptop, are unplaytested.

---

## Open questions

Answer these as early as they block work. Suggested defaults are marked, so nothing waits on you.

| ID | Question | Blocks | Suggested default | Owner / date |
| --- | --- | --- | --- | --- |
| OQ-01 | Superseded by D-022: later operating costs use funds, not finite cycles/energy. | Deferred economy | Billing and departure thresholds still open; no economy in R1. | 2026-10-14 |
| OQ-02 | Deferred by D-022: Emergency Extraction: cost and number of uses? | NAV-03 | One use per run; costs a large fraction of Capital and some Historical Significance. | |
| OQ-03 | Does "Thank you for keeping quiet" need high Planetary Memory, or always appear in the Silent ending? | END | Only with high Planetary Memory, so it feels earned. | |
| OQ-04 | How much of the Erased ending is first person versus orbit? | END-06, VIEW-06 | Start at wherever the player is, then pull out to orbit. | |
| OQ-05 | English only or bilingual UI? | content | English only for MVP; Chinese as a later pass. | |
| OQ-07 | Deferred by D-022: How to detect "no walkable path to surface" cheaply after any edit? | NAV-04 | Coarse grid flood fill on a debounce; fall back to a "stuck for N seconds" timer. | |
| OQ-08 | Do we need Web Workers for meshing? | TECH-06 | Start with time-sliced remeshing on the main thread; add a worker only if profiling demands it. | |
| OQ-09 | Deferred by D-022: Collision: mesh collider or sample the density field for the player capsule? | NAV-01, TERR-05 | Sample the density field with a capsule of points; avoids a second mesh. Revisit after a prototype. | |
| OQ-10 | Density grid resolution and chunk size that meet the frame budget? | TECH-06, TERR-02 | Try 64³ with 16³ chunks first; measure. | |
| OQ-11 | Is the Observed ending a separate scene or a variation of Heard? | END-03 | Variation of Heard with stronger interference for MVP. | |
| OQ-12 | Should the run allow saving (Firebase) or be session-only? | scope | Session-only for MVP. Revisit after M6. | |
| OQ-14 | Which geometric and discovery fields should ResourceCluster carry beyond its M1.5 id/category/position/radius proxy? | M3, GEN-01 | Define irregular geometry, depletion, discovery and collection state with the full generator. | |
| OQ-15 | Detector billing is deferred by D-022. | Later economy | Keep scans free in R1; revisit with operating costs. | 2026-10-14 |

---

### Current questions after D-022
- ~~How should the work area's depth extent and robot scan range be shown clearly?~~ R1 shows a wireframe sphere (D-023); whether that reads clearly still needs a playtest.
- What simple surface-entry search works reliably on the current planet?
- ~~Is Builder or Gardener the first second behavior?~~ Gardener, with antennas (D-025).
- Are later strategy controls a questionnaire, presets or a panel? Deferred; R1 has one goal.
- What electricity billing and departure threshold work without bloating the game? Deferred.

## Rejected ideas (so we do not re-argue them)

| Idea | Why not |
| --- | --- |
| Layered interior (minerals, then life, then memory) | Too predictable; random clusters give exploration and surprise (design §10.2). |
| Showing Cosmic Exposure as a meter | Turns the ending into number optimization (D-008). |
| A separate "Depositor" tool | Hard to explain; replaced by Add Terrain (D-004). |
| Full-sphere first-person in the MVP | Too costly for the core loop (D-009). |

## D-028 — Site logistics and operating feedback

User approved the warehouse / operating account / planet condition split. Warehouse holds sellable minerals and construction soil. Life and Memory are discoveries, not commodities. Mineral sales explicitly transfer inventory into capital; simulation ticks bill only running robots. Manual mode freezes operation and billing. Insufficient capital pauses the crew, allowing sales and manual resume; purchases, deployment expansion and forced departure remain deferred.

Prototype tuning: 250 starting credits, 40 per mineral, power draw Miner 6 / Gardener 3 / Builder 8 kW, electricity 0.25 credits per kW-minute. Values are provisional and centralized in tuning.ts. Initial ecology is 60; living plants add 0.6 each, disturbed life discoveries subtract 2 each, lost terrain fraction subtracts up to 60. Stability currently estimates retained mass, not local structural connectivity. Prepared ground estimates cumulative Builder-edited samples (10,000 samples = 100), weighted by remaining mass. All three are labelled estimates in the UI. Discovery collection does not constitute a protection-choice system; that remains future work.

## D-029 — Surface exploration and orbital atlas

The user requested underside lighting, landing sites, returnable first-person exploration, and a 2D world map. Added ambient and lower-hemisphere fill while retaining the directional key. Eight regional landing candidates are sampled from the edited density field, refreshed every two seconds and checked again before landing. Missing or steep ground is unavailable.

Surface mode uses radial up, tangent-plane WASD/arrow movement and drag-to-look; on-screen held buttons support touch. Steps across steep height changes are blocked. Returning restores the previous camera pose and lens. Ground loss beneath the walker returns to orbit. This is outer-surface exploration, not cave traversal, jumping or full character physics. Terrain editing and robot placement are disabled during exploration; the existing Auto/Manual simulation policy stays in effect.

The atlas uses an equirectangular projection of sampled surface height and refreshes once per second while open. Optional layers show remaining subsurface resource projections, excavated/filled terrain against the seed baseline, plants, antennas, robots and landing sites. The walker is marked on the atlas. Full resource distribution is intentionally visible in this requested survey view; it is not restricted to Detector discoveries.

## D-030 — Builder/Gardener handoff and interface boundaries

Builder terrain edits retain up to 64 recent prepared sites. Gardener surveys test suitable prepared sites inside their own area before covering the rest of the area with a seeded disc pattern. A Gardener waiting with no-sites automatically surveys again when Builder, Miner or manual terrain edits intersect its work area. Explicitly paused robots remain paused, and distant edits do not wake them. Waiting does not incur robot electricity charges. The UI distinguishes waiting for ground from reaching global plant/antenna capacity.

The operating interface uses one grid with a shared top and bottom boundary for the left control rail and right report rail. Each rail scrolls inside its own bounds on desktop. The application title stays on one line. A centered opening presents Contract #1380, Terraforming Contractor and its tagline, then fades into the workspace; it can be skipped and respects reduced-motion preferences.

## D-031 — Debt warning and bankruptcy

The user asked for funds to stay near zero so spending needs thought. Starting capital is now 0. Electricity is billed even when it drives funds negative; the crew is no longer paused for insufficient funds. At or below ₡0 the operating account shows a near-bankruptcy warning. At −₡50 (`tuning.economy.bankruptcyLimit`) the run ends: billing, sales and simulation stop and a game-over screen offers a new contract (page reload). This supersedes the "insufficient capital pauses the crew" rule and the 250-credit start in D-028.

## D-032 — Broadcast animation, distant planets and travel

The user asked for a broadcast animation, and for new planets to appear in the background after enough signals, which can be clicked to travel to. Planet condition now has a Broadcast signal button; it needs at least one antenna and is free. Each broadcast increments `signal.broadcastCount`, sets `hasBroadcast`, and adds one exposure point per antenna to `exposureScore` (mirrored into hidden `cosmicExposure`). The animation sends three staggered amber rings outward along each antenna's normal plus one faint shell around the planet over 3.2 s; the button is locked while it plays.

From the third broadcast on, one more distant planet fades in per broadcast (up to five), at fixed canvas corners clear of the home planet, so they stay on screen while orbiting. They are hidden during surface exploration. Clicking one asks for confirmation; travelling replaces the run state with a fresh planet seeded from the current seed (`<seed>/signal-N`), keeping only available funds, and remounts the app without the opening title. The URL seed is not updated. Values live in `tuning.signal`. Exposure consequences and endings (design §9) are still not implemented.

## D-033 — Communicator replaces in-panel warnings

Robot stop messages, the Builder's soil shortage and the low-funds warning no longer appear as rounded notice boxes inside cards. They arrive on a square-cornered communicator at the bottom-right, in the same row as the key hints. It opens by itself when a new message appears, lists the messages, and each message can be dismissed. Each one carries one button to the most relevant place: Auto mode with the robot to place or check, or selling the stored minerals when funds are low and minerals are waiting. Messages are derived from run state in `systems/comms.ts`, so they disappear when the cause is resolved. Generic `.notice` boxes are now square-cornered.


Electricity was later raised from 0.25 to 0.4, then to 0.55 credits per kW-minute (a Miner now costs 3.30 per minute); the per-mineral price of 40 is unchanged.


## D-034 — Free terraforming with consistent procedural consequences

- **Date:** 2026-10-20
- **Status:** accepted
- **Context:** The 20 October crit discussion and subsequent user decision call for a clearer project definition and causal chain. Existing docs still describe a one-Miner next step even though D-025–033 record later features.
- **Decision:** Define the project as a procedural sandbox where players freely reshape different planets. Use the chain: planet starting conditions → player choices and robot work → environmental change → resident responses → different planetary outcomes.
- **Why:** Preserve playful freedom while making consequences legible. Resource extraction, ecological flourishing and unusual shapes are valid intentions; migration is feedback, not an automatic failure.
- **Implementation boundary:** This is a documentation decision. Residents, persistent planet records and a live 3D system overview are not implemented by it. Keep existing implemented behavior identified separately from future intent.
- **Affects:** root and game READMEs; design §1–3/5–6; subsequent spec and roadmap updates.
- **Relationship:** Extends D-022's emphasis on procedural automation; supersedes its one-Miner-only description of the current design scope, not its implementation history.

## D-035 — Residents make habitat consequences visible

- **Date:** 2026-10-20
- **Status:** accepted
- **Context:** The user liked rock Pikmin as a reference and accepted the first planet's quiet cave-dweller concept.
- **Decision:** Begin with one rock-like species preferring snug cavities, low disturbance and nearby companions. Brief disruption prompts retreat; sustained disruption or invalid shelter may prompt reachable relocation; quiet can allow return or occupation of suitable new cavities.
- **Why:** Automatic resident behavior makes environmental change visible. Departure is feedback, not an automatic failure.
- **Open:** final body design, generation counts, cave detector, routes and numerical thresholds. Wall-following/social gestures can follow the core response. A door pebble is optional animation, not a hauling requirement.
- **Affects:** procedural-system §4–5; spec HAB/RES; content and tuning. All resident implementation remains todo.

## D-036 — Preserve discovered worlds and compare their actual shapes

- **Date:** 2026-10-20
- **Status:** accepted
- **Decision:** Expand D-032 toward a persistent multi-planet sandbox: varied starting conditions, per-planet state retained across travel, return visits, and a 3D system overview with current edited silhouettes and hover information.
- **Why:** Planet differences and accumulated player choices should remain observable across worlds.
- **Current gap:** D-032 travel replaces the run, carrying funds only; distant screen-positioned entries do not preserve old terrain or represent actual editable world sizes.
- **Open:** inactive-world simulation, browser-reload saves, shared/local accounts and update budget. Orbital physics is not required.
- **Affects:** design §10; procedural-system §2/6; spec PLN/SYS; roadmap. No state persistence or system view is implemented by this entry.

## D-037 — Keep accounting internal and explain essential consequences

- **Date:** 2026-10-20
- **Status:** accepted
- **Decision:** Weaken detailed financial presentation; calculations may remain internal. Show compact operating context and actionable warnings when money affects available actions.
- **Why:** Keep attention on procedural processes and world changes while retaining understandable rules.
- **Boundary:** D-031 debt/bankruptcy and existing charges remain implemented behavior. Changing the hard ending, thresholds, sale policy or ownership of funds is not approved by this interface decision.
- **Affects:** design §7–8; spec OPS; content; tuning. Interface simplification remains todo.

## D-038 — Separate signal infrastructure from gardening

- **Date:** 2026-10-20
- **Status:** proposed
- **Context:** The crit discussion calls for clearer roles; the Gardener currently alternates plants and antennas (D-025).
- **Proposal:** Keep cultivation and planet discovery causally distinct; choose a separate placement/construction path for antennas.
- **Why:** A player should understand why planting differs from discovering a planet.
- **Boundary:** No implementation owner or interaction is chosen. Do not remove current antenna placement or mark this accepted.
- **Affects if accepted:** AUT-15, Gardener rules, signal controls, content and roadmap.

## D-039 — Sell minerals automatically on delivery

- **Date:** 2026-10-21
- **Status:** accepted; implemented, not yet browser-verified
- **Decision:** Every mineral is sold at the standard price the moment it is collected (robot or manual). The Sell button is removed. The warehouse bay now counts minerals sold. While bankrupt, sales stay blocked and minerals remain in stock as before.
- **Why:** Selling by hand was bookkeeping that distracted from the terrain and robots (D-037). The user chose per-delivery settlement over timed batches.
- **Supersedes:** the manual sale step of D-031/D-021 and the "sell" communicator action of D-033. Prices, charges and bankruptcy (D-037 boundary) are unchanged.
- **Affects:** `tools/collector.ts`, `systems/economy.ts`, `systems/comms.ts`, SitePanel, Comms, run state `economy.mineralsSold`, content "Compact operating messages", OPS-01.

## D-040 — Persistent planets: shared funds, frozen inactive worlds

- **Date:** 2026-10-21
- **Status:** accepted; implemented and browser-checked (edit A → visit B → return to A)
- **Context:** The user moved S3–S5 ahead of S1/S2 (persistent planets, overview and varied planets first, residents after). PLN-05 required this choice before S3.
- **Decision:** The operating account (funds and bankruptcy) is shared across planets. Every other part of the run state is kept per planet: terrain density, collected IDs, stock, soil, robots, structures and the planet's own signal state. Only the active planet simulates and bills; a planet you leave is frozen and its robots resume when you return. The player's tool selection travels with them. Planets live for the browser session only (PLN-06 unchanged).
- **Navigation:** the 3D System overview (S4) is the way to move between known planets. It draws each visited planet from its current chunk meshes, refreshing when a mesh version changes; planets answered by a signal but never visited are drawn as outlines at their real radius. The screen-space distant planets in the main view stay as the discovery moment.
- **Why:** Freezing keeps the cost and the explanation simple ("the crew pauses until you return") and avoids implying that every planet simulates.
- **Affects:** `state/planets.ts` (registry), `systems/signal.ts` `travelTo`, `systems/system.ts`, `ui/SystemOverview.tsx`, `main.tsx`, `App.tsx`; PLN-01/03/04/05, SYS-01–04.

## D-041 — Signal planets vary size, relief and abundance independently

- **Date:** 2026-10-21
- **Status:** accepted; implemented
- **Decision:** `planetConfig(seed)` gives each planet a radius, a relief amplitude, a mineral abundance and a life abundance. The home seed keeps the original values (radius 0.34, relief 0.16, x1). A planet whose seed comes from a signal reads each property from a different byte of its hash within the ranges in `tuning.planets`, so a large planet is not automatically rich. Terrain, resources, robot spawn, atmosphere, contour shading and the signal shell all read the same config. The overview describes the traits in words (for example "Small, rugged, mineral-poor, teeming with life").
- **Not yet:** different noise character per planet, memory abundance, and a playtest of whether small planets are too cramped for three robots.
- **Affects:** `world/planet.ts`, `world/resourceClusters.ts`, `render/terrainMaterial.ts`, `render/atmosphere.ts`, `views/SignalView.tsx`, `views/PlanetView.tsx`, `config/tuning.ts`; PLN-02.

## D-042 — First resident rules: seeded burrows, local disturbance, open-space routes

- **Date:** 2026-10-21
- **Status:** accepted; implemented; automated checks pass; browser-checked with scripted disturbance, not yet playtested by a person
- **Context:** D-035 left the cave detector, routes, counts and thresholds open. The user asked for S1 and S2 after S3–S5.
- **Burrows:** the initial terrain has no caves, so the seed carves groups of three burrows into the planet field: a pocket 0.6 below the ground and a slanted tunnel to the surface. Two of every three start occupied, leaving a spare home per group. The number of groups follows the planet's life abundance (D-041). The carving is part of `createPlanetField`, so every system sees the same terrain.
- **Shelter test (HAB-01/03):** recomputed from current density: the body fits (density ≥ 0.05), at least 70% of 26 rays meet rock within 0.6, and a bounded flood fill through empty samples reaches a point with open sky above it. The flood-fill path is the resident's real way in and out. Open pits fail as "exposed"; plugged burrows fail as "sealed".
- **Disturbance (HAB-02):** every manual edit and every Miner/Builder edit adds a fading source (manual 1.4, robot 0.3 per edit, capped at 3, ×0.97 per tick, radius 0.9). Removal edits are also kept as candidate cavities (last 64).
- **Behaviour:** above 0.5 a resident hides deep in its pocket; after 2.5 s below 0.15 it peeks again (RES-03). After 8 s of disturbance, or when its home fails the shelter test, it searches burrows and dug candidates within 3.0 that are free, quiet and valid, scored by enclosure, companions, disturbance and distance, with a 0.12 advantage threshold and a 20 s cooldown (RES-04/06). It walks out along its own tunnel, over the ground and in through the new tunnel; any point more than half a sample into rock rejects the route. With nowhere to go it waits on the ground, visible, and retries (RES-07). Calm residents occasionally look for a clearly better cavity, which lets them move into a new tunnel after work stops (RES-05).
- **Not crew:** residents run in Manual mode as well, never bill electricity, and freeze with their planet when you leave (D-040).
- **Body:** a provisional pale lumpy rock with two dark eyes that faces out of the entrance or along its walk. The final body design (D-027 board) is still open.
- **Affects:** `systems/residents.ts`, `views/ResidentsView.tsx`, `world/planet.ts` (`burrowSites`, field carving), run state `residents`/`habitat`, terrain tool, Miner, Builder, overview description, debug overlay; HAB-01–04, RES-01–08.

## D-043 — Autopilot: a third mode that runs the whole planet

- **Date:** 2026-10-21
- **Status:** accepted; implemented; automated checks and a headless 30-minute simulation pass; browser-checked start and cancel, not yet playtested by a person
- **Decision:** the mode switch gains **Autopilot** beside Auto and Manual. From either mode the player opens the Autopilot panel, sets how many Miners, Gardeners and Builders to deploy (0–4 each, at least one in total) and whether signals are sent automatically, then hands over. Cancelling (button, comms "Take over", or choosing Auto/Manual) returns to the human-in-the-loop Auto mode with one paused robot of each kind; the crew sizes are remembered.
- **Whole planet:** each robot sweeps a ring of overlapping sectors (6 for Miners and Gardeners at radius 2.4, 12 for Builders at 1.4) using the existing work-area logic. A stopped robot moves to the next sector; after a lap with no work it rests 900 ticks, doubling per fruitless lap up to 16×. A Miner on a planet with no mineral left, and a Gardener at both caps, simply stay stopped.
- **Builders:** they take sectors from one shared queue, level to one planet-wide height measured at hand-over, leave a sector after 15 jobs, and retire when the queue is empty. Reason: filling overshoots and flattening cuts it back, so a robot that repeats forever never converges (measured: 900–3700 jobs in 30 simulated minutes, paying electricity throughout). Autopilot therefore makes one pass; restart it for another.
- **Funds:** Gardeners and Builders wait while funds are at or below ₡−20 and resume at ₡−10 or above; Miners keep earning. This is a safeguard so a hand-over cannot bankrupt an unattended run.
- **Signals:** while antennas stand, a signal goes out every 20 s until all distant planets are visible (broadcast count `planetsAfter + maxPlanets − 1`), then stops. The manual button still works. This narrows design §9 ("a broadcast is an explicit player choice") to a choice the player makes once, at hand-over.
- **Per planet:** `autopilot` lives in the run state, so a planet left running is frozen with the rest (D-040) and arriving at another planet starts in Auto.
- **Not yet:** a person's playtest; a pass counter or per-robot sector overlay; letting Builders pass again after the terrain changes.
- **Affects:** `systems/autopilot.ts`, `systems/simulation.ts`, `systems/comms.ts`, `ui/AutopilotPanel.tsx`, `ui/ModeSwitch.tsx`, `App.tsx`, per-robot views and the world map, `spawn*` indices; AUTO-01–11.
