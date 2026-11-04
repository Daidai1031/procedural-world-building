# Tiny Dent — Roadmap

| | |
| --- | --- |
| **Purpose** | The order of work, and what "done" means for each step. |
| **Last updated** | 2026-11-04 |
| **Current focus** | Multi-planet ecosystem E1–E6 (D-065), in order; S1–S6 and Autopilot (D-043) still need a person's playtest |

## Next up — polish, onboarding and presentation (planned)

Recorded 2026-11-04 from the author's list. Nothing here is built or decided yet; each item needs a decision entry before code. Items are unordered except where noted.

### P1 — Presentation and showing the result

The course deliverable is how the game is shown, so this comes first.

- [ ] Decide the form of the presentation: a recorded video, and a vertical-format slide deck (portrait slides).
- [ ] Decide how the final result of a run is displayed: what the player or a viewer sees at the end (a result card, a system overview shot, a replay), and what is easy to capture on video.
- [ ] Plan first, then record on a schedule: write the plan (script, a clean starting state, what to cut), record a version, and each week re-record after the game changes. Keep each weekly version so progress can be compared.

### P2 — Accounts and the gallery

- [ ] User login.
- [ ] A signed-in player can save a finished world and have it appear in a gallery.
- [ ] Decide what a gallery entry holds (seed and edits, a screenshot, a short clip) and how the result is shown there.

### P3 — Onboarding

- [ ] A first-time guide in very short sentences. It points at the thing on screen and tells the player what they can do now ("You can now…"), one prompt at a time.
- [ ] Walk the player through the game step by step: each step waits for the player to do it, then moves on.
- [ ] Once the player has understood the logic of a step, the game takes over that step automatically, so they are not asked to repeat it.

### P4 — Creature redesign

- [ ] Redesign the creatures (the author's next step). The brief should say, in very few words, what each creature is and what it does, so the look explains itself.

### P5 — Feel and sound of digging

- [ ] Fine-tune how digging a planet feels and sounds; SUR-13 is built but still needs a listening pass. Playtest numbers go in `tuning.md`.

### P6 — Planet count

- [ ] Control the number of planets (a cap or a curated set), so the system stays readable and the frame cost stays bounded.

### P7 — Interplanetary train cutscene

- [ ] A cutscene for the interplanetary train journey (builds on E2 routes and shipments).

## Ecosystem roadmap — D-065 (active)

Brief: [Tiny_Dent_Gameplay_Update_Spec.md](Tiny_Dent_Gameplay_Update_Spec.md). Six slices, built strictly in order; each ends with tests and `npm run build` green. A box is ticked only when the code and its test exist. "Playable" means the stated check passes in the game, not only in unit tests.

Phase 0 of the brief (baseline and contracts) is this documentation pass plus the baseline test run recorded in the change log below.

### E1 — Material economy (Phase 1, D-066)

Built 2026-11-04. Baseline before the change: 135 tests passing; after: all passing with `tests/inventory.test.ts`, and `npm run build` green.

**Playable when:** digging a planet raises its own material stock by exactly what was removed, the Builder spends it, and the stock is right after leaving and returning.

- [x] Material data and a native material per surface — MAT-01.
- [x] Per-planet `inventory`, replacing `soil` — MAT-02.
- [x] Miner deposits, Builder withdraws and returns — MAT-03/04.
- [x] Ore stays separate behind `autoSellOre` — MAT-05.
- [x] Rock planet balance unchanged — MAT-06.
- [~] Panels and overview show the stock — MAT-07. Built and type-checked; not yet looked at in a browser.
- [x] Tests MAT-T1–T4.

### E2 — Interplanetary trains (Phase 2, D-067)

Built 2026-11-04 for cargo. Passengers wait for E3. Tests: `tests/logistics.test.ts`; panel and rail line checked by screenshot on a two-planet run (spaceports, route, a shipment at 0%); a long run of a train crossing is not yet watched.

**Playable when:** a route joins two visited planets, a train carries cargo across a planet switch, and nothing is lost or duplicated.

- [x] Graph core and the interplanetary graph — LOG-01/10.
- [x] Route building with shared credits — LOG-02.
- [x] Shipments, reserve at departure, deliver once, refund — LOG-03–06, 08.
- [x] Run-level logistics clock — LOG-07.
- [x] Creature passengers — done with E3 (MIG-01/03).
- [x] Routes and trains in the system overview, with layer toggles — LOG-09.
- [x] Tests LOG-T1–T4.

### E3 — Passports and migration (Phase 3, D-068)

Built 2026-11-04 for the existing species (Cairn and Cyclops Sentinel stand in for Duck and Drillhead, D-065; new bodies are D-072). Tests: `tests/migration.test.ts`. A visitor arriving and the panel line were seen on screen; settling and homesickness over a real session have not been watched, and all numbers are first guesses.

**Playable when:** a Cairn and a Cyclops Sentinel travel, each with a history, judge their new ground, stay, ask or return, and two species share a planet.

- [x] Unique creature IDs and the passport — MIG-01/02/03.
- [x] Habitat scoring, trial, cooldown, hysteresis — MIG-04/05.
- [x] Request or return when nothing suits — MIG-06.
- [x] Mixed species and colonies — MIG-07.
- [x] Creature card in the interface — MIG-08.
- [x] In-place behaviour untouched; IDs survive switching — MIG-09/10.
- [x] Tests MIG-T1–T3.

### E4 — Habitat construction (Phase 4, D-069)

Built 2026-11-04 except the suitability layer. Tests: `tests/patches.test.ts` (a Cairn shipped to metal with plastic settles after a Builder lays a patch). The patch blend into the terrain material was seen on screen on hand-placed patches (rock and metal planets); a Builder laying one in a live session has not been watched.

**Playable when:** a Builder spends shipped plastic on a patch and a Cairn settles on it.

- [x] Patch records, persistence, revisit — PAT-01/04/08.
- [x] Builder patch job with stock reservation — PAT-02.
- [x] Patch effect on scoring and on ground colour — PAT-03/06.
- [ ] Suitability layer — PAT-07. Not built.
- [x] Tests PAT-T1–T2.

### E5 — Emergent roads (Phase 5, D-070)

Built 2026-11-04. Tests: `tests/roads.test.ts` (graph, A*, heat and decay, road price, terrain cut and reroute, planet switch, and the whole target loop). Seen on screen: walkers wearing heat in Manual mode, hand-paved edges and the edge card. Not watched: a Builder paving a road in a live session, a cut in the browser, frame cost on a 900-node planet with many walkers.

**Playable when:** the target scenario in the spec's multi-planet acceptance runs to the end.

- [x] Navigation graph and bounded A* — RDS-01/02/08.
- [x] Trips, heat and decay — RDS-03.
- [x] Desire paths, road upgrade and cheaper edges — RDS-04/05.
- [x] Terrain invalidation, reroute and blocked edges — RDS-06.
- [x] Agent traversal classes — RDS-07.
- [x] Debug layers and road card — RDS-09/10.
- [x] Tests RDS-T1–T2.

### E6 — Ecology expansion (Phase 6, D-071)

Land half built 2026-11-04: Fur, Jelly, Ice and Rock species are rows in `content/species.ts`. Tests: `tests/species.test.ts`.

- [x] Species roles and material rules for Fur, Jelly, Ice, Rock as data — ECO-01/02.
- [x] Water planet: separate decision, brief and acceptance first — ECO-06 (D-073, [water-brief.md](water-brief.md)).
- [ ] Per-material rules beyond species (for example plastic ground refusing plants) — needs a decision.

### E7 — The Water planet (D-073)

Built 2026-11-04. Tests: `tests/water.test.ts`. Seen on screen: an ocean planet from orbit, swimmers at 0.65–0.9 depth. Not watched: a Builder anchoring a mound in a live session, a land creature settling on a platform island, the overview with swimmers.

**Playable when:** an ocean world has Glassfin swimming at several depths, a mound built in it washes away unless a platform anchors it, and a plant, a road and a land creature can live on an anchored island.

- [x] Water radius, planet draw, depth — WAT-01/02.
- [x] Water drawn over the seabed — WAT-03.
- [x] Glassfin species and body — WAT-04.
- [x] Swimming, depth need, noise — WAT-05/06/07.
- [x] Shipping vetoes and no underwater homes — WAT-08/09.
- [x] Mounds, erosion, platforms — WAT-10/11.
- [x] Dry-ground rules for plants, antennas and the ground graph — WAT-12/13.
- [x] Persistence and overview line — WAT-14/15.
- [x] Tests WAT-T1–T9.

## Current roadmap — D-034–037

Documentation baseline updated; implementation below remains planned. Existing implemented foundations and their playtest gaps are preserved. D-038 antenna separation is proposed, not a prerequisite.

### S0 — Reconcile the design and current prototype

- [x] Define the sandbox and causal chain in READMEs/design (D-034).
- [x] Explain residents, persistent planets and crit response (D-035–037).
- [x] Add checkable requirements and distinguish current implementation from planned work.
- [ ] Browser-check current robot, sales, exploration and signal interactions; log observations without claiming prior tests were rerun.

### S1 — One visible resident feedback loop

**Playable when:** residents occupy suitable cavities, retreat during brief work, and return after quiet.

Built 2026-10-21 after S3–S5 (D-042).
- [x] Generate valid initial homes and one species — HAB-01, RES-01/02.
- [x] Feed manual and robot edits into local disturbance and habitat revalidation — HAB-02/03.
- [x] Show peeking, retreat and cautious return — RES-03/08 (provisional body).
- [x] Validate brief disturbance and blocked entrances — HAB-T1, RES-T1/6 automated in `tests/residents.test.ts`.
- [~] Record behavior clarity and frame responsiveness in tuning.md. Cost is measured; clarity still needs a person's playtest.

### S2 — Relocation and newly created homes

**Playable when:** sustained disturbance causes reachable relocation, and a suitable new cavity may be occupied after work stops.

- [x] Candidate validity, occupancy and collision-safe motion — RES-04/05.
- [x] Cooldowns and no-home waiting — RES-06/07.
- [x] Compare brief work, sustained work, a suitable tunnel and an exposed pit — RES-T2–5 automated.
- [x] Kept scores, extra species, door-stone hauling and complex acoustics out of this slice.

### S3 — Two planets that can be revisited

**Playable when:** edit A → visit B → return to the same edited A.

Built 2026-10-21, before S1/S2 at the user's request (D-040).
- [x] Stable discovery IDs/config and stored planet records — PLN-01.
- [x] Preserve actual density and site state — PLN-03/04.
- [x] Choose global/local accounting and inactive-world behavior before background operations — PLN-05 (shared funds, inactive frozen).
- [x] Verify no lost edits or duplicated stock — PLN-T1 automated in `tests/signal.test.ts`; browser check: dug crater, soil and antenna survived a return. Residents are part of the stored run state; a resident-specific return check is still to do.
- [ ] Treat browser-reload saves as separate scope — PLN-06.

### S4 — Live 3D system overview

**Playable when:** discovered worlds show their actual edited shapes together; hover inspects and click visits.

- [x] Spatial overview, shared records and terrain-revision meshes — SYS-01/02.
- [x] Concise descriptive hover and return navigation — SYS-03.
- [x] Live refresh: a per-frame mesh-version check, geometry rebuilt only on change; browser check showed a new trench appear while open — SYS-04, SYS-T1. Frame cost not yet measured.
- [x] Unvisited planets are outlines, not terrain; inactive planets say the crew is paused.

### S5 — More varied starting conditions

- [x] Independently vary playable size, terrain and resource abundance — PLN-02/T2 (D-041).
- [ ] Compare shared rules under different conditions and player choices (playtest).
- [ ] Expand species only after the first species and persistent travel read clearly.

### S6 — Planets with physical personalities

**Playable when:** a signal planet's material changes how digging feels, how the crew performs and how residents react, and a pit leaves a mark that outlasts its shape.

Design: [surface-brief.md](surface-brief.md) (D-060–062).
Built 2026-10-30.
- [x] Surface draw, profiles and rule multipliers — SUR-01/02/03/11.
- [x] `aEdit` surface memory — SUR-04/05.
- [x] Plastic and metal — SUR-06/07.
- [x] Fur — SUR-08.
- [x] Ice — SUR-10.
- [x] Jelly — SUR-09.
- [x] Surface labels and company lines — SUR-12.
- [~] Digging sound — SUR-13. Built; a person still has to listen to it.
- [x] Rename to Tiny Dent in the interface, documents, CI and deployment paths — D-062.
- [x] Move the folder to `tiny-dent/` — D-062. Done 2026-11-01.
- [ ] Low-end laptop frame rate on fur, ice and jelly — SUR-14.
- [ ] Playtest the rule numbers: all of them are first guesses.

### Compact operations — bounded presentation task

- [~] Simplify visible accounting while keeping meaningful operating context — OPS-01. Minerals now sell on delivery (D-039); detail rows remain.
- [ ] Verify critical causes/remedies remain understandable — OPS-02, OPS-T1.
- [ ] Preserve charges and bankruptcy until a new decision changes them — OPS-03.

### Later / open

Multiple Miners (AUT-13), final resident model, antenna-role separation (D-038), reload saves, richer ecology, narrative audits and cosmic endings. None is required to prove S1/S2. Existing three-robot functionality remains; no need to rebuild it as a “next prototype.”

## Previous R1–R3 roadmap — historical

The following records the earlier automation plan and its outstanding checks. It is not the active task order.

#### Previous scope: D-022

This replaces the old M2-first navigation sequence. Existing M0/M1/M1.5 work stays intact. The historical M0–M7 checklists below record the earlier plan and completed work; unchecked legacy tasks are not the active backlog.

#### R1 — One robot that mines on its own
**Playable when:** assign a local area and press Start once; a Miner scans, chooses, hovers to an entry, excavates a real tunnel, collects and repeats.
- [x] Work area and Start/Pause/reassignment — AUT-01/08
- [x] Local scanning and nearest discovered Mineral — AUT-02/03
- [x] Empty-space hovering and surface entry — AUT-04
- [x] Progressive excavation with current-density clearance — AUT-05/07
- [x] Collection and next-target cycle — AUT-06
- [x] No-target/blocked stopping and readable status — AUT-09/10
- [x] Fixed simulation steps and bounded edits — AUT-11/12
- [x] AUT-T1–6 automated in `tests/miner.test.ts`
- [ ] AUT-T7: record visual, responsiveness and behavior playtest observations in `tuning.md`

**Exclude:** purchases, electricity, backpack, hauling, first person, complex metrics, questionnaire and endings. Use existing resource proxies before designing full ore deposits.

#### R2 — Multiple Miners
- [ ] Shared target reservation, safe release and reassignment — AUT-13
- [ ] Observe different tunnels under the same simple rule
- [ ] Validate no duplicate collections or conflicting target ownership
No economic gate is required to test multiple robots.

#### R3 — A second procedural behavior
- [x] Choose Builder reshaping or Gardener growth — AUT-14: Gardener with plants and antennas (D-025)
- [x] Introduce only one new rule set and its visible terrain/plant effect — AUT-15/16
- [x] Interaction with mining: digging removes structures; no repair loop (automated tests)
- [ ] Browser playtest: are plants and antennas readable, is the growth rate right?
- [x] Builder: cut and fill toward one level, using the Miner's soil — AUT-17 (D-026)
- [ ] Browser playtest: does the levelling read on the planet?

#### Later, only after the process works
Lightweight mineral income, robot purchases, deployment expansion and electricity expenses; insolvency departure; resident choices; audit and signal ending. Prices and thresholds remain unsettled. First person is optional and deferred.

## Historical roadmap — retained for implementation history

## How this works

- Each milestone is a **vertical slice**: something you can open in a browser and play, however rough, and that ends with a short playtest note in `tuning.md`.
- The design will change while you build. That is expected. If a milestone teaches you something, write a decision in `decisions.md` **before** editing `design.md` or `spec.md`.
- Tasks refer to spec IDs so nothing gets built that the spec does not know about.
- Dates are left blank on purpose. Fill them in when you know your calendar.
- Historical ordering only. D-022 makes R1–R3 above the active development sequence.

Status: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` cut

---

## M0 — Set up

**Goal:** an independent game app that builds and shows a planet placeholder. Shared-site deployment is a separate task (D-012).
**Playable when:** `npm run dev`, then open `/game/?seed=1380&debug=1` for a rotating sphere and the debug overlay.

- [x] Create `tiny-dent/` (Vite + React + TypeScript, `allowJs`) — TECH-01–03
- [x] Set `base: '/game/'` - TECH-05
- [x] Shared-site build assembly and Firebase rewrite configured and emulator-verified in `deployment/` (D-013; live publish pending)
- [x] Create `src/` layout from spec §2, and `src/config/tuning.ts`
- [x] Add the run store with the state shape in spec §3 — TECH-04
- [x] Copy voxel modules from the guidebook (spec §10) and confirm they run
- [x] Debug overlay and `?seed=` — DBG-01, DBG-02
- [x] Docs are already in `tiny-dent/docs/`
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

**Playable when:** choose Detector or press `D`, then left-click the planet. A small wireframe region and any buried Mineral point signals there appear; press `T` to return to terrain editing. Exposed teaching targets remain visible normally.

- [x] Seeded, independent category target proxies and three surface teaching targets — GEN-01/04/07 (full irregular deposits remain M3)
- [x] Local Detector selection, click anchor, and scan radius — DET-01
- [x] Local terrain wireframe and hidden target reveal; hide scan on tool switch — DET-02/03
- [x] Fixed world-space distance falloff from the guidebook lesson — DET-04
- [x] Automated seed, locality, exposure and production-build checks
- [ ] **Playtest:** check scan visibility, click accuracy and FPS in a browser; log feedback in `tuning.md`.

**Stretch work (TERR-06):** distance-based chunk LOD and seam snapping are implemented and geometry-tested. Browser inspection and target-device performance checks remain.

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

- [ ] Full irregular mineral clusters and collection — GEN-01–06 (replace M1.5 point proxies)
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
- [ ] Material blending for rock, soil and mineral — VIS-03
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

Monuments that change the silhouette · more classifications (10 more main plus rare) · seeder and plant growth · shareable result cards · random company contracts · "original intent vs. classification" comparison · whole-planet walking with spherical gravity · mobile input · Observed ending as its own scene.

## Risks to watch each milestone

Frame rate while remeshing · confusion about the two views · getting trapped feeling unfair · the classification feeling random · art readability of low-saturation resources. See `design.md` §17.

---

## Change log

- **2026-11-04:** Added the "Next up" backlog P1–P7 (presentation, login and gallery, onboarding, creature redesign, dig feel and sound, planet count, train cutscene). Planned only; no decisions yet. Then refined P1 (plan, then record weekly and re-record after changes) and P3 (point-out prompts, step-by-step guidance, automate once understood).
- **2026-11-04 / D-071, D-073:** E6 land half built; the Water slice scoped (E7) before any code, then built (E7). Tests 193.
- **2026-11-04 / D-070:** E5 built (ground graph, A*, walkers, heat, desire paths, Builder roads, reroute on terrain cuts, layers and edge card).
- **2026-11-04 / D-069:** E4 built (patches, Builder patch job, drawn skin); suitability layer left out.
- **2026-11-04 / D-068:** E3 built. Manual mode now also steps trains and visitors; visitor routing fixed.
- **2026-11-04 / D-067, D-072:** E2 built for cargo; D-072 records that Duck and Drillhead get new bodies after E3.
- **2026-11-04 / D-065:** Added the ecosystem roadmap E1–E6 above. Nothing in it is complete yet.
- **2026-10-20 / D-034–037:** Added S0–S5 resident/persistence/overview slices and compact-operations task. Preserved R1–R3 and M0–M7 history; no new gameplay task is marked complete.


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
| 2026-09-30 | D-021: three chunk detail levels added; mixed-level seam and edited-terrain tests pass, visual/performance checks pending. |

| 2026-10-14 | D-022: R1–R3 autonomy-first sequence supersedes unchecked legacy backlog; existing completion records retained. |
| 2026-10-14 | D-023: R1 Miner implemented (sphere work area, hover shell, radial tunnels, path line, debris); human playtest pending. |
| 2026-10-14 | D-025: R3 Gardener implemented ahead of R2 (multiple Miners still open); human playtest pending. |
| 2026-10-14 | D-026: Builder added; all three robot roles now exist. R2 (multiple Miners) still open. |
- **2026-10-21 / D-043:** Autopilot mode built (crew counts, whole-planet sweep, automatic signals, cancel back to Auto). Needs a person's playtest.
- **2026-10-21 / D-044, D-048:** Removed obsolete resource categories, retained Mineral as the only resource and locked seed `1380` mineral positions with a regression fixture.
