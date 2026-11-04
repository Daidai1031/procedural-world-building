# Planet surfaces — implementation brief (D-060)

| | |
| --- | --- |
| **Audience** | Whoever implements or retunes planet materials |
| **Status** | Designed and built on 2026-10-30. Open items are in [`roadmap.md`](roadmap.md) S6. |
| **Decision record** | [`decisions.md`](decisions.md) D-060 (surfaces), D-061 (surface memory), D-062 (rename) |
| **Requirements** | [`spec.md`](spec.md) §4.21 SUR-01 – SUR-14 and tests SUR-T1 – SUR-T8 |
| **Values** | Rule and visual numbers live in `src/content/surfaces.ts`; shared thresholds in `tuning.surface`; colors in `palette.surface` |

## 1. The idea

A material is a planet's physical personality, not a skin. Each signal planet draws one material from its seed, and that one draw changes how digging feels, how well each robot works and how residents react. It is the sixth seeded dimension of `planetConfig` after size, relief, minerals, residents and shape (D-041).

Ares-9 stays rock. Six materials exist: rock, metal, plastic, fur, jelly and ice. "Glass planet" in early notes is the ice planet.

## 2. The table

| Material | Digging | Robots | Residents | Company line | Look |
| --- | --- | --- | --- | --- | --- |
| Rock | Baseline | Baseline | Baseline | "Empty. Awaiting development." | Contoured gray stone, D-027 |
| Metal | Hard, slow, loud; spiral swarf at the cut | Miner power ×2; Rigger's antennas conduct best, one broadcast counts twice | Noise ×2, residents move sooner | "Premium alloy world. Ideal for luxury estates." The loudest broadcast, the shortest road to Erased | Mirror reflection of space; contours become engraved grooves; dug ground becomes brushed scratches |
| Plastic | Clean cut, cheap | Builder most efficient; Gardener grows nothing | No plants to lean on, fewer residents; dug soil becomes colored microplastics that stay in the atmosphere forever | "Planet™. 100% recyclable*" with the small print "*not really" | Glossy toy, saturated hard color bands, contours become mold parting lines |
| Fur | Soft and quiet; pits are slowly covered by regrowing fur | Gardener shears patterns instead of planting; Builder's Flatten becomes combing | Noise ×0.5, residents' favorite; a shaved patch exposes them | "Wool futures: shear the planet every quarter." | Shell hair; dug ground is bald; hair moves in the wind |
| Jelly | Wobbles when dug; a pit springs back within tens of seconds | Miner must keep digging to hold a tunnel open; high power bill | Translucent: residents underground are visible from orbit | "Snack-grade planet. Theme-park conversion advised." | Transmission; surface ripples when disturbed |
| Ice | Brittle: every dig chips off a chunk; cracks stay forever | Robot heat melts nearby ground; a robot parked too long sinks | Crystal Crown's home world; a crack can sever a burrow | "Natural premium drinking water resource." | Translucent ice; world-space Voronoi cracks |

## 3. Data

- `src/content/surfaces.ts` holds one entry per material: name, the six rule parameters (`hardness`, `elasticity`, `brittleness`, `noise`, `conductivity`, `price`), crew multipliers, species affinity, company lines and visual parameters.
- `PlanetConfig` gains `surface`. It is drawn from a new stream, `${seed}:surface`, so `${seed}:config`, `${seed}:shape` and `${seed}:resource:mineral` read exactly what they read before: every existing seed keeps its size, shape and mineral positions. Home seeds are always `rock`.
- Colors go in `palette.surface.*`, so the rule "models use palette colors only" keeps holding.

**Rule readings chosen for the build:**

| Parameter | Meaning in play |
| --- | --- |
| `hardness` | Brush radius ÷ cbrt(hardness), so one click removes 1/hardness of the volume; manual cost per sample × hardness, so a click costs the same; Miner dig step ÷ hardness |
| `elasticity` | Above 0 the ground springs back to its original shape once a chunk has rested |
| `brittleness` | Above 0 digging chips off a seeded polyhedron and spreads cracks around the cut |
| `noise` | Multiplies every disturbance added to `habitat.sources` |
| `conductivity` | Multiplies exposure per broadcast and how many signals one broadcast counts as |
| `price` | Multiplies the sale price of minerals mined on this planet |

## 4. Surface memory: `aEdit`

Every terrain mesh vertex carries `aEdit`, a `vec3` with three channels, all 0–1:

| Channel | Name | Written by | Fades? | Used for |
| --- | --- | --- | --- | --- |
| x | scar | every density edit | **never** | Fresh rock, metal brushing, plastic stress whitening, ice cracks, jelly bruises, pale regrown fur |
| y | bald | digging and shearing on fur | regrows | Fur length |
| z | comb | Builder on fur | regrows | Hair lies flat |

**Why not plain "current density − initial density".** The first sketch computed the attribute that way. When jelly springs back, or a pit is filled, that difference returns to zero and the mark vanishes, which breaks the requirement that memory moves from geometry to surface. So `PlanetWorld` keeps a per-sample `wear` grid and stores the largest difference a sample has ever had. Every planet caches its initial density for this; elastic planets also return to it. Air that stays air is skipped, or a pit's rim would get a halo.

**Why the vertex takes the larger of its two samples.** A marching-cubes vertex lies between one sample inside the solid and one outside. After a dig only the outside sample changed, so interpolating would make the scar depend on the sub-voxel crossing point and draw bands along every wall.

The attribute flows through `buildMarchingMeshInCells` → `buildChunk` / `buildLodChunk` → `snapToCoarseEdges` → `mergeChunks` → `PlanetView`. A geometry without it (the home page's hero) reads zero, which is an untouched planet.

## 5. Rendering

`createTerrainMaterial` keeps the shared GLSL: world-space grain, height, slope, contours, resource glow, work area, atmosphere limb. A recipe per material picks the three.js class and adds a few uniforms and lines.

| Material | Class | Recipe |
| --- | --- | --- |
| Metal | `MeshStandardMaterial` | `metalness` 0.9, `roughness` 0.3, env map from a PMREM of a small space scene. Contours raise roughness instead of changing color. `scar` adds world-space stripe noise |
| Plastic | `MeshPhysicalMaterial` | `clearcoat` 1, `clearcoatRoughness` 0.08, `step`-cut color bands, thin bright parting lines, stress whitening |
| Fur | `MeshPhysicalMaterial` with `sheen`, plus shells | One instanced draw per chunk, N shells by `gl_InstanceID`. Each shell moves out along the normal by `shell × length × (1 − bald)` with a little droop and wind. The fragment hashes the unmoved position so a strand stays coherent across shells. Far chunks show only the sheen |
| Jelly | `MeshPhysicalMaterial` | `transmission` 0.9, `thickness`, `ior` 1.35, attenuation. Vertex ripples read up to 32 disturbance sources |
| Ice | `MeshPhysicalMaterial` | Transmission, low roughness, world-space Voronoi cracks scaled by `scar` |

**Cost note.** Transmissive surfaces force one more scene pass, but fur is the expensive one: see the measurements in [`tuning.md`](tuning.md). Jelly and ice lower `transmissionResolutionScale`, the system view always uses an opaque variant, and fur halves its shells whenever frames stay slow, down to the sheen alone. Frame rate on a low-end laptop is a required playtest item, not an assumption.

## 6. Mechanics

- **Hardness, noise, conductivity, price:** one lookup through `surfaceOf(seed)` at the place each rule is already computed.
- **Rebound (`world.settle`):** after a chunk rests, `density += (base − density) × k`. Dirty chunks go through the existing `RemeshScheduler`. A chunk being edited never settles, so only continuous digging holds a tunnel open. Rebound notifies structures and residents through the normal ground-change path.
- **Regrowth:** the same pass fades `bald` and `comb`. `scar` stays, so regrown fur is paler.
- **Chips:** on a brittle planet, a dig that removes enough rock also carves a seeded convex polyhedron next to the brush, spreads the scar past the brush and may plug a nearby burrow tunnel.
- **Melt:** on ice a robot that stays in one place melts the ground under it and sinks with it.
- **Shearing:** on fur the Gardener walks a pattern (stripes, rings, spiral) chosen in its panel. Autopilot and new planets start from a seeded pattern. A shaved spot no longer shelters a resident.
- **Combing:** on fur the Builder's Flatten job writes `comb` instead of cutting.
- **Microplastics:** `PlanetWorld` counts excavated samples; the atmosphere draws more colored points as that count grows. It never goes down.
- **Species:** `planetSpecies` adds a surface affinity to its score: Moss Cap likes fur, Crystal Crown likes ice.
- **Sound:** each material has a Web Audio voice for digging, synthesized at runtime. Sound starts after the first gesture and has a mute button.

## 7. Order of work

1. Data layer, rules, tests.
2. `aEdit`.
3. Plastic, metal.
4. Fur.
5. Ice.
6. Jelly.
7. Sound.
8. Rename to Tiny Dent.

Check each with `npm test`, `npm run build` and a screenshot of a planet of that material.

## 8. Out of scope for now

- A magnetic species clinging to tunnel walls on metal. The table says it "can" exist; it needs a tenth body. Metal currently favors the Cyclops Sentinel.
- The Erased ending. Metal raises exposure; endings are still unbuilt.
- Spiral swarf at the cut. Not built; metal's digging reads through its sound and the brushed scar.
