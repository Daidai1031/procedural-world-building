# Terraforming Contractor #1380

> “We’re here to put a dent in the universe.”

A browser-based procedural sandbox where players freely reshape different planets, using manual tools and autonomous robots.

## Design direction and next step

**Planet starting conditions → player choices and robot work → environmental change → resident responses → different planetary outcomes.**

Players can pursue resource extraction, ecological flourishing, or strange planetary forms. There is no single ideal planet. The next development focus is a readable connection between terrain edits, habitat conditions, and residents choosing where to live.

### Current implementation

- **Manual tools:** Dig, Add Terrain, Flatten, and a bounded Detector.
- **Miner:** assign a spherical area and Start; it scans, chooses a mineral, hovers to an entry, excavates and collects, then repeats.
- **Gardener:** surveys suitable ground, grows spreading plants, and currently also places antennas. Separating antenna construction from gardening is a proposal, not an implemented change.
- **Builder:** cuts high ground and fills low ground toward a target level, using the shared soil stock. Prepared sites can wake a waiting Gardener.
- **Operations:** mineral storage/sales, soil stock, electricity billing, debt warning and bankruptcy; communicator messages explain operating problems.
- **Exploration:** returnable outer-surface walking, landing sites and an updating 2D atlas.
- **Discovery/travel:** explicit broadcasts reveal distant planet entries. Travel currently creates a fresh planet state and carries funds only; old sites are not preserved for return.

### Planned next

One cave-dwelling, quiet-sensitive rock resident species; persistent planet records and return travel; a live 3D overview showing the actual edited shapes of discovered planets. These are design targets, not features shipped by this documentation update.

The desired money interface is compact: detailed accounting may remain internal, while operating restrictions and critical warnings remain understandable. The current debt/game-over rule is retained until a replacement is explicitly decided.

See [design](docs/design.md), [requirements](docs/spec.md), and [roadmap](docs/roadmap.md).

## Run locally

Requires Node.js 22.12+ (or a newer supported release) and npm.

```powershell
cd terraforming-1380
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
Planet Remaining updates as solid samples are removed or added. Canister and
energy costs are scheduled for M2/M3; M1's fill action is unrestricted.
The rendered planet now uses three detail levels: nearby chunks keep the full
mesh, while distant chunks use coarser meshes. Fine edges snap to coarse edges
at their shared boundary. LOD preparation is spread over frames and a change
appears only when all its meshes are ready. The debug overlay shows the number
of visible chunks at each level (`LOD 0/1/2`). Terrain edits still change the
same full-resolution density grid.

Click **Detector** or press `D`, then left-click the planet to scan a small
region. The scan shows a subdued local terrain wireframe and nearby buried
resource signals, faded by distance from the clicked point. Mineral, Life,
and Memory use distinct marker shapes. Buried targets stay hidden outside
Detector mode; exposed targets remain visible. Click elsewhere to move the
scan. Press `T` or click **Terrain** to return to editing. The seeded markers
are early target proxies; irregular deposits, collection, and scan costs
are scheduled for M3.

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

Open **World map & landing** to inspect terrain, resource distribution, development and landing sites. Select an available LZ and choose **Land here**, or click a landing beacon directly on the planet. Walk with WASD / arrow keys (or hold the on-screen movement buttons), and drag to look. Use **Return to orbit** or Escape to restore the orbital view. Steep edges block walking. The atlas displays your current location and refreshes while open.
