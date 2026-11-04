# Tiny Dent — Multi-Planet Ecology, Migration & Emergent Roads

**Status:** Accepted as the plan by D-065 (2026-11-04); built in order, see [roadmap.md](roadmap.md) E1–E6 for what exists. Names `Rubber Duck` and `Drillhead` are roles filled by Cairn and Cyclops Sentinel (D-065)  
**Goal:** Connect planet materials, resource logistics, creature migration, habitat choice, colonies, and agent-made roads into one readable procedural simulation. Preserve the existing editable voxel planets, robots, residents, signal discovery, shared credits, and system overview.

## 1. Core game loop

Discover a planet → scan and extract its *native material* → stockpile or trade materials → establish interplanetary train routes → transport materials and optional resident passengers → residents evaluate local habitat and settle or return → same-species clustering creates colonies → colonies, mines and spaceports generate movement demand → repeated journeys create **desire paths** → Builder upgrades busy paths to roads → terrain and roads alter travel costs, ecology and resident decisions.

**Design principle:** Players shape environments and logistics; they cannot command a creature to be happy or force permanent settlement. A planet can host several species and locally imported materials. No universal best outcome.

## 2. Planet materials, species and rules

Retain the existing seeded base surface types (`rock`, `metal`, `plastic`, `fur`, `jelly`, `ice`), add `water` as a *separate later vertical slice*. Planet **base material** controls underlying terrain physics; **local material patches** from imported fill control localized looks and habitat suitability. Distinguish deposited construction material from collectible resource deposits and water volume.

| Base planet | Material obtained from excavation | Example native creature | Habitat preference / special rule |
| --- | --- | --- | --- |
| Rock | stone, soil, mineral ore | Pebble / Moss Cap | Stable rock/cavities; Moss Cap likes soil, moisture, vegetation and quiet |
| Metal | scrap metal, alloy ore | Drillhead (drill-nosed resident) | Metal-rich stable substrate and tunnels; tolerates mechanical sounds; dislikes unstable soft ground |
| Plastic | plastic chips, polymer blocks | Rubber Duck | Smooth warm plastic, social groups; can float, but needs a safe resting surface; plastic cannot directly grow plants |
| Fur | fibers | Fluffball / Moss Cap | Soft, quiet insulated areas; reacts to shearing |
| Jelly | gel | Jelly Blob | Moist, elastic surfaces; can rebound with ground |
| Ice | ice, crystals | Crystal Crown | Cold stable icy cavities; affected by fractures/heat |
| Water **(later)** | water, dissolved minerals/sediment | aquatic swimmer | Moves through continuous 3D water; needs sufficient water depth; land plantings/antennas require imported structural material + soil and a stable platform |

These are proposed roles: preserve existing resident types and map/extend them instead of deleting their identity or existing behavior. For a first full playable slice, use **Plastic + Metal**, **Rubber Duck + Drillhead**; expand materials using data-driven profiles. Define concrete material units, yield, storage, and construction costs. Extraction must follow conservation: no free material from terrain edits, and Builder fill must consume physical stock. Distinguish *saleable ore* from *construction material*; current automatic mineral selling must remain compatible behind a migration/feature flag until new inventory behavior is ready.

## 3. Creatures, passports, migration

Each individual has a stable globally unique `creatureId`, `speciesId`, `originPlanetId`, current location/planet, biological/environmental preferences with minor seeded individual variation, `passport` travel/settlement history, current home/colony, `lifeSupport`/survival condition, `comfort`, `belonging`, and state: `native | traveling | exploring | settling | established | homesick | returning`. IDs must survive planet transfers; never duplicate a resident on two planets. A passport is a UI view over the state/history, not a separate simulation truth.

Decision loop: survival requirements are hard constraints (e.g. aquatic species need water); score habitat using local material, temperature/moisture, terrain stability, disturbances, and nearby same-species neighbors. Use bounded hysteresis, exploration duration and cooldowns to avoid constant oscillation. On arrival find candidate sites; if no suitable habitat after a trial period, resident requests materials or books a return train. Player chooses to supply habitat-making resources or let them leave. Creatures autonomously choose whether to settle after conditions improve. Support mixed-species planets and local settlement clusters.

## 4. Interplanetary rail graph & logistics

Use `systemPlanets` as planet nodes; **discovery arcs** (`systemArcs`) are not automatically transport routes. Add explicit buildable/operational **space-train edges** with route ID, endpoints, cost, capacity, travel ticks, availability and status. Routes connect `Spaceport` nodes; first implementation can animate a train on the current `System Overview`, with deterministic time-stepped shipments rather than orbital physics. Transport both **cargo** and **passengers**; reserve stock at departure, deliver once at arrival, account for energy/credits, support cancel/failure/return without duplication. Keep per-planet physical inventories and **shared Credits**.

Current inactive planets are frozen (`PlanetRegistry`): implement train movement in a small run-level/global logistics clock; do not silently advance all resident/robot world simulations. Off-world passengers are stored in in-transit manifests, not in either planet population. Explicitly choose and test handling of returns and skipped/unvisited destinations.

## 5. Local graph and emergent roads

Three separate but linked graphs:
1. **Interplanetary transport graph:** planets/spaceports, rail connections, shipments, passengers.
2. **Local navigation + service graph:** spaceport, mine/resource sites, material depots, colonies, habitat sites, construction sites; traversable nodes/edges with surface type, distance, slope, hazard, disturbance, capacity and travel cost.
3. **Optional social affinity data:** neighbor attraction and colony clustering; do **not** build a global all-pairs social graph for every creature.

Crucial mechanic: **movement creates roads**. Pathfinding (A* or Dijkstra on a sampled spherical surface/navigation graph) initially produces travel routes, not built roads. Agents moving between goals deposit heat/traffic on local navigable segments. Traffic decays slowly; repeated use creates faint **desire paths**. At thresholds, Builder may upgrade paths into persistent roads, **consuming local/transported materials**. Roads lower travel cost and may alter nearby habitats; choose material-specific behavior (ice can break/melt, jelly shifts, etc.). Terrain edits may invalidate edges and trigger bounded rerouting. Swimming species use water 3D navigation (later), not terrestrial roads. Hovering/underground agents have their own traversability and should not be forced onto ground roads.

Keep visible path separate from underlying Graph data. Spherical-world routes must follow surface/terrain clearance, avoid impassable cliffs and resident-sensitive areas when cost rules call for it. Ensure stable deterministic generation and performance-bounded updates; no full graph rebuild every frame.

## 6. Building with imported materials

Builder selects a construction job at a targeted local patch, reserves quantity of material from the planet inventory, and creates a locally tagged material patch or platform, consuming resources only upon verified construction (or according to an explicitly tested partial-progress rule). Imported plastic on Metal makes a warm/smooth Duck habitat; imported soil over a structurally stable rock/metal platform allows vegetation where the effective local rules permit. Imported soil **alone** cannot create a stable island in open water. Avoid making the full voxel field multi-material initially: use a persistent localized material overlay with geometry/physics integration as a later step. Maintain base-planet material identity and underlying physics.

## 7. UX / debug / documentation

Keep the existing 3D full system overview and on-planet viewer. Add optional layers: `Rail Routes`, `Cargo Flow`, `Passports`, `Habitat Suitability`, `Colonies`, `Navigation Nodes`, `Traffic Heat`, `Desire Paths`, `Built Roads`, `Blocked Edges`. On selected resident, show origin, preference, current comfort/belonging, reason for staying/leaving, travel history. On selected road, show why it exists (trip count, traffic/threshold, cost) and why rerouting occurred. Prefer controls that make causality understandable rather than a huge dashboard. Produce one concise architecture/algorithm breakdown and demonstrable debug examples for the final review.

## 8. Suggested code integration (inspect before changing)

Existing anchors: `tiny-dent/src/content/surfaces.ts`, `content/residents.ts`, `world/resourceClusters.ts`, `state/runState.ts`, `state/planets.ts`, `systems/system.ts`, `systems/systemView.ts`, `systems/signal.ts`, `systems/economy.ts`, `systems/miner.ts`, `systems/builder.ts`, `systems/residents.ts`, `systems/workSites.ts`, `systems/simulation.ts`.

Suggested modules (adapt to actual architecture): `src/graph/graphCore.ts`, `interplanetaryGraph.ts`, `surfaceGraph.ts`; `src/systems/logistics.ts`, `migration.ts`, `colonies.ts`, `roadTraffic.ts`, `roadConstruction.ts`; `src/render/graphOverlay.ts`; typed material/inventory definitions. Persist run-global graph and train state at registry/run level and local navigation/patch/colony state per planet. Separate pure simulation logic from Three.js/React rendering. Preserve currently shipped behavior behind explicit flags while migrating data.

## 9. Implementation phases & definition of done

**Phase 0 — Baseline & contracts.** Inspect actual types, README, current tests, save/swap behavior; record design decisions and regression tests. No new visuals required.

**Phase 1 — Native material inventory.** Mine Metal → metal, Plastic → plastic; store stock by planet; retain stable resources, mineral sales and backward compatibility; tests for exact stock and repeated deliveries.

**Phase 2 — Interplanetary transport.** Operational route, one train, cargo manifest, shared funding and delivery across planet swaps. System overview shows route and train; tests for no duplication/lost cargo, frozen planets, invalid target and deterministic travel.

**Phase 3 — Two-species passport migration.** Plastic ducks and Metal drillheads travel; individual history, local habitat evaluation, stay/homesick/return and two species on one planet; tests for unique IDs, off-world transit, return and hysteresis.

**Phase 4 — Builder habitat patches.** Import plastic to Metal; Builder uses physical stock to lay a persistent plastic patch; ducks settle on it; test terrain updates, stock conservation, revisit persistence, surface evaluation and legacy planet behavior.

**Phase 5 — Movement → desire path → road.** Settlements/spaceports/mines produce local trips; traffic heat generates visible trails; Builder upgrades one route with stock; path cost lowers, terrain damage reroutes; togglable graph/traffic debug. Tests for repeatability, traffic decay, road invalidation and route correctness.

**Phase 6 — Expand ecology.** Fur, Jelly, Ice and Rock species/materials; Water is a separately scoped vertical slice requiring real volumetric swimming, aquatic habitat and imported stable platform rules. Do not fake all-water as painted solid sphere.

**Playable acceptance scenario (target after Phase 5):** Mine plastic on Plastic → ship plastic and one Rubber Duck to Metal by train → Duck initially dislikes bare Metal and requests an appropriate habitat → Builder consumes delivered plastic and constructs a localized patch → Duck chooses to stay and joins a small colony with another Duck → deliveries and colony travel generate a desire path from spaceport to colony → Builder upgrades it to a road → edit terrain across road and visibly reroute or mark blocked → passport/history, material stock and colonies remain correct after planet switching.

## 10. Non-negotiables / scope control

- Reuse current seeded generation, voxel terrain edits, terrain LOD, robotics, residents, economy, broadcast, registry and System Overview; no rewrite.
- Start with vertical slices; do not implement seven ecosystems, advanced sociology, orbital physics and a new voxel renderer simultaneously.
- Stable seeds and creature IDs; deterministic simulation under fixed input; persistent material inventory, local patches, roads, colony membership, passports and train manifests across planet switches.
- Exactly-once cargo/passenger transfers; no material creation/deletion by accounting bugs; explicit refunds/rollback for failures.
- Don’t silently redefine existing planet material presets or native species without documenting it.
- Preserve performance via local invalidation, bounded pathfinding and capped visual/debug nodes. Keep tests and build passing every phase.