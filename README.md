# Tiny Dent

**A procedural sandbox where you reshape small planets, by hand or through autonomous robots, and watch the residents decide whether they like what you did.**

Final project for DESIGN 4197/6197, Procedural World Building (Cornell, Fall 2026).

> “We’re here to put a dent in the universe.” —— Steve Jobs

![Autopilot mode: the robot crew works a seeded planet](docs/media/week8_autopilot_mode.jpg)

**Play and read:** the project site is served at `/`, the game at `/game/`, and the course [guidebook](worldbuilding-guidebook/) at `/guidebook/`. To run it locally, see [Run it locally](#run-it-locally).

## The idea

Every planet starts from a seed: a shape, a mineral budget, a species of residents. You place robots, size their work areas, and let them carve, plant, and build. The planet changes; the residents react. They shelter underground, peek out, tremble near robot work, and move toward quieter ground. They “vote with their feet,” so the consequences of your work are visible without the game declaring one ideal outcome.

```text
planet starting conditions → player choices and robot work → environmental change
        → resident responses → different planetary outcomes
```

You may chase resources, grow flourishing habitats, or pursue strange planetary forms. Planets that answer your broadcasts become new, persistent sites to visit, so each run grows into a small system of different worlds.

## References

The look and the premise come from two places: a game that proved planets can be soft, editable toys, and a book that proved a planet can be small enough to care for.

### Astroneer

*Astroneer* (System Era Softworks, 2016) is the closest relative. Its planets are volumetric: a terrain tool digs, raises, and flattens a density field, and the chunked surface re-meshes under your hands. Its colour language (saturated, faceted, friendly) shows that an editable planet can still read as a toy. We borrow the premise of small, distinct, fully editable worlds, and the idea of travelling between them.

<p>
  <img src="tiny-dent/docs/reference/Astroneer_1.png" alt="Astroneer: a base on a faceted, colourful planet" width="49%">
  <img src="tiny-dent/docs/reference/Astroneer_2.jpg" alt="Astroneer: a planet seen from orbit with a base and launch trails" width="49%">
</p>

*Images: Astroneer promotional art, © System Era Softworks. Used for reference only.*

Where we diverge: in Astroneer the player does the digging. In #1380 the player’s main verb is *delegating*. Robots follow visible rules, and the interesting part is the planet’s response.

### Slipways

*Slipways* (Beau Jarrett, Kitfox Games) is the reference for the **planet system**, the System Scale layers above. Its map is a graph: planets are nodes, trade routes are edges, and each planet shows what it produces and what it needs. You grow a network by deciding which worlds to connect, and distance, supply and demand decide whether a link pays off. We borrow this reading of a system as a legible web of worlds, and the idea that building a route is itself the main design act.

<p>
  <img src="tiny-dent/docs/reference/Slipways.jpg" alt="Slipways: a star map of planets joined by glowing trade routes, each labelled with the goods it produces and consumes" width="80%">
</p>

*Image: Slipways screenshot, © Beau Jarrett / Kitfox Games. Used for reference only.*

Where we diverge: Slipways is a turn-based map of abstract planets. In Tiny Dent each node is a planet you can walk on and reshape, and a route carries real cargo and residents between worlds you have edited yourself. The planet network (layer 8), route pathfinding (layer 9) and shared economy (layer 10) are built on this graph reading.

### *The Little Prince*

Saint-Exupéry’s prince lives on a planet small enough to tend every day: weeding baobabs, sweeping volcanoes, watching one flower. That scale is the emotional target. A planet should be small enough that one change is visible from space and that its inhabitants can be known individually.

<p>
  <img src="tiny-dent/docs/reference/the little prince.jpeg" alt="The Little Prince standing on his small cratered planet" width="49%">
  <img src="tiny-dent/docs/reference/planet.jpg" alt="A small, cratered, rocky planet" width="49%">
</p>

*Left: The Little Prince, Starcatcher edition, property of Succession de Antoine de Saint-Exupéry (POMASE), licensed through LPP612 and Medialink, 2024. Right: stock image of a cratered rock planet. Both used for reference only.*

The planet in the game is a pale, cratered body in the same spirit: a single rock you can hold in your head.

### Rock creatures and stones

The residents are small rock creatures, and the planet’s surface language is flat-shaded stone. A character sheet of mossy, crystalline, and sleepy rock beings set the tone for their personalities and silhouettes. A sheet of flat-shaded stones set the faceted look of the terrain and boulders.

<p>
  <img src="tiny-dent/docs/reference/character.jpg" alt="A sheet of small rock creatures with moss, crystals, and seedlings" width="49%">
  <img src="tiny-dent/docs/reference/stone.jpg" alt="A sheet of flat-shaded grey stones" width="49%">
</p>

*Left: rock-creature character sheet signed “KEDO.” Right: stock illustration of stones. Both used for reference only.*

### The Quiet Drifter

The player's traveller started as an original turnaround sheet: an ivory spacesuit, a domed helmet with a dark face inset, ochre cuffs, and a small rose brooch, four heads tall. The sheet also fixes the part breakdown, joint pivots, local axes and material palette, so the character could be built procedurally from primitives and rigged at those pivots.

<p>
  <img src="tiny-dent/docs/reference/drifter-turnaround.png" alt="The Quiet Drifter turnaround sheet: front, side, back and three-quarter views, exploded parts, rose brooch detail, joint pivots and material palette" width="100%">
</p>

*The Quiet Drifter turnaround sheet, the design source for the in-game character.*

These references fed the component board, the resident design board and the Drifter rig shown below.

## How it plays

- **Auto and Autopilot.** Place a Miner, Gardener, Builder, or Rigger, size its spherical work area, and it works by itself. Autopilot hands the whole planet to the crew, which sweeps the surface sector by sector.
- **Manual.** Dig, Add Terrain, Flatten, and a Detector that scans for Mineral, Life, and Memory signals. Manual mode pauses the simulation, so robots never dig unseen.
- **Economy.** Minerals sell on delivery, running robots draw billed electricity, manual edits cost credits, and a run ends in bankruptcy at −₡50.
- **Signal planets.** Once antennas stand, the player can broadcast. After the third broadcast, answering planets appear. Each is a persistent site with its own seed and shape, and the run’s funds are shared among them.
- **System overview.** A 3D view shows the home site and the answering planets together; clicking a world focuses it.
- **Residents.** One species per planet, nine procedurally generated body directions compared on a design board.

![The system overview shows the home planet and the planets that answered](docs/media/week8_system.jpg)

## How it is made

The planet is a **density field** with one sign rule (negative inside). A seeded sphere-plus-noise function builds it, edits add or subtract from it, and **chunked Marching Cubes** turns it into a mesh. Only chunks an edit touches are rebuilt, and a three-level distance-based LOD with seam snapping keeps far terrain cheap while the full-resolution field stays the source of truth.

Everything else is rules over that field:

| Part | What it does | Technique |
| --- | --- | --- |
| Planet | Seeded shape, mineral deposits, per-planet variation | density field, noise, seeded RNG |
| Terrain editing | Dig, add, flatten; affected chunks re-mesh | CSG on a density field, dirty-chunk remesh |
| Miner | Finds minerals, flies a hover shell, carves tunnels | path following, density subtraction |
| Gardener | Plants on flat ground, raises antennas on high ground, plants spread | distributions, slope filtering |
| Builder | Cuts high ground and fills low ground with mined soil | cut and fill |
| Residents | Shelter, peek, tremble, relocate | disturbance fields, walkable routes |
| Look | Voxel-orb robots, contour-line terrain, point-cloud atmosphere, one palette file | shaders, particles |

The techniques come from the course lessons in the [guidebook](worldbuilding-guidebook/): noise and erosion, voxels, shaders, distributions, paths, particles, and branching systems. The game does not share code with the guidebook; it ports the ideas.

## System architecture

The game has **7 Planet Scale layers** and **3 System Scale layers**. These describe responsibilities, not the order of each simulation tick. Layers 1-9 have implementations, with simplified models for materials, social relationships, ground traffic and local logistics. Layer 10 provides economic accounting; a full global economy remains planned. The homepage's **System atlas** visualizes both scales with expandable implementation details.

### Planet Scale - 7 layers

| Layer | Current implementation | Technique | Source |
| --- | --- | --- | --- |
| 1. Terrain & Geometry | Seeded noise generates a density field. Digging, filling and flattening rebuild only affected chunks; distance-based LOD controls mesh detail. | Noise · Density Field · Marching Cubes | [world/planet.ts](tiny-dent/src/world/planet.ts) · [world/voxels/](tiny-dent/src/world/voxels/) |
| 2. Materials & Resources | Seeds determine native materials and deposits. Each planet has its own inventory, and imported materials form local habitat patches. This is a native surface plus patches, not a full volumetric material field. | Seeded Distribution · Surface Patches | [content/materials.ts](tiny-dent/src/content/materials.ts) · [systems/inventory.ts](tiny-dent/src/systems/inventory.ts) · [systems/patches.ts](tiny-dent/src/systems/patches.ts) |
| 3. Vegetation & Infrastructure | Spatial sampling and slope filters choose planting sites; growth rules drive spreading. Antennas support discovery and spaceports serve as route endpoints. | Spatial Sampling · Growth Rules | [systems/placer.ts](tiny-dent/src/systems/placer.ts) · [systems/structures.ts](tiny-dent/src/systems/structures.ts) · [systems/logistics.ts](tiny-dent/src/systems/logistics.ts) |
| 4. Residents & Habitat | Species preferences combine material, water, disturbance, vegetation and nearby kin into habitat suitability. Comfort, belonging and state machines drive resident responses. | Agent-Based Modeling · Habitat Suitability | [systems/residents.ts](tiny-dent/src/systems/residents.ts) · [systems/habitat.ts](tiny-dent/src/systems/habitat.ts) · [content/species.ts](tiny-dent/src/content/species.ts) |
| 5. Colonies & Social Graph | Nearby homes of the same species form connected components, yielding colony members and centres. Persistent interpersonal relationships and complex social behaviour are not implemented. | Neighborhood Search · Connected Components | [migration.ts](tiny-dent/src/systems/migration.ts) |
| 6. Movement & Roads | Budgeted A* searches plan surface routes. Traffic heat accumulates and decays; Builders spend materials on roads. Heat comes from simulated service trips, not every resident footstep; flying robots contribute no heat. | A* · Traffic Heatmap · Desire Paths | [graph/surfaceGraph.ts](tiny-dent/src/graph/surfaceGraph.ts) · [systems/traffic.ts](tiny-dent/src/systems/traffic.ts) |
| 7. Local Logistics | Excavation supplies inventory. Builders prioritize habitat patches, platforms, roads and terrain work, spending the required stock. Local inventory is shared; individual hauling trips are not simulated. | Task Allocation · Resource Accounting | [systems/builder.ts](tiny-dent/src/systems/builder.ts) · [systems/inventory.ts](tiny-dent/src/systems/inventory.ts) |

### System Scale - 3 layers

| Layer | Current implementation | Technique | Source |
| --- | --- | --- | --- |
| 8. Planet Network | Seeds determine planetary positions. Players connect spaceports on visited worlds; distance determines route construction cost and travel time. | Graph Theory · Procedural Layout | [systems/system.ts](tiny-dent/src/systems/system.ts) · [graph/graphCore.ts](tiny-dent/src/graph/graphCore.ts) |
| 9. Interplanetary Transport & Migration | Dijkstra finds the shortest route by travel time. Cargo and residents move through transit, delivery or return states. Passports preserve identity and travel history; migrants explore, settle, become homesick or return home. | Dijkstra · State Machine | [systems/logistics.ts](tiny-dent/src/systems/logistics.ts) · [systems/creatures.ts](tiny-dent/src/systems/creatures.ts) · [systems/migration.ts](tiny-dent/src/systems/migration.ts) |
| 10. Economy & Global Simulation | Shared credits, mineral sales, electricity, terrain-editing fees, ports, routes, shipping fees and interplanetary stock flows are implemented. Dynamic supply-and-demand pricing is not. Only the active planet runs local simulation; other planets retain snapshots and receive deliveries. | Stock–Flow Accounting · Rule-Based Simulation | [systems/economy.ts](tiny-dent/src/systems/economy.ts) · [systems/simulation.ts](tiny-dent/src/systems/simulation.ts) · [state/planets.ts](tiny-dent/src/state/planets.ts) |

### Cross-layer feedback

```mermaid
flowchart TD
  subgraph P["Planet Scale - each world"]
    T["1 Terrain & Geometry"] --> M["2 Materials & Resources"]
    T --> V["3 Vegetation & Infrastructure"]
    M --> H["4 Residents & Habitat"]
    V --> H
    H --> C["5 Colonies & Social Graph"]
    C --> R["6 Movement & Roads"]
    R --> L["7 Local Logistics"]
    M --> L
    L -->|Reshape terrain| T
    L -->|Build habitat patches| H
  end
  subgraph S["System Scale - between worlds"]
    N["8 Planet Network"] --> X["9 Transport & Migration"]
    X --> E["10 Economic accounting - partial"]
    E -->|Costs and funding limits| X
  end
  V -->|Spaceports| N
  M -->|Export stock| X
  X -->|Import materials| L
  X -->|Residents arrive| H
  H -->|Settle or return home| X
```

For example: a migrant dislikes the local material, requests a familiar one, and receives it from another planet. A Builder spends that stock on a habitat patch. Comfort and belonging are recalculated, affecting whether the resident settles or requests a return journey. Another feedback loop connects traffic heat to road construction, lower travel costs and subsequent route choices.

**Simulation boundary:** [simulation.ts](tiny-dent/src/systems/simulation.ts) advances fixed steps in order: autopilot, electricity, robots, surface changes, vegetation, residents, migration, traffic, water and interplanetary logistics. Only the active planet runs local simulation. Other planets retain snapshots that can receive cargo and residents. Simultaneous evolution of all planets and market-driven dynamic pricing are not implemented.

**Technology stack:** TypeScript, React 19, Three.js / React Three Fiber, Zustand and Vite. Generation and simulation live mainly in `world/`, `graph/` and `systems/`; state lives in `state/`; rendering lives in `render/` and `views/`. The homepage uses HTML / CSS and a Three.js scene sharing the game's models.

### Design decisions

The look was chosen before any robot was built. A component board compared visual options for every on-planet element over five rounds, each option a 3D model at game scale. The chosen set uses voxel-orb robots that differ by silhouette, contour-line terrain shaded by height and slope, and a point-cloud atmosphere.

![Component board: five rounds of visual options at game scale](docs/media/week6_design_decision.jpg)

The residents followed the same method: nine body directions generated procedurally, then one species per planet.

![Resident design board](docs/media/week8_resident_design.jpg)

### Drifter character and rig

The Drifter rig viewer exposes the character's joint hierarchy, animation clips, local axes and rotation curves. Select a joint to inspect it or adjust its pose.

[![Drifter character rig: joint hierarchy, character preview and rotation controls](docs/media/roledesign.webp)](tiny-dent/docs/Drifter%20Rig%20Nodes.html)

[View rig details on the project site](https://worldbuilding-guidebook.web.app/design/drifter-rig-nodes.html) or open the [standalone HTML viewer](tiny-dent/docs/Drifter%20Rig%20Nodes.html) locally. The hosted viewer is included in the next site deployment.

The full record is in the game docs:

- [Design](tiny-dent/docs/design.md): what the game is and why
- [Specification](tiny-dent/docs/spec.md) and [procedural system](tiny-dent/docs/procedural-system.md)
- [Decisions](tiny-dent/docs/decisions.md): numbered and dated
- [Roadmap](tiny-dent/docs/roadmap.md): what is built and what is not
- [Tuning](tiny-dent/docs/tuning.md) and [content](tiny-dent/docs/content.md)

## Current state

Implemented: manual terrain editing, four robot roles, Autopilot, site accounting, surface exploration, persistent signal planets, per-planet material inventories, habitat preferences, derived colonies, surface pathfinding and traffic-driven roads, Builder habitat patches, interplanetary cargo and passenger routes, and resident passports and migration states. See the ten-layer architecture above for implementation limits; the full global economy remains partial.

Not implemented, and marked as such in the [roadmap](tiny-dent/docs/roadmap.md): the end-of-run audit, planet classifications and the Silent / Heard / Erased endings (M5), cosmic ending visuals, and ending audio. Bankruptcy is the only way a run ends today.

## Development log

| Week | Game milestone |
| --- | --- |
| 6 (Sep 28) | `tiny-dent/` created: seeded sphere-plus-noise planet, chunked Marching Cubes, Dig / Add / Flatten, Detector |
| 6 | Component board decides the visual language |
| 7 (Oct 7) | Three-level distance-based terrain LOD |
| 7 | Teacher feedback (“what if the game played itself?”) turns the game toward robots; Miner, Gardener, Builder; Auto and Manual modes; economy; world map; broadcasts |
| 8 | Autopilot, Rigger, persistent signal planets, system overview, resident species |

### Week 6: the first prototype

The prototype uses a seeded sphere-plus-noise density field and extracts its surface with chunked Marching Cubes. Right-drag orbits the planet. Dig, Add Terrain, and Flatten edit the density field and rebuild affected chunks; Flatten supports both a local radial plane and a global horizontal plane. A remaining-volume estimate tracks terrain added or removed. The Detector scans a local patch and shows nearby terrain wireframe plus distance-faded Mineral, Life, and Memory signals, each with its own marker shape. Exposing a target’s centre collects it and updates the category count.

![Week 6 game prototype](docs/media/week5_game.gif)

<p>
  <img src="docs/media/week5_M0.jpg" alt="Milestone M0" width="49%">
  <img src="docs/media/week5_M1.jpg" alt="Milestone M1" width="49%">
</p>

### Week 7: robots that terraform by rules

Teacher feedback asked what would happen if the game played itself, so the game shifted from manual digging to robots that change the planet by visible rules. The player places each robot and sizes its spherical work area; the robot then works on its own.

- **Miner** scans for nearby minerals, flies along a hover shell to the entry point above each one, and carves a radial tunnel one dig step at a time.
- **Gardener** samples ground points in its area. It plants on the flattest suitable ground and raises antennas on the highest. Mature plants spread to nearby ground, and digging removes any plant or antenna whose ground is lost.
- **Builder** measures the mean ground height of its area, cuts high ground down to that level, and fills low ground using soil the Miner has dug out.

The robots, terrain, and atmosphere use the look chosen on the component board. All colours come from one palette file, and a test fails if a model uses a colour outside it. Around the crew, the run gained a site economy and surface exploration with a 2D world map. Robot stop reasons and low-funds warnings arrive in a communicator with a button that leads to the fix.

![Week 7 robot crew at work](docs/media/week7_world.gif)

Key files: [planet generation](tiny-dent/src/world/planet.ts), [LOD](tiny-dent/src/world/lodChunks.js), [Miner](tiny-dent/src/systems/miner.ts), [Gardener](tiny-dent/src/systems/gardener.ts), [Builder](tiny-dent/src/systems/builder.ts), [decisions D-022 to D-033](tiny-dent/docs/decisions.md).

### Week 8: autopilot, signal planets, and residents

Autopilot hands the whole planet to the crew: Miners, Gardeners, Builders, and the new Rigger, which takes over antenna building, each sweep the surface sector by sector. Minerals now sell automatically on delivery, and manual terrain edits cost credits. Planets that answer a broadcast become persistent sites with their own seeds and shapes. Residents are small rock creatures that shelter underground, peek out, and tremble near robot work.

Key files: [game systems](tiny-dent/src/systems/), [decisions](tiny-dent/docs/decisions.md).

## Course work behind the game

The [guidebook](worldbuilding-guidebook/) is where each technique was learned and tested before it reached the game. Its week-by-week record, with demos and exercise write-ups, is in the **[guidebook log](worldbuilding-guidebook/LOG.md)**.

| Lesson | Technique | Used in the game for |
| --- | --- | --- |
| 02 Procedural maps | noise, erosion | planet shape |
| 03 Voxels | density fields, Marching Cubes, chunks, LOD | terrain and editing |
| 04 Shaders | height, slope, Fresnel, MatCap | planet look |
| 05 Distributions | seeded placement, slope filtering | Gardener planting rules |
| 06 Paths | splines, route validation | robot and resident movement |
| 07 Particles | emitters, forces | atmosphere |
| 08 Branching systems | L-systems, response experiments | plants, resident response |

Exercise write-ups are indexed in [docs/exercise/](docs/exercise/README.md); setup tutorials are in [docs/tutorials/](docs/tutorials/README.md).

## Repository

```text
Repository
├── tiny-dent/         the game (start at docs/README.md)
├── worldbuilding-guidebook/   interactive lessons and 3D demos (LOG.md has the weekly record)
├── docs/                      exercise notes, tutorials, weekly media
└── deployment/                homepage, combined build, Hosting routes
```

Each app has its own dependencies, tests, and build. `deployment/` combines both with the project homepage for one Firebase Hosting site.

## Run it locally

From the repository root:

```powershell
npm.cmd ci --prefix worldbuilding-guidebook   # first time only
npm.cmd ci --prefix tiny-dent         # first time only
npm.cmd --prefix deployment run build         # rebuild after every change
npm.cmd --prefix deployment run preview       # starts the Firebase Hosting emulator
```

Open <http://127.0.0.1:5002/>. The homepage is `/`, the guidebook `/guidebook/`, and the game `/game/`. The preview serves the built copy in `deployment/public/`, so edits show up only after rebuilding. See the [game README](tiny-dent/README.md) for controls and the [deployment README](deployment/README.md) for build and deploy details.
