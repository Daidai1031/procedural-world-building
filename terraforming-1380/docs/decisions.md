# Terraforming Contractor #1380 — Decisions

| | |
| --- | --- |
| **Purpose** | The memory of the project. Every time the design or spec changes, the *reason* goes here, so we can tell later whether a change was a good idea. |
| **Last updated** | 2026-09-30 |

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
- **Status:** accepted
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

## Open questions

Answer these as early as they block work. Suggested defaults are marked, so nothing waits on you.

| ID | Question | Blocks | Suggested default | Owner / date |
| --- | --- | --- | --- | --- |
| OQ-01 | Run budget: 30 work cycles or 1,000 energy? | BUD-01, TOOL-06, SCAN-05 | **Energy.** It lets each tool have a different cost, which supports module trade-offs. Drop "work cycles" unless a day/night beat needs it. | |
| OQ-02 | Emergency Extraction: cost and number of uses? | NAV-03 | One use per run; costs a large fraction of Capital and some Historical Significance. | |
| OQ-03 | Does "Thank you for keeping quiet" need high Planetary Memory, or always appear in the Silent ending? | END | Only with high Planetary Memory, so it feels earned. | |
| OQ-04 | How much of the Erased ending is first person versus orbit? | END-06, VIEW-06 | Start at wherever the player is, then pull out to orbit. | |
| OQ-05 | English only or bilingual UI? | content | English only for MVP; Chinese as a later pass. | |
| OQ-07 | How to detect "no walkable path to surface" cheaply after any edit? | NAV-04 | Coarse grid flood fill on a debounce; fall back to a "stuck for N seconds" timer. | |
| OQ-08 | Do we need Web Workers for meshing? | TECH-06 | Start with time-sliced remeshing on the main thread; add a worker only if profiling demands it. | |
| OQ-09 | Collision: mesh collider or sample the density field for the player capsule? | NAV-01, TERR-05 | Sample the density field with a capsule of points; avoids a second mesh. Revisit after a prototype. | |
| OQ-10 | Density grid resolution and chunk size that meet the frame budget? | TECH-06, TERR-02 | Try 64³ with 16³ chunks first; measure. | |
| OQ-11 | Is the Observed ending a separate scene or a variation of Heard? | END-03 | Variation of Heard with stronger interference for MVP. | |
| OQ-12 | Should the run allow saving (Firebase) or be session-only? | scope | Session-only for MVP. Revisit after M6. | |
| OQ-14 | Which geometric and discovery fields should ResourceCluster carry beyond its M1.5 id/category/position/radius proxy? | M3, GEN-01 | Define irregular geometry, depletion, discovery and collection state with the full generator. | |
| OQ-15 | What energy cost or cooldown should each Detector scan have? | M3, DET-05, BUD-01 | Use an energy cost when OQ-01 is resolved; keep scans free in the visual prototype. | |

---

## Rejected ideas (so we do not re-argue them)

| Idea | Why not |
| --- | --- |
| Layered interior (minerals, then life, then memory) | Too predictable; random clusters give exploration and surprise (design §10.2). |
| Showing Cosmic Exposure as a meter | Turns the ending into number optimization (D-008). |
| A separate "Depositor" tool | Hard to explain; replaced by Add Terrain (D-004). |
| Full-sphere first-person in the MVP | Too costly for the core loop (D-009). |
