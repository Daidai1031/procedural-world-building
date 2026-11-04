# Tiny Dent — The Water planet

| | |
| --- | --- |
| **Status** | Written 2026-11-04 before any code, as D-071 required, then built the same day (D-073 records what differs). Requirements: spec §4.28 (WAT). Roadmap: E7. |
| **Answers the question** | *What exactly is an ocean world here, what must be real about it, and what is left out?* |

This is a separate slice on top of the five land slices (D-066–D-070). It does not change how the six land materials work.

## 1. What a Water planet is

A Water planet is a **planet condition**, not a seventh surface. It has a normal solid core with one of the six materials as its **seabed** (so excavation, hardness, the crew, mineral clusters and surface memory all keep working), and a **volume of water** around that core that covers all of it.

- **Which planets.** A signal planet is a Water planet if it is a sphere and a draw from its own stream (`${seed}:water`, below 0.4) says so. The home planet never is. About one signal planet in ten becomes one. This **does change** which existing seeds are oceans; it moves no other seeded value except one: the core's radius is capped at 0.30 (so there is room for water inside the voxel world), and that is recorded for every seed it changes in D-073.
- **Water radius.** `waterRadius = radius × 6 + relief × 3 + 0.45`: the highest the seabed can reach plus 0.45 world units. So every point of the seabed is at least 0.45 under the surface, and at most about 1.7.
- **Depth** at a point is `waterRadius − |point|` where the point is in water. A point is **in water** when it is inside `waterRadius` and not inside solid ground. That is a real test on the real terrain, so digging the seabed deeper makes the water deeper there and building it up makes it shallower. Nothing is painted.

## 2. What must be real (and how we know)

| Real thing | Why it matters | Check |
| --- | --- | --- |
| Water is a volume | Swimmers have a depth, not just a place on a surface | WAT-T2 |
| Depth follows the terrain | Digging and building change habitat | WAT-T3 |
| Swimmers move in 3 D | "Do not fake all-water as painted solid sphere" | WAT-T4 |
| Hard needs are vetoes | A swimmer is never shipped to dry land | WAT-T6 |
| Soil alone does not make an island | Ground built in open water washes away unless it is anchored | WAT-T7 |
| Dry land needs a platform and soil | Plants, antennas and walkers stand only on anchored dry ground | WAT-T8 |

## 3. The swimmer: Glassfin

One new species, added as a row of data (D-071) plus a body: a small, pale, translucent fish with two dot eyes and fins.

- Native to every Water planet and to no other. Land species are never native to one.
- **Need:** water at least 0.35 deep where it keeps its territory (a hard need, not a score). It likes a depth between 0.5 and 1.4 and takes what the planet has.
- **Territory:** a point in the water at its liked depth. It drifts around it in a slow seeded loop, always in water, never inside the seabed, never at the surface.
- **Noise:** digging near it (the same disturbance as for land residents) makes it dive toward the seabed; sustained noise makes it leave for another territory away from the noise. If the seabed under its territory is built up until the water is under 0.35 deep, it moves.
- It never leaves heat on a road (RDS-07), because it never walks.

## 4. Who can go where

- A Glassfin can be shipped only to a Water planet. The refusal says why.
- A land species can be shipped to a Water planet only if that planet has an **anchored platform**; underwater ground is never a land creature's home (a land creature needs open air above it).
- Natives of a land planet on a Water planet behave as any visitor (D-068): they judge the dry ground they can reach, and if there is none they are homesick.

## 5. Building land: mounds and platforms

Ground built up in the water is a **mound**. Every terrain addition on a Water planet (the player's Add tool or a Builder fill) is recorded as one.

- **Soil alone washes away.** An unanchored mound is returned to the original seabed in pieces after 2 400 ticks (80 seconds). Nothing is refunded and nothing is created: the water takes it.
- **A platform anchors it.** A Builder lays a **platform** under a mound when the stock holds 30 units of a structural material (scrap metal or plastic chips, which on a Water planet must be shipped in unless the seabed is metal or plastic) **and** 12 units of soil. Both are taken together, once, after the mound is checked again; a platform that cannot be paid for costs nothing. A platform is a patch (D-069) of its material, so it also changes the ground colour and the habitat there.
- **The Builder levels nothing on an ocean** (added while building): trimming or filling the seabed would only make mounds that wash away, and a mound waiting for its platform is protected from it.
- **Dry ground needs both.** A plant or an antenna can stand only where the ground is above the water and inside an anchored platform. Walkers' graph nodes exist only on dry ground, so roads can be worn only on a platform island.

The Water planet's own broadcast needs an antenna, so an ocean cannot call for neighbours until someone has built it an island. That is intended.

## 6. Left out, on purpose

Waves, currents, buoyancy, tides, weather; ships and floating things; fishing; oxygen and a swimmer dying; partial lakes and water on land planets; water freezing or boiling; rivers; more than one aquatic species; a swimmer's own road or lane network; drawing the water in the system overview with refraction. Each would need its own decision.

## 7. Acceptance

See spec, *Water acceptance* (WAT-T1–T9). The last one runs the whole story: a Glassfin planet, a dug seabed, a mound that washes away, a mound that is anchored and keeps a plant and a road, and a land creature that is refused and then accepted.
