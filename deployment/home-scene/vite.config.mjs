import { fileURLToPath } from 'node:url'

export default {
  resolve: { alias: { three: fileURLToPath(new URL('../../terraforming-1380/node_modules/three/build/three.module.js', import.meta.url)) } },
  build: {
    outDir: fileURLToPath(new URL('../home/scene', import.meta.url)),
    emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL('./planet.js', import.meta.url)), formats: ['es'], fileName: () => 'marching-planet.js' },
  },
}
