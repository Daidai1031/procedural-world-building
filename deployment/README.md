# Shared Firebase Hosting

| Path | Application | Source |
| --- | --- | --- |
| / | Project home | deployment/home |
| /guidebook/ | Worldbuilding Guidebook | worldbuilding-guidebook |
| /game/ | Terraforming Contractor #1380 | terraforming-1380 |

The home page is HTML/CSS (`home/index.html`, `home/home-v6.css`) plus one script bundle.
The script source is in `home-scene/`; the shared build bundles it into
`home/scene/home.js` using the game's installed Three.js and Vite dependencies, and copies
the game's fonts (Audiowide, Outfit, Bricolage Grotesque) into `home/scene/fonts/`.

- `planet.js`: the hero loop. It imports the game's own `PlanetWorld`, terrain material,
  atmosphere, robots, surface models and residents. Each 32-second loop (sol 0 to 1380)
  the Miner, Builder and Gardener dig mineral deposits, level pads, raise antennas and plant
  lichen, while the planet's native species peeks out of its burrows; the next loop moves to
  another seed (`SEEDS`). As in the game the planet stays still and the camera orbits.
  Loading the next planet blocks for roughly 0.2-0.4 s while the canvas is faded out.
  `?t=<seconds>` renders a fast-forwarded still and `?seed=<seed>` pins one planet, for
  screenshots; reduced motion shows a still at 70% of a loop.
- `residents.js`: resident profile cards built from `src/content/residents.ts`, with one
  shared renderer drawing every visible portrait. Each species reacts to hover in character.
- `page.js`: fade-in of sections as they enter the viewport and the current-section marker.

`home/images/planet-still.png` is the fallback when WebGL is unavailable. `home/favicon.svg`
(also the header logo) is the game's default Facet Pebble resident, rendered once with the
game's own renderer and lights, smoothly cropped and downsized (no pixelation) onto a dark
circle; the game keeps its own shovel favicon. Each Vite application builds independently.
`build.mjs` assembles all three into the generated `deployment/public/` directory.
Guidebook uses Vite base and BrowserRouter basename `/guidebook/`; Game uses
`/game/`. Old `/lesson/:lesson` and `/lesson/:lesson/:step` links redirect to
Guidebook. Both applications link back to the project home.

## Build and preview

Requires Node.js 22.12+ and npm. From the repository root:

```powershell
npm.cmd ci --prefix worldbuilding-guidebook
npm.cmd ci --prefix terraforming-1380
npm.cmd --prefix deployment run build
npm.cmd --prefix deployment run preview
```

Open http://127.0.0.1:5002/. In a second terminal run:

```powershell
npm.cmd --prefix deployment run verify:hosting
```

Checks use the actual Firebase router: entry points, nested paths, legacy lesson
redirects, game query parameters and JS/CSS asset bytes. Set HOSTING_TEST_URL
to verify another origin against the local build.

## Publish

```powershell
npm.cmd --prefix deployment run deploy
```

This rebuilds and deploys Hosting only to the existing worldbuilding-guidebook
site. It requires an authorized Firebase CLI login. Firestore and Authentication
configuration remain unchanged. Local builds use Guidebook's existing .env.local;
GitHub Actions uses the existing VITE_FIREBASE_* secrets.

- https://worldbuilding-guidebook.web.app/
- https://worldbuilding-guidebook.web.app/guidebook/
- https://worldbuilding-guidebook.web.app/game/

Use this shared command. The old guidebook-only Firebase configuration would
overwrite the combined site. GitHub workflows use entryPoint: deployment and
include the homepage automatically in subsequent builds.

## Validation

Both production builds, nine game tests, desktop/mobile visual checks and browser
navigation between all three entry points passed. Browser checks also exercised
the detector toggle and guidebook deep-link reload. Existing application bundle
size and onnxruntime-web eval warnings remain.
