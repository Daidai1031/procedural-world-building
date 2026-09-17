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
  const root = await mkdtemp(path.join(tmpdir(), 'worldbuilding-guidebook-extract-'))
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

test('practice references use the extractor and match is restricted to chapter 1', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'worldbuilding-guidebook-practice-'))
  try {
    const filename = path.join(root, 'content/lessons/02-maps/chapters/1-functions/steps/01-fill.mdx')
    await mkdir(path.dirname(filename), { recursive: true })
    await mkdir(path.join(root, 'src'))
    await writeFile(path.join(root, 'content/lessons/02-maps/lesson.yaml'), 'slug: maps\n')
    await writeFile(path.join(root, file), 'function shapeValue(value) { return value }')
    await writeFile(filename, '---\npractice:\n  kind: fill\n  prompt: Fold the value into crests.\n  from: { file: src/math.js, fn: shapeValue }\n---\n')
    assert.equal((await extractAll(root))['maps/fill:practice'].name, 'shapeValue')
    await writeFile(filename, '---\npractice:\n  kind: implement\n  reference: { file: src/math.js, fn: missing }\n---\n')
    await assert.rejects(extractAll(root), /missing function "missing"/)
    await writeFile(filename, '---\npractice:\n  kind: match\n---\n')
    await extractAll(root)
    const other = path.join(root, 'content/lessons/02-maps/chapters/2-simulation/steps/02-match.mdx')
    await mkdir(path.dirname(other), { recursive: true })
    await writeFile(other, '---\npractice:\n  kind: match\n---\n')
    await assert.rejects(extractAll(root), /only supported in chapter 1/)
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep))
    await rm(root, { recursive: true, force: true })
  }
})

test('JSX regions extract and dedent real markup, including mixed nested markers and CRLF', () => {
  const source = [
    'function Demo() {',
    '  return (',
    '    <>',
    '      {/* #region entity */}',
    '      <mesh position={[1, 2, 3]}>',
    '        {/* #region geometry */}',
    '        <boxGeometry args={[1, 1, 1]} />',
    '        {/* #endregion */}',
    '      </mesh>',
    '      {/* #endregion */}',
    '    </>',
    '  )',
    '}',
  ].join('\r\n')
  const result = extractSnippet(source, { file: 'src/Demo.jsx', region: 'entity', highlight: [2] }, step)
  assert.equal(result.language, 'jsx')
  assert.equal(result.startLine, 5)
  assert.equal(result.code, '<mesh position={[1, 2, 3]}>\n  <boxGeometry args={[1, 1, 1]} />\n</mesh>')
  assert.equal(extractSnippet(source, { file: 'src/Demo.jsx', fn: 'Demo' }, step).code.includes('#region'), false)
  const mixed = '// #region outer\nconst x = 1\n{/* #region inner */}\n<mesh />\n{/* #endregion */}\n// #endregion'
  assert.equal(extractSnippet(mixed, { file: 'src/Demo.jsx', region: 'outer' }, step).code, 'const x = 1\n<mesh />')
  assert.throws(() => extractSnippet('{/* #region unfinished */}\n<mesh />', { file: 'src/Demo.jsx', region: 'unfinished' }, step), /unclosed region/)
  assert.throws(() => extractSnippet('{/* #endregion */}', { file: 'src/Demo.jsx', region: 'missing' }, step), /unmatched/)
  assert.throws(() => extractSnippet(source, { file: 'src/Demo.jsx', region: 'absent' }, step), /missing region/)
})

test('function extraction parses JSX components and preserves attached export comments', () => {
  for (const prefix of ['', 'export ', 'export default ']) {
    const source = `// A real mesh\n${prefix}function Box() {\n  return <mesh><boxGeometry args={[1, 1, 1]} /></mesh>\n}`
    const result = extractSnippet(source, { file: 'src/Box.jsx', fn: 'Box' }, step)
    assert.equal(result.language, 'jsx')
    assert.equal(result.startLine, 1)
    assert.equal(result.code, source)
  }
})

test('named region endings let shared JSX belong to overlapping teaching snippets', () => {
  const source = [
    '{/* #region materials */}',
    '<Box />',
    '{/* #region curves */}',
    '<Sphere />',
    '{/* #endregion materials */}',
    '<Cone />',
    '<Knot />',
    '{/* #endregion curves */}',
  ].join('\n')
  assert.equal(extractSnippet(source, { file: 'Scene.jsx', region: 'materials' }, step).code, '<Box />\n<Sphere />')
  assert.equal(extractSnippet(source, { file: 'Scene.jsx', region: 'curves' }, step).code, '<Sphere />\n<Cone />\n<Knot />')
  assert.throws(() => extractSnippet('// #region a\n1\n// #endregion b', { file, region: 'a' }, step), /unmatched #endregion b/)
})
