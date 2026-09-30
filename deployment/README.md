# Shared Firebase Hosting

| Path | Application | Source |
| --- | --- | --- |
| / | Project home | deployment/home |
| /guidebook/ | Worldbuilding Guidebook | worldbuilding-guidebook |
| /game/ | Terraforming Contractor #1380 | terraforming-1380 |

The home page uses HTML/CSS with a Three.js low-resolution Marching Cubes planet illustration.
The scene source is in `home-scene/`; the shared build bundles it into
`home/scene/` using the game's installed Three.js and Vite dependencies.
It reuses the game surface extraction code, renders on resize or interaction,
and falls back to a static preview when
WebGL is unavailable. Each Vite application builds independently.
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
