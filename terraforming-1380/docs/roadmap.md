# Terraforming Contractor #1380 — Roadmap

| | |
| --- | --- |
| **Purpose** | The order of work, and what "done" means for each step. |
| **Last updated** | 2026-09-30 |
| **Current focus** | M1.5 Detector; M1 human playtest still pending |

## How this works

- Each milestone is a **vertical slice**: something you can open in a browser and play, however rough, and that ends with a short playtest note in `tuning.md`.
- The design will change while you build. That is expected. If a milestone teaches you something, write a decision in `decisions.md` **before** editing `design.md` or `spec.md`.
- Tasks refer to spec IDs so nothing gets built that the spec does not know about.
- Dates are left blank on purpose. Fill them in when you know your calendar.
- If time runs short, cut from the bottom (M6 polish first, then M5 extras). M1–M4 are the game's identity.

Status: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` cut

---

## M0 — Set up

**Goal:** an independent game app that builds and shows a planet placeholder. Shared-site deployment is a separate task (D-012).
**Playable when:** `npm run dev`, then open `/game/?seed=1380&debug=1` for a rotating sphere and the debug overlay.

- [x] Create `terraforming-1380/` (Vite + React + TypeScript, `allowJs`) — TECH-01–03
- [x] Set `base: '/game/'` - TECH-05
- [x] Shared-site build assembly and Firebase rewrite configured and emulator-verified in `deployment/` (D-013; live publish pending)
- [x] Create `src/` layout from spec §2, and `src/config/tuning.ts`
- [x] Add the run store with the state shape in spec §3 — TECH-04
- [x] Copy voxel modules from the guidebook (spec §10) and confirm they run
- [x] Debug overlay and `?seed=` — DBG-01, DBG-02
- [x] Docs are already in `terraforming-1380/docs/`
- [x] GDD archive is present at `docs/archive/gdd-v0.5.md` (verified during final review)

**Validation:** TypeScript + production build pass. Automated checks cover seeded geometry, chunk seams and URL options. Browser visual/FPS verification remains pending: Computer Use denied Chrome access. Shared Firebase configuration and both CI workflows are now prepared and emulator-verified (D-013); live publishing remains pending. No gameplay changes.

## M1 — A planet you can dig

**Goal:** the core toy. Digging and filling feel good before anything else exists.
**Playable when:** in orbit view, the planet stays still while right-drag rotates the camera. Use `F` or the buttons to select Dig/Add Terrain/Flatten and left-click to shape the planet; supported Alt/Ctrl shortcuts provide temporary overrides. The surface changes with no gaps between chunks.

**Before implementation:** Follow the negative-inside edit and solid-volume mass rules in D-014; use D-015 for mode selection and optional modifier shortcuts.

- [x] Sphere plus noise density field — TERR-01, TERR-02, GEN-07 (terrain seed only; resource clusters later)
- [x] Chunks, Marching Cubes, dirty-chunk remesh — TERR-03, TERR-04 (target-device frame budget unverified)
- [x] Stationary planet, right-drag orbit camera and mouse raycast — VIEW-01, TOOL-10 (M1 orbit scope)
- [x] Terrain Tool: Dig, Add, Flatten with brush size — TOOL-01–05 (canister and Wide Drill effects later)
- [x] Flatten offers Planet Surface (default) and Horizontal plane orientations with matching previews — TOOL-04, D-019
- [x] Mass tracking, `planetRemaining` — TERR-09, MET-02 (sample-volume estimate)
- [x] First look: warm white background, gray material, world-space triplanar grain — VIS-01, VIS-02
- [ ] **Playtest:** does digging feel satisfying? Log it.

**M1 check:** Build and automated terrain, seed and seam tests pass. The user still needs to playtest the mouse controls, material and frame rate in a browser (D-016, PT-002). Canister spending begins in M2; budget costs in M3.

**Flatten corrections (D-017, D-019):** Planar stamp and matching disc preview are implemented and tested. Planet Surface is now the default, with the former global-Y Horizontal plane selectable; platform feel still needs the M1 human playtest.

## M1.5 — Inspect a local patch (D-018)

**Playable when:** choose Detector or press `D`, then left-click the planet. A small wireframe region and any buried Mineral, Life, or Memory point signals there appear; press `T` to return to terrain editing. Exposed teaching targets remain visible normally.

- [x] Seeded, independent category target proxies and three surface teaching targets — GEN-01/04/07 (full irregular deposits remain M3)
- [x] Local Detector selection, click anchor, and scan radius — DET-01
- [x] Local terrain wireframe and hidden target reveal; hide scan on tool switch — DET-02/03
- [x] Fixed world-space distance falloff from the guidebook lesson — DET-04
- [x] Automated seed, locality, exposure and production-build checks
- [ ] **Playtest:** check scan visibility, click accuracy and FPS in a browser; log feedback in `tuning.md`.

**Boundary:** No resource extraction, economy, irregular deposit shape or Detector cost yet. Those join the M3 resource and budget loop.

## M2 — Walk on it

**Goal:** the second view, and the trapped problem.
**Playable when:** press `Tab`, walk on the surface, dig a shaft, and either climb out or get stuck.

- [ ] First-person controller and collision (OQ-09) — VIEW-02, NAV-01, TERR-05
- [ ] `Tab` transition that preserves position — VIEW-03
- [ ] Crosshair raycast for tools — TOOL-10
- [ ] Canister: fill from digging, spend when adding — TOOL-02, TOOL-03, TOOL-07
- [ ] Trapped detection and Emergency Extraction — NAV-02–04
- [ ] **Playtest:** is getting trapped a fun problem or an annoying one? Decide OQ-02.

## M3 — The loop and the trade-offs

**Goal:** the metrics make choices matter.
**Playable when:** you scan, dig to a signal, sell it, watch the five metrics move against each other, and the budget runs out.

- [ ] Full irregular clusters, discovery and collection for minerals, life, memory — GEN-01–06 (replace M1.5 point proxies)
- [ ] Detector energy cost or cooldown — DET-05 (decide OQ-15)
- [ ] Scanner with direction, distance band, strength — SCAN-01–06
- [ ] Budget and costs; decide OQ-01 — BUD-01–03
- [ ] Five metrics and notices — MET-01, MET-03–09, UI-04
- [ ] Development Readiness and Stability rules — spec §5.1
- [ ] Module selection screen and effects — MOD-01–03, UI-05
- [ ] Backpack — PACK-01–04
- [ ] Small core — TERR-07
- [ ] **Playtest:** can a run max every metric? (MET-09). Adjust `tuning.md`.

## M4 — The story beats

**Goal:** the humor and the dread exist.
**Playable when:** you can find #1379, repair the Echo Array, broadcast, and see the company reward you.

- [ ] Silent Shore base with the four systems — design §4.3
- [ ] Guaranteed #1379 archive and Echo Array target — GEN-08, UI-06
- [ ] Deep Echo Console and exposure — SIG-01–07
- [ ] Company voice: all notices from `content.md` loaded by key
- [ ] Intro screen and directive
- [ ] **Playtest:** does a first-time player understand the warning and choose knowingly?

## M5 — Audit, classification, endings

**Goal:** the payoff.
**Playable when:** a run ends with an audit, one of six classifications that fits the planet, and one of the endings.

- [ ] Shape analysis features — CLS-01, CLS-02, spec §5.2
- [ ] Classification pipeline and data file — CLS-03–08
- [ ] Six test planets (DBG-07) and the CLS-T check
- [ ] Audit sequence UI — END-01, CLS-08
- [ ] Silent, Heard, Erased endings — END-02–06
- [ ] Restart with a new seed — END-07
- [ ] Debug: preview classification, force ending — DBG-04, DBG-05
- [ ] **Playtest:** does the classification feel earned? If not, fix features before adding names.

## M6 — Look and sound

**Goal:** the art direction lands.
**Playable when:** the planet decays from textured solid to wireframe to fragments, and sounds support it.

- [ ] Point / line / surface layers — VIS-04
- [ ] Wireframe states from local thickness and remaining mass — VIS-05, VIS-06, spec §5.4
- [ ] Material blending for rock, soil, mineral, life, memory — VIS-03
- [ ] Scan visuals as dot grids and lines — SCAN-03
- [ ] Cosmic ending visuals — VIS-09, VIS-10
- [ ] Core sounds and the ending audio — AUD-01, AUD-03, AUD-04
- [ ] Performance pass — TECH-06, PERF-T

## M7 — Playtest and tune

**Goal:** it is ready for someone else.

- [ ] At least five outside playtests, logged in `tuning.md`
- [ ] Walk through every acceptance check in spec §9
- [ ] Fix the top three confusions
- [ ] Update `design.md` and `spec.md` to match what the game became
- [ ] Deploy at `/game/` and fill in the README play link

---

## Icebox (Stretch, not scheduled)

Monuments that change the silhouette · more classifications (10 more main plus rare) · seeder and plant growth · shareable result cards · random company contracts · "original intent vs. classification" comparison · whole-planet walking with spherical gravity · mobile input · Observed ending as its own scene · LOD for chunks (TERR-06).

## Risks to watch each milestone

Frame rate while remeshing · confusion about the two views · getting trapped feeling unfair · the classification feeling random · art readability of low-saturation resources. See `design.md` §17.

---

## Change log

| Date | Change |
| --- | --- |
| 2026-09-29 | First roadmap, M0–M7. |
| 2026-09-30 | M0 implementation and automated validation; Firebase integration deferred, visual check pending; existing GDD archive verified (D-012). |
| 2026-09-30 | D-013: shared build assembly and Firebase Hosting routes verified locally; live publishing remains pending. |
| 2026-09-30 | D-014 and D-015 settle M1 density direction and terrain controls before implementation. |
| 2026-09-30 | D-016: implemented M1 terrain interaction and right-drag orbit; automated checks passed, human feel test pending. |
| 2026-09-30 | D-017: Flatten now uses a horizontal plane and circular footprint; regression and seam tests passed. |
| 2026-09-30 | D-018: M1.5 local Detector, seeded target proxies and distance-faded reveal implemented; browser feel test pending. |
| 2026-09-30 | D-019: Flatten now offers Planet Surface (radial default) and Horizontal planes; geometry, seams and build checks passed. |
