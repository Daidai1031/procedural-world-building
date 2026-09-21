# Exercise 05 — Voxel Terrain

**Date:** 2026-09-17  
**Course section:** Lesson 3 — Voxels  
**Project:** [`worldbuilding-guidebook`](../../worldbuilding-guidebook/)  
**Implemented:** 2026-09-21  
**Main implementation:** [`src/scene/demos/voxels/`](../../worldbuilding-guidebook/src/scene/demos/voxels/) and [`content/lessons/03-voxels/`](../../worldbuilding-guidebook/content/lessons/03-voxels/)  
**Status:** Implemented as Lesson 03 (12 steps); Web Workers and Dual Contouring are documented, not built

> The sections up to "Optimization directions to explore" are the assignment plan
> and the concepts, written before the code. The sections from "What was built"
> onward record the implementation, the measured results, and where the result
> differs from the plan.

## Exercise goal

Create a voxel-terrain experiment. Represent terrain as a
three-dimensional scalar field, combine shapes with sequential CSG operations,
extract a renderable surface with Marching Cubes, and document why larger or
higher-resolution worlds require chunking and further optimization.

```text
3D sample grid
  → density / signed-distance field
  → sequential CSG operations
  → isosurface threshold
  → mesh generation
  → normals and material
  → chunked rendering
```

## Assignment requirements

- [x] Create a voxel terrain in a different tab. *(Built as Lesson 03 of the
      guidebook, not as a separate tab.)*
- [x] Explore and implement different density shapes. *(Ground, caves and floating
      islands; the other shapes in section 3 are not built.)*
- [x] Explore and understand CSG techniques as sequential operations. *(Union,
      subtraction, intersection and an order comparison.)*
- [x] Consider size and performance limitations; explore and document why
      chunking is needed. *(Steps 02, 09 and 10.)*
- [x] Implement a meshing solution such as Marching Cubes.
- [x] Document and understand the features of alternative meshing techniques.
      *(Surface Nets and greedy meshing are implemented; the rest are described.)*
- [x] Explore ways to optimize a voxel structure. *(Chunks, dirty-chunk reuse,
      greedy meshing, level of detail. Workers are not built.)*

## 1. Voxels, volume, and density

A **voxel** is the three-dimensional counterpart of a pixel: one sample or cell
in a regular 3D grid. The voxel data is not automatically visible geometry. It
first describes the inside and outside of a volume; a meshing algorithm later
turns the boundary into triangles or quads.

Two common voxel representations are:

| Representation | Stored value | Surface definition | Typical result |
| --- | --- | --- | --- |
| Binary occupancy | solid or empty | boundary between solid and empty cells | blocky terrain |
| Scalar density / signed field | continuous number | points where the field crosses an isovalue | smooth terrain |

For this exercise, a convenient convention is:

- field value `d(p) < 0`: point `p` is inside the solid;
- field value `d(p) > 0`: point `p` is outside the solid;
- field value `d(p) = 0`: the surface.

The **isovalue** does not have to be zero, but every density shape, CSG formula,
and meshing step must use the same convention.

A signed distance field (SDF) is a special scalar field whose magnitude
approximates distance to the nearest surface. Not every density field is a true
distance field. The CSG formulas below are easiest to reason about with
consistent signed fields, even though combining them may no longer preserve an
exact distance everywhere.

## 2. Resolution

**Voxel resolution** is the number of samples used along the X, Y, and Z axes.
For a cubic grid with resolution `N`:

- stored samples grow as `N³`;
- Marching Cubes evaluates `(N - 1)³` cells;
- cell size is approximately `world size / (N - 1)`.

| Resolution | Samples | Marching Cubes cells | Practical effect |
| ---: | ---: | ---: | --- |
| `16³` | 4,096 | 3,375 | fast, coarse silhouette |
| `32³` | 32,768 | 29,791 | more detail at roughly 8× the samples |
| `64³` | 262,144 | 250,047 | smoother detail, much higher memory and meshing cost |

Halving the voxel size along every axis produces about eight times as many
samples. Therefore, a visually small increase in detail can create a large CPU,
memory, and triangle-count increase.

Resolution controls the detail that can exist in the field. Meshing resolution
controls how accurately that field is converted to geometry. Increasing mesh
density cannot recover detail that was never sampled in the voxel field.

## 3. Density shapes

A scalar field can describe terrain that a height field cannot: caves,
overhangs, floating islands, enclosed rooms, and a fully volumetric planet.

Let `p = (x, y, z)`. The following fields are starting points; their signs may
need to be inverted to match the chosen inside/outside convention.

| Shape | Example field term | Produces |
| --- | --- | --- |
| Ground plane | `h(x, z) - y` | heightfield-like terrain |
| 3D fBm | `fbm3d(p)` | blobby, sponge-like mass |
| Ridged 3D | `1 - abs(fbm3d(p))` | sheets and walls |
| Terraced | quantize or smooth-step the vertical term | mesas and stepped cliffs |
| Floating islands | `fbm3d(p) - falloff(y)` | separated sky islands |
| Planet | `r + h(normalize(p)) - length(p)` | a spherical, diggable world |
| Strata | `ground + sin(y * k + fbm2d(x, z))` | layered sedimentary bands |

The slide's ground expression `h(x, z) - y` is positive below the terrain. If the
implementation uses “negative = inside,” use `y - h(x, z)`,  or invert the final
field. The important rule is consistency, not which sign convention is chosen.

### Cave-generation options

| Method | Visual behavior | Directly evaluable? | Main cost / control |
| --- | --- | --- | --- |
| Thresholded 3D noise | chambers and pockets | yes | one noise sample per voxel; threshold controls density |
| Intersection of fields | tunnel-like overlaps | yes | two or more field evaluations per voxel |
| Worms | intentional winding tunnels | no | path growth and cross-chunk lookup; control length, radius, and direction |
| 3D cellular automata | organic connected pockets | no | repeated updates across up to 26 neighbors; less direct artistic control |

“Directly evaluable” means that the field value at `p` can be computed from a
formula without first simulating or storing a path/history.

## 4. CSG — Constructive Solid Geometry

**Constructive Solid Geometry (CSG)** creates a complex volume by combining
simpler fields. With the “negative = inside” SDF convention:

| Operation | Formula | Use |
| --- | --- | --- |
| Union | `min(a, b)` | add a rock or join two volumes |
| Intersection | `max(a, b)` | keep only the overlapping region |
| Subtraction | `max(a, -b)` | carve a tunnel, room, or crater from `a` |
| Smooth union | `smin(a, b, k)` | make an organic join without a hard crease |
| Shell | `abs(a) - thickness` | create hollow objects or walls |

CSG operations are **sequential**, so order matters. A possible experiment is:

```text
base planet
  → union with surface rocks
  → subtract a tunnel field
  → subtract one spherical room
  → smooth-union an attached formation
```

Subtracting a room before unioning another solid can refill part of that room;
performing the subtraction last produces a different world. The exercise should
display or record the operation order rather than treating CSG as an unordered
list of shapes.

## 5. Mesh generation

Voxel data and renderable mesh geometry are separate layers:

- the scalar field answers “inside or outside?” at sampled positions;
- the mesher finds the boundary;
- the output mesh supplies vertices, faces, normals, and optional material data
  to Three.js.

### Marching Cubes

Marching Cubes examines each grid cell formed by eight neighboring samples.

1. Compare each corner value with the isovalue.
2. Encode the eight inside/outside results as an 8-bit case index.
3. Use the case to identify intersected cell edges.
4. Interpolate a vertex along each crossed edge from the two density values.
5. Connect the interpolated vertices into triangles.
6. Compute or estimate normals, preferably from the field gradient.

Because eight corners yield `2⁸ = 256` configurations, the algorithm uses a
case table. Interpolation places vertices between voxel samples, producing a
smoother surface than rendering one cube per occupied voxel.

The main limitations are a comparatively high triangle count, ambiguous cases
that must be handled carefully, and remeshing cost when the field changes.

### Alternative meshing techniques

| Method | Input | Look | Face count | Sharp features | Topology / trade-off |
| --- | --- | --- | --- | --- | --- |
| Culled faces | binary | blocky | medium | axis-aligned only | lowest cost; often watertight but can be non-manifold |
| Greedy meshing | binary | blocky | lowest | axis-aligned only | merges adjacent faces; may create T-junctions |
| Marching Cubes | density | smooth, beveled | high triangles | poor | medium cost; needs ambiguity handling |
| Marching Tetrahedra | density | smooth | very high triangles | poor | unambiguous, but more faces and work |
| Surface Nets | density | smooth | low quads | poor | low–medium cost; mostly manifold |
| Dual Contouring | Hermite data | smooth plus sharp | low quads | good | preserves corners; higher complexity and risk of non-manifold/self-intersection |

**Hermite data** stores surface intersections and normals. Dual Contouring uses
that information to position a representative vertex for each active cell,
which is why it can retain sharp edges that Marching Cubes tends to round.

Marching Cubes is the implementation target for this assignment. The alternatives
should be documented and compared, not all implemented.

## 6. Why chunking is needed

A single monolithic voxel grid becomes expensive because density storage,
field evaluation, meshing, and updates all grow cubically. Changing one small
area can also force the entire world mesh to be regenerated.

**Chunking** divides the world into independently managed voxel regions.

```text
world
  → chunks
      → local density samples
      → local CSG evaluation
      → local mesh
      → local collision / interaction state
```

Chunking enables:

- loading and generating only nearby terrain;
- frustum and distance culling;
- remeshing only a dirty chunk after an edit;
- moving expensive generation to a worker thread;
- using different detail levels at different distances;
- releasing distant chunk data from memory.

Chunk borders require special care. Neighboring chunks must share or sample an
extra boundary layer so the mesher sees the same values on both sides. Without
this overlap, visible cracks or inconsistent triangles can appear.

Threads or Web Workers improve responsiveness by moving field and mesh
calculation off the main UI thread. They do not reduce the total amount of work,
so chunk size, update frequency, and data transfer still need measurement.

## 7. Optimization directions to explore

- Store scalar values in typed arrays rather than nested JavaScript objects.
- Use integer indices and contiguous memory for predictable access.
- Generate only chunks within a chosen view radius.
- Cache unchanged density data and mesh results.
- Mark edited chunks and their boundary neighbors as dirty; remesh only those.
- Evaluate procedural fields lazily instead of storing an unlimited world.
- Use sparse storage when most of the volume is empty or uniform.
- Add distance-based level of detail for far chunks.
- Reuse edge vertices within the mesher to reduce duplicate vertices.
- Calculate density and mesh data in a Web Worker.
- Keep rendering, density resolution, and chunk dimensions as separate controls.
- Profile density evaluation, CSG, meshing, GPU upload, and draw cost separately.

## What was built

The plan called for a separate voxel tab. It became **Lesson 03 — Voxels** of the
guidebook instead: twelve steps, each with one live 3D demo, a short text, and a
code snippet extracted from the real source. Steps are in
[`content/lessons/03-voxels/steps/`](../../worldbuilding-guidebook/content/lessons/03-voxels/steps/);
demos and math are in
[`src/scene/demos/voxels/`](../../worldbuilding-guidebook/src/scene/demos/voxels/).

| Step | Concept | Main source |
| --- | --- | --- |
| 01 From height fields to volumes | one height per (x, z) versus a value at every (x, y, z) | [`volumeDiagram.js`](../../worldbuilding-guidebook/src/scene/demos/voxels/volumeDiagram.js) |
| 02 Voxel resolution | cubic growth of samples | [`voxelMath.js`](../../worldbuilding-guidebook/src/scene/demos/voxels/voxelMath.js) `sampleDensityGrid` |
| 03 Density shapes | ground, caves, floating islands | `groundDensity`, `cavesDensity`, `islandsDensity` |
| 04 Combining shapes with CSG | union, subtraction, intersection | `unionDensity`, `subtractDensity`, `intersectDensity` |
| 05 Operation order | the same three fields in two orders | `roomThenRockDensity`, `rockThenRoomDensity` |
| 06 Reading one cell | corner pattern, crossing points, one cell's skin | `findSurfaceEdgeTriangles` |
| 07 Marching Cubes | the rule run on every cell | [`marchingCubes.js`](../../worldbuilding-guidebook/src/scene/demos/voxels/marchingCubes.js) |
| 08 Surface Nets | one vertex per cell, quads across crossed edges | [`surfaceNets.js`](../../worldbuilding-guidebook/src/scene/demos/voxels/surfaceNets.js) |
| 09 Chunking | chunks, seams, the shared border | [`chunks.js`](../../worldbuilding-guidebook/src/scene/demos/voxels/chunks.js) |
| 10 Rebuilding what changed | dirty chunks and reuse of untouched meshes | `buildEditedChunks`, `chunkIsReached` |
| 11 Fewer faces | culled faces versus greedy meshing | [`greedyMeshing.js`](../../worldbuilding-guidebook/src/scene/demos/voxels/greedyMeshing.js) |
| 12 Level of detail | coarser chunks far from the camera, and the seams they open | [`lodChunks.js`](../../worldbuilding-guidebook/src/scene/demos/voxels/lodChunks.js) |

Tests that back the claims in this note:
[`meshing.test.mjs`](../../worldbuilding-guidebook/scripts/meshing.test.mjs),
[`chunks.test.mjs`](../../worldbuilding-guidebook/scripts/chunks.test.mjs),
[`greedy.test.mjs`](../../worldbuilding-guidebook/scripts/greedy.test.mjs), and
[`lod.test.mjs`](../../worldbuilding-guidebook/scripts/lod.test.mjs).

## Decisions made while building

- **Sign rule:** negative inside, as in section 1. `ISOVALUE` is fixed at 0 and is
  not a control. The lesson text says "sdf" or "value", never bare "density",
  because a larger density suggests more solid, and here larger means more air.
- **Density shapes built:** the ground plane `y - h(x, z)`, thresholded 3D noise
  for caves, and floating islands. The 3D noise is value noise, not gradient
  noise. Ridged, terraced, planet and strata fields, and worm or cellular-automata
  caves, were **not** built.
- **CSG built:** union, subtraction, intersection with the exact formulas of
  section 4. Smooth union and shell were **not** built.
- **The volume is closed by padding.** Samples below the volume count as solid, so
  no floor is drawn, and samples past every other side count as air, so the volume
  reads as a cut-away block. The mesher therefore runs over `N + 1` cells along x
  and z and `N` along y, which is more than the `(N - 1)³` of section 2.
- **The Marching Cubes table is generated, not typed.** Step 06 draws a cell's skin
  by joining crossed edges that share a face. Step 07 runs that same rule for all
  256 corner patterns when the file loads. An ambiguous face is resolved per face,
  which is what keeps neighbouring cells from disagreeing.
- **Triangle winding comes from the inside-to-outside edge direction.** Gradient
  normals read from padded samples had flipped triangles near the volume edge, and
  the culled faces showed as white slits. Vertices next to padding now take the
  flat normal of their triangle.
- **A chunk holds its own samples plus a border of 2.** A cell reaches one sample
  past its chunk, so one layer of border is enough for the *positions*. The lighting
  needs one more. Measured at 32 samples in 4 × 4 × 4 chunks: with a border of 1 the
  triangles land in exactly the same places as the whole volume, but the normals of
  860 (ground) and 1,771 (caves) triangles differ, so a faint shading seam would
  show. With a border of 2 both are identical.
- **Each chunk works out its own field.** A chunk evaluates the density function for
  the samples it holds, including its border, rather than copying them from a
  neighbour. Two chunks therefore compute the border samples twice.
- **The edit in Step 10 is a dent, not a CSG subtraction.** `max(ground, -sphere)`
  changes values a long way from the sphere: deep ground samples, and samples on
  steep slopes. No bounding box was safe, and 36 of 169 test positions left a changed
  chunk unmarked even with a margin of four samples. The dent adds a bump that is
  exactly zero beyond its radius, so a chunk is dirty exactly when the sphere comes
  within its held box.
- **Level of detail has its own layout.** Steps 09 and 10 split a volume of `N`
  samples, and the padding cells make `N` a poor multiple. Step 12 instead uses 4 × 4 × 4
  chunks of 8 cells, so the volume is 32 cells across (33 samples), and every chunk
  boundary is a multiple of 4. A chunk at level 0, 1 or 2 therefore always lands
  its boundary on a sample of its own lattice, whatever its neighbour uses. The
  Marching Cubes mesher gained a `step` argument for this: a level is a step of
  1, 2 or 4 samples.
- **The level follows the learner's camera and is chosen per column.** All chunks
  above one spot on the ground share a level, chosen by the distance from the camera
  to a point 2 units above the column's centre. Chunks stacked in a column therefore
  never meet across a level change. A column is at full detail closer than 8.5 world
  units, and each level after that reaches 2.5 further. Two neighbouring column
  centres are at most 2.12 apart, so by the triangle inequality their distances to
  any camera differ by less than 2.5 and their levels by at most one. That is tested
  for 405 camera positions all round the volume. The scene reads the camera every
  frame and only draws again when a column changes level.
- **Seams are snapped, not stitched.** Where two levels meet, the two meshes end at
  different heights along the shared edge. Every point of the finer chunk that lies
  on such a side is moved, inside the plane of the side, to the nearest point on the
  edge where the coarser column's surface ends, and takes the normal interpolated
  along that edge. The triangle count does not change. The two meshes still do not
  share vertices, so a hairline can remain where a straight piece of the fine edge
  cuts across a bend in the coarse one. Stitching them properly, as the Transvoxel
  method does, was not built. A point on the corner where two such sides meet is
  snapped to the first side only. Only the ground was tried, so overhangs and caves,
  where the nearest point on the edge could belong to another strand of the
  surface, were not checked.
- **An earlier attempt hid the gap with skirts** (a wall hung down from each open
  edge). The gap stayed easy to see in the shading and in the outline of the
  surface, and the wall cannot make the surfaces meet, so it was replaced by snapping.

## Measured results

Measured in Node on one machine. Timings are the median of 3 to 5 runs after the
code was warm. Treat the milliseconds as relative, not absolute: a browser is
slower and other machines differ.

**Same field at three resolutions** (samples, Marching Cubes triangles, time for
field sampling plus meshing):

| Shape | Resolution | Samples | Triangles | Time |
| --- | ---: | ---: | ---: | ---: |
| Ground | 16 | 4,096 | 1,610 | 19 ms |
| Ground | 32 | 32,768 | 6,962 | 61 ms |
| Ground | 64 | 262,144 | 29,034 | 325 ms |
| Caves | 16 | 4,096 | 2,126 | 10 ms |
| Caves | 32 | 32,768 | 9,412 | 66 ms |
| Caves | 64 | 262,144 | 39,654 | 406 ms |
| Islands | 16 | 4,096 | 2,760 | 14 ms |
| Islands | 32 | 32,768 | 11,912 | 78 ms |
| Islands | 64 | 262,144 | 48,900 | 430 ms |

Samples grow by 8× per doubling, as section 2 says. Triangles grow by only about
4×, because they follow the surface area, not the volume.

**Sequential CSG** (solid samples out of 32,768, at 32 samples per side):

| Field | Solid samples |
| --- | ---: |
| Ground | 11,552 |
| Ground ∪ sphere | 12,852 |
| Ground − sphere | 11,144 |
| Ground ∩ sphere | 408 |
| Carve the room, then add the rock | 11,994 |
| Add the rock, then carve the room | 11,378 |

The last two use the same three fields. Only the order differs, and the results
differ by 616 solid samples, which is the part of the room the rock refills.

**Marching Cubes versus Surface Nets** at 32 samples. A sliver is a triangle whose
quality measure (4√3 · area / sum of squared edge lengths) is below 0.3.

| Shape | MC triangles | MC slivers | SN triangles | SN slivers |
| --- | ---: | ---: | ---: | ---: |
| Ground | 6,962 | 10.0% | 6,836 | 2.1% |
| Caves | 9,412 | 11.0% | 9,228 | 3.0% |
| Islands | 11,912 | 11.9% | 11,924 | 1.6% |

**Chunking** at 32 samples. Without a border, a chunk cannot read the corners of
its last row of cells, so nobody meshes that row. With a border, the chunks
together make exactly the triangles of the whole volume, positions and normals.

| Shape | Chunks | Triangles missing without a border | Samples held with a border, relative to the whole grid |
| --- | ---: | ---: | ---: |
| Ground | 2 × 2 × 2 | 5.1% | 2.21× |
| Ground | 4 × 4 × 4 | 19.3% | 3.74× |
| Caves | 2 × 2 × 2 | 3.0% | 2.21× |
| Caves | 4 × 4 × 4 | 22.0% | 3.74× |
| Islands | 2 × 2 × 2 | 10.5% | 2.21× |
| Islands | 4 × 4 × 4 | 25.7% | 3.74× |

The border is real extra work, and a larger share of it the smaller the chunk.
Building all chunks with a border at 32 samples took 101 to 181 ms in this run,
against 61 to 78 ms for one grid, so chunking alone does not make one full build
faster. Its payoff is in what does not have to be rebuilt.

**Rebuilding after an edit** (a dent moved over 169 positions):

| Resolution | Chunks | Chunks reached, average | Time, reached only versus all |
| ---: | ---: | ---: | ---: |
| 32 | 2 × 2 × 2 = 8 | 3.3 | 0.51 |
| 32 | 4 × 4 × 4 = 64 | 13.0 | 0.27 |
| 64 | 4 × 4 × 4 = 64 | 10.3 | 0.21 |

Reusing the untouched chunks gave a mesh identical to rebuilding everything in
every tested case (2 resolutions × 2 chunk counts × 7 positions).

**Greedy meshing versus culled faces** (quads):

| Shape | Resolution | Culled | Greedy | Greedy / culled |
| --- | ---: | ---: | ---: | ---: |
| Ground | 16 | 838 | 249 | 0.30 |
| Ground | 32 | 3,546 | 1,167 | 0.33 |
| Ground | 64 | 14,646 | 4,792 | 0.33 |
| Caves | 32 | 4,830 | 1,902 | 0.39 |
| Caves | 64 | 20,064 | 7,318 | 0.36 |
| Islands | 32 | 5,962 | 2,331 | 0.39 |
| Islands | 64 | 24,454 | 8,509 | 0.35 |

Both meshes cover exactly the same area on every plane. Greedy took about as long
to build as culled.

**Level of detail** on the 4 × 4 × 4 layout (33 samples across, ground only).
Triangles of the whole volume with every chunk at one level:

| Level | Samples used | Triangles | Relative to level 0 |
| --- | --- | ---: | ---: |
| 0 | every sample | 7,388 | 1.00 |
| 1 | every 2nd | 1,840 | 0.25 |
| 2 | every 4th | 468 | 0.063 |

Triangles for a mix of levels, with the camera at different places (three levels):

| Camera | Levels of the 16 columns | Triangles | Relative to level 0 |
| --- | --- | ---: | ---: |
| Starting view (6, 5, 8) | 0 to 2, all three | 2,062 | 0.28 |
| Opposite side (−6, 5, −8) | 0 to 2, all three | 2,052 | 0.28 |
| Close (0, 3, 3) | all 0 | 7,388 | 1.00 |
| Far (0, 20, 0) | all 2 | 468 | 0.06 |

Building every chunk from scratch took 114 ms with all chunks at level 0 and 28 ms
from the starting view (median of 5 runs, Node). When a column changes level, only the
chunks that changed are meshed again; snapping every chunk of the starting layout
took 5.6 ms once the meshes were cached.

The height difference between two meshes at a shared edge was measured with vertical
rays just inside each chunk, at 589 points along the seams of five layouts of levels.
Left open, the largest difference was 0.356 world units, about two finest cells (one
sample is 0.19 units). Snapped, it was 0.011, under a tenth of a finest cell.
`lod.test.mjs` requires the snapped difference to be under a fifth of the open one.

A chunk at level 0 makes exactly the triangles and normals of the whole volume, and
a whole volume at level 1 or 2 makes exactly those of the whole volume meshed with a
step of 2 or 4. That shows the chunks share out the cells with no gap and no overlap.

## Corrections to the plan

- **Section 5 says Surface Nets makes "low quads" and Marching Cubes "high
  triangles". Measured, the two make about the same number of faces.** Surface Nets
  has 0.98 to 1.00 of the Marching Cubes triangle count once each quad is counted as
  two triangles. What differs is the *shape*: about one Marching Cubes triangle in
  ten is a thin sliver, against 2 to 3 in a hundred for Surface Nets.
- **Section 6 says a missing border leaves "visible cracks or inconsistent
  triangles".** In this implementation it leaves a missing row of cells along every
  seam, so a slit opens where the chunks meet.
- **Section 7 lists "reuse edge vertices within the mesher".** Not done: every mesh
  here is a triangle list without an index buffer.

## Not built

A Web Worker, sparse storage, lazy evaluation of an unlimited world, Dual
Contouring, Marching Tetrahedra, smooth union, shell, and the density shapes and cave
methods listed above. Step 11 names workers and Dual Contouring and says they are
not built. Within level of detail, exact stitching of the seams (Transvoxel), and
levels that change smoothly as the camera moves instead of jumping, were not built. Typed arrays are used throughout
(`Float32Array` for every grid and mesh), but no comparison against another storage
was measured.

## Verification

- [x] The voxel terrain opens: all twelve steps load at `/lesson/voxels/<step>`
      with the right titles and no console errors (checked in a browser).
- [x] All density modes return finite values: the eight fields (ground, caves,
      islands, three CSG operations, two CSG orders) were sampled at 16 per side.
- [x] CSG order changes the result predictably: 11,994 versus 11,378 solid samples.
- [x] Marching Cubes generates valid positions and normals: `meshing.test.mjs`
      checks that both are finite and that the winding agrees with the normals.
      There are no indices; the mesh is a triangle list.
- [x] Chunk boundaries do not show cracks: `chunks.test.mjs` shows that chunks with
      a border make exactly the triangles of the whole volume.
- [x] Build and lint pass. `npm test` passes except one test that already failed
      before this work: "Lesson 02 has two complete chapters" (a frontmatter parsing
      error on a Lesson 02 step).
- [x] Performance measurements recorded for multiple resolutions: see above.
- [ ] Nothing here was measured in a browser frame loop, so the numbers do not show
      frame time, GPU upload or draw cost.

## Practical takeaways

- A voxel is data in a 3D field, not automatically a rendered cube.
- Resolution grows cubically, so detail becomes expensive quickly.
- CSG edits the scalar field before meshing and must follow an explicit order.
- Marching Cubes extracts a smooth isosurface but can create many triangles.
- Chunking localizes generation, rendering, and edits; it is the foundation for
  an interactive large voxel world.
- Optimization should be guided by measured density, meshing, transfer, and
  rendering costs rather than one undifferentiated frame-time number.

## Follow-up experiments

- [ ] Compare blocky greedy meshing with smooth Marching Cubes on the same world,
      side by side. *(Culled versus greedy and Marching Cubes versus Surface Nets
      are done, but not greedy versus Marching Cubes.)*
- [x] Add an interactive dig operation and remesh only the affected chunks. *(Step 10,
      with sliders rather than a click.)*
- [ ] Compare main-thread generation with a Web Worker.
- [ ] Test a planet field that supports tunnels through the full volume.
- [x] Explore Surface Nets or Dual Contouring after the Marching Cubes baseline.
      *(Surface Nets only.)*
- [x] Add distance-based level of detail to the chunks, and check that two levels
      can meet without a crack. *(Step 12. The levels follow the camera and the
      seams are snapped together, not stitched; only the ground was tried.)*
- [ ] Stitch the seams between levels properly (Transvoxel) and compare the result
      with snapping, including on caves and overhangs.
- [ ] Measure frame time, GPU upload and draw cost in the browser, separately from
      meshing time.
- [ ] Reuse edge vertices with an index buffer and measure the memory saved.
