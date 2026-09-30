import { cp, lstat, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

// TECH-05: combine build outputs only; each app owns its source and dependencies.
const deployment = path.dirname(fileURLToPath(import.meta.url))
const root = path.dirname(deployment)
const guidebook = path.join(root, 'worldbuilding-guidebook')
const home = path.join(deployment, 'home')
const game = path.join(root, 'terraforming-1380')
const output = path.resolve(deployment, 'public')
const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('Run this through npm: npm --prefix deployment run build')

for (const app of [guidebook, game]) {
  const result = spawnSync(process.execPath, [npmCli, 'run', 'build'], { cwd: app, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const sceneBuild = spawnSync(process.execPath, [path.join(game, 'node_modules/vite/bin/vite.js'), 'build', '--config', path.join(deployment, 'home-scene/vite.config.mjs')], { cwd: root, stdio: 'inherit' })
if (sceneBuild.error) throw sceneBuild.error
if (sceneBuild.status !== 0) process.exit(sceneBuild.status ?? 1)

// Validate both outputs before replacing the previous assembled site.
const gameHtml = await readFile(path.join(game, 'dist/index.html'), 'utf8')
const guidebookHtml = await readFile(path.join(guidebook, 'dist/index.html'), 'utf8')
await readFile(path.join(home, 'index.html'), 'utf8')
if (!guidebookHtml.includes('/guidebook/assets/')) throw new Error('Guidebook build must use Vite base /guidebook/')
if (!gameHtml.includes('/game/assets/')) throw new Error('Game build must use Vite base /game/')
const collision = await lstat(path.join(guidebook, 'dist/game')).catch(error => {
  if (error.code !== 'ENOENT') throw error
})
if (collision) throw new Error('Guidebook output occupies the reserved /game/ directory')

// Only the generated deployment/public directory may be removed.
if (path.dirname(output) !== deployment || path.basename(output) !== 'public') {
  throw new Error('Unexpected deployment output path')
}
const existing = await lstat(output).catch(error => {
  if (error.code !== 'ENOENT') throw error
})
if (existing?.isSymbolicLink()) throw new Error('Deployment output must not be a symbolic link')
await rm(output, { recursive: true, force: true })
await cp(home, output, { recursive: true })
await cp(path.join(guidebook, 'dist'), path.join(output, 'guidebook'), { recursive: true })
await cp(path.join(game, 'dist'), path.join(output, 'game'), { recursive: true })
console.log('Assembled deployment/public: home at /, guidebook at /guidebook/, game at /game/')
