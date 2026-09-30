import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// TECH-05: exercise Firebase's actual router, not a mock of the rewrite rules.
const origin = process.env.HOSTING_TEST_URL ?? 'http://127.0.0.1:5002'
const home = await readFile(new URL('./public/index.html', import.meta.url), 'utf8')
const guidebook = await readFile(new URL('./public/guidebook/index.html', import.meta.url), 'utf8')
const game = await readFile(new URL('./public/game/index.html', import.meta.url), 'utf8')
for (const [route, expected] of [
  ['/', home],
  ['/guidebook', guidebook],
  ['/guidebook/', guidebook],
  ['/guidebook/lesson/voxels', guidebook],
  ['/guidebook/lesson/shaders/distance-and-fresnel', guidebook],
  ['/lesson/voxels', guidebook],
  ['/lesson/voxels/from-height-fields-to-volumes?test=1', guidebook],
  ['/game', game],
  ['/game/', game],
  ['/game/?seed=1380&debug=1', game],
  ['/game/survey/test?seed=1380', game],
  ['/gamebook', home],
]) {
  const response = await fetch(new URL(route, origin))
  assert.equal(response.status, 200, route)
  assert.match(response.headers.get('content-type'), /text\/html/, route)
  assert.equal(await response.text(), expected, route)
  console.log('PASS ' + route)
}
for (const html of [home, guidebook, game]) {
  const assets = [...html.matchAll(/(?:src|href)="([^"<>]+\.(?:js|css))"/g)].map(match => match[1])
  assert.ok(assets.length > 0)
  for (const asset of assets) {
    const response = await fetch(new URL(asset, origin))
    assert.equal(response.status, 200, asset)
    assert.doesNotMatch(response.headers.get('content-type'), /text\/html/, asset)
    const expected = await readFile(new URL('./public' + asset, import.meta.url))
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected, asset)
    console.log('PASS asset ' + asset)
  }
}
