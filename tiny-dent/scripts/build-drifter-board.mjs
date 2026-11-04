// D-064: bundles docs/drifter/board.ts (three.js and the game's own Drifter model) into one self-contained
// page, docs/drifter/board.html, so the board can be opened from disk or hosted without a build step.
import { readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = `${root}node_modules/.drifter-board`
await build({
  root, logLevel: 'warn', configFile: false, publicDir: false,
  build: {
    outDir, emptyOutDir: true, minify: true, write: true, copyPublicDir: false,
    lib: { entry: `${root}docs/drifter/board.ts`, formats: ['iife'], name: 'DrifterBoard', fileName: () => 'board.js' },
  },
})
const script = (await readFile(`${outDir}/board.js`, 'utf8')).replaceAll('</script', '<\\/script')
const template = await readFile(`${root}docs/drifter/board-template.html`, 'utf8')
await writeFile(`${root}docs/drifter/board.html`, template.replace('<script>/*BOARD*/</script>', () => `<script>${script}</script>`))
await rm(outDir, { recursive: true, force: true })
console.log('wrote docs/drifter/board.html')
