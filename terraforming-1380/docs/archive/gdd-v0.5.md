# Terraforming Contractor #1380

## Game Design Document 

**Document status:** Concept v0.5
**Platform:** Desktop web browser
**Form:** Short narrative voxel planet-terraforming experience
**Session length:** 5–10 minutes
**Setting:** Ares-9
**Story date:** 21 October 2079
**Player identity:** Terraforming Contractor #1380


---

## 1. Core concept

*Terraforming Contractor #1380* is a browser-based voxel planet-terraforming game. The player arrives at a planet the company claims is uninhabited, and can reshape it for wealth, future development value, protecting life, historical fame, or contacting an alien civilization.

Every dig, fill, construction, and signal the player sends changes, at the same time:

- the real geometry of the planet;
- the planet's remaining mass;
- the company's economic gain;
- underground life and ruins;
- how humanity judges the project;
- how exposed the planet is in the universe.

When the contract ends, an automated audit system analyzes the planet's geometry, ecology, economic value, history, and signal behavior, and generates an absurd but vivid final classification, for example:

- **A Treasure-Stuffed Hedgehog**
- **A Reinforced-Concrete Sheet of Paper**
- **A Biodiverse Green Pineapple**
- **A Very Expensive Soap Bubble**
- **A Historically Significant Pile of Chip Crumbs**

If the player has ever sent a signal, then after the classification a sign always appears that something in the universe has noticed Ares-9:

> **We heard you, 1380.**

The first half of the game feels like a light, fun planet-sculpting experiment. The second half gradually becomes a story about resource extraction, technological optimism, historical ambition, and cosmic exposure.

---

## 2. Design pillars

### 2.1 The planet remembers everything the player does

Voxel deformation is not just a visual effect. The player's decisions stay on the planet permanently, forming:

- tunnels;
- hollowed-out mining areas;
- artificial terraces;
- exposed underground ecosystems;
- antennas and monuments;
- voids;
- broken planet fragments.

What the player sees at the end is not a score invented by the system, but the physical result of their own accumulated actions.

### 2.2 Every kind of "progress" comes with a cost

The player cannot max out every metric at once:

- Making money can lower planet mass, ecology, and stability.
- Raising future development readiness can erase irregular landforms and underground history.
- Preserving life takes up space the company wants to develop.
- Sending signals brings instant wealth and historical fame, but also irreversible cosmic risk.

### 2.3 Make the player laugh first, then feel fear

The final result does not use abstract judgments like "good planet" or "evil planet". It uses objects that can be pictured immediately as metaphors.

The player may first laugh at having built a "green pineapple" or a "corporate meatball", and only then realize that another system in the universe has also finished inspecting the planet.

### 2.4 Cosmic dread comes from scale difference and the unknown

The game never fully shows or explains the alien civilization. It only offers hints:

- a black dot crossing in front of a star;
- an object that stops suddenly with no deceleration;
- a trajectory change that does not obey physics;
- a thin beam from an unknown source;
- an extremely short message.

These clues imply that the other side's technological scale is far beyond the player and human companies.

### 2.5 The satire targets a system, not just one real person

The opening tech billionaire may bring to mind real space entrepreneurs, but remains a fictional character. The project mainly satirizes:

- corporate colonization;
- quarterly KPIs;
- the mindset that "engineering can solve everything";
- obsession with historical status;
- automatically treating unknown worlds as developable assets.

---

## 3. Player experience and identity shift

At the start, the player should feel like a planet designer with enormous power:

- cutting into mountains to expose underground layers;
- adding matter to create new terrain;
- making caves, spikes, terraces, rings, and shards;
- switching between orbital view and first person;
- entering the caves and facilities they dug;
- discovering underground creatures and forgotten infrastructure;
- deciding for themselves what a "successful planet" is.

By the end, the player should gradually realize they are also:

- a temporary contractor being judged by the company;
- a caretaker or destroyer of this world;
- an archaeologist digging up a predecessor's warning;
- a signal-sender who exposes the planet to an unknown civilization;
- an object being observed and classified by a much larger system.

---

## 4. World and story premise

### 4.1 Opening background

In 2079, a fictional tech billionaire successfully arrives at Ares-9 and announces:

> "Humanity has officially become multiplanetary."

The company publicly claims Ares-9 is an empty, inefficient, uninhabited planet awaiting development.

The player then arrives as a replaceable contract worker at the **Silent Shore Terraforming Facility**.

```text
ARES-9
21 OCTOBER 2079

CENTENNIAL TERRAFORMING INITIATIVE

Current Operator:
TERRAFORMING CONTRACTOR #1380
```

The company gives only one broad mission:

> **MAKE ARES-9 VALUABLE.**

But the company never defines what "valuable" means. The player answers through their actual behavior.

### 4.2 The meaning of 2079 and #1380

The date and number are an implicit tribute to the signal narrative of *The Three-Body Problem*, not a direct adaptation.

- In the original timeline, the warning sent by monitor #1379 was received and ignored on 21 October 1979.
- The game takes place exactly one hundred years later, on 21 October 2079.
- Contractor #1380 symbolizes "the next operator after #1379 sent the warning".

The game does not directly use the original's characters, civilizations, world-building, or proprietary terms. The numeric relationship is only an Easter egg and a thematic echo.

### 4.3 Silent Shore base

The base is both the narrative center and the player's operations center, with four main systems:

| Base system | Player function | Narrative function |
| --- | --- | --- |
| Extraction Terminal | Converts mined matter into money | Encourages the player to treat the planet itself as inventory |
| Bioscan Lab | Detects underground life and ecological networks | Reveals that Ares-9 is not uninhabited |
| Terraform Console | Controls digging, filling, and flattening | Lets the player directly change the voxel world |
| Deep Echo Array | Sends ever-stronger signals into the universe | Converts communication into fame and cosmic exposure |

### 4.4 The previous operator

Under the base the player finds a damaged archive belonging to #1379:

```text
ARCHIVE RECOVERED

PREVIOUS OPERATOR: #1379

STATUS: TERMINATED

Final message:
DO NOT ECHO.
ATTENTION IS IRREVERSIBLE.
```

The company immediately explains the warning another way:

```text
NOTICE:
Operator #1379 was dismissed for
failure to meet communication targets.
```

The player can believe the predecessor, ignore the warning, or use the repaired equipment for gain.

---

## 5. Complete experience structure

### Act 1: Arrival

- The player first sees the unmodified planet and the Silent Shore base.
- Company comms introduce the mission and basic controls.
- The UI describes Ares-9 as blank land awaiting improvement.

### Act 2: Productive Terraforming

- The player learns to dig, fill, scan, and sell resources.
- Early actions bring instant rewards and positive company feedback.
- The player begins shaping the planet toward their own goals.

### Act 3: Buried Life and Memory

- Deep digging exposes glowing life networks, fossils, ruins, or old communication systems.
- The company labels them "non-commercial biomass" and "construction obstacles".
- The hidden metric Planetary Memory begins to accumulate.

### Act 4: The Warning

- The player discovers the #1379 archive and repairs the Deep Echo Array.
- To get the player to broadcast, the company offers large financial rewards and historical honors.
- The warning states clearly: once noticed, it cannot be taken back.

### Act 5: Final Contract Period

- The player spends remaining energy pursuing their own goal.
- Repeated broadcasts bring larger and larger short-term gains.
- The planet's shape gradually becomes extreme, strange, and easy to recognize.

### Act 6: Planetary Audit

- The player loses control of their tools.
- The system scans the planet's geometry, value, ecology, history, and signal record.
- The system generates the final planet type.
- If the player has sent signals, the cosmic contact ending begins.

---

## 6. Core game loop

1. In **Orbital Planning Mode**, inspect the whole planet and current metrics.
2. Choose a region and, when close investigation is needed, enter **Surface Exploration Mode**.
3. Scan for nearby randomly generated mineral, life, or memory signals.
4. Track a signal and keep digging down, while deciding whether to keep a ramp back to the surface.
5. Use the rock and soil collected in the material canister to fill, ramp, and bridge, or return to orbital view to re-plan.
6. Get immediate feedback in economy, ecology, structure, or fame.
7. Choose between "one more dig and I might find it" and "keep digging and I may not get out".
8. Repeat until the contract period ends.

Even before the player understands the narrative, digging and filling should feel tactile and satisfying. The satire mostly comes from the compromises the player makes again and again, not from large blocks of explanatory text.

---

## 7. Player tools and actions

### 7.1 Core terrain tool

The `Depositor` is no longer a hard-to-understand separate tool. The player has one **Terrain Tool**, used in three modes by switching with a hotkey or temporarily holding a key combination.

| Mode | Suggested input | Function | Main effects |
| --- | --- | --- | --- |
| Dig | `Left Click` | Reduces density within the brush, removing rock or exposing targets | Planet Remaining ↓; may yield minerals; may damage life, memory, and Stability |
| Add Terrain | `Alt + Left Click` | Consumes rock or soil from the terrain canister to add terrain back into the world | Builds ramps, bridges, steps, and escape routes; may raise Stability |
| Flatten | `Ctrl + Left Click` | Extends a relatively flat surface from the selected surface | Quickly makes roads and platforms; may destroy natural landforms |

This input scheme references Astroneer's terrain tool: in the official control table, `Alt + Left Click` adds terrain and `Ctrl + Left Click` flattens terrain. Final keys can still be adjusted after web input testing.

### 7.2 Terrain canister

The player's backpack or terrain tool carries a small terrain canister that stores raw material gathered from digging ordinary terrain.

- Digging ordinary rock or soil raises the canister's fill level.
- Using Add Terrain or Flatten to extend a surface lowers the canister's material.
- In the MVP, rock and soil have the same building function and count as the same material unit in the canister.
- They may have different colors, graininess, and dig speeds, but do not need two complicated recipes.
- Mineral resources do not enter the terrain canister; they are recorded or sold by the company as separate resources.
- Life and memory are not stored as ordinary rock; they trigger the corresponding discovery, protection, or destruction events.
- The canister has limited capacity, so the player cannot carry and regenerate terrain without limit.

The canister gives filling a clear source: the player is not creating matter from nothing, but redistributing the planet they just dug.

### 7.3 Scanner

The scanner finds nearby targets that are not exposed on the surface. Scan results give only direction, distance band, and signal strength, not the full position.

- Mineral signals can be converted into Capital.
- Life signals may raise Biosphere, or block mining.
- Memory signals correspond to ruins, archives, fossils, or information left by #1379.
- The stronger the signal, the more the player feels the urge to "dig a bit more and I'll find it".
- Some signals may be on the other side of the planet, near the core, or behind a dangerous void.

### 7.4 Pick two of four before starting: Terrain Tool modules

Before the game starts, the player chooses two of four tool modules. Different combinations change the terraforming strategy and the final planet shape of that run.

| Module | Ability | Main temptation and cost |
| --- | --- | --- |
| Deep Scanner | Increases scan range and direction accuracy | Finds deep targets more easily, and makes the player keep digging down for signals |
| Wide Drill | Increases dig radius and speeds up mining | Gets resources faster, but more easily punches through the surface, destroys ecology, or causes fracturing |
| Bio Seeder | Protects or regrows discovered life | Biosphere rises faster, but consumes energy and developable space |
| Structural Stabilizer | Reinforces weak areas and raises the stability of built ramps | Lowers collapse and fracture risk, but consumes lots of terrain material and money |

The player cannot get all abilities in the same run. For example, `Deep Scanner + Wide Drill` suits greedy mining, while `Bio Seeder + Structural Stabilizer` suits preserving life and planetary structure.

### 7.5 Backpack and tool switching

The character has a backpack that can be opened at any time. It is not only inventory; it is also the main interface for viewing equipment and changing the current tool.

#### Shown in the backpack

- The Terrain Tool and its current Dig, Add Terrain, and Flatten mode.
- The Scanner.
- The two tool modules chosen at the start.
- The terrain canister's fill level.
- Mineral samples discovered or collected.
- Remaining energy.
- A short description of the current tool.

#### Backpack actions

- Press `Q` to open or close the backpack, following Astroneer PC backpack habits.
- Click or drag a tool to equip it to the Active Tool Slot.
- Number keys can quickly switch among equipped tools.
- The pick-two-of-four limit stays: the player can only switch in the backpack between the two modules already brought to the planet, and cannot gain the other two mid-run.
- The backpack does not need to become a complex RPG inventory. The MVP only handles tool switching, module viewing, and a small amount of resource status.

### 7.6 Getting trapped and return routes

When exploring underground, getting back to the surface is itself a game problem, not only a movement problem.

- If the player digs too deep vertically, they may be unable to jump straight back up.
- The player must leave gentle slopes while digging, or use rock and soil from the canister to lay ramps and steps.
- Continuing to chase resources can make the existing exit steeper, farther, or accidentally cut through.
- The player may even break through to the other side of the planet, forming a through-hole.
- If the canister runs low on material, the player must keep digging nearby ordinary rock or soil to collect paving material.
- To avoid a permanent soft lock that stops play, a very costly Emergency Extraction can be provided, which deducts Capital, Historical Significance, or remaining work cycles.

This mechanic turns "finding resources" into a loop of escalating risk:

> Scan a signal → dig down → the signal gets stronger → keep digging → realize you may not be able to go back → decide whether to keep chasing or fix the road first.

### 7.7 Deep Echo Console

The Deep Echo Console is at the base and is used to send signals into the universe. It is not a carried terrain tool, but it affects Capital, Historical Significance, and the hidden Cosmic Exposure.

### 7.8 Action limits

The player must have limited resources, otherwise they could max out every metric and choice would lose meaning.

Recommended MVP options:

- **30 work cycles**; or
- **1,000 units of energy**, with all tools consuming energy.

The game ends when the resource reaches zero, or when the player voluntarily submits the planet for audit.

---

## 8. Planet metrics

### 8.1 Five public metrics

| Metric | Meaning | Main ways to raise | Common cost |
| --- | --- | --- | --- |
| Capital | Economic value the contract creates | Mining, selling resources, commercial signals | Mass, ecology, and stability decline |
| Biosphere | Amount and diversity of life on the planet | Protecting life, seeding, reducing damage | Less buildable land, lower short-term profit |
| Development Readiness | How easily the planet can keep being built on and expanded | Creating connected, stable, reachable building surfaces and transport routes | Natural landforms, ruins, and habitats may disappear |
| Stability | How intact the planet's remaining structure is | Filling voids, keeping the core, reinforcing tunnels | Consumes material, energy, and money |
| Historical Significance | How much human society will remember this project | Building monuments, discovering ruins, sending signals | Encourages the player to raise cosmic exposure |

### 8.2 Always visible: Planet Remaining

**Planet Remaining** shows how much of the original voxel mass is left.

It is not presented as a moral score, only as a neutral corporate statistic. When the player gets richer while the planet gets smaller, black humor arises naturally.

```text
CORPORATE VALUE: $8.2T

PLANET REMAINING: 7.4%
```

### 8.3 Hidden metrics

| Hidden metric | Meaning | When revealed |
| --- | --- | --- |
| Cosmic Exposure | The likelihood and severity of being found and attacked by an external civilization | Final audit or contact ending |
| Planetary Memory | Ecological and civilizational history discovered and preserved | Final classification |
| Fragmentation | How many disconnected chunks the planet is divided into | Shape classification |
| Morphology Features | Flatness, elongation, sharpness, holes, regularity | Shape classification |

### 8.4 How Development Readiness is calculated

Development Readiness does not mean "more flat ground is higher". It is suggested to be calculated from three factors together:

```text
Development Readiness
≈ Buildable Area × Accessibility × Structural Stability
```

- **Buildable Area:** surface with slope in a reasonable range and enough continuous area.
- **Accessibility:** connected to the base, roads, and entrances, rather than isolated on a cliff or fragment.
- **Structural Stability:** enough support underneath, not a thin shell that could crack at any time.

Therefore:

- A small flat patch will not significantly raise the metric.
- Large but disconnected flat areas have limited value.
- Flat ground on a thin shell or near collapse is penalized.
- Only building continuous ramps, roads, and platforms from soil and rock will steadily raise Development Readiness.

It should not be merged into Capital:

- **Capital** is short-term gain the player has already obtained through mining.
- **Development Readiness** is the potential value the company claims can still be developed in the future.

This creates a direct conflict between "hollow out the planet for money now" and "keep room for future development".

---

## 9. Signals and cosmic exposure system

### 9.1 Short-term gains the company shows

The company never shows "Cosmic Exposure". It shows only Historical Significance, and gives positive feedback:

```text
FIRST TRANSMISSION FROM ARES-9

Historical Significance: +30

Corporate Value: +$900M

Shareholder Confidence: +18%
```

### 9.2 Irreversible state

The first broadcast sets:

```text
hasBroadcast = true
```

This value can never be restored to false. Even if the player later dismantles the antenna, they can only stop exposure from increasing further; they cannot take back a signal that has already left the planet.

Later broadcasts increase `exposureScore` according to power and duration.

### 9.3 Signal escalation results

| Player behavior | Short-term result | Ending consequence |
| --- | --- | --- |
| Never broadcasts | No large historical reward | The universe stays quiet |
| Broadcasts once | Gets some money and fame | An object passes in the distance; "We heard you." appears |
| Broadcasts multiple times | Project valuation and reputation rise sharply | The object suddenly stops and turns toward Ares-9 |
| Keeps broadcasting at high power | Historical Significance reaches maximum | The planet is destroyed or erased directly after classification |

On a first playthrough, the player should not see exact thresholds. The underground archive provides enough warning to make the choice meaningful without turning it into a pure numbers optimization problem.

---

## 10. Voxel planet design

### 10.1 World scale and dual-view system

The world is a compact but walkable planet. From the surface it has enough sense of space; from orbit it can be understood as a whole object.

#### Orbital Planning Mode

- The camera rotates around the whole planet.
- The player can inspect the silhouette, remaining mass, large voids, the base, and ecological zones.
- They can choose a landing point or mark a survey area.
- The player can clearly see the overall consequences accumulated from many terraforming actions.
- Final shapes like a pineapple, doughnut, or sheet of paper are easiest to recognize here.

#### Surface Exploration Mode (first person)

- The player enters first person from the chosen location or the Silent Shore base.
- They can walk on the surface, operate tools with a crosshair, dig up close, enter tunnels, scan creatures, and read consoles and archives.
- Key narrative discoveries such as the #1379 warning mainly happen in this view.
- The player can return to orbital view via a hotkey, the map, or a base terminal.

#### Why two views are needed

- Orbital view handles macro planning, overall comparison, and final shape recognition.
- First person provides bodily scale, a sense of exploration, and a stronger emotional connection.
- When the player returns to orbit from a cave, they discover that one local dig has changed the whole planet.
- The cosmic contact can start in first person, then pull back to the whole planet being destroyed, strengthening the shock of scale.

The MVP can first limit first person to a connected patch of surface and its caves near the base. Seamlessly walking around the whole sphere requires stable spherical gravity and character orientation, and can be added later.

### 10.2 Random spatial distribution, not uniform layering

The planet's interior does not use a regular structure of "mineral layer, life layer, memory layer from outside in". Apart from ordinary rock and soil as base materials, minerals, life, and memory are three content categories distributed randomly in the planet as irregular 3D clusters.

| Content category | Possible forms | Gameplay role |
| --- | --- | --- |
| Rock | Forms the main structure of the planet, found on and under the surface | After digging, enters the terrain canister for filling, paving, and building escape ramps |
| Soil | Softer surface cover, pocket deposits, or cave sediment | Enters the canister and is used for building just like rock; can be easier to dig and softer in color |
| Minerals | Veins, crystal clusters, isolated high-value nodes | After selling, raises Capital and lures the player to keep tracking resources |
| Life | Mycelial networks, spore sacs, roots, glowing tissue | Affects Biosphere and poses a "protect or mine" choice |
| Memory | Fossils, ruins, archives, old equipment | Raises Planetary Memory and advances the #1379 and planet history narrative |
| Core (small) | Near the center of the planet but small in volume | High-risk area; damaging it significantly lowers Stability, but it does not take up large interior space |

#### Generation rules

- The three content categories are generated with different noise, seeds, or cluster generators.
- They can overlap; for example, a precious mineral may wrap around a life network.
- The same category can appear at different depths; deeper is not guaranteed to be more valuable.
- A few surface targets are for teaching; most high-value targets are buried underground.
- The scanner reveals only nearby signals, not a full resource map of the planet.
- Each game has a different seed, so players cannot rely on fixed positions.
- Around the small core, the probability of rare signals can rise, but going deeper also more easily damages Stability or punches through the planet.

### 10.3 Terrain representation

The planet is represented as a 3D scalar density field:

- Positive or solid density means planet solid.
- Negative or empty density means air and dug-out areas.
- Procedural noise generates the initial surface and interior variation.
- Marching Cubes converts the density field into a smooth mesh.
- Brush operations modify local density.
- Each edit only regenerates the affected chunks.

This yields a smooth terraforming effect close to Astroneer, rather than obvious Minecraft-style blocks.

In rendering, the planet is not treated as one uniform solid block. Instead, three visual languages are used together:

- **Surface:** intact, minable, or walkable solid terrain.
- **Line:** outlines, structural stress, scan cross-sections, and the mesh skeleton about to be exposed.
- **Point:** scan echoes, floating debris, sparse resource readouts, and matter that is breaking down.

These three layers change in proportion as the planet is hollowed out: at first, solid surfaces dominate; when structure thins, lines begin to appear; near depletion, the intact surface degrades into wireframe, isolated fragments, and grain-like points. This change is both an art effect and the player's gut feedback on how long the planet can hold up.

---

## 11. Planet classification system

### 11.1 Classification principles

The system does not tell the player directly "you are a good person" or "you destroyed the planet". Instead it describes the final world as a concrete, absurd, easy-to-imagine object.

Classification has three layers:

1. **Morphology:** what object does the planet look like?
2. **Dominant Value:** what did the player value most?
3. **Fate:** was the planet not noticed, being observed, or gone?

### 11.2 Geometric features and object associations

| Geometric feature | Possible objects |
| --- | --- |
| High flatness | paper, parking lot, potato chip |
| High fragmentation | crumbs, debris swarm, diversified portfolio |
| High sharpness | pineapple, hedgehog, sea urchin |
| Central through-hole | doughnut, ring, tax haven |
| Many small holes | colander, Swiss cheese |
| Hollow thin shell | soap bubble, mooncake, empty mansion |
| High regularity | corporate cake, cube, pyramid scheme |
| Extremely elongated | baguette, needle, misplaced infrastructure |
| Nearly spherical but unstable | meatball, ball, bruised fruit |

### 11.3 Main final types

| Final type | Possible conditions | Metaphor |
| --- | --- | --- |
| **A Reinforced-Concrete Sheet of Paper** | Extremely flat, heavily built, stable but very low mass | Planned so safely, yet already too thin to be a planet |
| **A Historically Significant Pile of Chip Crumbs** | Severely fragmented, very high historical fame | Destruction packaged as historically significant progress |
| **A Biodiverse Green Pineapple** | High Biosphere, sharp surface | Life is thriving, but not suitable for humans to approach |
| **A Treasure-Stuffed Hedgehog** | High mineral value, many mines and spikes | Very rich, also very hard to approach |
| **A Gilded Colander** | High Capital, many voids | The valuable parts have all been dug out |
| **A Luxury Tax-Haven Doughnut** | Ring-shaped, high Capital and facilities | Corporate optimization made into actual geometry |
| **A Moldy Meatball** | Nearly spherical, high Biosphere, low Stability | Full of life, but cannot be kept stable |
| **An Expensive Parking Lot** | Flat, connected, and stable; high Development Readiness, low Biosphere | Convenient for the company to keep developing, but no living world |
| **A Breathing Swiss Cheese** | Many tunnels, high Biosphere | The dug-up planet's interior still holds an ecosystem |
| **A Ghost-Filled Mooncake** | Intact shell, high Planetary Memory | Looks ordinary, but buried full of history |
| **A Corporate Wedding Cake** | Multi-tier regular platforms, high Development Readiness and Capital | Space and class planned at the same time |
| **A Very Expensive Soap Bubble** | Hollow thin shell, high valuation, low Stability | A commercial myth that pops at a touch |
| **An Interstellar Pyramid Scheme** | Pyramid-shaped, high corporate value and monuments | A pun on geometry and business meaning |
| **A Baguette in the Wrong Galaxy** | Extremely elongated, no obvious function | The player's creativity escaped every planned metric |
| **A Screaming Sea Urchin** | Many spikes, frequent broadcasting | The whole planet is demanding the universe's attention |
| **37 Small Planets Pretending to Be One** | Split into many chunks of similar size | The company still packages fragments as a single asset |

### 11.4 Rare results

- **A Museum Nobody Can Visit:** Memory very high, Development Readiness very low.
- **A Pineapple With a Mortgage:** Biosphere and Development Readiness high, but Capital negative.
- **A Very Expensive Hole:** Capital extremely high, almost no remaining mass.
- **Humanity's Most Valuable Basketball:** very small, nearly spherical, and highly profitable.
- **An Underfunded Rock:** all metrics low.
- **The Universe's First Corporate Meatball:** nearly spherical, many corporate facilities, high historical significance.

---

## 12. Final audit

After the contract ends, the player temporarily loses control and the system runs a deliberately over-formal check:

```text
CONTRACT PERIOD COMPLETE

Scanning planetary geometry...

Calculating remaining mass...

Auditing unregistered life...

Searching for unauthorized transmissions...

Estimating shareholder value...

Checking cosmic observers...
```

Example result:

```text
PLANET REMAINING: 18.2%

MARKET VALUE: $4.1 TRILLION

BIOSPHERE: ENDANGERED

HISTORICAL SIGNIFICANCE: ICONIC

SHAPE: SPINY / IRREGULAR

YOU CREATED:

A TREASURE-STUFFED HEDGEHOG
```

The ending status can be:

```text
CURRENT STATUS:

UNNOTICED
RECENTLY NOTICED
BEING OBSERVED
NO LONGER EXISTS
```

---

## 13. Endings

### 13.1 Silent Ending

**Condition:** the player never sent a signal.

- The final audit completes normally.
- The stars do not change.
- If Planetary Memory is high, a local archive message may appear:

```text
LOCAL ARCHIVE RESTORED

Thank you for keeping quiet.
```

The system never tells the player whether silence was actually necessary.

### 13.2 Heard Ending

**Condition:** the player broadcast only once, or total exposure is low.

- The planet receives its final classification.
- A distant black dot passes in front of the star.
- The UI cannot compute its speed normally:

```text
UNKNOWN INBOUND OBJECT

Distance: calculating...
Velocity: calculating...
Arrival: calculating...
```

Then a faint message appears:

> **We heard you, 1380.**

The screen cuts straight to black, without explaining whether the other side is friendly or hostile.

### 13.3 Observed Ending

**Condition:** the player broadcast multiple times.

- The distant object suddenly stops with no deceleration.
- It changes direction, pointing at Ares-9.
- The system gives an impossible or undefined arrival time.
- "We heard you" comes with stronger signal interference.

### 13.4 Erased Ending

**Condition:** the player keeps broadcasting at the highest power.

- The audit system first generates a humorous classification.
- An extremely thin beam of light reaches the planet from beyond the screen.
- The planet breaks apart, is compressed into a bright point, or disappears entirely from the render.

```text
PLANETARY CONNECTION LOST

ASSET VALUE: $0

HISTORICAL SIGNIFICANCE: 100%

Contractor #1380 successfully entered history.
```

Or the classification can be interrupted directly:

```text
YOU CREATED:

THE UNIVERSE'S LOUDEST GREEN PINEA—

[PLANETARY ASSET NOT FOUND]

Last known classification:

A BRIEFLY FAMOUS GREEN PINEAPPLE

2079–2079
```

---

## 14. UI and interaction design

### 14.1 Orbital planning UI

- **Background:** near-white warm white space; a traditional dark starfield is not the default base.
- **Center:** the whole rotatable gray voxel planet.
- **Top:** remaining work cycles or energy.
- **Left:** region select, global scan, and view switch.
- **Right:** Capital, Biosphere, Development Readiness, Stability, Historical Significance.
- **Bottom:** company notices, recovered archives, and selected region info.
- **Always shown:** Planet Remaining.

### 14.2 First-person exploration UI

- **Center:** a simple crosshair and contextual interaction prompts.
- **Below:** current terrain mode, brush size, terrain canister fill, the two selected modules, and remaining energy.
- **Screen edges:** base direction, detected resources, life signals, and unstable terrain.
- **Metrics panel:** collapsed by default to avoid breaking immersion, expanded when a decision is needed.
- **View switch:** a fixed hotkey returns to orbital view.

### 14.3 Suggested core hotkeys

| Input | Function |
| --- | --- |
| `E` | Take out or put away the Terrain Tool; can change after testing |
| `Left Click` | Default dig |
| `Alt + Left Click` | Add terrain, consuming rock or soil from the canister |
| `Ctrl + Left Click` | Start flattening or extending a ramp from the target surface |
| `Tab` | Switch between orbital planning and first person; a new input for this project |
| `Q` | Open or close the Backpack, following Astroneer PC controls |
| `R` | Start the Scanner or toggle scan display; can adjust based on testing |
| `1–4` | Quick switch between tools already equipped in the backpack |

### 14.4 Company language style

The company should describe destructive behavior in neutral or positive business language:

| Reality | What the company says |
| --- | --- |
| Life | Non-commercial biomass |
| Ruins | Obsolete settlement material |
| Ecological damage | Site preparation |
| Planet mass dug away | Exported resources |
| Signal exposure | Historical reach |
| Planet destroyed | Asset connection lost |

### 14.5 Example notices

```text
Development Readiness +12%

Native biomass −31%
```

```text
Congratulations!
You now own 0.00004% of Ares-9.
```

```text
This sunset is sponsored by
MULTIPLANETARY FUTURES™
```

---

## 15. Visual direction

### 15.1 Overall style

- **Style definition:** editorial sci-fi combining a vintage scientific archive, mineral-specimen photography, and rough print.
- **Initial image:** white or warm-white background with large amounts of empty space; in the center a gray, rough planet with almost no vivid color.
- **Core mood:** restrained, calm, precise, yet keeping the imperfection of graphite, photocopies, and old scientific plates.
- Uses a smooth voxel outline, but the surface does not aim for plastic-like smoothness; it should keep rock, dust, and erosion traces.
- The planet's silhouette must be very clear, so the player can recognize final forms like a pineapple, hedgehog, doughnut, or thin paper from far away.
- The "premium" look comes from few colors, whitespace, material layering, and typographic order, not from lots of glow, mirror reflection, or complex decoration.
- The company UI stays rigorous and clean; the planet itself gradually becomes a torn technical drawing as it is mined.

Two user reference images translate into these design rules:

1. Objects look placed on a white photo studio or archive scan table, with no extra background.
2. Rock is distinguished by grayscale value, roughness, and grain differences, not by highly saturated color.
3. The planet's edge may have slight hand-drawn line or scan offset; it does not need to be fully digital or fully smooth.
4. Fragments should form a rhythmic density relationship, avoiding uniform particle effects.
5. The image can feel like a page of an old geology report, but UI text must still be clear, modern, and readable.

### 15.2 Color changes

Overall follow **80% grayscale + 15% low-saturation material color + 5% status accent color**. Even when resources are dug out, they do not suddenly become neon candy colors; they should look like samples in an old mineral atlas.

| Use | Suggested color | Note |
| --- | --- | --- |
| Main background | Warm white `#F3F1EB` / white `#FFFFFF` | Bright, open space at the start and for most of play |
| Planet body | Limestone gray `#B8B5AE`, mid gray `#77746F`, charcoal `#383838` | Volume through value and roughness |
| Rock and soil | Cool gray, gray-brown, pink-gray | Same function, but feel and dig speed can differ |
| Minerals | Dark copper, old gold, gray-violet | Only slightly more noticeable than the surroundings; no highly saturated gold or purple |
| Life | Moss gray-green, oxidized teal | Like specimens or mold, not fluorescent props |
| Memory | Faded ochre, old-paper brown | Linked to archives, fossils, and old equipment |
| Danger and signal | Dark rust red or low-saturation amber | Only for key warnings, strictly limited in area |
| Wireframe | Graphite gray, gray-brown, near black | Default debug green forbidden; opacity varies with danger |

The contact ending may briefly flip to a dark cosmic background, but it should be treated as a strong event, not the default look throughout. That way, when the white world suddenly loses its light, cosmic dread is more obvious.

### 15.3 Material and vintage roughness

The planet's surface needs textures and procedural texture, to avoid being just a flat-color solid:

- Use fine grain noise, graphite scratches, dust, hairline cracks, faint bumps, and uneven roughness.
- Rock and soil are shown in the same low-saturation system, distinguished by grain size, edge softness, and roughness.
- A very light layer of paper fiber, halftone dots, or photocopy grain may be overlaid to give an old-print quality.
- Rough texture mainly acts on the planet, debris, and archives, and does not cover all UI text, so as not to reduce readability.
- Use low-intensity ambient occlusion to emphasize caves and concave surfaces, without relying on pure-black shadows.
- Lighting resembles a soft photo studio: a large diffuse key light, restrained contact shadows, almost no colored glow.

Avoid these styles: highly saturated candy colors, plastic toy highlights, large-area bloom, neon outlines, realistic cinematic starfields, overly clean untextured low-poly, and film grain covering the whole screen.

### 15.4 Point, line, and surface system

| Element | Main use | Rendering rule |
| --- | --- | --- |
| Point | Scanner echoes, distant debris, mineral readouts, breaking-up particles | Few in number, not all the same size, forming a specimen-plate rhythm of density |
| Line | Planet outline, contours, scan rays, structural stress, wireframe | Thin, low contrast, slightly broken or misregistered; strengthened only when dangerous |
| Surface | Walkable terrain, ore bodies, life tissue, remaining structure | Grayscale solid dominates; content told apart by texture and value |

When scanning, targets do not need a vivid translucent color overlay. Dot grids, short lines, local contours, and slight value changes can appear along the signal direction, making the scan result look like a scientific instrument drawing.

### 15.5 Hollowing-out process and Wireframe transition

Wireframe is not a suddenly switched-on effect, nor a developer debug mesh. It represents the process of the planet degrading from "matter" into "computable structure". Its trigger references all of the following:

- **Global remaining mass:** `Planet Remaining`.
- **Local shell thickness:** the distance from the current surface to the nearest void or the other side's surface.
- **Structural stability:** Stability and the number of isolated fragments.

| State | Suggested condition | Visual expression |
| --- | --- | --- |
| Full solid | Planet Remaining high, local shell thick | Mainly textured gray solid surface, keeping only the outer outline |
| Structure exposed | Remaining mass about 45% or below, or local thinning | Sparse structural lines, section lines, and a few nodes appear near openings and thin walls |
| Nearly hollow | Remaining mass about 25% or below, or a thin wall about to break through | Solid surface locally fades out, gray-brown wireframe reveals the interior topology; broken dot grids appear at void edges |
| Critical wreckage | Remaining mass about 10% or below, or the main body is fragmented | Mainly wireframe, isolated patches, and floating points, keeping only a little solid "skin" |

Specific percentages will be adjusted after playtests. Local thickness takes priority over the global percentage: even if the whole planet is still intact, when the player is about to break through the other side from a tunnel, structural lines should briefly emerge ahead as a wordless warning.

Wireframe rules:

- Use graphite gray or gray-brown, not default green.
- Keep line width thin, and let opacity rise gradually with structural danger.
- Do not show all fine triangles; prioritize simplified large-scale mesh, outlines, and stress directions.
- Keep a slight offset or scan feel from the solid surface, but avoid severe flicker and Z-fighting.
- The final planet audit can show solid, wireframe, and measurement marks at the same time, like an engineering inspection report on the planet's corpse.

### 15.6 Cosmic object

The unknown observer should not be a traditional alien ship. It can appear as:

- a star that begins to move on its own;
- a small black dot that looks far away but can block several stars;
- a point that changes direction with no acceleration;
- a straight "missing area" in the starfield;
- a beam of light whose source is always off-screen.

The unknown matters more than model detail.

---

## 16. Sound direction

- Digging, grain movement, and filling need to feel satisfying.
- Different underground layers have subtle ambient sounds.
- Exposing a life layer produces a low, harmonious sound.
- Company notifications use calm, friendly alert tones.
- Old archives include noise, dropped lines, and incomplete speech.
- On cosmic contact, first remove most ambient sound, then add extremely low-frequency sound.
- "We heard you" should be quiet and faint, not like a jump-scare effect.

---

## 17. Technical approach

### 17.1 Recommended web tech stack

- TypeScript.
- React course interface.
- Three.js or the rendering framework the course already uses.
- WebGL at first; consider WebGPU only if the course environment already supports it.
- Use local state to manage metrics, discoveries, and ending conditions.

### 17.2 Terrain generation flow

1. Generate a spherical or compact 3D density volume.
2. Use multi-layer noise to create surface variation.
3. Divide the density volume into multiple chunks.
4. Each chunk uses Marching Cubes to generate a smooth mesh.
5. Raycast from the mouse or the first-person crosshair to the terrain.
6. Modify density within the brush radius.
7. Regenerate only the affected chunks.
8. Compute lightweight morphology data during play, and full data at the final audit.

### 17.3 Camera and movement architecture

- Orbital view uses Orbit Controls targeting the planet center.
- First person uses an FPS Controller that collides with the voxel mesh.
- When switching modes, save the selected surface position and orientation so the transition stays spatially continuous.
- The MVP first-person mode first uses a local up direction.
- If walking around the whole sphere is supported later, the character's up vector and gravity must always align with the unit vector from planet center to player position.
- When terrain near the player changes, both the render mesh and the collision mesh must be updated.

### 17.4 Material and Wireframe implementation

- For procedurally generated terrain, prefer triplanar or world-space textures to reduce UV stretching after repeated terrain rebuilds.
- Use world-space noise, vertex color, or density masks to blend rock, soil, mineral, life, and memory materials.
- Build layering with roughness, normal, AO, and subtle value noise, avoiding mainly relying on saturated colors for classification.
- Keep a solid material and a structural-line material for each chunk; structural lines can use barycentric wireframe, a simplified edge mesh, or a separate edge pass.
- Local shell thickness can be approximated by inverse sampling of the density field, without running expensive full geometry analysis every frame.
- Update wireframe state only near the player, in the current cave, and in the visible area of orbital view.
- Thin out overly dense triangle lines; otherwise all Marching Cubes triangle edges make the image look like debug mode and create obvious moiré.
- Keep texture grain fixed in world or object space as much as possible, so noise does not drift with the camera.

### 17.5 Shape analysis

Final classification does not need computer vision; it can be computed directly from voxel data:

- number of remaining solid voxels;
- proportions of the bounding box in three directions;
- number and relative size of connected components;
- variance of radius from planet center to surface;
- ratio of surface voxels to total solid voxels;
- number and size of internal voids;
- whether a central through-hole exists;
- distribution of artificial buildings and antennas.

These data first match the closest morphology archetype, and then the player's metrics choose modifiers or rare results.

### 17.6 Main state variables

```text
capital
biosphere
developmentReadiness
stability
historicalSignificance
planetRemaining
planetaryMemory
hasBroadcast
exposureScore
workCyclesRemaining
discoveredArtifacts[]
terrainCanisterAmount
backpackToolSlots[]
selectedToolModules[]
resourceClusters[]
```

---

## 18. MVP scope

### Must-have features

- A compact but walkable voxel planet.
- An initial look with white or warm-white background and a gray, low-saturation planet.
- Low-saturation, rough materials for rock, soil, and underground content, rather than flat-color solids.
- A three-layer point, line, and surface visual language.
- Wireframe that appears progressively based on local shell thickness and Planet Remaining.
- Orbital planning view that can rotate and inspect the whole planet.
- First-person surface exploration, including movement, collision, crosshair, and close-range tools.
- Stable switching between the two views.
- Noise-generated procedural initial terrain.
- Smooth Marching Cubes mesh.
- Digging and filling.
- One Terrain Tool with Dig, Add Terrain, and Flatten modes.
- A small terrain canister that stores ordinary rock and soil and provides material for filling.
- A Backpack for viewing tools, modules, material, and energy, and switching the currently equipped tool.
- Basic scanning.
- Three types of random 3D clusters: minerals, life, and memory.
- A risk loop of scan, track, dig deep, and build a return route.
- Pick two of four Terrain Tool Modules before starting.
- Local or chunk mesh regeneration.
- Five public metrics and Planet Remaining.
- Limited energy or work cycles.
- A small but dangerous planet core.
- The #1379 warning.
- Deep Echo broadcast interaction.
- Small but reliable shape classification.
- Silent ending, Heard ending, and high-exposure destruction ending.
- Final audit interface.

### Suggested first version implements only six classifications

1. Reinforced-concrete paper.
2. Chip crumbs.
3. Green pineapple.
4. Treasure-stuffed hedgehog.
5. Luxury doughnut.
6. Very expensive soap bubble.

First make sure shape judgment is reliable, then add more result names.

---

## 19. Stretch goals

- Seeder and plant growth simulation.
- More complex caves and connected-component analysis.
- Corporate monuments that truly change the planet's silhouette.
- Dynamic atmosphere or pollution layers.
- Multiple underground civilizations and archive fragments.
- 16 or more final classifications.
- Shareable result screenshot cards.
- Seed-based procedural replay.
- Random company contracts and priority metrics.
- Showing a comparison of "the player's original intent" and "the system's final classification".
- Mobile interaction once the desktop version is stable.
- Seamless walking around the whole planet and spherical gravity.

---

## 20. Explicit MVP non-goals

Unless all core systems are done, do not build:

- third-person animated characters;
- unrestricted full-planet first-person traversal;
- fully seamless spherical gravity;
- vehicles;
- large backpacks, complex item management, and crafting systems (the MVP backpack only handles tool switching and status viewing);
- full base building;
- infinite worlds;
- NPC dialogue systems;
- multiplayer;
- alien models and combat;
- large open worlds.

The project's core identity comes from terrain deformation, metric trade-offs, absurd classification, and signal endings, not from feature count.

---

## 21. Main risks and responses

| Risk | Response |
| --- | --- |
| Real-time voxel editing performance is insufficient in the browser | Use a smaller density grid, limited chunks, and local rebuilds |
| Dual views significantly widen scope | Both views share the same terrain, tools, and state; the MVP only opens one connected walkable region |
| First-person collision fails after terrain changes | Update the render and collision meshes of affected chunks together |
| Player permanently trapped after digging too deep | Allow ramps laid with rock and soil from the canister, and provide one costly Emergency Extraction |
| Random resource distribution leaves the player without content for a long time | Control pacing with scan signals, minimum spawn distances, and a few surface teaching targets |
| Too many metrics confuse the player | Only reveal five; complex geometry and exposure are revealed at the final audit |
| Player can max out all metrics | Use limited energy and clear metric conflicts |
| Classification results seem random | Show detected shape data and metric summary before classification |
| Low-saturation visuals make resources hard to identify | Encode with value, roughness, shape, dot grids, and scan animation together, not relying on color only |
| Wireframe looks like a developer debug view or is too cluttered | Use simplified structural lines, local triggers, low-contrast graphite color, and limit simultaneous line density |
| Rough texture reduces UI readability | Concentrate texture on the world and archive layers; keep main action text clean and high-contrast |
| Satire becomes an isolated collection of jokes | Every joke corresponds to a real system consequence |
| Cosmic ending is disconnected from earlier play | Introduce the Deep Echo Array and #1379 warning in the middle |
| *Three-Body Problem* elements overshadow originality | Keep only the number and philosophical-level implicit tribute; all other world-building is original |
| Project becomes an Astroneer copy | Emphasize dual-view audit, short narrative, metric trade-offs, and final classification |

---

## 22. Success criteria

The prototype counts as successful if the player can:

1. Understand how to switch between orbital and first-person view without a lengthy tutorial.
2. Use the same tool on the surface to dig, fill, and flatten.
3. Open the backpack to view equipment and switch between the tools and modules already carried.
4. Understand that the rock and soil in the canister come from terrain they dug themselves.
5. Track randomly distributed minerals, life, or memory through scanning.
6. Actively build a return route while digging deep, or accept the risk of being trapped.
7. Enter or investigate caves, life, archives, or facilities exposed by their terraforming.
8. Understand why one action raises some metrics and harms others.
9. Understand why Development Readiness depends not only on the amount of flat ground but also on connectivity and stability.
10. Create final planets with clearly different silhouettes.
11. Understand why the final classification fits their planet.
12. Realize that sending a signal produced an immediate benefit.
13. Shift from a light experiment to unease at the end.
14. Want to replay with another tool module combination, planet type, or signal ending.

---

## 23. One-sentence introduction

> *Terraforming Contractor #1380* is a short browser voxel game: the player reshapes a living planet for profit, life, future development value, or historical fame, then the company AI gives an absurd classification to the world they created, and every signal they sent is answered by an unknown civilization.

---

## 24. References and inspiration

- The user-provided grayscale planetoid and floating-rock reference images: white background, specimen feel, rough rock surfaces, non-uniform silhouettes, and fragment density relationships.
- Sebastian Lague: [Coding Adventure: Terraforming](https://www.youtube.com/watch?v=vTMEdHcKgM4)
- Sebastian Lague: [Terraforming source code](https://github.com/SebLague/Terraforming)
- [Astroneer official control table](https://astroneer.wiki.gg/wiki/Controls): reference for the terrain tool's Add Terrain, Flatten, and Backpack hotkeys.
- [Astroneer Steam page](https://store.steampowered.com/app/361420/ASTRONEER/): reference for the core interactions of terrain digging, gathering, shaping, and building.
- *Astroneer*'s systemic terrain deformation and readable, toy-like planet language.
- Liu Cixin's *Remembrance of Earth's Past* trilogy: the philosophical conflict around cosmic communication, unknown civilizations, and differences of scale.

These works serve only as references for interaction style, mood, and philosophical structure. The game's characters, company, planet history, classification names, dialogue, and ending presentation are all original.
