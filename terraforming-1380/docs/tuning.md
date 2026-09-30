# Terraforming Contractor #1380 — Tuning

| | |
| --- | --- |
| **Purpose** | Every number that will change after playtesting, in one place, with its reason and where it lives in code. |
| **Last updated** | 2026-09-30 |
| **Source of truth** | `src/config/tuning.ts`. This file mirrors it and records *why*. If the two differ, fix one of them the same day. |

## Rules

- **Source** column: `GDD` = came from the original design and is a real decision; `guess` = a starting value with no evidence yet.
- When a playtest changes a value, update the **Value** and add a line in the [playtest log](#playtest-log) with what you saw.
- Prefer changing a value over changing a rule. If three value changes do not fix a problem, it is a design problem: open a decision in `decisions.md`.

---

## 1. Budget and economy

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
| `brush.radius.min` | 0.18 | 0.12–0.3 | guess | World units; M1 six-unit planet (D-016) |
| `brush.radius.default` | 0.38 | 0.25–0.6 | guess | World units; a small visible bite at the current planet scale (D-016) |
| `brush.radius.max` | 0.9 | 0.6–1.2 | guess | World units; wide enough to shape without swallowing the planet (D-016) |
| `brush.radius.step` | 0.08 | 0.04–0.12 | guess | Mouse wheel step (D-016) |
| `flatten.innerFraction` | 0.75 | 0.6–0.9 | guess | Flat inner 75% of the selected plane's in-plane/normal range; feather the outer edge (D-017, D-019) |
| `wideDrill.radiusMultiplier` | 1.8 | 1.4–2.5 | guess | |
| `wideDrill.puncturePenalty` | 1.3 | | guess | Raises fracture / punch-through chance |
| `core.radius` | 0.08 × planetRadius | 0.05–0.12 | guess | Small, per GDD |
| `core.stabilityHit` | 25 | 15–40 | guess | Points of Stability |
| `remesh.timeBudgetMs` | 6 | 3–10 | guess | Per frame |

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
| `gen.cluster.life.count` | 8 | 4–15 | guess | |
| `gen.cluster.memory.count` | 6 | 3–10 | guess | M1.5 point proxies; M3 must reserve the guaranteed #1379 archive |
| `gen.surfaceTeachingTargets` | 3 | 2–5 | guess | GEN-04 |
| `gen.minSpawnDistanceFromBase` | 10 | | guess | GEN-05 |
| `gen.archive1379.depthFraction` | 0.25–0.4 of radius | | guess | Reachable but not on the surface |

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
| `history.perMemoryFound` | 6 | | guess | |
| `biosphere.perLifeCluster` | 8 | | guess | |

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
- **Result:** The 28 M1.5 target proxies repeat exactly for the same seed and change with another. Surface teaching targets are exposed, buried targets are hidden until selected in a local scan or dug open, and a distant scan returns none. Eight tests and the production build passed.
- **Changes made:** Started with a 0.95-unit Detector radius and 0.24-unit world-space fade width (D-018). These are guesses pending a browser playtest.

### PT-005 - 2026-09-30 - dual Flatten planes
- **Tester:** Codex automated check; browser feel still awaits a human playtest.
- **Seed:** 1380.
- **Result:** Default radial and optional Horizontal stamps moved density samples toward their distinct plane fields. The radial edit's chunk mesh and normals matched a whole-volume remesh. Nine tests and the production build passed.
- **Changes made:** Default Flatten orientation changed to Planet Surface; D-017's Horizontal plane remains selectable. Brush radius and edge feathering values did not change (D-019).
