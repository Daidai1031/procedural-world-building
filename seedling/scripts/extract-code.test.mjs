import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { extractAll, extractSnippet } from './extract-code.mjs'

const file = 'src/math.js'
const step = 'content/lessons/02-maps/chapters/1-functions/steps/01-noise.mdx'

test('function extraction includes attached comments and reports the real source line', () => {
  const source = '// Unrelated\n\n// Repeatable noise\n// Same position, same result\nexport function perlin2d(x) {\n  return x\n}\n'
  const result = extractSnippet(source, { file, fn: 'perlin2d' }, step)
  assert.equal(result.startLine, 3)
  assert.equal(result.code, source.slice(source.indexOf('// Repeatable')).trimEnd())
  assert.equal(result.name, 'perlin2d')
})

test('extracts arrow and function expressions as complete declarations', () => {
  for (const expression of ['(x) => x + 1', 'function (x) { return x + 1 }']) {
    const source = `const sample = ${expression}`
    assert.equal(extractSnippet(source, { file, fn: 'sample' }, step).code, source)
  }
})

test('regions are dedented and nested markers are stripped, including CRLF sources', () => {
  const source = 'function sample() {\r\n  // #region octaves\r\n  let value = 0\r\n  // #region inner\r\n  value += 1\r\n  // #endregion\r\n  // #endregion\r\n}'
  const result = extractSnippet(source, { file, region: 'octaves' }, step)
  assert.equal(result.code, 'let value = 0\nvalue += 1')
  assert.equal(result.startLine, 3)
})

test('missing identifiers, ambiguous references, and invalid highlights fail loudly', () => {
  for (const reference of [{ fn: 'gone' }, { region: 'gone' }]) {
    assert.throws(() => extractSnippet('function exists() {}', { file, ...reference }, step), (error) => {
      assert.ok(error.message.includes(step))
      assert.match(error.message, /missing (function|region) "gone"/)
      return true
    })
  }
  assert.throws(() => extractSnippet('', { file, fn: 'a', region: 'b' }, step), /exactly one/)
  assert.throws(() => extractSnippet('function a() {}', { file, fn: 'a', highlight: [2] }, step), /outside snippet/)
})

test('nested content uses the lesson slug, and a renamed function stops the build command', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'seedling-extract-'))
  try {
    await mkdir(path.dirname(path.join(root, step)), { recursive: true })
    await mkdir(path.join(root, 'src'))
    await writeFile(path.join(root, 'content/lessons/02-maps/lesson.yaml'), 'slug: procedural-maps\n')
    await writeFile(path.join(root, step), '---\ntitle: Noise\ngoal: Sample noise.\ncode:\n  file: src/math.js\n  fn: perlin2d\n---\n')
    await writeFile(path.join(root, file), 'function perlin2d() { return 1 }')
    const result = await extractAll(root)
    assert.equal(result['procedural-maps/noise'].name, 'perlin2d')
    assert.deepEqual(JSON.parse(await readFile(path.join(root, 'src/generated/snippets.json'), 'utf8')), result)
    await writeFile(path.join(root, file), 'function renamed() { return 1 }')
    const build = spawnSync(process.execPath, ['scripts/extract-code.mjs', root], { encoding: 'utf8' })
    assert.equal(build.status, 1)
    assert.ok(build.stderr.includes(step))
    assert.match(build.stderr, /missing function "perlin2d"/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
