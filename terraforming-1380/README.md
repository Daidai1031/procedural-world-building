# Terraforming Contractor #1380

M1/M1.5: a seeded Marching Cubes planet you can dig, add to, flatten, and inspect locally in orbit view.

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
exposure, and chunk border geometry.
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

RunState metrics are placeholders, not computed scores. Both budgets remain
until OQ-01 is resolved; resource point proxies are generated now, while full
clusters remain M3 work. See
[decisions](docs/decisions.md) and [roadmap](docs/roadmap.md).
