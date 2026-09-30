# Terraforming Contractor #1380 — Spec

| | |
| --- | --- |
| **Status** | Draft v0.1, derived from design v0.5-en |
| **Last updated** | 2026-09-30 |
| **Answers the question** | *What exactly must the game do, and how do we know it does?* |
| **Sibling files** | Why: [`design.md`](design.md) · Values: [`tuning.md`](tuning.md) · Text: [`content.md`](content.md) · Order of work: [`roadmap.md`](roadmap.md) · Why we chose: [`decisions.md`](decisions.md) |

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

The single source of truth for one run. (Note: the earlier design listed `habitability`; it is now `developmentReadiness`.)

```ts
type ToolId = 'terrain' | 'detector' | 'scanner' | 'deepScanner' | 'wideDrill' | 'bioSeeder' | 'stabilizer';
type ModuleId = 'deepScanner' | 'wideDrill' | 'bioSeeder' | 'stabilizer';
type TerrainMode = 'dig' | 'add' | 'flatten';
type FlattenOrientation = 'radial' | 'horizontal';
type ResourceCategory = 'mineral' | 'life' | 'memory';
interface ResourceCluster {
  id: string;
  category: ResourceCategory;
  position: [number, number, number]; // centered world coordinates
  radius: number;                      // M1.5 marker proxy, not final deposit geometry
}

interface RunState {
  seed: string;
  mode: 'orbital' | 'surface' | 'audit' | 'ending';

  budget: { workCyclesRemaining: number; energy: number };          // OQ-01: one may be removed

  metrics: {                                                          // public, 0..100 unless noted
    capital: number;                                                  // money, unbounded
    biosphere: number;
    developmentReadiness: number;
    stability: number;
    historicalSignificance: number;
  };
  planetRemaining: number;                                            // 0..1 of original solid mass

  hidden: {
    planetaryMemory: number;
    fragmentation: number;                                            // connected components / size spread
    morphology: MorphologyFeatures;                                   // see section 5.2
    cosmicExposure: number;                                           // mirrors signal.exposureScore
  };

  signal: { hasBroadcast: boolean; broadcastCount: number; exposureScore: number };  // hasBroadcast never resets

  loadout: {
    modules: [ModuleId, ModuleId];                                    // chosen at run start, fixed
    activeTool: ToolId;
    terrainMode: TerrainMode;
    flattenOrientation: FlattenOrientation;                            // radial by default (D-019)
    toolSlots: ToolId[];                                              // what the backpack can equip
  };

  canister: { amount: number; capacity: number };                     // rock and soil share one unit
  minerals: Record<string, number>;                                   // samples, sold via Extraction Terminal
  discoveries: { artifactIds: string[]; lifeClusterIds: string[] };
  resourceClusters: ResourceCluster[];                                // generated from seed
  detector: { center: [number, number, number] | null; radius: number }; // local scan, TUNE

  flags: {
    archive1379Found: boolean;
    echoArrayRepaired: boolean;
    emergencyExtractionUsed: boolean;
  };
}
```

---

## 4. Requirements

### 4.1 World and terrain (TERR)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| TERR-01 | The planet is a 3D scalar density field. Solid is on one side of a threshold, air on the other. The sign rule is the same everywhere (guidebook Lesson 03: negative inside). | MVP | done |
| TERR-02 | Initial density = sphere (distance to center - radius; negative inside) plus layered noise for surface relief and interior variation. Grid resolution `TUNE`. | MVP | done |
| TERR-03 | The volume is split into chunks. Each chunk meshes with Marching Cubes. Chunks use a two-sample border so neighbouring chunks produce the same surface as a single volume (guidebook finding). | MVP | done |
| TERR-04 | An edit only marks the chunks it touches as dirty; only dirty chunks are remeshed, spread over frames within the frame budget. | MVP | wip |
| TERR-05 | Edits update the render mesh and the collision mesh together for the affected chunks. | MVP | todo |
| TERR-06 | Chunks far from the camera use lower detail; seams between detail levels are snapped so no visible gaps appear. | Stretch | todo |
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

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| NAV-01 | The first-person controller collides with the voxel mesh and can climb slopes up to a limit. `TUNE` | MVP | todo |
| NAV-02 | Vertical drops or steep shafts can leave the player unable to get back up. This is intended. | MVP | todo |
| NAV-03 | **Emergency Extraction:** returns the player to the base at a high cost (Capital, Historical Significance, or work cycles). Cost and usage limit `TUNE` (OQ-02). Always available when the player cannot leave by their own means. | MVP | todo |
| NAV-04 | Detecting "trapped" is automatic (no walkable path to the surface above a slope limit within a radius) and offers Emergency Extraction. | MVP | todo |
| NAV-05 | First person is limited to one connected region around Silent Shore plus its caves. Spherical gravity for the full planet is not required. | MVP | todo |
| NAV-06 | Full walking around the whole sphere with aligned gravity. | Stretch | todo |

### 4.7 Views (VIEW)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| VIEW-01 | **Orbital Planning Mode:** camera orbits the planet center (orbit controls). Shows silhouette, remaining mass, voids, base, and ecology zones. | MVP | wip |
| VIEW-02 | **Surface Exploration Mode:** first-person controller with crosshair. | MVP | todo |
| VIEW-03 | `Tab` toggles between them. The transition keeps the selected surface position and orientation so it feels spatially continuous. | MVP | todo |
| VIEW-04 | In orbital mode the player can select a landing point or mark a survey area. | MVP | todo |
| VIEW-05 | Both views share the same terrain, tools, and state; there is no second copy of the world. | MVP | todo |
| VIEW-06 | The contact ending can begin in first person and pull out to orbit. | Stretch | todo |

### 4.8 Metrics (MET)

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

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| BUD-01 | The run has a finite budget: either 30 work cycles **or** 1,000 energy (OQ-01). Every tool costs some of it. | MVP | ? |
| BUD-02 | The run ends when the budget reaches 0 or when the player submits the planet for audit. | MVP | todo |
| BUD-03 | The player is warned before the last portion of the budget is spent. | MVP | todo |

### 4.10 Signals and exposure (SIG)

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
| VIS-01 | Palette follows `design.md` §14 (about 80/15/5 gray / material / accent). Named color tokens live in `config/` and CSS variables. | MVP | wip |
| VIS-02 | Terrain uses triplanar or world-space texturing. No UV stretch after remeshing. | MVP | wip |
| VIS-03 | Mineral, Life, and Memory use three distinct colors (yellow, green, pink). Each buried target tints only the terrain surface around it, faded by world-space distance to the target: `(1 - smoothstep(0, glowRadius, distance(worldPosition, targetPosition)))^2`. Deep targets do not reach the surface. Other material blending uses world-space noise, vertex color, or density masks. `TUNE` glow radius. | MVP | wip |
| VIS-04 | Point / line / surface layers exist and are drawn by separate passes. | MVP | todo |
| VIS-05 | **Wireframe states** (solid, structure exposed, nearly hollow, critical wreck) are chosen per chunk from `planetRemaining`, local shell thickness, and stability (see 5.4). Local thickness has priority over the global percentage. | MVP | todo |
| VIS-06 | Structural lines use a simplified edge set, not every triangle. Line color is graphite/gray-brown (never default green). No Z-fighting or heavy flicker. | MVP | todo |
| VIS-07 | Texture grain is fixed in world/object space, never floating with the camera. | MVP | todo |
| VIS-08 | Rough texture is applied to the world and archive layers only; core UI text stays clean and high contrast. | MVP | todo |
| VIS-09 | The contact ending may switch briefly to a dark cosmic background; the rest of the game does not. | MVP | todo |
| VIS-10 | Unknown observer is one of the abstract forms in `design.md` §14 (not a classic ship). | MVP | todo |

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

## 5. Algorithms and rules

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

Mapped to the success criteria in `design.md` §18.

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

- **OQ-07** How to compute "no walkable path" (NAV-04) cheaply after arbitrary edits.
- **OQ-08** Web Workers for meshing: needed for TECH-06, or is time-slicing on the main thread enough?
- **OQ-09** Collision: mesh collider from chunk meshes, or sample the density field directly for the player capsule?
- **OQ-10** Resolution of the density grid versus chunk size that meets TECH-06.

---

## Change log

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
