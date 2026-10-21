# Terraforming Contractor #1380 — Design

> “We’re here to put a dent in the universe.”

| | |
| --- | --- |
| **Status** | Concept v0.7 — multi-planet procedural sandbox (D-034) |
| **Last updated** | 2026-10-20 |
| **Answers the question** | *What is this game, why does it exist, and how should it feel?* |
| **Not in this file** | Exact rules, numbers, data formats → [`spec.md`](spec.md). Tunable values → [`tuning.md`](tuning.md). Player-facing text → [`content.md`](content.md). |

> **How this file changes.** Edit it when the *vision* changes, not when a number changes. Any change to a pillar, the ending structure, or the tone gets a dated entry in [`decisions.md`](decisions.md) first. Anything marked **(open)** is a question the design has not settled yet.

---

## 1. Pitch

*Terraforming Contractor #1380* is a browser-based procedural sandbox where players freely reshape different planets, using manual tools and autonomous robots.

**Planet starting conditions → player choices and robot work → environmental change → resident responses → different planetary outcomes.**

A seed establishes a planet's initial terrain, resources and, in the planned system, its size and residents. The player decides where and how to intervene. Robots repeat rule-based work; changes to terrain and disturbance affect habitats; residents respond by hiding, gathering or moving. The resulting planet records these choices.

Players may pursue resources, ecological flourishing, unusual planetary forms, or combinations of these. Resident departure is feedback, not an automatic failure condition. Free choice still has consistent, visible consequences.

**Implemented foundation:** editable terrain, three robot roles, operating feedback, surface exploration, an atlas and broadcast-triggered travel. **Next target:** one resident species responding to habitat change. Persistent revisitable planets and the live 3D system overview are planned. Documentation does not implement them.

| | |
| --- | --- |
| Platform | Desktop web browser |
| Player role | Contractor #1380, shaping worlds and directing a robot crew |
| Main view | Orbital observation, manual intervention and task assignment |
| Next playable goal | Observe a cave resident react to work and choose a new home |
| First planet / setting | Ares-9, 21 October 2079 |
| Subtitle | We’re here to put a dent in the universe. |

The subtitle is the Steve Jobs line selected by the user. Company satire, buried history and cosmic contact remain a narrative layer; they do not require a single prescribed sandbox outcome.

---

## 2. Design pillars

Each pillar is a test. If a feature does not serve at least one, it does not belong in the game.

### 2.0 Rules keep the world moving
One instruction starts an ongoing process. Robots choose their next action from discovered targets and current terrain rather than replaying a scripted animation. The player directs and adjusts; the simulation performs the individual edits. Keep controls small and behavior understandable.

### 2.1 The planet remembers everything
Deformation is never just a visual effect. Every decision stays on the planet as geometry: tunnels, hollowed-out mines, terraces, exposed underground ecosystems, antennas, monuments, voids, broken fragments. The final result is the physical sum of what the player did, not a score invented by the system.

### 2.2 Freedom with legible consequences

A player may mine, cultivate, reshape, pause or explore. The same world rules apply regardless of intent. Excavation can remove a home and create a new cavity; work can make a suitable home temporarily too noisy. Habitat quality is species-specific, not equivalent to flatness or money.

Residents “vote with their feet.” Their hiding, return and migration make environmental consequences visible. Do not label all extraction bad or all planting good, and do not treat every resident departure as failure.

### 2.2a Different beginnings, different outcomes

Planet size, terrain and resource abundance should vary independently within feasible limits. Shared rules interact with different starting conditions and choices. Preserve outcomes so players can revisit and compare them; a different seed alone is not yet a persistent multi-planet system.

### 2.3 Funny first, then frightening
The final result is never "good planet / evil planet". It is an object the player can picture immediately. The player laughs at their green pineapple or corporate meatball, and only then realizes that something else in the universe has finished auditing the planet too.

### 2.4 Cosmic dread comes from scale and the unknown
The alien presence is never fully shown or explained. Only hints: a black dot crossing a star, an object that stops without slowing down, a trajectory that breaks physics, a thin beam from no source, one very short message. The implication is that the other side is technologically far beyond humans and the company.

### 2.5 The satire targets a system, not a person
The opening tech-billionaire may recall real space entrepreneurs, but stays a fictional character. The targets are corporate colonization, quarterly KPIs, "engineering solves everything" thinking, obsession with historical status, and treating every unknown world as an asset to develop.

---

## 3. Player experience

The player encounters a gray, tactile planet with its own terrain and resource pattern. They experiment with Dig/Add/Flatten or assign bounded robot work. Visible targets, movement and edits explain what the robots are doing.

In the next slice, small rock residents inhabit snug cavities. Brief vibration makes them retreat; sustained disturbance may make them relocate. After work ends, a newly created suitable cavity may attract residents. Small groups and repeated peeking make the changing settlement readable without a large dashboard.

Later, the player discovers planets with different starting conditions, returns to previous sites, and compares their edited shapes and resident distributions in a 3D system view. Residents and that persistent system view are planned, not implemented.

---

## 4. Setting and story

### 4.1 Premise
In 2079 a fictional tech billionaire reaches Ares-9 and declares: *"Humanity has officially become multiplanetary."* The company publicly calls Ares-9 empty, inefficient, and waiting for development. The player arrives as a replaceable contractor at the **Silent Shore Terraforming Facility**.

The company gives one vague order: **MAKE ARES-9 VALUABLE.** It never defines "valuable". The player answers that through play.

### 4.2 Why 2079 and #1380
The date and number are a quiet nod to the signal-and-silence narrative of *The Three-Body Problem*, not an adaptation.

- In the novel's timeline, a warning from monitor #1379 was received on 21 October 1979 and ignored.
- The game takes place exactly one hundred years later, on 21 October 2079.
- Contractor #1380 is the operator who comes after #1379.

No characters, civilizations, world-building, or proprietary terms from the novel are used. The numbers are an Easter egg and a thematic echo. Everything else is original.

### 4.3 The base: Silent Shore
The base is the narrative hub and the player's control center.

| Base system | Player function | Narrative function |
| --- | --- | --- |
| **Extraction Terminal** | Converts mined matter into money | Encourages treating the planet as inventory |
| **Bioscan Lab** | Detects underground life and ecological networks | Reveals that Ares-9 is not uninhabited |
| **Terraform Console** | Controls digging, filling, flattening | Lets the player directly change the voxel world |
| **Deep Echo Array** | Sends ever stronger signals into space | Converts communication into fame and cosmic exposure |

### 4.4 The predecessor: #1379
Deep underground the player finds a damaged archive:

```text
ARCHIVE RECOVERED
PREVIOUS OPERATOR: #1379
STATUS: TERMINATED

Final message:
DO NOT ECHO.
ATTENTION IS IRREVERSIBLE.
```

The company immediately reframes it:

```text
NOTICE:
Operator #1379 was dismissed for
failure to meet communication targets.
```

The player can trust the warning, ignore it, or exploit the repaired equipment.

---

## 5. Structure of a run

Inspect a planet → choose an intervention → work manually or assign robots → observe environmental change → observe resident responses → adjust, continue or pause.

Across the planned system: discover → visit → develop → leave → revisit and compare. Discovery, visiting and continued simulation are separate concerns. Background simulation and reload persistence remain open; state must at least survive switching between planets in one session.

The current prototype includes bankruptcy and reset-style travel. Those are existing rules, not proof that a persistent sandbox or revised economy has shipped. Narrative audits and contact endings remain later work.

---

## 6. Core loop

1. Inspect starting terrain, resources and, once implemented, resident settlements.
2. Choose where to mine, reshape or cultivate; manual and robot work are both valid.
3. Assign a work area and Start/Pause, or use a manual terrain tool.
4. Terrain and resources change; planned habitat and vibration systems read those changes.
5. Residents hide, return, gather or move according to their preferences.
6. Observe the result and choose the next intervention.
7. Later, discover another planet, preserve the current site, and return to compare outcomes.

Robots act without repeated dig clicks. Residents choose automatically from current environmental conditions rather than following scripted outcomes. Their responses can change the player's next choice, but never require optimizing a universal happiness score.

---

## 7. Player toolkit (design intent)

### 7.1 Immediate controls
Select robot, set a circular work area, start/pause, and reassign. The first goal is simply “mine discovered minerals in this area.” Goal menus, questionnaires, and strategy presets remain undecided and deferred.

### 7.2 Three robot roles, introduced gradually
| Role | Procedural work | Schedule |
| --- | --- | --- |
| Miner | Scan, choose a mineral, excavate, collect, repeat | Next prototype |
| Builder | Reshape terrain with Add/Flatten; later reinforce it | Candidate second behavior |
| Gardener | Find suitable exposed ground and seed or restore life | Later exploration |

Robot type is separate from robot count. First test one Miner; then test multiple Miners without duplicating targets; then add one second behavior. Do not build all three at once.

### 7.3 Movement and excavation
Robots hover through empty space to a work site. A Miner enters solid ground by progressively excavating a tunnel, not by flying through intact rock. Movement and target choice must respond to changed terrain.

### 7.4 Scanning and knowledge
Robots learn targets through bounded scans; they do not start knowing the whole underground map. The player can also scan manually with the existing Detector. The first robot scan may reuse its local discovery queries without requiring a separate scanner robot.

### 7.5 Existing tools and deferred equipment
Keep Dig/Add/Flatten and Detector as working prototype tools. First-person walking, being trapped, Emergency Extraction, backpack, two-of-four loadout, upgrades, and detailed hauling are deferred. They do not gate autonomous mining.

### 7.6 Later economy — agreed direction, not the next task
Minerals may be sold for funds to buy robots and expand limited deployment slots. Rock/soil are construction material. Life and Memory are discoveries, not ordinary saleable ore. Running robots incur electricity expenses; approaching insolvency can force departure. Prices, billing, reserve thresholds, and remedies are unsettled.

Keep this layer lightweight. Do not require purchases, power, transport, or bankruptcy rules to validate the first robot. Fixed work cycles or a non-replenishable energy pool are superseded as the planned run budget.

### 7.7 Memory and signals
Later, discovering life or archives can prompt a player decision. No separate archaeology robot is required. Keep broadcasting an explicit player choice rather than an automatic mining side effect.

---

## 8. Metrics

**D-022 scope:** The metrics below describe the retained narrative design, not the next prototype’s required dashboard. For autonomous mining, show robot state, current target, collected mineral count, and Planet Remaining. Complex metric trade-offs and formulas are deferred.


### 8.1 Five public metrics

| Metric | Meaning | Goes up by | Usual cost |
| --- | --- | --- | --- |
| **Capital** | Economic value created by the contract | Mining, selling resources, commercial signals | Lower mass, ecology, stability |
| **Biosphere** | Amount and variety of life on the planet | Protecting life, seeding, causing less damage | Less buildable land, lower short-term profit |
| **Development Readiness** | How easily the planet can keep being built on | Connected, stable, reachable building surfaces and transport routes | Natural landforms, ruins, habitats may vanish |
| **Stability** | How intact the remaining structure is | Filling voids, keeping the core, reinforcing tunnels | Costs material, energy, money |
| **Historical Significance** | How much humanity will remember this project | Monuments, discovering ruins, broadcasting | Pushes the player toward higher cosmic exposure |

### 8.2 Always visible: Planet Remaining
Shows how much of the original voxel mass is left. It is presented as a neutral corporate statistic, not a moral score. The dark humor appears when the player gets richer while the planet gets smaller.

```text
CORPORATE VALUE: $8.2T
PLANET REMAINING: 7.4%
```

### 8.3 Hidden metrics

| Hidden metric | Meaning | Revealed |
| --- | --- | --- |
| **Cosmic Exposure** | Likelihood and severity of being noticed and attacked | Final audit or contact ending |
| **Planetary Memory** | Ecological and civilizational history discovered and preserved | Final classification |
| **Fragmentation** | How many disconnected pieces the planet has become | Shape classification |
| **Morphology Features** | Flatness, elongation, spikiness, holes, regularity | Shape classification |

### 8.4 Why Development Readiness is not just "flat ground"
It combines three things:

```text
Development Readiness ≈ Buildable Area × Accessibility × Structural Stability
```

- **Buildable area:** surface with a reasonable slope and enough continuous size.
- **Accessibility:** connected to the base, roads, and entrances, not isolated on a cliff or fragment.
- **Structural stability:** enough support underneath, not a thin shell about to crack.

So one small flat patch barely matters, large disconnected flats are worth little, and flat ground on a collapsing shell is penalized. Only continuous ramps, roads, and platforms built from soil and rock raise it steadily.

It is deliberately separate from Capital: **Capital** is short-term money already earned; **Development Readiness** is the *potential* the company says it can still develop later. Together they create the direct conflict between "hollow it out for money now" and "keep room for the future".

---

## 9. Signals and cosmic exposure

### 9.1 What the company shows
The company never shows "Cosmic Exposure". It only shows the good news:

```text
FIRST TRANSMISSION FROM ARES-9
Historical Significance: +30
Corporate Value: +$900M
Shareholder Confidence: +18%
```

### 9.2 Irreversibility
The first broadcast sets `hasBroadcast = true` permanently. Removing the antenna later only stops exposure from *growing*; a signal that has left the planet cannot be recalled. Later broadcasts add to `exposureScore` according to power and duration.

### 9.3 Escalation

| Player behavior | Short-term result | Ending consequence |
| --- | --- | --- |
| Never broadcasts | No big historical reward | The universe stays quiet |
| Broadcasts once | Some money and fame | An object passes in the distance; "We heard you." |
| Broadcasts repeatedly | Valuation and fame rise sharply | The object stops suddenly and turns toward Ares-9 |
| Keeps broadcasting at high power | Historical Significance maxes out | The planet is destroyed or erased after classification |

On a first playthrough the exact thresholds are never shown. The underground archive is warning enough to make the choice meaningful without turning it into number optimization.

---

## 10. The world

### 10.1 Two views, one planet

**Orbital view is primary:** observe robots, assign work areas, inspect tunnels, and compare cumulative silhouettes. The planet remains stationary while the camera orbits.

First-person exploration is retained as an optional later idea. Surface controls, escape ramps, spherical gravity, and player collision are not prerequisites for the robot prototype.

Hovering makes roads unnecessary for robot travel. A future Builder should justify itself through reshaping or reinforcement rather than artificial road dependencies.

---

### 10.2 Random clusters, not layers
The interior is *not* a tidy "minerals, then life, then memory" onion. Apart from the base materials (rock and soil), minerals, life, and memory are three content categories scattered as irregular 3D clusters.

| Category | Possible forms | Gameplay role |
| --- | --- | --- |
| **Rock** | Main structure of the planet, everywhere | Goes to the canister; used for filling, roads, escape ramps |
| **Soil** | Softer surface cover, pockets, cave sediment | Same use as rock; easier to dig, softer color |
| **Minerals** | Veins, crystal clusters, isolated high-value nodes | Sold for Capital; lures the player onward |
| **Life** | Mycelial networks, spore sacs, roots, glowing tissue | Affects Biosphere; forces a protect-or-mine choice |
| **Memory** | Fossils, ruins, archives, old equipment | Raises Planetary Memory; advances #1379 and planet history |
| **Core** | Small, near the center | High risk; damaging it sharply lowers Stability, but it does not fill the interior |

Generation principles: the three categories use different noise, seeds, or cluster generators and may overlap (a precious mineral might wrap a life network). The same category can appear at any depth; deeper is not guaranteed to be better. A few surface targets teach the mechanic; most high-value targets are buried. The scanner reveals nearby signals only, never a full map. Each run has a new seed. Rare signals cluster around the core, but going there also makes Stability loss or punching through more likely.

### 10.3 Terrain representation
The planet is a 3D scalar density field: solid density means planet, empty density means air or dug-out space. Procedural noise makes the initial surface and interior variation. Marching Cubes turns the field into a smooth mesh, brush operations edit local density, and only affected chunks are rebuilt. The result is a smooth Astroneer-like feel rather than Minecraft blocks.

Visually the planet is not one uniform solid. It uses three visual languages at once:

- **Surface:** intact, minable, walkable solid terrain.
- **Line:** outline, contours, structural stress, scan cross-sections, the wire skeleton about to be exposed.
- **Point:** scan echoes, floating debris, sparse resource readouts, matter breaking apart.

Their proportions shift as the planet is hollowed out: mostly solid surfaces at first; lines appear when structure thins; near exhaustion the whole planet decays into wireframe, isolated fragments, and dust. This is both an art effect and the player's gut feeling for how long the planet can hold.

---

## 11. Classification

### 11.1 Principles
The system never says "you are a good person" or "you destroyed the planet". It describes the final world as a concrete, absurd object. Classification has three layers:

1. **Morphology:** what does the planet look like?
2. **Dominant value:** what did the player care about most?
3. **Fate:** unnoticed, being observed, or gone?

### 11.2 Geometry to object

| Geometric feature | Possible objects |
| --- | --- |
| High flatness | paper, parking lot, potato chip |
| High fragmentation | crumbs, debris swarm, diversified portfolio |
| High spikiness | pineapple, hedgehog, sea urchin |
| Central through-hole | doughnut, ring, tax haven |
| Many small holes | colander, Swiss cheese |
| Hollow thin shell | soap bubble, mooncake, empty mansion |
| High regularity | corporate cake, cube, pyramid scheme |
| Extremely elongated | baguette, needle, misplaced infrastructure |
| Near-spherical but unstable | meatball, ball, bruised fruit |

### 11.3 Main and rare outcomes
The full list, with conditions, is in [`content.md`](content.md#classifications). The **first version implements six**, chosen so the shape detection can be trusted before adding more names:

1. A Reinforced-Concrete Sheet of Paper
2. A Historically Significant Pile of Chip Crumbs
3. A Biodiverse Green Pineapple
4. A Treasure-Stuffed Hedgehog
5. A Luxury Tax-Haven Doughnut
6. A Very Expensive Soap Bubble

Rare outcomes reward extreme runs (for example *A Very Expensive Hole*, *An Underfunded Rock*, *A Museum Nobody Can Visit*).

---

## 12. Audit and endings

When the contract ends, the player loses control and the system runs a deliberately over-formal check: geometry, remaining mass, unregistered life, unauthorized transmissions, shareholder value, cosmic observers. Before naming the result it shows the detected shape data and a metric summary, so the classification never feels random.

```text
PLANET REMAINING: 18.2%
MARKET VALUE: $4.1 TRILLION
BIOSPHERE: ENDANGERED
HISTORICAL SIGNIFICANCE: ICONIC
SHAPE: SPINY / IRREGULAR

YOU CREATED:
A TREASURE-STUFFED HEDGEHOG
```

Fate status is one of **UNNOTICED**, **RECENTLY NOTICED**, **BEING OBSERVED**, **NO LONGER EXISTS**.

| Ending | Condition | What happens |
| --- | --- | --- |
| **Silent** | Never broadcast | Normal audit; stars unchanged. With high Planetary Memory, a local archive may show *"Thank you for keeping quiet."* The game never says whether silence was necessary. |
| **Heard** | Broadcast once, or low total exposure | Classification, then a distant black dot crosses the star. The UI cannot compute its speed (*"Distance: calculating…"*). A faint line: *"We heard you, 1380."* Hard cut to black. Intent is never explained. |
| **Observed** | Broadcast several times | The distant object stops without slowing, changes direction, points at Ares-9. Arrival time is impossible or undefined. "We heard you" comes with heavy interference. |
| **Erased** | Keeps broadcasting at maximum power | The audit produces a funny classification, then a very thin line of light arrives from off-screen. The planet breaks apart, compresses to a bright point, or vanishes from the render. Final screen: *"Contractor #1380 successfully entered history."* The classification line can also be cut off mid-word. |

---

## 13. UI tone and company voice

The company describes destruction in neutral or cheerful business language.

| Reality | Company says |
| --- | --- |
| Life | Non-commercial biomass |
| Ruins | Obsolete settlement material |
| Ecological damage | Site preparation |
| Planet mass dug away | Exported resources |
| Signal exposure | Historical reach |
| Planet destroyed | Asset connection lost |

Example notices, sponsor lines, and all other copy live in [`content.md`](content.md).

**Orbital UI (D-024):** warm off-white background, stationary gray planet and orbit camera. A top switch separates **Auto** (a Miner panel with work area, Start/Pause, phase track, target and stop reason) from **Manual** (Terrain and Detector). A right-hand Site report shows Planet Remaining and the warehouse in both modes. Type is Fraunces for display and Bricolage Grotesque for interface text. Later economy and narrative panels are deferred.

**First-person UI:** minimal crosshair and contextual prompts; bottom shows terrain mode, brush size, canister level, the two modules, and energy; screen edges hint at base direction, detected resources, life signals, unstable terrain; metrics panel collapsed by default and opened at decision points.

---

## 14. Visual direction

**Style:** editorial sci-fi that mixes a vintage scientific archive, mineral-specimen photography, and rough print. Restrained, cold, precise, with the imperfection of graphite, photocopies, and old geology plates.

- **Opening image:** white or warm-white background with generous empty space; a single gray, rough, nearly colorless planet in the middle.
- Smooth voxel silhouette, but the surface is not plastic: it keeps rock, dust, and erosion.
- The silhouette must read clearly from far away so a pineapple, hedgehog, doughnut, or sheet of paper is recognizable.
- "Premium" feels come from few colors, white space, material layering, and typographic order, not glow, reflection, or ornament.
- The company UI stays strict and clean. The planet itself gradually becomes a torn technical drawing as it is mined.

Rules distilled from the reference images:

1. Objects sit on a white studio or archive-scan table with no extra background.
2. Rock is told apart by gray value, roughness, and grain, not saturated color.
3. Planet edges may carry slight hand-drawn line or scan offset; it does not have to be perfectly digital.
4. Fragments should have rhythm, dense here and sparse there, not uniform particle spray.
5. The image can feel like a page of an old geology report, but UI text stays clear, modern, and readable.

### Color
Roughly **80% grayscale, 15% low-saturation material color, 5% status accent.** Resources never turn neon candy; they look like specimens in an old mineral atlas.

| Use | Suggested color | Note |
| --- | --- | --- |
| Main background | Warm white `#F3F1EB` / white `#FFFFFF` | Bright and open for most of the game |
| Planet body | Limestone `#B8B5AE`, mid gray `#77746F`, charcoal `#383838` | Volume through value and roughness |
| Rock and soil | Cool gray, gray-brown, pink-gray | Same function, different feel and dig speed |
| Minerals | Old gold, muted mustard yellow `#cfa726` | Slightly more noticeable than surroundings; the glow reads as gold ore, not a lamp |
| Life | Moss green `#3f9a58` | Like specimens or mold, not fluorescent props |
| Memory | Deep rose pink `#c52b7d` | Ties to archives, fossils, old equipment |
| Danger and signal | Dark rust red or low-saturation amber | Key warnings only, tightly limited in area |
| Wireframe | Graphite gray, gray-brown, near black | Never default debug green; opacity rises with danger |

The contact ending may briefly flip to a deep cosmic background, treated as a strong event rather than the default look, so the white world losing its light hits harder.

### Material and texture
Fine grain, graphite scratches, dust, hairline cracks, subtle bump, uneven roughness. Rock and soil share one low-saturation family but differ in grain size, edge softness, and roughness. A very light paper-fiber or halftone layer can add a print feel, but rough texture stays on the planet, debris, and archives and never covers UI text. Ambient occlusion is low-intensity, no pure-black shadows. Lighting resembles a soft photo studio: broad diffuse key light, restrained contact shadows, almost no colored glow.

**Avoid:** candy colors, plastic toy highlights, heavy bloom, neon outlines, realistic cinematic starfields, over-clean untextured low-poly, and film grain across the whole screen.

### Point / line / surface rules

| Element | Use | Rule |
| --- | --- | --- |
| Point | Scan echoes, far debris, mineral readouts, decaying particles | Few, unequal sizes, specimen-plate rhythm |
| Line | Outline, contours, scan rays, structural stress, wireframe | Thin, low contrast, slightly broken or offset; stronger only when dangerous |
| Surface | Walkable terrain, ore bodies, life tissue, remaining structure | Mostly gray solid; content told apart by texture and value |

Scanning does not paint a bright translucent color over targets. Dot grids, short lines, local contours, and small value changes appear along the signal direction so it looks like an instrument drawing.

### Component styles (D-027)
Chosen on the component board (`docs/component-board.html`). Exact colors live in `src/config/palette.ts`, numbers in [`tuning.md`](tuning.md#visual-style-d-027).

| Component | Chosen style | Look |
| --- | --- | --- |
| Miner | E · voxel orb | Hollow 0.02-cell orb, tilted ring of cubes, stepped drill; graphite band |
| Gardener | G3 · pannier worker | Same orb, seed pannier behind, two voxel arms; moss band |
| Builder | B1 · roller | Same orb on two brackets carrying a voxel roller; ochre band |
| Status light | One 2 × 2 light per robot | Scan white pulse, amber move / fast-blink work, gold collect, green plant, rust stop |
| Plant | Vegetation A + D | Lichen discs with an L-system branch; grows by level |
| Antenna | A · lattice mast | 0.45 three-leg truss, small dish, blinking amber lamp |
| Mineral | B · crystal cluster | Gold octahedra; visual only while targets stay points |
| Terrain | C · contours | Height and slope value, graphite contour every 0.045 |
| Work area | D · denser contours | Contours double inside the area; edge is one contour line |
| Atmosphere | C4 · terrain-hugging dust | Cool gray points, clumped, never absent; faint irregular halo |
| Rendering | Solid | No outlines; one soft key light and a warm fill |

Robots are told apart by silhouette (ring, pannier, roller), not by color: in orbit a robot is about 28 px tall.

### The wireframe transition
Wireframe is not a debug overlay or a sudden effect. It shows the planet degrading from *matter* into *computable structure*. Triggered by three inputs: global **Planet Remaining**, **local shell thickness**, and **structural stability** (including the number of isolated fragments).

| State | Rough condition | Look |
| --- | --- | --- |
| Solid | High mass, thick shell | Textured gray solid, outline only |
| Structure exposed | About <45% left, or a local thin spot | Sparse structural lines, cross-sections, a few nodes near openings and thin walls |
| Nearly hollow | About <25% left, or a wall about to break through | Surface fades out locally, graphite-brown wireframe reveals the inner topology, broken dot grids at void edges |
| Critical wreck | About <10% left or the main body has split | Mostly wireframe, isolated patches, floating points, a thin "skin" of solid |

Percentages are tuned after playtests. **Local thickness beats the global percentage:** even on a mostly intact planet, a tunnel about to break through should show brief structural lines ahead as a wordless warning. Wireframe rules: no default green, thin lines, simplified large-scale mesh and stress direction rather than every triangle, slight offset from the solid surface but no flicker or Z-fighting. The final audit can show solid, wireframe, and measurement marks together, like an engineering inspection of a corpse.

### The unknown observer
Not a classic alien ship. Options: a star that starts to move by itself; a small black dot that hides several stars; a point that changes direction with no acceleration; a straight "missing" strip in the starfield; a beam whose source is always off-screen. The unknown matters more than model detail.

---

## 15. Audio direction

- Digging, moving grains, and filling must feel satisfying.
- Each underground zone has subtle ambient sound.
- Exposed life gives a low, harmonic sound.
- Company notifications use calm, friendly chimes.
- Old archives contain noise, dropouts, and incomplete speech.
- On cosmic contact, strip out most ambience first, then add very low frequencies.
- *"We heard you"* is quiet and faint, never a jump scare.

---

## 16. Scope

**Next prototype:** one autonomous Miner, local discovery, nearest known target selection, hovering in empty space, progressive tunnel excavation, collection, repeat, Start/Pause/reassignment, and readable state feedback. Reuse existing seeded terrain, editable density, local remeshing, Detector and LOD.

**After validation:** multiple Miners with target reservation; one second procedural behavior (Builder or Gardener, to be selected).

**Retained later direction:** limited deployment, robot purchases and electricity costs, near-bankruptcy departure, life/memory responses, corporate audit and signal endings.

**Deferred:** first person, backpack, loadouts, detailed transport, complex economy, collapse simulation, questionnaires, and full metric optimization. No robot code is delivered by this document revision.

---

## 17. Risks

| Risk | Response |
| --- | --- |
| Robot is just a random brush or scripted animation | Require discovered targets, incremental movement, genuine excavation and re-selection |
| Robot passes through solid terrain | Query current density and excavate before advancing |
| Robot stalls or endlessly retries | Report no-target/blocked reason and stop; use a bounded progress check |
| Excavation hurts frame rate | Reuse dirty-chunk remeshing; cap edits per simulation step and measure |
| Too many controls hide the process | Start with one goal, one area, Start/Pause |
| Multiple robots duplicate work | Reserve targets in the multi-robot milestone |
| Mechanics balloon before automation works | Validate each procedural behavior before adding economy or narrative layers |

---

## 18. Success criteria

1. Assigning an area and starting once produces at least two automatic target cycles when targets are available.
2. The player can explain the current robot state and target.
3. Excavation leaves persistent tunnels in the actual density field.
4. The robot never flies through intact solid terrain.
5. Changing the work area or seed changes the resulting work pattern.
6. Pause halts robot movement and edits; reassignment abandons the previous task safely.
7. No target or no progress ends with a readable reason.
8. Replaying the same seed, simulation steps and commands reproduces the same decisions.
9. The process remains responsive during remeshing.

Later audit/story acceptance checks are scheduled after this prototype.

---

## 19. References and inspiration

- Reference images: grayscale planetoids with floating rock. White background, specimen feel, rough surfaces, irregular silhouettes, fragment rhythm.
- Sebastian Lague, *Coding Adventure: Terraforming* ([video](https://www.youtube.com/watch?v=vTMEdHcKgM4), [source](https://github.com/SebLague/Terraforming)).
- [Astroneer controls](https://astroneer.wiki.gg/wiki/Controls) (Add Terrain, Flatten, backpack hotkeys) and [Astroneer on Steam](https://store.steampowered.com/app/361420/ASTRONEER/) for digging, gathering, shaping, and building interaction.
- Astroneer's systemic terrain deformation and toy-like readable planets.
- Liu Cixin's *Remembrance of Earth's Past* trilogy: the philosophical tension of cosmic communication, unknown civilizations, and differences of scale.

These are references for interaction, mood, and philosophical structure only. Characters, company, planet history, classification names, dialogue, and ending presentation are original.

---

## Open design questions

Tracked in detail in [`decisions.md`](decisions.md#open-questions). Design-level ones:

- **OQ-01** Superseded by D-022: later funds pay operating costs; fixed cycles/energy are not the run budget.
- **OQ-02** Deferred: Emergency Extraction only matters if first person returns.
- **OQ-03** Should Silent ending's "Thank you for keeping quiet" require high Planetary Memory, or always appear?
- **OQ-04** How much of the Erased ending is shown in first person versus orbit?
- **OQ-05** Is the game English-only, or bilingual in the UI (the Chinese GDD drafted bilingual text)?

---

## Change log

- **2026-10-20 / D-034:** Reframed the project as a freely directed multi-planet procedural sandbox; added the action–environment–resident consequence chain and distinguished implemented foundations from planned features.


| Date | Version | Change |
| --- | --- | --- |
| 2026-09-29 | v0.5-en | English edition created from the Chinese GDD v0.5. `habitability` renamed to `developmentReadiness` throughout. |
| 2026-09-30 | v0.5-en / Detector | D-018 adds a local Detector beside the coarse Scanner. |
| 2026-09-30 | v0.5-en / Flatten planes | D-019 makes planet-relative Flatten the default and keeps world-level Horizontal as an option. |

| 2026-10-14 | v0.6 / components | D-027: component styles chosen on the component board (robots, plants, antennas, minerals, terrain, work area, atmosphere). |
| 2026-10-14 | v0.6 | D-022: robot-led procedural terraforming, simplified prototype, subtitle, and deferred management/navigation. |
