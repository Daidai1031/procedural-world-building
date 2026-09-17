# Exercise 05 — Voxel Terrain

**Date:** 2026-09-17  
**Course section:** Lesson 3 — Voxels  
**Project:** [`seedling`](../../seedling/)  
**Main implementation:** Not started  
**Status:** Planned

> This note records the assignment plan and the concepts that must be tested in
> code. After implementation, replace planned sections with source-file links,
> measured results, observed behavior, and verification evidence.

## Exercise goal

Create a voxel-terrain experiment in a separate tab. Represent terrain as a
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

- [ ] Create a voxel terrain in a different tab.
- [ ] Explore and implement different density shapes.
- [ ] Explore and understand CSG techniques as sequential operations.
- [ ] Consider size and performance limitations; explore and document why
      chunking is needed.
- [ ] Implement a meshing solution such as Marching Cubes.
- [ ] Document and understand the features of alternative meshing techniques.
- [ ] Explore ways to optimize a voxel structure.

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

- field value (d(p) < 0): point (p) is inside the solid;
- field value (d(p) > 0): point (p) is outside the solid;
- field value (d(p) = 0): the surface.

The **isovalue** does not have to be zero, but every density shape, CSG formula,
and meshing step must use the same convention.

A signed distance field (SDF) is a special scalar field whose magnitude
approximates distance to the nearest surface. Not every density field is a true
distance field. The CSG formulas below are easiest to reason about with
consistent signed fields, even though combining them may no longer preserve an
exact distance everywhere.

## 2. Resolution

**Voxel resolution** is the number of samples used along the X, Y, and Z axes.
For a cubic grid with resolution (N):

- stored samples grow as (N^3);
- Marching Cubes evaluates ((N - 1)^3) cells;
- cell size is approximately (	ext{world size} / (N - 1)).

| Resolution | Samples | Marching Cubes cells | Practical effect |
| ---: | ---: | ---: | --- |
| (16^3) | 4,096 | 3,375 | fast, coarse silhouette |
| (32^3) | 32,768 | 29,791 | more detail at roughly 8× the samples |
| (64^3) | 262,144 | 250,047 | smoother detail, much higher memory and meshing cost |

Halving the voxel size along every axis produces about eight times as many
samples. Therefore, a visually small increase in detail can create a large CPU,
memory, and triangle-count increase.

Resolution controls the detail that can exist in the field. Meshing resolution
controls how accurately that field is converted to geometry. Increasing mesh
density cannot recover detail that was never sampled in the voxel field.

## 3. Density shapes

A scalar field can describe terrain that a height field cannot: caves,
overhangs, floating islands, enclosed rooms, and a fully volumetric planet.

Let (p = (x,y,z)). The following fields are starting points; their signs may
need to be inverted to match the chosen inside/outside convention.

| Shape | Example field term | Produces |
| --- | --- | --- |
| Ground plane | (h(x,z) - y) | heightfield-like terrain |
| 3D fBm | (operatorname{fbm3d}(p)) | blobby, sponge-like mass |
| Ridged 3D | (1 - |operatorname{fbm3d}(p)|) | sheets and walls |
| Terraced | quantize or smooth-step the vertical term | mesas and stepped cliffs |
| Floating islands | (operatorname{fbm3d}(p) - operatorname{falloff}(y)) | separated sky islands |
| Planet | (r + h(operatorname{normalize}(p)) - |p|) | a spherical, diggable world |
| Strata | ground term plus (sin(y k + operatorname{fbm2d}(x,z))) | layered sedimentary bands |

The slide's ground expression (h(x,z)-y) is positive below the terrain. If the
implementation uses “negative = inside,” use (y-h(x,z)), or invert the final
field. The important rule is consistency, not which sign convention is chosen.

### Cave-generation options

| Method | Visual behavior | Directly evaluable? | Main cost / control |
| --- | --- | --- | --- |
| Thresholded 3D noise | chambers and pockets | yes | one noise sample per voxel; threshold controls density |
| Intersection of fields | tunnel-like overlaps | yes | two or more field evaluations per voxel |
| Worms | intentional winding tunnels | no | path growth and cross-chunk lookup; control length, radius, and direction |
| 3D cellular automata | organic connected pockets | no | repeated updates across up to 26 neighbors; less direct artistic control |

“Directly evaluable” means that the field value at (p) can be computed from a
formula without first simulating or storing a path/history.

## 4. CSG — Constructive Solid Geometry

**Constructive Solid Geometry (CSG)** creates a complex volume by combining
simpler fields. With the “negative = inside” SDF convention:

| Operation | Formula | Use |
| --- | --- | --- |
| Union | (min(a,b)) | add a rock or join two volumes |
| Intersection | (max(a,b)) | keep only the overlapping region |
| Subtraction | (max(a,-b)) | carve a tunnel, room, or crater from (a) |
| Smooth union | (operatorname{smin}(a,b,k)) | make an organic join without a hard crease |
| Shell | (|a|-	ext{thickness}) | create hollow objects or walls |

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

Because eight corners yield (2^8 = 256) configurations, the algorithm uses a
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

## Planned interface and implementation evidence

The new voxel tab should make the important decisions visible rather than hiding
them in code. Candidate controls and readouts are:

- density-shape selector;
- field resolution and world size;
- isovalue;
- ordered CSG-operation list;
- primitive position, size, and smoothing amount;
- wireframe and chunk-boundary toggles;
- chunk size and view radius;
- voxel count, active-cell count, triangle count, generation time, and memory
  estimate.

Record at least:

1. the same field at three resolutions;
2. at least three density shapes;
3. a sequential CSG example with before/after views;
4. a Marching Cubes result;
5. one comparison with an alternative meshing technique;
6. measured evidence showing why the terrain should be chunked.

## Source files

Source files will be linked here after the new voxel tab and implementation
structure exist. Do not claim implementation results before they have been
built and tested.

## Observed behavior

Not recorded yet. Add visual and performance observations after implementation.

## Verification

- [ ] The voxel terrain opens in a separate tab.
- [ ] All density modes return finite values.
- [ ] CSG order changes the result predictably.
- [ ] Marching Cubes generates valid positions, indices, and normals.
- [ ] Chunk boundaries do not show cracks.
- [ ] Build and lint pass.
- [ ] Performance measurements are recorded for multiple resolutions.

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

- [ ] Compare blocky greedy meshing with smooth Marching Cubes on the same world.
- [ ] Add an interactive dig operation and remesh only the affected chunks.
- [ ] Compare main-thread generation with a Web Worker.
- [ ] Test a planet field that supports tunnels through the full volume.
- [ ] Explore Surface Nets or Dual Contouring after the Marching Cubes baseline.
