import { fileURLToPath } from 'node:url'

const three = fileURLToPath(new URL('../../terraforming-1380/node_modules/three/', import.meta.url))

export default {
  publicDir: false,
  // The scene imports the game's source, so both resolve the game's single copy of three.
  resolve: { alias: [
    { find: /^three$/, replacement: `${three}build/three.module.js` },
    { find: /^three\/(.*)$/, replacement: `${three}$1` },
  ] },
  build: {
    outDir: fileURLToPath(new URL('../home/scene', import.meta.url)),
    emptyOutDir: true,
    rolldownOptions: { output: { minify: true } },
    lib: { entry: fileURLToPath(new URL('./main.js', import.meta.url)), formats: ['es'], fileName: () => 'home.js' },
  },
}
