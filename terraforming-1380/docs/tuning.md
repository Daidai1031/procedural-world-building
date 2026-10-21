# Terraforming Contractor #1380 — Tuning

| | |
| --- | --- |
| **Purpose** | Every number that will change after playtesting, in one place, with its reason and where it lives in code. |
| **Last updated** | 2026-10-21 |
| **Source of truth** | `src/config/tuning.ts`. This file mirrors it and records *why*. If the two differ, fix one of them the same day. |

## Rules

- **Source** column: `GDD` = came from the original design and is a real decision; `guess` = a starting value with no evidence yet.
- When a playtest changes a value, update the **Value** and add a line in the [playtest log](#playtest-log) with what you saw.
- Prefer changing a value over changing a rule. If three value changes do not fix a problem, it is a design problem: open a decision in `decisions.md`.

---

## Current operating values — source snapshot (2026-10-20)

Source: [src/config/tuning.ts](../src/config/tuning.ts), checked against current code. These supersede older “economy deferred” prose and legacy fixed-budget guesses below. No values were changed by this documentation update.

| Runtime parameter | Current value | Meaning |
| --- | --- | --- |
| economy.startingCapital | 0 | Starting credits |
| economy.bankruptcyLimit | −50 | Run ends at or below this balance |
| economy.mineralPrice | 40 | Credits per sold mineral |
| economy.electricityRate | 0.55 | Credits per kW-minute |
| economy.manualTerrainRate | 0.02 | Credits per changed terrain sample |
| economy.power.miner / gardener / rigger / builder | 6 / 3 / 3 / 8 | kW while working |
| signal.planetsAfter / maxPlanets | 3 / 5 | First reveal broadcast count / maximum entries |
| signal.pulseSeconds / planetFadeSeconds | 3.2 / 4 | Visual seconds |

D-037 changes intended presentation only. Funds scope across persistent sites, revised bankruptcy and inactive-world billing remain open.

## Resident and planet tuning

Implemented 2026-10-21 (D-041, D-045, D-046). Values live in `src/config/tuning.ts` under `planets` and `residents`. They are first guesses that passed the automated checks; none has been judged in a person's playtest yet.

| Key | Value | Meaning |
| --- | --- | --- |
| `planets.radius / relief` | 0.17–0.38 / 0–0.2 (home 0.34 / 0.16) | Fractions of the voxel world; relief below 0.04 becomes exactly smooth (D-056) |
| `planets.shapes / shapeWeights` | sphere, cube, tetra, donut, apple, nail / 0.25, then 0.15 each | D-056/D-058 solids of signal planets; only spheres carry relief |
| `planets.minerals / residents` | ×0.4–2 / ×0.3–2 (home ×1) | Mineral and resident abundance configuration |
| `residents.initialCount` | 11–13 | Seeded Ares-9 starting population, centered around twelve (D-052) |
| `residents.size` | 0.75–1.25× | Deterministic body-size variation within one planet (D-053) |
| `residents.homeCandidates / homeCandidateSamples` | 24 / 128 | Bounded deterministic surface-home search |
| `residents.minSoilDepth / maxSlopeDeg` | 0.45 / 25° | D-045 surface-home support and slope limits |
| `residents.headroom / minHomeSpacing` | 0.18 / 0.5 | Clear space above a home and separation between homes |
| `residents.peekLift / hideDepth` | 0.015 / 0.075 | Simulation poses for a surface home (the view draws its own, below) |
| `residents.look` | model drawn at 0.2 world units per model unit; lurk shows 30% of the height (hiding 20%) with eye rims ≥0.05 under; peek clears the eyes by 0.14; a peek every 6–12 s, 2.8 s out; tremble 0.2 body radius at 11 Hz | D-055/D-059 presentation: crown-only lurking, periodic look-around, trembling near work |
| `residents.speciesJitter / solidRelief` | 1.5 profile steps / cube 2, tetra 3, nail 3 | D-059 choice of a signal planet's species from its size, relief and minerals |
| `residents.temperament` | per species; multipliers on the shared values below | D-059 characters, summarised in the next table |

| Species | speed | stroll interval | noise to hide | wait to return | noise endured | company | other | peeks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Facet Pebble | ×1 | ×1 | ×1 | ×1 | ×1 | ×1 | | 6–12 s, 2.8 s, snap |
| Moss Cap | ×0.7 | ×2.5 | ×1.3 | ×1.4 | ×1.6 | ×1.3 | plant effect ×2 | 10–18 s, 5 s, slow sweep |
| Tall Slab | ×0.8 | ×3 | ×1.6 | ×2 | ×1.8 | ×1.5 | population ×0.8, crown 40% | 12–20 s, 4.5 s, slow sweep |
| Crystal Crown | ×1.1 | ×2 | ×0.65 | ×1.8 | ×0.7 | ×1 | tremble ×1.4 | 9–16 s, 1.8 s, dart |
| Cyclops Sentinel | ×0.9 | ×1.5 | ×1.4 | ×0.6 | ×1.3 | ×0.6 | population ×0.7 | 4–7 s, 4.5 s, wide sweep |
| Hermit Shell | ×0.6 | ×4 | ×0.7 | ×2.2 | ×1.2 | ×−1.5 | burrow ×1.6, population ×0.6, crown 45% | 14–24 s, 2 s, dart |
| Cairn | ×0.85 | ×0.8 | ×0.9 | ×1 | ×1 | ×3 | population ×1.4 | 5–10 s, 3 s, snap |
| Periscope | ×0.75 | ×2 | ×1 | ×0.8 | ×1.2 | ×1 | burrow ×1.4, crown 50%, stalk-only peeks | 3–6 s, 3.5 s, sweep |
| Shard | ×1.5 | ×0.35 | ×0.8 | ×0.6 | ×0.6 | ×0.5 | stepping ×1.4 | 4–8 s, 1.5 s, fast dart |
| `residents.disturbance` | radius 0.9, manual 1.4, robot 0.3, cap 3, ×0.97/tick | HAB-02 |
| retreat / quiet | 0.5 / 0.15; quiet for 75 ticks (2.5 s) | RES-03 |
| flee | 60 ticks (2 s) of disturbance, then leave the work | RES-04, D-054 |
| burrow preference | bonus 0.85; one resident per burrow; wander every 300 ticks | D-054 |
| search | retry every 90 ticks, at most 6 retries; score = nearby companions × 0.04 − travel distance × 0.05 | RES-04/07, D-051 |
| motion | 0.012 per tick (0.36/s), body 0.1 | RES-08 |

Automated checks cover deterministic surface homes, brief retreat and return, sustained-noise relocation, bounded searching, support removal and added-terrain lift. Browser feel remains to be playtested.

The responsibilities below were planned before implementation and stay as the checklist for playtest notes.

| Responsibility | Why it matters | Status |
| --- | --- | --- |
| Resident body clearance and cavity fit | Distinguish snug shelters from blocked cavities or exposed pits | TBD |
| Disturbance radius and work strength | Make local reactions visible without affecting the whole planet | TBD |
| Disturbance decay and quiet delay | Distinguish short retreat from lasting relocation | TBD |
| Sustained-disturbance duration | Avoid moving house after every brief action | TBD |
| Relocation advantage and cooldown | Prevent oscillation | TBD |
| Companion radius and bias | Form small groups without overriding safe access | radius 0.9 / bonus 0.04 implemented; playtest TBD |
| Search radius / candidate limit / movement step | Bound workload and respect terrain | TBD |
| Initial count and size variation | Keep one species readable and affordable | 11–13 and 0.75–1.25× implemented; readability/performance playtest TBD |
| Planet radius / roughness / resource abundance ranges | Make independent starting differences visible | TBD |
| Overview detail and revision refresh budget | Show live shape without full-resolution rendering of every world | TBD |

Evidence to record: brief disturbance/recovery, sustained disturbance, unsuitable pit vs suitable cavity, blocked entrance, no available home, competing residents and normal-camera readability. Use HAB-T/RES-T checks in [spec.md](spec.md). Do not invent “measured” timings before observing them.

## Robot prototype tuning (D-023)

Values live in `src/config/tuning.ts` (`miner`). All are `guess`: no playtest has judged speed or feel yet. Distances are world units; the planet radius is about 2.04.

| Parameter | Purpose | Current value |
| --- | --- | --- |
| Simulation step | Behavior rate independent of render frame rate | 30 Hz, at most 3 steps per frame |
| Travel speed | Visible travel in empty space | 0.03 / tick (slowed from 0.045 after first look) |
| Scan range, scan time | Bounded discovery around the robot | 2.6, 12 ticks |
| Work area radius | Limits where targets are eligible | 0.6–2.4, default 1.6 |
| Dig radius, dig step | Tunnel width and speed | 0.2, 0.018 / tick (slowed from 0.025) |
| Hover height | Clearance above the outermost solid sample | 0.4 |
| Arrive distance | Hover goal tolerance | 0.06 |
| Collect time | Pause after a collection | 10 ticks |
| No-progress limits | Stops blocked work without endless retries | 45 stalled dig ticks; 900 move ticks; 600 dig ticks |
| Edits per step | Caps remesh workload | 1 dig edit per robot per tick |

Robot purchase prices and slot expansion remain deferred. Operating electricity and manual terrain costs are implemented; use the current snapshot above. The fixed-cycle/energy numbers below are historical references superseded by D-022. Existing brush, Detector and LOD values remain relevant to their implemented tools.

## 1. Budget and economy — historical fixed-budget proposals

This legacy table is retained for provenance. It is not the active operating account and must not overwrite current economy.* values. Fields remaining in code do not mean fixed-budget gameplay is active.


| Parameter | Value | Range to try | Source | Notes |
| --- | --- | --- | --- | --- |
| `budget.energyTotal` | 1000 | 600–1500 | GDD | Used if OQ-01 = energy |
| `budget.workCycles` | 30 | 20–40 | GDD | Used if OQ-01 = cycles |
| `budget.warnAtFraction` | 0.15 | 0.1–0.25 | guess | BUD-03 warning |
| `cost.dig` | 2 | 1–5 | guess | Per action, scaled by brush radius |
| `cost.add` | 3 | 1–6 | guess | |
| `cost.flatten` | 3 | 1–6 | guess | |
| `cost.scan` | 8 | 4–15 | guess | |
| `cost.broadcastPerPowerUnit` | 40 | 20–80 | guess | Signals are pricey but pay off |
| `canister.capacity` | 300 | 150–600 | guess | Material units |
| `mass.perUnit` | 1 | | guess | 1 canister unit ↔ a fixed volume of density |
| `price.mineral.base` | 50 | | guess | Per sample; varies by mineral type |
| `emergencyExtraction.capitalLoss` | 0.4 | 0.2–0.6 | guess | Fraction of Capital (OQ-02) |
| `emergencyExtraction.historyLoss` | 10 | 0–20 | guess | |

## 2. Terrain and tools

| Parameter | Value | Range to try | Source | Notes |
| --- | --- | --- | --- | --- |
| `grid.resolution` | 64 | 48–96 | guess | Per axis; OQ-10 |
| `chunk.size` | 16 | 8–32 | guess | Samples per axis, plus 2-sample border |
| `lod.maxLevels` | 3 | 2–3 | guess | Full, half, and quarter sampling for rendered chunks (D-021) |
| `lod.fullDetailDistance` | 7 | 6–9 | guess | Camera-to-column-center distance before detail drops (D-021) |
| `lod.bandWidth` | 2.5 | 2.2–4 | guess | Distance per coarser level; wider than adjacent-column center spacing (D-021) |
| `brush.radius.min` | 0.18 | 0.12–0.3 | guess | World units; M1 six-unit planet (D-016) |
| `brush.radius.default` | 0.38 | 0.25–0.6 | guess | World units; a small visible bite at the current planet scale (D-016) |
| `brush.radius.max` | 0.9 | 0.6–1.2 | guess | World units; wide enough to shape without swallowing the planet (D-016) |
| `brush.radius.step` | 0.08 | 0.04–0.12 | guess | Mouse wheel step (D-016) |
| `flatten.innerFraction` | 0.75 | 0.6–0.9 | guess | Flat inner 75% of the selected plane's in-plane/normal range; feather the outer edge (D-017, D-019) |
| `wideDrill.radiusMultiplier` | 1.8 | 1.4–2.5 | guess | |
| `wideDrill.puncturePenalty` | 1.3 | | guess | Raises fracture / punch-through chance |
| `core.radius` | 0.08 × planetRadius | 0.05–0.12 | guess | Small, per GDD |
| `core.stabilityHit` | 25 | 15–40 | guess | Points of Stability |
| `remesh.timeBudgetMs` | 6 | 3–10 | guess | Per frame for dirty-chunk remeshing and LOD mesh preparation; final seam assembly is a separate step |

## 3. Scanner and generation

| Parameter | Value | Range to try | Source | Notes |
| --- | --- | --- | --- | --- |
| `scan.range.base` | 30 | | guess | World units |
| `scan.range.deepScanner` | 60 | | guess | |
| `scan.directionError.base` | 25° | 10–40° | guess | |
| `scan.directionError.deepScanner` | 8° | | guess | |
| `detector.radius` | 0.95 | 0.7–1.3 | guess | World units; bounded local reveal (D-018) |
| `detector.fadeWidth` | 0.24 | 0.15–0.35 | guess | World-space falloff at scan boundary (D-018) |
| `gen.cluster.mineral.count` | 14 | 8–25 | guess | |
| `gen.minSpawnDistanceFromBase` | 10 | | guess | GEN-05 |

## 4. Metrics

| Parameter | Value | Range to try | Source | Notes |
| --- | --- | --- | --- | --- |
| `dr.slopeMax` | 20° | 12–30° | guess | Buildable slope |
| `dr.patchMin` | area of 8×8 samples | | guess | Minimum continuous patch |
| `dr.walkSlopeMax` | 35° | | guess | For accessibility |
| `dr.thicknessMin` | 3.0 | | guess | Supporting thickness |
| `dr.debounceMs` | 500 | 200–1500 | guess | Recompute after edits settle |
| `stability.weights` | w1 .30, w2 .25, w3 .15, w4 .20, w5 .10 | | guess | massRemaining, thinShell, core, largest component, stabilizer |
| `history.perMonument` | 8 | | guess | |

## 5. Signals and endings

| Parameter | Value | Range to try | Source | Notes |
| --- | --- | --- | --- | --- |
| `signal.k` | 1.0 | | guess | `exposureScore += power × duration × k` |
| `signal.historyPerBroadcast` | 30 (first), then 20 | | GDD (first) | First transmission +30 |
| `signal.capitalPerBroadcast` | 900M-equivalent | | GDD (first) | Scaled to game money units |
| `ending.T_observed` | 1.5 | 1–3 | guess | Above this: Observed |
| `ending.T_erased` | 5.0 | 3–10 | guess | At or above: Erased |
| `ending.heardIfSingleBroadcast` | true | | GDD | One broadcast → Heard |

Player sees none of these thresholds (D-008).

## 6. Classification

| Parameter | Value | Range to try | Source | Notes |
| --- | --- | --- | --- | --- |
| `cls.matchMin` | 0.55 | 0.4–0.7 | guess | Below this: closest archetype |
| `cls.morphology.flatnessMin.paper` | 0.7 | | guess | See `classifications.json` |
| `cls.rare.priority` | first | | GDD | Rare checked before main |

Per-archetype ranges live in `src/content/classifications.json`, not here. This table is for global values only.

## 7. Visual thresholds

| Parameter | Value | Range to try | Source | Notes |
| --- | --- | --- | --- | --- |
| `wire.state1.planetRemaining` | 0.45 | 0.35–0.6 | GDD | Structure exposed |
| `wire.state2.planetRemaining` | 0.25 | 0.15–0.35 | GDD | Nearly hollow |
| `wire.state3.planetRemaining` | 0.10 | 0.05–0.15 | GDD | Critical wreck |
| `wire.thickness.warn` | 2.0 | | guess | Local thickness triggering early lines |
| `wire.updateHz` | 3 | 2–4 | guess | Local thickness refresh |
| `wire.lineDensityCap` | 1.0 | | guess | Lines per unit area |
| `palette.grayShare` | 0.80 | | GDD | 80 / 15 / 5 |

## 8. Performance targets

| Parameter | Value | Source |
| --- | --- | --- |
| Target frame rate | 60 fps | guess |
| Floor during remesh | 30 fps | guess |
| Initial load | under 5 s on broadband | guess |

---

## Gardener and structure tuning (D-025)

Values live in `src/config/tuning.ts` (`gardener`, `rigger`, `structures`). All are `guess`. The Rigger (D-057) copies the Gardener's values except `workTicks` 36 and a default work area of 2.0.

| Parameter | Purpose | Current value |
| --- | --- | --- |
| Job pattern | Alternation between jobs | plant, plant, antenna |
| Survey | Ground points per survey; empty surveys before stopping | 30; 3 |
| Slope limits | Flat enough for a plant / an antenna | 0.35 rad / 0.6 rad |
| Spacing | plant–plant / antenna–antenna / mixed | 0.25 / 0.9 / 0.3 |
| Caps | Most plants / antennas on the planet | 60 / 8 |
| Work time | Ticks spent planting or raising | 24 |
| Growth | Stages, ticks per stage | 3, 300 |
| Spread | Interval, reach, attempts | every 450 ticks, 0.3–0.7, 6 |
| Travel | Speed and hover height (same as Miner) | 0.03 / tick, 0.4 |

## Builder tuning (D-026, D-050)

Values live in `src/config/tuning.ts` (`builder`). All are `guess`.

| Parameter | Purpose | Current value |
| --- | --- | --- |
| Job priority | Repair order | fill, then flatten |
| Level samples | Stable reference-height samples | 60 |
| Survey | Ground points per survey; empty surveys before stopping | 40; 3 |
| Local surface probe | Ring radius / samples | 0.38 / 8 |
| Local relief thresholds | Minimum hole depth / isolated bump height | 0.09 / 0.14 |
| Brush | Flatten radius / fill radius | 0.35 / 0.18 |
| Fill cost | Soil needed in stock before a fill | 28 samples |
| Clearances | Structures / residents / live Miner tunnel | 0.15 / 0.22 / 0.45 |
| Work time | Ticks per job | 18 |
| Area | Work area radius | 0.6–2.4, default 1.2 |

## Visual style (D-027)

Values live in `src/config/tuning.ts` (`visual`); colors live in `src/config/palette.ts`. Chosen on the component board, not yet playtested in the game.

| Parameter | Purpose | Current value | Source |
| --- | --- | --- | --- |
| `visual.contour.spacing` | World units between contour lines | 0.045 | board |
| `visual.contour.majorEvery` | Every nth contour is stronger | 5 | board |
| `visual.contour.heightRange` | Height that spans low gray to limestone | 0.3 | board |
| `visual.workArea.innerSpacingFactor` | Contour spacing inside a work area, as a fraction | 0.5 | board |
| `visual.atmosphere.strength` | Overall atmosphere opacity | 0.23 | user |
| `visual.atmosphere.points` | Dust points | 4200 | board |
| `visual.atmosphere.floorChance` | Minimum chance of dust where the noise is thin | 0.15 | board |
| `visual.atmosphere.falloff` | Height falloff, thin / dense dust | 0.05 / 0.24 | board |
| `visual.atmosphere.rim` | Limb tint toward the atmosphere color | 0.35 | board |
| `visual.atmosphere.drift` | Inner / outer shell drift (rad/s) | 0.03 / 0.012 | board |

## Documentation change log

- **2026-10-20 / D-034–037:** Documented current operating values and planned resident/planet tuning responsibilities. No runtime parameters changed and no playtest results were added.

## Playtest log

Record every session, even a five-minute one. The point is to change the design based on what actually happened.

### Entry template

```markdown
### PT-000 — YYYY-MM-DD — build / commit
- **Tester:** (who, how familiar with games)
- **Seed:** 
- **Modules chosen:** 
- **Result:** classification, ending, time played
- **What they said / did:** 
- **What confused them:** 
- **What was fun:** 
- **Changes made:** value changes here, decisions logged as D-xxx
```

### PT-001 - 2026-09-30 - M0 technical smoke check
- **Tester:** Codex automated checks; no human/browser playtest yet.
- **Seed:** 1380 (repeatability), 1381 (different geometry).
- **Result:** TypeScript/Vite production build passed. Three tests passed, including identical repeated position/normal buffers and exact triangle/normal equality between 64 chunks and one whole-volume mesh. Dev server starts at /game/.
- **Limitations:** No browser connected to the UI tool, so visual rotation, live FPS and target-hardware performance remain unverified. Vite reports a non-blocking bundle-size warning (Three.js/R3F entry bundle around 1.13 MB before gzip).
- **Changes made:** None to balance. Grid 64 and chunk size 16 remain provisional (OQ-10). D-003 accepted; D-012 records M0 decisions. Budget and canister defaults were also copied into tuning.ts for RunState initialization only.

### PT-002 - 2026-09-30 - M1 automated terrain check
- **Tester:** Codex automated checks; human feel test still pending.
- **Seed:** 1380; `m1-replay` for repeated-input determinism.
- **Result:** Dig removed 97 solid samples at the default radius in a representative surface location. Editing dirtied only nearby chunks; edited chunk triangles and normals matched a whole-volume remesh. Node remesh timing for one edit peaked at roughly 15 ms per frame, excluding browser rendering. Build and terrain tests passed.
- **What remains to test:** Right-drag orbit, left-click target accuracy, flatten feel, visible triplanar grain and real browser FPS on the target laptop. The 30 fps remesh floor is not yet verified.
- **Changes made:** Brush radius changed from 2.0/4.0 default/max to 0.38/0.9, with a 0.18 minimum and 0.08 wheel step. The previous values were too large for the existing planet radius of about 2.04 world units (D-016).

### PT-003 - 2026-09-30 - planar Flatten correction
- **Tester:** Codex automated check; visual feel still awaits a human playtest.
- **Seed:** 1380.
- **Result:** A sample inside Flatten's horizontal circular footprint and vertical band, but outside the former spherical cutoff, moved toward the selected horizontal plane. Edited chunk triangles and normals still matched a whole-volume remesh. Seven tests and the production build passed.
- **Changes made:** Flatten now stamps a horizontal plane within a cylindrical local region, with a 75% flat core and a feathered edge; hover preview is a flat disc and ring (D-017).

### PT-004 - 2026-09-30 - Detector automated check
- **Tester:** Codex automated check; browser visibility and FPS await a human playtest.
- **Seed:** `detector-replay` plus a comparison seed.
- **Result:** The original M1.5 target proxies repeated exactly for the same seed and changed with another. D-044 later removed the obsolete categories; 14 mineral proxies remain and D-048 locks their pre-migration coordinates. `mineral-0` stays shallow, buried minerals stay hidden until selected in a local scan or dug open, and a distant scan returns none.
- **Changes made:** Started with a 0.95-unit Detector radius and 0.24-unit world-space fade width (D-018). D-044 changed resource scope without retuning either value.

### PT-005 - 2026-09-30 - dual Flatten planes
- **Tester:** Codex automated check; browser feel still awaits a human playtest.
- **Seed:** 1380.
- **Result:** Default radial and optional Horizontal stamps moved density samples toward their distinct plane fields. The radial edit's chunk mesh and normals matched a whole-volume remesh. Nine tests and the production build passed.
- **Changes made:** Default Flatten orientation changed to Planet Surface; D-017's Horizontal plane remains selectable. Brush radius and edge feathering values did not change (D-019).

## Autopilot (D-043)

Runtime values in `tuning.autopilot`: up to 4 robots per kind (defaults 2/1/1/1 for Miner, Gardener, Rigger, Builder); Miner, Gardener and Rigger 6 sectors of radius 2.4, Builder 12 of 1.4; rest 900 ticks doubling to 16×; Builder 15 jobs per sector; funds hold at ₡−20, resume at ₡−10; signal every 600 ticks (20 s).

Observed headless, 54 000 ticks (30 simulated minutes), seeds 1380, mars, abc with crews 2/1/1, 4/4/4 and 1/2/2: all 14 minerals sold within 5 minutes, plants and antennas at their caps, 7 signals sent, no bankruptcy, funds steady at about ₡290–520, Builders retired by 10 minutes with 178–180 jobs, planet remaining 92–94%. Not a person's playtest; the browser check covered start, cancel and the panels only.

## System view (D-049)

All values are `guess` until playtested; they live in `tuning.system` in `src/config/tuning.ts`. Phase 1 uses `pullSeconds`, `focusDistanceFactor`, `distance`, `zoom` and `fade.otherWorlds`; the rest are reserved for later phases.

| Key | Value | Used for |
| --- | --- | --- |
| `pullSeconds` | 1.4 | pull-back and return, ease-in-out cubic |
| `diveSeconds` / `arriveSeconds` / `holdMs` | 1.3 / 0.9 / 900 | hold-to-travel (Phase 3) |
| `focusDistanceFactor` | 6.5 | camera distance to a focused world, in its radii |
| `distance` | min 14, max 48, margin 1.1 | fit of the whole system in the field of view |
| `zoom` | min 12, max 48, step 0.08 | wheel zoom in system view |
| `fade.otherWorlds` | pull 0.25 → 0.85 | other worlds and name tags fade in |
| `marks`, `ghostOpacity`, `arcOpacity`, `arcLift`, `fade.atmosphere`, `fade.marks` | see file | readouts and arcs (Phase 2) |

Not measured yet: frame time with all worlds visible, and the LOD rebuild cost when pulling back and returning.
