# Terraforming Contractor #1380 — Design

| | |
| --- | --- |
| **Status** | Concept v0.5 (English edition, carried over from the Chinese GDD) |
| **Last updated** | 2026-09-29 |
| **Answers the question** | *What is this game, why does it exist, and how should it feel?* |
| **Not in this file** | Exact rules, numbers, data formats → [`spec.md`](spec.md). Tunable values → [`tuning.md`](tuning.md). Player-facing text → [`content.md`](content.md). |

> **How this file changes.** Edit it when the *vision* changes, not when a number changes. Any change to a pillar, the ending structure, or the tone gets a dated entry in [`decisions.md`](decisions.md) first. Anything marked **(open)** is a question the design has not settled yet.

---

## 1. Pitch

*Terraforming Contractor #1380* is a short, browser-based voxel game about reshaping a planet the company insists is empty.

You arrive on **Ares-9** as a replaceable contract worker and dig, fill, and flatten it for profit, life, future development, or historical glory. When the contract ends, an automated audit classifies the world you made as an absurd object: *A Treasure-Stuffed Hedgehog*, *A Very Expensive Soap Bubble*, *A Reinforced-Concrete Sheet of Paper*. If you ever sent a signal into space, something out there answers:

> **We heard you, 1380.**

The first half plays like a cheerful planet-sculpting toy. The second half turns into a story about extraction, technological optimism, the hunger for a place in history, and being noticed by something far larger than you.

| | |
| --- | --- |
| **Platform** | Desktop web browser |
| **Form** | Short narrative voxel-terraforming experience |
| **Session length** | 5–10 minutes |
| **Setting** | Ares-9, 21 October 2079 |
| **Player role** | Terraforming Contractor #1380 |

**One-sentence version:** *You reshape a living planet for profit, life, or glory, a corporate AI classifies your creation as something ridiculous, and every signal you sent is answered by someone unknown.*

---

## 2. Design pillars

Each pillar is a test. If a feature does not serve at least one, it does not belong in the game.

### 2.1 The planet remembers everything
Deformation is never just a visual effect. Every decision stays on the planet as geometry: tunnels, hollowed-out mines, terraces, exposed underground ecosystems, antennas, monuments, voids, broken fragments. The final result is the physical sum of what the player did, not a score invented by the system.

### 2.2 Every kind of "progress" has a cost
No run should max every metric.

- Making money lowers the planet's remaining mass, ecology, and stability.
- Raising future development potential can erase irregular landforms and buried history.
- Protecting life takes up space the company wants to build on.
- Broadcasting brings instant wealth and fame, and an irreversible cosmic risk.

### 2.3 Funny first, then frightening
The final result is never "good planet / evil planet". It is an object the player can picture immediately. The player laughs at their green pineapple or corporate meatball, and only then realizes that something else in the universe has finished auditing the planet too.

### 2.4 Cosmic dread comes from scale and the unknown
The alien presence is never fully shown or explained. Only hints: a black dot crossing a star, an object that stops without slowing down, a trajectory that breaks physics, a thin beam from no source, one very short message. The implication is that the other side is technologically far beyond humans and the company.

### 2.5 The satire targets a system, not a person
The opening tech-billionaire may recall real space entrepreneurs, but stays a fictional character. The targets are corporate colonization, quarterly KPIs, "engineering solves everything" thinking, obsession with historical status, and treating every unknown world as an asset to develop.

---

## 3. Player experience

**At the start** the player should feel like a planet designer with enormous power: cutting into mountains to expose layers, adding matter to raise new land, making caves, spikes, terraces, rings, and shards, switching between orbit and first person, walking into the caves they carved, finding buried life and forgotten infrastructure, and deciding for themselves what a "successful planet" is.

**By the end** they should realize they are also:

- a disposable contractor being graded by a company,
- the caretaker or destroyer of a world,
- an archaeologist digging up a predecessor's warning,
- a signal-sender exposing the planet to something unknown,
- an object being observed and classified by a much larger system.

The satire comes mainly from the compromises the player makes again and again, not from long stretches of text.

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

| Act | What happens |
| --- | --- |
| **1. Arrival** | First look at the untouched planet and the Silent Shore base. Company comms explain the job and the basic controls. The UI describes Ares-9 as blank land awaiting improvement. |
| **2. Productive Terraforming** | The player learns to dig, fill, scan, and sell. Early actions bring instant rewards and cheerful company feedback. The player starts shaping the planet toward their own goal. |
| **3. Buried Life and Memory** | Deep digging exposes glowing life networks, fossils, ruins, or old comms systems. The company labels them "non-commercial biomass" and "construction obstacles". The hidden *Planetary Memory* value starts to build. |
| **4. The Warning** | The player finds the #1379 archive and can repair the Deep Echo Array. The company offers large money and honors to broadcast. The warning says being noticed cannot be undone. |
| **5. Final Contract Period** | The player spends remaining energy on their own goal. Repeated broadcasts pay more and more in the short term. The planet's shape becomes extreme, odd, and recognizable. |
| **6. Planetary Audit** | The player loses control. The system scans geometry, value, ecology, history, and signal record, produces the final planet type, and, if the player ever broadcast, the cosmic contact ending begins. |

---

## 6. Core loop

1. Inspect the whole planet and current metrics in **Orbital Planning Mode**.
2. Pick a region and drop into **Surface Exploration Mode** for close work.
3. Scan for nearby randomly generated mineral, life, or memory signals.
4. Follow a signal and dig down, deciding whether to keep a ramp back to the surface.
5. Use rock and soil from the terrain canister to fill, ramp, and bridge, or return to orbit to re-plan.
6. Get immediate economic, ecological, structural, or fame feedback.
7. Choose between *"one more dig and I might find it"* and *"keep going and I may not get out"*.
8. Repeat until the contract ends.

Digging and filling must feel good on their own, before the player understands the story. The satire lives in the trade-offs, not the exposition.

---

## 7. Player toolkit (design intent)

Exact rules and numbers are in [`spec.md`](spec.md). This section says what each tool is *for*.

### 7.1 One Terrain Tool, three modes
A single tool rather than several confusing ones. The modes are **Dig**, **Add Terrain**, and **Flatten**. Dig removes matter and may find things. Add Terrain rebuilds ground and escape routes from material you dug. Flatten quickly makes roads and platforms, at the cost of natural landforms. The input scheme is inspired by Astroneer's terrain tool and will be adjusted after playtests.

Flatten has two plane orientations (D-019). **Planet Surface**, the default, makes a local terrace tangent to the planet at the selected point, so it works on the sides and underside. **Horizontal** keeps the earlier world-level platform. Both remain planar, not spherical brushes.

### 7.2 The terrain canister
A small canister stores rock and soil from digging and pays for filling. This gives filling a clear source: the player is *redistributing* the planet they just dug, not creating matter from nothing. Capacity is limited. Rock and soil share one material unit in the MVP and differ only in look, feel, and dig speed. Minerals never go in the canister (they are sold). Life and memory are never stored as rock (they trigger discovery, protect-or-destroy events).

### 7.3 The scanner
Finds targets that are not exposed on the surface. It gives direction, distance band, and signal strength, never an exact position. Mineral signals turn into Capital. Life signals can raise Biosphere or block mining. Memory signals point to ruins, archives, fossils, or #1379's traces. The stronger the signal, the stronger the urge to dig "just a bit more".

### 7.3a The Detector
The Detector inspects one nearby patch the player chooses on the planet. Its local wireframe makes the terrain legible and shows the actual Mineral, Life, and Memory targets inside that small volume. A buried target otherwise stays unseen until digging exposes it. The reveal fades with distance from the fixed scan point, as in the guidebook's Distance and Fresnel lesson, rather than changing as the camera moves. The broad Scanner still helps choose *where* to inspect; Detector answers *what is in this patch*. Early target markers are stand-ins for the irregular deposits and discovery rules scheduled for M3 (D-018).

### 7.4 Pick two of four modules
Before the run the player picks two modules. The combination changes the run's strategy and the planet's final shape.

| Module | Ability | Temptation and cost |
| --- | --- | --- |
| **Deep Scanner** | Longer scan range, better direction | Finds deep targets more easily, and invites endless downward digging |
| **Wide Drill** | Bigger dig radius, faster mining | Fast income, but easier to punch through the surface, wreck ecology, or fracture the planet |
| **Bio Seeder** | Protects or regrows discovered life | Biosphere rises faster, but costs energy and buildable space |
| **Structural Stabilizer** | Reinforces weak areas and ramps | Lowers collapse and fracture risk, but costs lots of material and money |

The player cannot own all four. *Deep Scanner + Wide Drill* is greedy extraction; *Bio Seeder + Structural Stabilizer* is preservation.

### 7.5 The backpack
A pull-up screen for tools, modules, canister level, collected mineral samples, energy, and a one-line description of the active tool. It is not an RPG inventory. Modules can be swapped between the two equipped ones but never gained mid-run.

### 7.6 Getting trapped
Getting out is part of the game. Digging straight down may leave no way to jump back up. The player must leave gentle slopes as they dig or build ramps and steps from canister material. Chasing a resource can make an exit steeper, longer, or accidentally cut through, and the player can even punch through to the other side of the planet. To avoid a permanent soft lock there is one very expensive **Emergency Extraction**.

> Scan a signal → dig down → the signal gets stronger → dig more → realize you may not get back → keep chasing or fix the road?

### 7.7 Deep Echo Console
Located at the base, not a hand tool. It sends signals into space and feeds Capital, Historical Significance, and the hidden Cosmic Exposure.

### 7.8 Limited resources
Without a budget the player could max everything and the choices would mean nothing. The MVP uses either **30 work cycles** or **1,000 units of energy** that every tool spends. The run ends when the budget hits zero or the player submits the planet for audit. **(open)** — pick one; see `decisions.md` OQ-01.

---

## 8. Metrics

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
The planet is compact but walkable: big enough to feel large from the surface, small enough to understand as one object from orbit.

**Orbital Planning Mode.** The camera orbits the whole planet. The player checks silhouette, remaining mass, large voids, the base, and ecological zones; picks a landing point or marks a survey area; and sees the cumulative result of many edits. The final pineapple, doughnut, or sheet of paper is easiest to recognize here.

**Surface Exploration Mode.** First person from the chosen spot or the Silent Shore base. The player walks, aims a crosshair tool, digs close up, enters tunnels, scans life, and reads consoles and archives. Key story discoveries like the #1379 warning happen here. A hotkey, map, or base terminal returns to orbit.

**Why both:** orbit is for planning, comparison, and recognizing the final shape. First person gives bodily scale, exploration, and emotional weight. Coming out of a cave and seeing that one local dig changed the whole planet is a key beat. The contact ending can start in first person and pull all the way out as the planet is destroyed.

The MVP limits first person to one connected patch of surface around the base, plus its caves. Walking seamlessly around the whole sphere needs stable spherical gravity and character orientation, and is a stretch goal.

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

**Orbital UI:** warm off-white background (not a dark starfield); central gray rotatable voxel planet; top bar for cycles/energy; left for region select, global scan, view switch; right for the five metrics; bottom for notices, recovered archives, and selection info; Planet Remaining always visible.

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

The precise MVP requirement list is in [`spec.md`](spec.md#4-requirements) with IDs and status. In short: a walkable compact voxel planet with orbit and first-person views; one terrain tool with three modes and a canister; scanner; clusters of minerals, life, memory; two-of-four modules; backpack; five metrics plus Planet Remaining; limited energy; a small dangerous core; the #1379 warning; Deep Echo broadcasting; six reliable classifications; Silent, Heard, and high-exposure endings; the final audit screen.

**Stretch goals:** seeder and plant growth simulation; more complex cave and connected-component analysis; monuments that genuinely change the silhouette; dynamic atmosphere or pollution; multiple underground civilizations and archive fragments; 16+ classifications; shareable result cards; seed-based replay; random company contracts with priority metrics; "player's original intent vs. system classification" comparison; mobile interaction; seamless walking around the whole planet with spherical gravity.

**Explicitly out of scope** unless every core system is done: third-person animated character, unrestricted full-planet first-person traversal, fully seamless spherical gravity, vehicles, large inventory or crafting, full base building, infinite worlds, NPC dialogue, multiplayer, alien models and combat, large open world.

The project's identity comes from terrain deformation, metric trade-offs, absurd classification, and the signal ending, not the number of features.

---

## 17. Risks

| Risk | Response |
| --- | --- |
| Real-time voxel editing too slow in the browser | Smaller density grid, limited chunks, local rebuilds |
| Two views greatly widen scope | Share terrain, tools, and state; MVP opens only one connected walkable region |
| First-person collision breaks after terrain changes | Update render and collision meshes together for affected chunks |
| Player trapped forever after digging too deep | Ramps from canister material, plus one costly Emergency Extraction |
| Random resources leave the player empty-handed too long | Scan signals, minimum spawn distance, a few surface teaching targets |
| Too many metrics confuse players | Only five public; geometry and exposure revealed at the audit |
| Player maxes every metric | Limited energy and explicit metric conflicts |
| Classification feels random | Show detected shape data and metric summary before naming |
| Low-saturation art makes resources hard to read | Encode with value, roughness, shape, dot grids, scan animation, not color alone |
| Wireframe looks like a debug view or clutter | Simplified structural lines, local triggers, low-contrast graphite, cap line density |
| Rough texture hurts UI legibility | Texture on world and archive layers only; action text stays clean and high contrast |
| Satire becomes a pile of unrelated jokes | Every joke maps to a real system consequence |
| Cosmic ending disconnected from the rest | Introduce Deep Echo Array and the #1379 warning in the middle |
| *Three-Body* elements overshadow originality | Keep only the number and philosophical nod; all else original |
| The game becomes an Astroneer clone | Emphasize dual view, audit, short narrative, metric trade-offs, final classification |

---

## 18. Success criteria

The prototype succeeds if a player can:

1. Understand switching between orbit and first person without a long tutorial.
2. Dig, fill, and flatten with one tool on the surface.
3. Open the backpack, read equipment, and switch between carried tools and modules.
4. Understand that canister rock and soil come from terrain they dug.
5. Track randomly placed minerals, life, or memory with the scanner.
6. Build a route back while digging deep, or knowingly accept the risk of being trapped.
7. Enter or examine caves, life, archives, or facilities exposed by their work.
8. Understand why an action raises some metrics and hurts others.
9. Understand that Development Readiness depends on connectivity and stability, not just flat area.
10. Create final planets with clearly different silhouettes.
11. Understand why the final classification fits their planet.
12. Notice that sending a signal gave an immediate reward.
13. Feel the shift from light experiment to unease at the end.
14. Want to replay with different modules, planet shapes, or signal endings.

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

- **OQ-01** Work cycles or energy as the run budget?
- **OQ-02** What does Emergency Extraction cost, and can it be used more than once?
- **OQ-03** Should Silent ending's "Thank you for keeping quiet" require high Planetary Memory, or always appear?
- **OQ-04** How much of the Erased ending is shown in first person versus orbit?
- **OQ-05** Is the game English-only, or bilingual in the UI (the Chinese GDD drafted bilingual text)?

---

## Change log

| Date | Version | Change |
| --- | --- | --- |
| 2026-09-29 | v0.5-en | English edition created from the Chinese GDD v0.5. `habitability` renamed to `developmentReadiness` throughout. |
| 2026-09-30 | v0.5-en / Detector | D-018 adds a local Detector beside the coarse Scanner. |
| 2026-09-30 | v0.5-en / Flatten planes | D-019 makes planet-relative Flatten the default and keeps world-level Horizontal as an option. |
