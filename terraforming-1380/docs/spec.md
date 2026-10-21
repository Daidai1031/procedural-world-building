# Terraforming Contractor #1380 — Spec

| | |
| --- | --- |
| **Status** | Draft v0.6 — resident feedback and persistent planets (D-034–037) |
| **Last updated** | 2026-10-21 |
| **Answers the question** | *What exactly must the game do, and how do we know it does?* |
| **Sibling files** | Why: [`design.md`](design.md) · Values: [`tuning.md`](tuning.md) · Text: [`content.md`](content.md) · Order of work: [`roadmap.md`](roadmap.md) · Why we chose: [`decisions.md`](decisions.md) |

## Current scope — D-034–037 (2026-10-20)

**Implemented foundations:** manual terrain/Detector; one Miner, Gardener and Builder; plant growth and antenna placement; shared soil and prepared sites; sales, electricity and manual-edit charges; debt/bankruptcy; outer-surface exploration and atlas; explicit broadcasts and reset-style travel (D-023–033).

**Next:** one cave-dwelling resident species reacting to real shelter geometry and local disturbance. Then preserve two planets across travel, followed by the live 3D overview and wider generation variety. All new HAB/RES/PLN/SYS/OPS rows below are todo. This documentation update changes no runtime code.

**Scope authority:** the active requirements below extend implemented AUT/TERR rules. Older MOD/PACK, full cave traversal, detailed metrics, audit/classifications, contact endings and fixed-energy budgets remain deferred. Their historic MVP labels do not make them the current backlog. A legacy row saying a feature is unimplemented does not override the verified implementation summary; reconcile specific acceptance before marking broad old rows done.

Current operations start with 0 credits, warn at/below 0 and end the run at/below −50; minerals sell for 40; power rate is 0.55 credits/kW-minute; manual edits cost 0.02 per changed sample. These are current provisional values, not immutable design requirements. D-037 simplifies presentation; it does not change these rules.

Current travel recreates RunState and keeps funds only. Neither old-world terrain preservation, responsive residents nor a live system overview is implemented.

## 0. How to read and edit this file

This file is meant to change during development. A few rules keep that safe.

- **Every requirement has a stable ID** such as `TERR-03`. IDs are never reused or renumbered. Code comments, commits, tests, and roadmap tasks refer to them (`// TERR-03`).
- **Status** is one of `todo`, `wip`, `done`, `cut`, or `?` (needs a decision). Update it in the same commit as the code.
- **Priority** is `MVP` or `Stretch`. Moving a requirement between them is a scope decision: log it in `decisions.md`.
- **`TUNE`** marks a number or threshold that is expected to change with playtesting. The value lives in [`tuning.md`](tuning.md) and in one config file in code (`src/config/`), never hard-coded in logic.
- **When you learn something by building, change the spec.** If the code and the spec disagree, one of them is wrong: fix the spec (and note why in `decisions.md`) or fix the code. Do not leave both.
- **Cutting is allowed.** Mark the row `cut`, keep it in the table, and say why in the Notes column.

---

## 1. Platform and stack

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| TECH-01 | Runs in a current desktop browser (Chrome, Edge, Firefox, Safari) with WebGL2. No install. | MVP | todo |
| TECH-02 | Built with Vite, React, Three.js (React Three Fiber where it helps). WebGPU is not used. | MVP | done |
| TECH-03 | Language: TypeScript preferred; JavaScript modules from `worldbuilding-guidebook` may be reused via `allowJs`. See `decisions.md` D-003. | MVP | done |
| TECH-04 | Game state lives in one store (for example Zustand); UI reads it, systems write it. No game rules in React components. | MVP | done |
| TECH-05 | Deployed as a static site under the path `/game/` (`base: '/game/'`). | MVP | wip |
| TECH-06 | Target 60 fps on a mid-range laptop with integrated graphics; never below 30 fps during a remesh. `TUNE` | MVP | todo |
| TECH-07 | A run is deterministic from its seed: same seed and same inputs produce the same planet, clusters, and classification. | MVP | wip |

---

## 2. Architecture

The world, the rules, and the presentation are separate layers. Design changes should mostly touch **data and rules**, not the world or renderer.

```text
                ┌────────────────────────────────────────┐
  content/      │  Data: classifications, notices,       │  ← edited most often
  config/       │  archives, tuning values (JSON/TS)     │
                └───────────────────┬────────────────────┘
                                    │ read
┌──────────────┐   events   ┌───────▼────────┐   state    ┌──────────────┐
│ Input / tools│ ─────────▶ │  Systems (rules)│ ─────────▶ │  Game store  │
│ (dig, scan…) │            │ metrics, signal,│            │ (RunState)   │
└──────┬───────┘            │ classify, ends  │            └──────┬───────┘
       │ edit density       └───────▲────────┘                   │ read
┌──────▼───────┐  dirty chunks      │ queries            ┌───────▼───────┐
│ World        │ ──────────────────┘                     │ Views / UI    │
│ density field│ ── meshes, collision ─────────────────▶ │ orbit, FPS,   │
│ chunks, MC   │                                         │ HUD, audit    │
└──────────────┘                                         └───────────────┘
```

Suggested layout of `terraforming-1380/src/`:

```text
src/
  world/        densityField, chunks, marchingCubes, lod, collision, generation (noise, clusters)
  tools/        terrainTool (dig/add/flatten), detector, scanner, modules, canister
  systems/      metrics, developmentReadiness, shapeAnalysis, classification, signal, endings
  state/        runState (store), selectors, save (optional)
  views/        orbitView, surfaceView, transitions, audit, endingScenes
  ui/           hud, backpack, notices, archive reader, metric panels
  render/       materials, triplanar shaders, wireframe pass, point/line layers
  content/      classifications.json, notices.json, archives.json, endings.json
  config/       tuning.ts (all TUNE values), controls.ts, flags.ts
  debug/        debug overlay, cheats (see section 8)
```

---

## 3. Game state

### 3.1 Current implementation snapshot

The actual source of truth is [src/state/runState.ts](../src/state/runState.ts); the following interface is copied from the current implementation, not a proposed replacement. Refer to that source for imported types and constructors. The density field lives in PlanetWorld and is not included in RunState; preserving only this store cannot preserve edited terrain.

```ts
export interface RunState {
  seed: string
  mode: 'orbital' | 'surface' | 'audit' | 'ending'
  budget: { workCyclesRemaining: number; energy: number }
  metrics: {
    capital: number
    biosphere: number
    developmentReadiness: number
    stability: number
    historicalSignificance: number
  }
  planetRemaining: number
  hidden: {
    planetaryMemory: number
    fragmentation: number
    morphology: MorphologyFeatures
    cosmicExposure: number
  }
  signal: { hasBroadcast: boolean; broadcastCount: number; exposureScore: number }
  loadout: {
    modules: [ModuleId, ModuleId]
    activeTool: ToolId
    terrainMode: TerrainMode
    flattenOrientation: FlattenOrientation
    toolSlots: ToolId[]
    // D-025: which robot Auto mode is placing and showing controls for.
    autoRobot: AutoRobot
  }
  canister: { amount: number; capacity: number }
  minerals: Record<string, number>
  discoveries: { artifactIds: string[]; lifeClusterIds: string[] }
  resourceClusters: ResourceCluster[]
  collectedIds: string[]
  detector: { center: [number, number, number] | null; radius: number }
  // AUT-01–12: robots live in the run state; simTick counts fixed simulation steps.
  robots: MiningRobotState[]
  gardeners: GardenerState[]
  builders: BuilderState[]
  // D-026: soil removed by Miners, spent by the Builder when filling. Counted in density samples.
  economy: { mineralStock: number; mineralsSold: number; revenue: number; electricitySpent: number; terrainSpent: number; bankrupt: boolean; preparedSamples: number }
  preparedSites: [number, number, number][]
  soil: number
  // AUT-15/16: plants and antennas standing on the surface.
  structures: Structure[]
  structureCounter: number
  simTick: number
  flags: {
    archive1379Found: boolean
    echoArrayRepaired: boolean
    emergencyExtractionUsed: boolean
  }
}
```

Current simulation uses separate Miner/Gardener/Builder arrays and a fixed-step simTick. Mineral/life/memory markers are resource proxies; a life discovery is not an autonomous resident. Legacy budget/loadout fields are not proof those mechanics are active.

### 3.2 Planned multi-planet and resident state (not implemented)

Conceptual responsibilities, not final TypeScript names:

- A system record stores stable discovered planet IDs, selected planet and each planet's starting config.
- A planet record retains its RunState plus the edited density field or a validated replayable edit history, residents, habitat occupancy, disturbance and terrain revision.
- Residents have stable identity, species, position, home/target, behavior state and response timers.
- Habitat candidates include current enclosure/clearance/access validity and occupancy; invalidation follows density edits.
- Both local view and overview read the same planet record; derived display meshes may be cached by terrain revision.
- Account scope, background ticking and reload serialization remain open. No automatic merging of funds or continuing off-screen billing is implied.

## 4. Requirements

### 4.0 Autonomous mining (AUT) — existing foundations

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| AUT-01 | Select one Miner, set one circular work area, Start/Pause and reassign it. One goal: mine discovered minerals. | MVP | done |
| AUT-02 | Bounded robot scans discover only targets within scan range and the assigned work volume. Existing manual Detector remains available; scanning never reveals the whole planet. | MVP | done |
| AUT-03 | Choose the nearest discovered, uncollected Mineral in the area; break equal-distance ties by stable target ID. Life and Memory are not mined as ore. | MVP | done |
| AUT-04 | Hover through empty space to a valid surface entry; do not intersect intact terrain during travel. | MVP | done |
| AUT-05 | Progressively excavate from the entry toward the target using the existing density edit operations. Check clearance against current density before advancing; never teleport to buried ore. | MVP | done |
| AUT-06 | Collect an exposed Mineral once, update the shared collected IDs/counts, clear the target and begin another scan/select cycle without player clicks. Reuse collection foundations where suitable. | MVP | done |
| AUT-07 | Reassess current terrain and target validity while working. If another edit changes the world, revise the task or report a stop reason. | MVP | done |
| AUT-08 | Pause stops robot movement, scanning, collection and edits; camera/manual inspection stays usable. Reassignment safely discards the old task. | MVP | done |
| AUT-09 | No eligible target stops with no-targets; a bounded no-progress check stops with blocked. No endless digging, retries, or motion when stuck. | MVP | done |
| AUT-10 | Show phase, selected area, current target and stop reason. UI explains the visible robot process. | MVP | done |
| AUT-11 | Use fixed simulation steps and stable ordering for reproducibility. Same seed and tick-indexed commands yield the same target sequence and terrain edits. Rendering frame rate must not define mining speed. | MVP | done |
| AUT-12 | Bound terrain edits per step and reuse dirty-chunk remeshing. Measure responsiveness on the user's laptop; do not claim performance before measuring it. | MVP | wip |
| AUT-13 | Multiple Miners reserve distinct targets, release reservations on pause/reassignment/completion, and redistribute work. | Stretch | todo |
| AUT-14 | Introduce one second procedural behavior: Builder reshaping or Gardener growth. Gardener chosen (D-025). | Stretch | done |
| AUT-15 | The Gardener alternates plant, plant, antenna inside its area. Plants take the flattest suitable surveyed ground, antennas the highest; suitability is solid ground, air above, slope limit and spacing. Stops with `no-sites` when nothing fits. | Stretch | done |
| AUT-17 | The Builder levels its area toward the mean ground height measured at Start, alternating cut-only Flatten on high ground and Add on low ground. Fills spend a shared soil stock filled by Miner digging (and the Builder's own cuts). It skips ground near plants, antennas and live Miner tunnels, and stops with `level` or `no-soil`. | Stretch | done |
| AUT-16 | Plants grow through stages and spread onto suitable neighbouring ground up to a cap. Any terrain edit removes structures whose ground is dug away or buried. | Stretch | done |

Implementation sequence: scan/select → empty-space travel → progressive dig → collect/repeat → controls/status → terrain-change and no-progress handling. No purchases, power billing, hauling, first person or questionnaire is required.

### 4.1 World and terrain (TERR)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| TERR-01 | The planet is a 3D scalar density field. Solid is on one side of a threshold, air on the other. The sign rule is the same everywhere (guidebook Lesson 03: negative inside). | MVP | done |
| TERR-02 | Initial density = sphere (distance to center - radius; negative inside) plus layered noise for surface relief and interior variation. Grid resolution `TUNE`. | MVP | done |
| TERR-03 | The volume is split into chunks. Each chunk meshes with Marching Cubes. Chunks use a two-sample border so neighbouring chunks produce the same surface as a single volume (guidebook finding). | MVP | done |
| TERR-04 | An edit only marks the chunks it touches as dirty; only dirty chunks are remeshed, spread over frames within the frame budget. | MVP | wip |
| TERR-05 | Edits update the render mesh and the collision mesh together for the affected chunks. | MVP | todo |
| TERR-06 | Chunks far from the camera use lower detail; seams between detail levels are snapped so no visible gaps appear. Geometry checks pass; browser inspection is pending. | Stretch | wip |
| TERR-07 | A small core sits near the center. Digging it sharply lowers Stability (`TUNE`) but it does not occupy a large interior volume. | MVP | todo |
| TERR-08 | Digging through to the other side of the planet is possible and must not crash or soft-lock (see NAV-03). | MVP | todo |
| TERR-09 | Each edit reports the mass removed or added so `planetRemaining` and the canister can be updated. | MVP | wip |

### 4.2 World generation (GEN)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| GEN-01 | Minerals, Life, and Memory are three independent cluster generators (own noise or seed stream). They are 3D irregular clusters, not depth layers. M1.5 has seeded point proxies; irregular deposits remain M3. | MVP | wip |
| GEN-02 | Clusters may overlap. The same category may appear at any depth. | MVP | todo |
| GEN-03 | Rock and Soil are base materials: soil as softer surface cover and pockets, rock as the main structure. | MVP | todo |
| GEN-04 | Every target starts embedded inside the initial sphere; none sits on or above the initial surface. A small number of shallow teaching targets glow through the surface (VIS-03), and most valuable targets are deeper. | MVP | done |
| GEN-05 | A minimum distance and count rule guarantees the player can find something within the first few scans. `TUNE` | MVP | todo |
| GEN-06 | Rare signals are more likely near the core. | MVP | todo |
| GEN-07 | The `seed` (URL parameter `?seed=`) fully determines generation. New run = new seed by default. | MVP | wip |
| GEN-08 | The #1379 archive and repairable Deep Echo Array are placed as guaranteed Memory targets at a reachable depth, so the story beat cannot be missed by bad luck. | MVP | todo |

### 4.3 Terrain tool and canister (TOOL)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| TOOL-01 | One Terrain Tool with three modes: Dig, Add Terrain, Flatten. | MVP | done |
| TOOL-02 | Dig raises signed density inside a brush (negative is solid, positive is air). Removed rock/soil goes to the canister up to capacity. | MVP | wip |
| TOOL-03 | Add Terrain lowers signed density inside a brush and consumes canister material 1:1 with added mass `TUNE`. It fails with feedback when the canister is empty. | MVP | wip |
| TOOL-04 | Flatten stamps a plane through the clicked point. Default Planet Surface uses the outward center-to-click vector as plane normal; Horizontal uses global +Y (D-019). Both use a circular footprint within that plane and a local band along its normal, with a flat center and feathered edge (D-017). The preview disc matches the plane. It costs canister material when it adds and returns material when it removes. | MVP | wip |
| TOOL-05 | Brush radius is adjustable within limits; Wide Drill increases the Dig radius cap. `TUNE` | MVP | wip |
| TOOL-06 | Every tool use costs energy or a work cycle (see BUD-01). Costs per action `TUNE`. | MVP | todo |
| TOOL-07 | Canister has a finite capacity. When full, extra dug matter is discarded (with a notice) but still counts as removed mass. | MVP | todo |
| TOOL-08 | Minerals do not go in the canister; they become mineral samples. Life and Memory do not become material; they raise discovery events. | MVP | todo |
| TOOL-09 | Digging into a Life cluster reduces Biosphere and shows the "non-commercial biomass" notice. Digging into Memory reduces Planetary Memory if destroyed, raises it if recovered. | MVP | todo |
| TOOL-10 | Tool input works in both orbital (mouse raycast) and surface (crosshair raycast) modes. | MVP | todo |

**Edit convention (D-014):** Density below zero is solid throughout the world, tools, meshing, and future collision code. Flatten uses the same sign rule when it removes or adds terrain. Report mass from the change in solid volume across an edit; a raw density delta is not itself a mass change.

### 4.4 Scanner (SCAN)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| SCAN-01 | Scanner reports nearby signals as **direction**, **distance band**, and **signal strength**, never exact positions. | MVP | todo |
| SCAN-02 | It distinguishes Mineral, Life, Memory signals by shape/value/animation, not by color alone. | MVP | todo |
| SCAN-03 | Scanning uses dot grids, short lines, local contours, and small value shifts in the signal direction; no bright translucent overlays. | MVP | todo |
| SCAN-04 | Range and direction accuracy depend on modules (Deep Scanner). `TUNE` | MVP | todo |
| SCAN-05 | Scanning costs energy. | MVP | todo |
| SCAN-06 | A signal behind a void, on the far side, or near the core is allowed (deliberate temptation). | MVP | todo |

### 4.4a Local Detector (DET)

The Detector is a separate, close-range inspection tool. The later Scanner retains its coarse direction/distance/strength role (D-018).

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| DET-01 | Equip Detector and left-click the planet to anchor one bounded local scan at the clicked surface. A new click replaces the scan. `TUNE` radius. | MVP | done (orbit) |
| DET-02 | While Detector is active, show the selected area's current terrain mesh as subdued local wireframe and reveal actual resource target positions within that volume. Switching tools hides the scan. No full-planet resource map. | MVP | done (point proxies) |
| DET-03 | Targets buried in solid terrain have no visible marker during ordinary viewing; only their surface glow (VIS-03) shows. A marker becomes visible when terrain exposes the target's center. Re-evaluate exposure after terrain edits. Use distinct forms and a text legend for Mineral, Life, Memory. | MVP | done (point proxies) |
| DET-04 | Fade wireframe and buried signals by distance from the fixed scan point in world space: `1 - smoothstep(radius - fadeWidth, radius, distance(worldPosition, scanCenter))`. Buried signals render through terrain only during the scan. Do not base this effect on camera distance or Fresnel. `TUNE` fade width. | MVP | done |
| DET-05 | Detector energy cost/cooldown is decided with the M3 budget (OQ-15); M1.5 inspection is free. | MVP | todo |

### 4.5 Modules and backpack (MOD / PACK)

**Deferred by D-022:** retained legacy requirements; not part of R1. Existing IDs and implementation history are preserved.

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| MOD-01 | Before the run the player chooses exactly two of four modules: Deep Scanner, Wide Drill, Bio Seeder, Structural Stabilizer. | MVP | todo |
| MOD-02 | The choice is fixed for the run. | MVP | todo |
| MOD-03 | Deep Scanner: longer range, better direction. Wide Drill: larger radius, faster mining, higher chance of punching through / fracturing. Bio Seeder: protects and regrows discovered life, costs energy and space. Structural Stabilizer: reinforces weak areas and ramps, costs material and money. Effects `TUNE`. | MVP | todo |
| PACK-01 | `Q` opens/closes the Backpack. | MVP | todo |
| PACK-02 | Backpack shows: Terrain Tool and current mode, Detector, Scanner, the two modules, canister level, mineral samples, energy, and a one-line description of the active tool. | MVP | todo |
| PACK-03 | Click or drag equips a tool to the Active Tool slot. Number keys `1–4` switch between equipped tools. | MVP | todo |
| PACK-04 | No crafting, no item grid, no weight. | MVP | todo |

### 4.6 Navigation and being trapped (NAV)

**Deferred by D-022:** retained legacy requirements; not part of R1. Existing IDs and implementation history are preserved.

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NAV-01 | The first-person controller collides with the voxel mesh and can climb slopes up to a limit. `TUNE` | MVP | todo |
| NAV-02 | Vertical drops or steep shafts can leave the player unable to get back up. This is intended. | MVP | todo |
| NAV-03 | **Emergency Extraction:** returns the player to the base at a high cost (Capital, Historical Significance, or work cycles). Cost and usage limit `TUNE` (OQ-02). Always available when the player cannot leave by their own means. | MVP | todo |
| NAV-04 | Detecting "trapped" is automatic (no walkable path to the surface above a slope limit within a radius) and offers Emergency Extraction. | MVP | todo |
| NAV-05 | First person is limited to one connected region around Silent Shore plus its caves. Spherical gravity for the full planet is not required. | MVP | todo |
| NAV-06 | Full walking around the whole sphere with aligned gravity. | Stretch | todo |

### 4.7 Views (VIEW)

**Current scope note:** outer-surface walking, return to orbit, landing validation and atlas exist (D-029). Full cave physics, shared editing in surface mode and cinematic ending transitions below are not implied. Rows retain historical breadth; SYS defines the planned system overview.


| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| VIEW-01 | **Orbital Planning Mode:** camera orbits the planet center (orbit controls). Shows silhouette, remaining mass, voids, base, and ecology zones. | MVP | wip |
| VIEW-02 | **Surface Exploration Mode:** first-person controller with crosshair. | MVP | todo |
| VIEW-03 | `Tab` toggles between them. The transition keeps the selected surface position and orientation so it feels spatially continuous. | MVP | todo |
| VIEW-04 | In orbital mode the player can select a landing point or mark a survey area. | MVP | todo |
| VIEW-05 | Both views share the same terrain, tools, and state; there is no second copy of the world. | MVP | todo |
| VIEW-06 | The contact ending can begin in first person and pull out to orbit. | Stretch | todo |

### 4.8 Metrics (MET)

**Deferred by D-022:** retained legacy requirements; not part of R1. Existing IDs and implementation history are preserved.

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| MET-01 | Five public metrics: Capital, Biosphere, Development Readiness, Stability, Historical Significance, shown in the orbital UI and in a collapsed first-person panel. | MVP | todo |
| MET-02 | Planet Remaining is always visible, including in first person. | MVP | done |
| MET-03 | Selling minerals at the Extraction Terminal raises Capital. | MVP | todo |
| MET-04 | Biosphere is derived from surviving Life clusters and Bio Seeder activity. | MVP | todo |
| MET-05 | Stability is derived from mass remaining, thin-shell area, core integrity, number of disconnected fragments, and Stabilizer use. See 5.1. | MVP | todo |
| MET-06 | Historical Significance is raised by discovering Memory, monuments, and broadcasts. | MVP | todo |
| MET-07 | Development Readiness follows the formula in 5.1 and is recomputed on a debounce after edits, not every frame. | MVP | todo |
| MET-08 | Metric changes show as company-voice notices (see `content.md`), e.g. "Development Readiness +12% / Native biomass −31%". | MVP | todo |
| MET-09 | No action can raise all five metrics without a cost to another one. Reviewed at each playtest. | MVP | todo |
| MET-10 | Hidden metrics (Cosmic Exposure, Planetary Memory, Fragmentation, Morphology) are not shown before the audit. | MVP | todo |

### 4.9 Budget (BUD)

**Current scope note:** D-028/031 plus current economy.ts implement sales, running power costs, manual terrain charges, warning and bankruptcy. The older deferred requirements below must be read against the current scope; fixed energy/cycle budgets remain inactive legacy ideas. OPS covers the desired simplified UI.


| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| BUD-01 | Legacy fixed cycles/energy budget superseded by D-022. Later operating costs are paid from funds; detailed billing is deferred. | Stretch | cut |
| BUD-02 | Later: voluntary departure or forced departure near insolvency leads to audit. Threshold and remedies remain open; no ending budget in the robot test. | Stretch | ? |
| BUD-03 | Later: warn of operating expenses and approaching insolvency. Wording and threshold remain open. | Stretch | ? |

### 4.10 Signals and exposure (SIG)

**Current scope note:** D-032 implements explicit, free broadcasting with an antenna, exposure added per antenna, and discovery entries after the third broadcast. Legacy power/duration, repair gates, money rewards and narrative endings below are deferred proposals, not the current broadcast algorithm. D-038 role separation is only proposed.


**Deferred by D-022:** retained legacy requirements; not part of R1. Existing IDs and implementation history are preserved.

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| SIG-01 | The Deep Echo Console lives at the base, is a use-in-place object (not carried), and can broadcast at a chosen power and duration. | MVP | todo |
| SIG-02 | Broadcasting shows only the positive feedback in company voice (Historical Significance, corporate value, shareholder confidence). Cosmic Exposure is never shown. | MVP | todo |
| SIG-03 | First broadcast sets `signal.hasBroadcast = true`; this can never be set back to false. | MVP | todo |
| SIG-04 | Each broadcast adds `exposureScore += power × duration × k` (`TUNE`) and `broadcastCount += 1`. | MVP | todo |
| SIG-05 | Removing the antenna stops further exposure but does not lower `exposureScore`. | MVP | todo |
| SIG-06 | The Echo Array must be repaired using the discovered #1379 equipment before it can broadcast. | MVP | todo |
| SIG-07 | Thresholds that pick the ending (Heard / Observed / Erased) are `TUNE` and are never displayed to the player. | MVP | todo |

### 4.11 Shape analysis and classification (CLS)

**Deferred by D-022:** retained legacy requirements; not part of R1. Existing IDs and implementation history are preserved.

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| CLS-01 | Lightweight morphology metrics are computed during play (for Wireframe and Stability). The full set is computed once at audit. | MVP | todo |
| CLS-02 | Morphology features are those in 5.2, derived from voxel data only. | MVP | todo |
| CLS-03 | Classification has three parts: **Morphology archetype**, **Dominant value modifier**, **Fate** (see 5.3). | MVP | todo |
| CLS-04 | Classifications are defined in data (`content/classifications.json`), not in code. Adding one needs no code change. | MVP | todo |
| CLS-05 | Rare results are checked first and override the main archetype when their conditions match. | MVP | todo |
| CLS-06 | If nothing matches well, fall back to the closest archetype by distance in feature space, never to an error. | MVP | todo |
| CLS-07 | The first release includes exactly six main classifications (listed in `design.md` §11.3), each verified by a manual test planet (CLS-T in section 9). | MVP | todo |
| CLS-08 | The audit shows detected shape data and metric summary before the name, so the result feels earned. | MVP | todo |
| CLS-09 | 10 more main classifications plus rare ones. | Stretch | todo |

### 4.12 Audit and endings (END)

**Deferred by D-022:** retained legacy requirements; not part of R1. Existing IDs and implementation history are preserved.

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| END-01 | At end of contract, player control is removed and the audit sequence plays (scanning lines from `content.md`). | MVP | todo |
| END-02 | Ending selection: no broadcast → Silent; some exposure below Observed threshold → Heard; between thresholds → Observed; at or above Erased threshold or sustained max power → Erased. | MVP | todo |
| END-03 | Silent, Heard, and Erased are required for MVP; Observed can ship as a variation of Heard. | MVP | todo |
| END-04 | Fate status shown at audit: UNNOTICED, RECENTLY NOTICED, BEING OBSERVED, NO LONGER EXISTS. | MVP | todo |
| END-05 | "We heard you, 1380." is displayed quietly (no jump scare) and cuts to black. | MVP | todo |
| END-06 | Erased ending: thin beam from off-screen, planet breaks up or vanishes from the render; final card shows `ASSET VALUE: $0`, `HISTORICAL SIGNIFICANCE: 100%`. An optional variant cuts the classification line mid-word. | MVP | todo |
| END-07 | After any ending the player can restart with a new seed. | MVP | todo |

### 4.13 Visuals (VIS)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| VIS-01 | Palette follows `design.md` §14 (about 80/15/5 gray / material / accent). Named color tokens live in `config/` and CSS variables; 3D colors are in `config/palette.ts` (D-027). | MVP | wip |
| VIS-02 | Terrain uses triplanar or world-space texturing. No UV stretch after remeshing. | MVP | wip |
| VIS-03 | Mineral, Life, and Memory use three distinct colors (yellow, green, pink). Each buried target tints only the terrain surface around it, faded by world-space distance to the target: `(1 - smoothstep(0, glowRadius, distance(worldPosition, targetPosition)))^2`. Deep targets do not reach the surface. Other material blending uses world-space noise, vertex color, or density masks. `TUNE` glow radius. | MVP | wip |
| VIS-04 | Point / line / surface layers exist and are drawn by separate passes. | MVP | todo |
| VIS-05 | **Wireframe states** (solid, structure exposed, nearly hollow, critical wreck) are chosen per chunk from `planetRemaining`, local shell thickness, and stability (see 5.4). Local thickness has priority over the global percentage. | MVP | todo |
| VIS-06 | Structural lines use a simplified edge set, not every triangle. Line color is graphite/gray-brown (never default green). No Z-fighting or heavy flicker. | MVP | todo |
| VIS-07 | Texture grain is fixed in world/object space, never floating with the camera. | MVP | todo |
| VIS-08 | Rough texture is applied to the world and archive layers only; core UI text stays clean and high contrast. | MVP | todo |
| VIS-09 | The contact ending may switch briefly to a dark cosmic background; the rest of the game does not. | MVP | todo |
| VIS-10 | Unknown observer is one of the abstract forms in `design.md` §14 (not a classic ship). | MVP | todo |
| VIS-11 | Terrain uses surface C (D-027): world-space value by height and slope plus graphite contour lines at a fixed radius spacing, so edits bend the lines. Keeps VIS-03 glow. `TUNE` spacing. | MVP | done |
| VIS-12 | A selected robot's work area shows as denser, darker contours inside its sphere with a single edge line, not as a wireframe sphere (D-027). | MVP | done |
| VIS-13 | The atmosphere is seeded points that hug the initial terrain, clump by noise with a minimum floor, and drift in two shells, plus a faint irregular halo and limb tint (D-027). `TUNE` strength, count. | MVP | done |
| VIS-14 | Robots, plants, antennas and mineral markers use the D-027 models; every model color comes from `config/palette.ts` (checked by test). | MVP | done |
### 4.14 Audio (AUD)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| AUD-01 | Dig / fill / grain movement sounds, varying by material. | MVP | todo |
| AUD-02 | Distinct subtle ambience per depth zone. | Stretch | todo |
| AUD-03 | Calm chime for company notifications. | MVP | todo |
| AUD-04 | On cosmic contact, ambience is removed first, then very low frequencies added. | MVP | todo |
| AUD-05 | Archives contain noise, dropouts, and incomplete speech. | Stretch | todo |

### 4.15 UI (UI)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| UI-01 | Orbital UI layout per `design.md` §13. | MVP | todo |
| UI-02 | First-person HUD: crosshair, contextual prompt, terrain mode, brush size, canister, two modules, energy; edge hints for base, resources, life, unstable terrain. | MVP | todo |
| UI-03 | Metrics panel collapsed by default in first person. | MVP | todo |
| UI-04 | Company notifications are queued, non-blocking, and skippable. | MVP | todo |
| UI-05 | Pre-run module selection screen (pick two of four). | MVP | todo |
| UI-06 | Archive reader for #1379 and other recovered documents. | MVP | todo |
| UI-07 | Minimal onboarding: controls are taught through the first three actions, not a long tutorial. | MVP | todo |

---

### 4.16 Habitat and disturbance (HAB) — planned

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| HAB-01 | Validate sunk surface homes from current density: soil depth ≥ 0.45, slope ≤ 25°, headroom ≥ 0.18 and spacing ≥ 0.5. | MVP | done (D-045) |
| HAB-02 | Feed manual Dig/Add/Flatten and robot terrain work into the same bounded local disturbance mechanism; disturbance decays when work ceases. Acoustic physics is not required. TUNE | MVP | done (D-042) |
| HAB-03 | Reconcile affected homes immediately after terrain edits: removed support ejects the resident onto the new surface; added terrain carries a hidden resident outward. | MVP | done (D-046) |
| HAB-04 | Expose habitat validity and disturbance in debug inspection without requiring a player-facing score dashboard. | MVP | done (D-042) |

### 4.17 Resident behavior (RES) — planned

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| RES-01 | Start Ares-9 with roughly twelve deterministic rock residents: one inside each open burrow and the rest scattered on valid surface homes, with stable 0.75–1.25× body-size variation. | MVP | done (D-045/D-052/D-053/D-054) |
| RES-02 | Soil depth, slope, headroom, spacing and current occupancy are hard home constraints. | MVP | done (D-045) |
| RES-03 | Brief disturbance causes visible retreat, followed by cautious return after sufficient quiet. TUNE | MVP | done (D-042) |
| RES-04 | Ongoing disturbance or home invalidation sends a resident away from the work to a free quiet burrow, or to open ground when every burrow is taken. One burrow holds one resident. | MVP | done (D-045/D-051/D-054) |
| RES-05 | Re-evaluate seeded and recently edited surface candidates from current density. | MVP | done (D-045) |
| RES-06 | Resolve equal candidates stably and prevent conflicting occupancy. TUNE | MVP | done (D-045) |
| RES-07 | If no home is available, keep a visible `searching` state with six bounded retries. A terrain change resets the retry budget. | MVP | done (D-045/D-046) |
| RES-08 | Make peeking, retreat and relocation distinguishable from the normal play camera: calm residents lurk with the crown showing and periodically surface to look around, and nearby disturbance makes them tremble; final body design remains open. | MVP | done (D-042/D-055) |

### 4.18 Planet identity and persistence (PLN) — planned

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| PLN-01 | Assign stable planet ID/seed/config and discovery status; repeat discovery does not duplicate an existing world. | MVP | done (D-040) |
| PLN-02 | Support independently varying playable size, terrain and resource abundance/distribution within technical limits. Icon size alone does not satisfy size variation. | MVP | done (D-041) |
| PLN-03 | Switching away and back in one session preserves edited terrain, collection/stock, robots, structures, residents, disturbance and local signal state. Store or reconstruct density, not seed alone. | MVP | done (D-040; residents pending S1) |
| PLN-04 | Separate view switching from world initialization. Discovery and revisiting must not reset a planet or duplicate income/resources. | MVP | done (D-040) |
| PLN-05 | Choose and document shared/local funds, inactive-world ticking and billing before implementing continuous background operation. | Stretch | decided (D-040: shared funds, inactive frozen) |
| PLN-06 | Browser-reload save/load scope and format remain a separate decision; do not claim durable saves from PLN-03. | Stretch | ? |

### 4.19 System overview (SYS) — planned

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| SYS-01 | Show discovered planets in a navigable 3D spatial arrangement; orbital physics is unnecessary. | MVP | done (D-040) |
| SYS-02 | Derive overview meshes from each current edited world, with revision-aware refresh. Holes/cuts must not revert to a decorative sphere. | MVP | done |
| SYS-03 | Hover reveals concise descriptive state; click visits the selected stored planet. Exact progress descriptor is open and must not prescribe a universal end goal. | MVP | done |
| SYS-04 | Refresh running-world changes while the overview is open, within a measured budget; choose cadence and inactive-world policy explicitly. | MVP | done (per-frame version check; inactive frozen) |
| SYS-05 | The system view is a camera pull-back in the main scene: no dialog, no second Canvas. Entry by the *System overview ↗* button, key `O`, or a click on a distant planet; exit by *Return to orbit ↓*, `O` or `Esc`. (D-049) | MVP | done |
| SYS-06 | The active planet stays at the scene origin and is never scaled. Other worlds sit at `planetPosition(seed) − planetPosition(active)`. At `pull = 0` the camera pose equals today's orbit pose. Right-drag turns, wheel zooms, left click picks; tools are disabled while pulled back. | MVP | done |
| SYS-07 | Pulling back never pauses, resets or edits the crew: the active planet keeps simulating and its robots stay visible as small amber lights. Inactive planets stay frozen (D-040). | MVP | done (not browser-verified: crew keeps working while pulled back) |
| SYS-08 | A planet known only from a signal is a wireframe at its true radius, always, until visited. Visited planets use their current edited meshes with contour shading (SYS-02). | MVP | done |
| SYS-09 | State is drawn on each visited planet instead of a list: ghost shell at the original radius, plant dots, antenna ticks, resident glows and robot lights. Counts are capped (`tuning.system.marks`). Inactive planets read from their frozen snapshot. | MVP | done |
| SYS-10 | A dashed arc joins each planet to the planets its signals found. A broadcast on the active planet sends a pulse along its outgoing arcs. Arcs are descriptive and imply no goal. | MVP | done |
| SYS-11 | Traveling is one press-and-hold gesture (`tuning.system.holdMs`) on a focused, non-active world; early release cancels. `travelTo` is unchanged and called once. The Travel button and the confirmation dialog are removed. | MVP | done |
| SYS-12 | Travel plays a dive under a paper-colored veil, then arrives in orbit around the new planet with a transient caption. With reduced motion the animation is skipped. | MVP | done (reduced motion shortens the animations to 0.2 s; not browser-verified) |
| SYS-13 | Name tags on every world; hover or focus adds a one-line caption in the existing description format. A visually hidden list of worlds gives keyboard and screen-reader access. | MVP | done |
| SYS-14 | While pulled back, both sidebars slide out and the canvas fills the main area; footer hints change; `A`, `M`, `P` still switch mode; `D`, `T`, `F` are ignored. | MVP | done |

### 4.20 Compact operating feedback (OPS) — planned UI change

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| OPS-01 | Keep accounting internal where possible; use compact operating status rather than mandatory detailed spending rows. Minerals are sold automatically on delivery (D-039, implemented); detailed rows remain. | MVP | in progress |
| OPS-02 | Explain material/funding restrictions and critical warnings with cause and available action. Do not hide current bankruptcy while it can terminate play. | MVP | todo |
| OPS-03 | Do not change charges, bankruptcy, sale policy or fund ownership as an incidental UI edit. A revised hard-ending policy needs a new decision. | MVP | todo |

**Role clarification:** AUT-15 currently includes antenna placement. D-038 is proposed only; no removal or reassignment is authorized by these requirements.

## 5. Algorithms and rules

### 5.0a Planned resident update order

Apply terrain edits and disturbance inputs → reconcile affected sunk residents with the new surface → decay disturbance on simulation time → update retreat/quiet timers → select the nearest free valid home → follow an above-surface route → publish occupancy/state for rendering. `stepResidents` runs in the shared fixed-step simulation; Manual mode advances the same step independently of the crew.


### 5.0 Autonomous work cycle

Idle → scan → select known target → find surface entry → move in empty space → excavate incrementally → collect → scan again. Pause can interrupt any active phase. Recheck target eligibility and terrain clearance using the authoritative density grid, not stale render meshes. A fixed simulation tick drives behavior; rendering only displays it. Limit retries and edits per tick. The exact entry search and progress thresholds are implementation choices to test, not a requirement for global navigation or a full physics engine.



### 5.1 Development Readiness and Stability

**Development Readiness**

```text
DR = normalize(BuildableArea) × Accessibility × StructuralStability
```

- **BuildableArea:** sample the surface on a coarse grid (`TUNE`). A sample counts if its local slope ≤ `slopeMax` and it belongs to a connected patch of area ≥ `patchMin`.
- **Accessibility:** the fraction of buildable area reachable from the base through a walkable path (slope ≤ `walkSlopeMax`).
- **StructuralStability:** the fraction of buildable samples whose supporting thickness below them is ≥ `thicknessMin`.
- Recompute when dirty chunks settle (debounce `TUNE`), not each frame.

**Stability** (all inputs normalized 0–1, combined by weights `TUNE`):

```text
Stability ≈ w1·massRemaining + w2·(1 − thinShellFraction) + w3·coreIntegrity
          + w4·largestComponentShare + w5·stabilizerBonus
```

### 5.2 Morphology features

All computed from the solid voxel set.

| Feature | Definition (initial proposal) |
| --- | --- |
| `flatness` | 1 − (shortest / longest principal axis of the solid set) |
| `elongation` | longest axis / middle axis, normalized |
| `spikiness` | variance of surface radius from the center, plus high-frequency component; also surface-voxels / total solid voxels |
| `sphericity` | how close the solid set is to a sphere of equal volume |
| `fragmentation` | 1 − (largest connected component volume / total volume); also the component count |
| `holeCount`, `holeSize` | flood-fill empty voxels not connected to the outside |
| `throughHole` | true if an empty path passes near the center from one side of the surface to the opposite side |
| `smallHoleDensity` | number of small cavities per unit volume |
| `shellHollowness` | interior void volume / bounding volume, plus shell thickness variance |
| `regularity` | share of surface normals aligned to a few axes/terraces; number of level platforms |

### 5.3 Classification pipeline

1. Compute morphology features and final metrics.
2. Check **rare** entries in priority order; the first whose conditions match wins.
3. Otherwise score every **main** archetype. Each defines feature ranges and a weight; the score is the weighted fit. The highest wins if above `matchMin`; otherwise pick the closest.
4. Apply **modifiers** from metrics (for example "Biodiverse", "Treasure-Stuffed", "Historically Significant").
5. Determine **fate** from signal state (see END-02, END-04).
6. Output `{ archetypeId, modifiers[], fate, shapeSummary, metricSummary }` to the audit UI.

**Classification data schema** (`content/classifications.json`):

```json
{
  "id": "concrete_paper",
  "name": "A Reinforced-Concrete Sheet of Paper",
  "tier": "main",
  "mvp": true,
  "priority": 0,
  "morphology": { "flatness": { "min": 0.7 } },
  "metrics": { "developmentReadiness": { "min": 0.6 }, "stability": { "min": 0.5 } },
  "planetRemaining": { "max": 0.2 },
  "blurb": "Planned so safely that it is barely a planet anymore."
}
```

### 5.4 Wireframe state per chunk

```text
stress(chunk) = max( f(localThickness), g(planetRemaining), h(stability, fragmentCount) )
state = 0 solid | 1 structure exposed | 2 nearly hollow | 3 critical wreck
```

- `localThickness`: approximate by sampling the density field along a few rays from surface points near the player (not a full geometry analysis). Refresh only near edits and near the player, at low frequency (`TUNE`, e.g. 2–4 Hz).
- Initial thresholds for `planetRemaining` are 45% / 25% / 10% (see `tuning.md`).
- Update only visible chunks (near the player, the current cave, and the orbital view).

### 5.5 Ending selection

```text
if !hasBroadcast                    → Silent
else if exposureScore < T_observed  → Heard
else if exposureScore < T_erased    → Observed
else                                → Erased
```

Thresholds `T_observed`, `T_erased` are in `tuning.md` and are never shown in the UI.

---

## 6. Controls

**Next prototype:** robot selection, work-area assignment, Start/Pause and reassignment. Preserve working manual terrain/Detector controls as inspection and intervention tools. The legacy first-person/backpack controls below are deferred.



| Input | Function |
| --- | --- |
| `E` | Take out or put away the Terrain Tool |
| `Left Click` | Use the active tool: edit in Terrain mode; anchor a local scan in Detector mode |
| `Right Drag` | Orbit the camera around the stationary planet (D-016) |
| `F` | Cycle selected mode: Dig → Add Terrain → Flatten → Dig |
| Flatten orientation buttons | Choose Planet Surface (default, radial normal) or Horizontal (global +Y normal); affects plain and Ctrl-click Flatten |
| `D` / `T` | Equip Detector / Terrain Tool (also available as on-screen buttons) |
| `Alt + Left Click` | Temporarily Add Terrain (uses canister material); selected mode stays the same |
| `Ctrl + Left Click` | Temporarily Flatten / extend a slope; selected mode stays the same |
| `Tab` | Toggle orbital / surface view (new to this project) |
| `Q` | Open / close Backpack |
| `R` | Start Scanner / toggle scan display |
| `1–4` | Quick-switch between equipped tools |
| Mouse wheel | Brush size |

Bindings live in `config/controls.ts` or the active tool input handler and may change after playtests. Per D-015, `F` plus plain left click is the dependable path to all three terrain modes if a browser or operating system captures a modifier shortcut. Only cycle on a non-repeated `F` keydown while the Terrain Tool is active; ignore it when focus is in editable text or another UI control. Apply Alt/Ctrl overrides only to a terrain click in the game viewport, without changing `terrainMode`. If both modifiers are held, do not edit terrain. Show the selected mode and the mode used for the current action in the terrain UI. Test the optional modifier shortcuts in supported browsers during M1. Per D-016, the planet has no automatic rotation; right-drag rotates the camera, and the mouse wheel adjusts brush radius. Per D-018, `D`/`T` switch active tools and Detector clicks never edit terrain.

Per D-019, Planet Surface is the initial Flatten orientation. Its signed target field is `dot(sample - click, normalize(click - planetCenter))`. Horizontal uses `sampleY - clickY`. The brush radius defines a circular in-plane footprint and an equal-width normal band; both fade over the outer 25%. If a click is effectively at the center, use global +Y as a safe normal. Dirty-chunk coverage must include the entire oriented brush and shared sample borders.

---

## 7. Data and content

- All player-facing text is referenced by key (`notice.first_broadcast`), defined in `content/*.json`, mirrored in [`content.md`](content.md).
- All balance numbers come from `config/tuning.ts`, mirrored in [`tuning.md`](tuning.md).
- Both are loaded at startup, so designers can change them without touching game logic.
- A run's final data (`seed`, choices, metrics, classification) is serializable so a run can be replayed or shared.

---

## 8. Debug and iteration tools (build these early)

These are what make it possible to keep redesigning while building.

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| DBG-01 | `?seed=` sets the seed; `?debug=1` shows the debug overlay. | MVP | done |
| DBG-02 | Overlay shows fps, chunk count, dirty chunks, remesh time, planetRemaining, all metrics, hidden metrics, morphology features, exposureScore. | MVP | wip |
| DBG-03 | Cheat panel: set any metric, set energy/canister, spawn a cluster near the player, teleport to base or core. | MVP | todo |
| DBG-04 | "Preview classification": compute the current classification at any moment without ending the run. | MVP | todo |
| DBG-05 | "Force ending": jump to Silent / Heard / Observed / Erased directly. | MVP | todo |
| DBG-06 | Force a wireframe state (0–3) on all chunks. | MVP | todo |
| DBG-07 | Preset test planets: load a saved density field that should classify as each of the six MVP archetypes. | MVP | todo |
| DBG-08 | Hot-reload of `content/*.json` and `config/tuning.ts` during play. | MVP | todo |

---

## 9. Acceptance and tests

### Robot prototype acceptance

| ID | Check | Covers |
| --- | --- | --- |
| AUT-T1 | Start once with at least two eligible targets; robot completes two scan/move/dig/collect cycles without additional dig clicks. | AUT-01–06 |
| AUT-T2 | Trace movement against density; no travel segment crosses unexcavated solid terrain. Actual density and chunk meshes show the tunnel. | AUT-04–05 |
| AUT-T3 | Hidden targets outside scan/area remain unknown. Targets are collected once. | AUT-02–03/06 |
| AUT-T4 | Pause freezes robot actions; reassignment abandons the old task. Empty or blocked areas stop with a readable reason. | AUT-08–10 |
| AUT-T5 | Edit terrain during work; robot updates its decision rather than using stale geometry. | AUT-07 |
| AUT-T6 | Same seed and tick-indexed commands reproduce decisions; changing seed/area changes work. Compare different render frame rates. | AUT-11 |
| AUT-T7 | Browser playtest records frame time and control clarity during autonomous remeshing. | AUT-10/12 |

### Planned sandbox acceptance

These are future checks; none were run by this documentation update.

| ID | Check | Covers |
| --- | --- | --- |
| HAB-T1 | Inspect a snug cavity and an exposed pit; validity follows geometry. Fill/block the cavity and verify it is invalidated. | HAB-01/03 |
| RES-T1 | Apply brief disturbance near an occupied home, then stop. Observe retreat and eventual return rather than immediate relocation. | HAB-02, RES-03 |
| RES-T2 | Apply sustained disturbance; observe a bounded search and collision-safe move to a reachable quiet home. | RES-02/04 |
| RES-T3 | Create a suitable cavity and let disturbance fade; allow occupation. An unsuitable pit stays ineligible. | RES-05 |
| RES-T4 | Provide equally good homes and competing residents; check stable choice, preference for a separate nearby home, no occupancy conflict or rapid oscillation. | RES-04/06 |
| RES-T5 | Remove all reachable shelters; residents remain visible with a bounded waiting/search response. | RES-07 |
| RES-T6 | Rebuild initial conditions with the same seed/config; compare placements. Judge behavior readability in a normal-camera playtest. | RES-01/08 |
| PLN-T1 | Edit planet A, visit B, then return to A; verify density, stocks, residents and robot state survive without duplicated rewards. | PLN-01/03/04 |
| PLN-T2 | Compare configurations: playable size and resource abundance can differ independently. | PLN-02 |
| SYS-T1 | Change terrain while overview is open; its simplified shape updates. Click it and inspect the same world. | SYS-01–04 |
| SYS-T2 | `cameraPose(0)` equals the orbit pose for any azimuth/polar; `cameraPose(1)` targets the layout center; distance and target are monotonic between. | SYS-05/06 |
| SYS-T3 | `systemLayout` puts the active planet at the origin and offsets the rest; `parentSeed` and `systemArcs` return one arc per known child with a known parent. | SYS-06/10 |
| SYS-T4 | `planetMarks` respects the caps, is deterministic and empty for a state with none. | SYS-09 |
| SYS-T5 | `holdProgress` is clamped 0..1 and linear. | SYS-11 |
| SYS-T6 | Browser: start a Miner, pull back, return; its progress continued and nothing reset. Broadcast while pulled back; the pulse runs along the outgoing arcs. | SYS-07/10 |
| SYS-T7 | Browser: hold to travel, release early (no change), hold fully (one `travelTo`, funds unchanged, old planet paused). No dialog appears. Repeat with reduced motion. | SYS-11/12 |
| OPS-T1 | Use compact financial feedback; a tester explains any shortage/critical warning and the available action. | OPS-01–03 |

### Deferred legacy acceptance



Mapped to the historical narrative criteria retained in `design.md` §18, not the active sandbox criteria.

| ID | Check | Covers |
| --- | --- | --- |
| ACC-01 | A new tester, with no instructions beyond the first prompts, switches orbit ↔ surface within 2 minutes. | criterion 1 |
| ACC-02 | Tester digs, fills, and flattens with the one tool, unprompted, within 5 minutes. | criteria 2, 4 |
| ACC-03 | Tester opens the backpack and switches tools. | criterion 3 |
| ACC-04 | Tester finds a buried signal with the scanner. | criterion 5 |
| ACC-05 | Tester builds a ramp back out, or asks for Emergency Extraction, when trapped. | criterion 6 |
| ACC-06 | Two runs with different module pairs produce clearly different planet silhouettes. | criterion 10 |
| ACC-07 | After the audit, the tester can say why the classification fits. | criterion 11 |
| ACC-08 | A run with one broadcast shows a reward and later the "We heard you" ending. | criteria 12, 13 |
| CLS-T | For each MVP archetype there is a saved test planet that classifies as expected (DBG-07). Run on every change to `classifications.json` or shape analysis. | CLS-07 |
| PERF-T | Dig 50 times in a row in a loaded planet; frame time never exceeds the TECH-06 budget. | TECH-06 |
| DET-T | Same seed and scripted inputs give the same classification twice. | TECH-07 |

---

## 10. Reuse from the guidebook

The Week 3 and Week 4 lessons already contain much of the engine. Copy first, then adapt; do not link the two apps.

| Need | Start from |
| --- | --- |
| Density field and CSG | `worldbuilding-guidebook/src/scene/demos/voxels/voxelMath.js` |
| Marching Cubes | `…/voxels/marchingCubes.js` |
| Chunking with borders, dirty-chunk remesh | `…/voxels/chunks.js` |
| Level of detail and seam snapping | `…/voxels/lodChunks.js` |
| Greedy meshing (probably not needed for smooth terrain) | `…/voxels/greedyMeshing.js` |
| Noise stack (Perlin, Worley, octaves) | `worldbuilding-guidebook/src/scene/demos/proceduralMaps/noiseMath.js` |

Known lesson learned to keep: without a two-sample border a chunk cannot read the corners of its last row of cells and 3–26% of triangles go missing. TERR-03 encodes this.

---

**M0 validation (D-012):** The seeded, rotating preview uses the copied modules and two-sample chunk borders. TECH-05 has base configuration, shared build assembly and emulator-verified Firebase rewrites (D-013); live deployment is pending. TECH-07 covers initial planet geometry only. DBG-02 shows fps, seed and allocated chunk count only. Terrain edits, interior generation and later debug values remain pending. The noise module also requires the copied `proceduralMaps/functionOverrides.js` helper.

## 11. Open technical questions

Details and history in [`decisions.md`](decisions.md#open-questions).

Current: cave detection/path strategy, resident body and tuning; account scope; inactive-world ticking/billing; reload saves; overview refresh budget; progress descriptors; D-038 antenna separation. These must not be inferred as settled implementation details.

- **OQ-07** How to compute "no walkable path" (NAV-04) cheaply after arbitrary edits.
- **OQ-08** Web Workers for meshing: needed for TECH-06, or is time-slicing on the main thread enough?
- **OQ-09** Collision: mesh collider from chunk meshes, or sample the density field directly for the player capsule?
- **OQ-10** Resolution of the density grid versus chunk size that meets TECH-06.

---

## Change log

- **2026-10-21 / D-049:** Recorded the system-view camera pull-back (SYS-05–14, SYS-T2–T7). Not implemented.
- **2026-10-20 / D-034–038:** Reconciled current implementation and state schema; added planned habitat, resident, persistent-planet, overview and compact-feedback requirements and acceptance. No runtime implementation or tests were changed.


| Date | Version | Change |
| --- | --- | --- |
| 2026-09-29 | v0.1 | First spec drafted from design v0.5-en. |
| 2026-09-30 | v0.1 / M0 | D-003 accepted; D-012 records setup scope, partial statuses, current noise source path, and the TERR-02 negative-inside formula correction. |
| 2026-09-30 | v0.1 / Hosting | D-013: independent builds combined under deployment/, Firebase game routes verified in the Hosting emulator. |
| 2026-09-30 | v0.1 / M1 rules | D-014 fixes TOOL-02/03's density direction; D-015 defines persistent `F` mode cycling and temporary click modifiers. |
| 2026-09-30 | v0.1 / M1 implementation | D-016: stationary planet, right-drag orbit, left-click terrain editing, local remesh, scaled brush and visible Planet Remaining. M1 has no canister cost yet. |
| 2026-09-30 | v0.1 / Flatten | D-017 replaces the spherical Flatten region and preview with a horizontal plane and circular footprint. |
| 2026-09-30 | v0.1 / Detector | D-018 adds local Detector wireframe and world-space distance-faded resource reveal, separate from Scanner. |
| 2026-09-30 | v0.1 / Flatten planes | D-019 adds the radial default and retains global horizontal Flatten as a selectable orientation. |
| 2026-09-30 | v0.1 / LOD | D-021 adds distance-based chunk detail and seam snapping; browser and target-device checks remain. |

| 2026-10-14 | v0.2 | D-022: AUT requirements, planned robot state, acceptance, scope override and superseded fixed budget; no code change. |
| 2026-10-14 | v0.3 | D-023: R1 Miner implemented. AUT-01–11 done; AUT-12 wip until measured on the target laptop. AUT-T1–6 are automated in `tests/miner.test.ts`; AUT-T7 needs a browser playtest. |
| 2026-10-14 | v0.4 | D-025: Gardener (AUT-14–16) implemented; tests in `tests/gardener.test.ts`. |
| 2026-10-14 | v0.5 | D-026: Builder (AUT-17) and shared soil stock implemented; tests in `tests/builder.test.ts`. |

### Autopilot (D-043)

Implemented 2026-10-21. Checks run in `tests/autopilot.test.ts`.

| ID | Check |
| --- | --- |
| AUTO-01 | Hand-over deploys the chosen crew, switches to Auto and starts each robot in its own sector. |
| AUTO-02 | An empty crew cannot start; counts clamp to 4 per kind. |
| AUTO-03 | The sector rings cover the whole planet for each kind. |
| AUTO-04 | Unattended, minerals are mined and sold and ground is shaped. |
| AUTO-05 | A stopped robot moves to the next sector; a Miner with no mineral left stays put. |
| AUTO-06 | Gardeners and Builders hold below ₡−20, resume above ₡−10; Miners keep working; comms reports it. |
| AUTO-07 | Signals start with the first antenna, are 20 s apart, can be switched off, and stop once every planet answered. |
| AUTO-08/09 | Cancel returns one paused robot per kind with default areas, even when a kind had none; counts are remembered. |
| AUTO-10 | Index 0 spawns exactly as before. |
| AUTO-11 | Builders take distinct sectors from one queue, share one level, stay within the job budget and retire. |
