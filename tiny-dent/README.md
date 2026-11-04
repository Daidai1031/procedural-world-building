# Tiny Dent

> “We’re here to put a dent in the universe.”

A browser-based procedural sandbox where players freely reshape different planets, using manual tools and autonomous robots.

## Design direction and next step

**Planet starting conditions → player choices and robot work → environmental change → resident responses → different planetary outcomes.**

Players can pursue resource extraction, ecological flourishing, or strange planetary forms. There is no single ideal planet. The next development focus is a readable connection between terrain edits, habitat conditions, and residents choosing where to live.

### System architecture

The current game is organized into **7 planet layers** (terrain, materials, vegetation/infrastructure, habitat, colonies, movement/roads, local logistics) and **3 system layers** (planet network, transport/migration, economy/global simulation).

See the [ten-layer architecture and source map](../README.md#system-architecture--系统层与技术) for the current implementation and its limits. The project homepage visualizes these scales in its **System atlas**.

### Current implementation

- **Manual tools:** Dig, Add Terrain, Flatten, and a bounded Detector.
- **Miner:** assign a spherical area and Start; it scans, chooses a mineral, hovers to an entry, excavates and collects, then repeats.
- **Gardener / Rigger:** the Gardener surveys suitable ground and plants vegetation that spreads; the Rigger builds antennas.
- **Builder:** repairs local holes first, then trims isolated obstructions, using the shared soil stock. Prepared sites can wake a waiting Gardener.
- **Operations:** mineral storage/sales, soil stock, electricity billing, debt warning and bankruptcy; communicator messages explain operating problems.
- **Resources and logistics:** each planet keeps material inventories. Spaceports and weighted routes support cargo and passengers; Builders spend stock on terrain, habitat patches, roads and platforms.
- **Exploration:** returnable outer-surface walking as the Quiet Drifter, in third or first person, landing sites and an updating 2D atlas. The Drifter's model, clips and board live in `docs/drifter/` (D-064).
- **Planet materials:** rock, metal, plastic, fur, jelly and ice change digging, the crew and residents. Marks stay on the surface even where the ground heals (D-060, D-061).
- **Sound:** each material has its own synthesized digging voice.
- **Discovery/travel:** broadcasts reveal distant planets. Visited sites retain their state for return; funds are shared, and the system overview shows connected worlds.

### Planned next

Species now evaluate habitat fit, form proximity-based colonies and can migrate with persistent passports. Ground service trips create traffic heat, and Builders upgrade busy paths into roads. Dynamic supply-and-demand pricing and simultaneous local simulation of all planets remain future work.

The desired money interface is compact: detailed accounting may remain internal, while operating restrictions and critical warnings remain understandable. The current debt/game-over rule is retained until a replacement is explicitly decided.

See [design](docs/design.md), [requirements](docs/spec.md), and [roadmap](docs/roadmap.md).

## Run locally

Requires Node.js 22.12+ (or a newer supported release) and npm.

```powershell
cd tiny-dent
npm.cmd install
npm.cmd run dev
```

Open the URL printed by Vite, using the path `/game/?seed=1380&debug=1`
(normally http://localhost:5173/game/?seed=1380&debug=1).
The overlay is opt-in; without `debug=1` it is hidden. Without `seed`, each
page load creates a new seed. Copy the displayed seed into the URL to replay it.

The planet stays still. Right-drag to orbit the camera; left-click the terrain
to use the selected mode. Use the three mode buttons or press `F` to cycle Dig,
Add Terrain, and Flatten. Alt+left click temporarily adds terrain, and Ctrl+left
click temporarily flattens. If the browser captures either combination, use
`F` and plain left click. Adjust brush size with the slider or mouse wheel.
Flatten defaults to **Planet Surface**: the plane through the clicked point is
perpendicular to the line from the planet center, making a local terrace even
on the planet's side. When Flatten is selected, choose **Horizontal** for the
older global-Y platform. The hover disc follows the chosen plane. Dig and Add
Terrain use round brushes.
Planet Remaining updates as solid samples are removed or added. Manual terrain edits currently incur per-sample operating charges; Builder fills consume shared soil. The legacy canister/fixed-energy budget is not the active limit.
The rendered planet now uses three detail levels: nearby chunks keep the full
mesh, while distant chunks use coarser meshes. Fine edges snap to coarse edges
at their shared boundary. LOD preparation is spread over frames and a change
appears only when all its meshes are ready. The debug overlay shows the number
of visible chunks at each level (`LOD 0/1/2`). Terrain edits still change the
same full-resolution density grid.

Click **Detector** or press `D`, then left-click the planet to scan a small
region. The scan shows a subdued local terrain wireframe and nearby buried
mineral signals, faded by distance from the clicked point. Buried targets stay hidden outside
Detector mode; exposed targets remain visible. Click elsewhere to move the
scan. Press `T` or click **Terrain** to return to editing. The seeded markers
are early target proxies. Miner mineral collection and inventory sales are implemented; fuller irregular deposits and separate scan costs remain later work.

`npm.cmd run build` type-checks and writes `dist/`.
`npm.cmd test` checks seed determinism, terrain edits, detector locality and
exposure, chunk borders, and mixed-detail LOD seams.
`npm.cmd run preview` serves the production build locally.
Use `npm` instead of `npm.cmd` in shells where PowerShell's execution policy
is not blocking the npm PowerShell shim. All package scripts are cross-platform.

## Same site, independent applications

This app owns its package, dependencies and build. Its Vite base is `/game/`.
It does not import from or build the guidebook. The shared build in `../deployment/` assembles this `dist/` under the site's
`game/` directory and configures Firebase routing. See
[shared deployment instructions](../deployment/README.md). Application builds
remain independent; the shared deployment configuration only publishes Hosting.

## Copied engine code (spec section 10)

Copied unchanged from `worldbuilding-guidebook/src/scene/demos/`:

- `voxels/voxelMath.js`
- `voxels/marchingCubes.js`
- `voxels/chunks.js`
- `proceduralMaps/noiseMath.js`
- `proceduralMaps/functionOverrides.js` (noiseMath dependency)

These live under `src/world/`, preserving relative imports. The older
`src/lessons/proceduralMaps/noiseMath.js` path in the brief no longer exists.
The field stays inside the copied volume's bounds, centered at (0, 3, 0);
the view offsets it to the origin. Grid: 64 samples per axis, 16-sample chunks,
two-sample borders, 64 allocated chunks (empty chunks are not drawn).

Some older RunState fields are legacy placeholders. Operating funds and site indicators have since been implemented (D-028–033); site indicators are estimates, not validated ecological or structural simulations. Resource markers remain proxies for fuller deposits. See [decisions](docs/decisions.md) and [roadmap](docs/roadmap.md).

### Surface exploration and world map

Open **World map & landing** to inspect terrain, resource distribution, development and landing sites. Select an available LZ and choose **Land here**, or click a landing beacon directly on the planet. Walk with WASD / arrow keys (or hold the on-screen movement buttons), and drag to look. You see the Quiet Drifter from behind; press V or **First-person view** to look through its eyes instead. Hold Shift to hurry. Keys 1–3 make it wave, kneel and sit; standing still, it looks around and later sits to watch the sky (D-064). Use **Return to orbit** or Escape to restore the orbital view. Steep edges block walking. The atlas displays your current location and refreshes while open.
