import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { test } from 'node:test'
import { extractSnippet } from './extract-code.mjs'
import { entities } from '../src/scene/demos/sceneAnatomy/entities.js'

const demo = 'src/scene/demos/sceneAnatomy/SceneAnatomyDemo.jsx'
const host = 'src/scene/SceneHost.jsx'

test('every proposed Lesson 01 snippet extracts from the running JSX', async () => {
  const snippets = {}
  const source = await readFile(demo, 'utf8')
  for (const region of ['box', 'sphere', 'cone', 'torus', 'matte-and-metal', 'curved-geometry', 'floor', 'grid', 'floor-and-grid', 'scene-lights', 'fill-lights', 'key-light']) {
    const snippet = extractSnippet(source, { file: demo, region }, 'phase3b-proposal')
    assert.equal(snippet.language, 'jsx')
    assert.equal(snippet.code.includes('#region'), false)
    snippets[region] = snippet
  }
  assert.match(snippets.box.code, /<boxGeometry args=\{\[1.5, 1.5, 1.5\]\}/)
  assert.match(snippets.sphere.code, /roughness=\{0.15\}/)
  assert.match(snippets.cone.code, /<meshBasicMaterial color=\{CONE_YELLOW\}/)
  assert.match(snippets.torus.code, /<torusKnotGeometry/)
  assert.doesNotMatch(source, /EntityGeometry|EntityMaterial|entities\.map/)
  snippets.structure = extractSnippet(source, { file: demo, fn: 'SceneAnatomyDemo' }, 'phase3b-proposal')
  assert.match(snippets.structure.code, /export default function SceneAnatomyDemo/)
  const cameraSource = await readFile(host, 'utf8')
  for (const region of ['canvas-camera', 'orbit-controls']) snippets[region] = extractSnippet(cameraSource, { file: host, region }, 'phase3b-proposal')
  assert.match(snippets['canvas-camera'].code, /position: \[6, 5, 8\], fov: 50/)
  assert.match(snippets['orbit-controls'].code, /minDistance=\{3\}/)
  await writeFile('artifacts/phase3b/proposed-snippets.json', JSON.stringify(snippets, null, 2))
})

test('plan and picker metadata explicitly describe approximate footprints', () => {
  assert.deepEqual(entities.map((entity) => entity.id), ['box', 'sphere', 'cone', 'torus'])
  for (const entity of entities) {
    assert.deepEqual(Object.keys(entity).sort(), ['colorToken', 'id', 'name', 'planPosition', 'planRadius', 'subtitle'])
    assert.equal(entity.planPosition.length, 2)
    assert.ok(entity.planRadius > 0)
  }
})

test('approved Lesson 01 has eleven stable steps, introduced code, and bounded prose', async () => {
  const { readdir, mkdir } = await import('node:fs/promises')
  const { parse } = await import('yaml')
  const directory = 'content/lessons/01-scene-anatomy/steps'
  const files = (await readdir(directory)).filter((file) => file.endsWith('.mdx')).sort()
  assert.deepEqual(files.map((file) => file.slice(3, -4)), [
    'what-is-a-scene', 'a-scene-file', 'entities-geometry-and-transform',
    'matte-and-metal', 'unlit-surfaces', 'curved-geometry', 'the-floor-and-the-grid',
    'lights-that-cast-no-shadow', 'the-key-light-and-shadows', 'what-the-camera-sees', 'moving-the-camera',
  ])
  const report = []
  const practiceSteps = []
  const target = (reference) => `${reference.file}#${reference.fn ?? reference.region}`
  for (const [index, file] of files.entries()) {
    assert.equal(Number(file.slice(0, 2)), index + 1)
    const [, header, body] = (await readFile(`${directory}/${file}`, 'utf8')).split('---')
    const frontmatter = parse(header)
    const words = body.trim().split(/\s+/).length
    assert.ok(words >= 60 && words <= 200, `${file}: ${words} words`)
    assert.equal(Boolean(frontmatter.code), index > 0)
    // This lesson's scene is declarative JSX with no maths behind it, so there
    // is nothing for match to score or for a live edit to override: fill is the
    // only kind it can carry. A fill must also read from a fragment this step
    // does not itself display, because StepCard renders the step's own code
    // block directly above its practice.
    if (frontmatter.practice) {
      practiceSteps.push(file)
      assert.equal(frontmatter.practice.kind, 'fill')
      assert.notEqual(target(frontmatter.practice.from), target(frontmatter.code))
      const blanked = extractSnippet(await readFile(frontmatter.practice.from.file, 'utf8'), frontmatter.practice.from, file)
      for (const blank of frontmatter.practice.blanks) {
        const line = blanked.code.split('\n')[blank.line - 1] ?? ''
        assert.ok(line.includes(blank.answer), `${file}: blank ${blank.line} is not on its line`)
        assert.ok(blank.hint && (blank.options ?? [blank.answer]).includes(blank.answer))
      }
    }
    if (frontmatter.code) {
      const snippet = extractSnippet(await readFile(frontmatter.code.file, 'utf8'), frontmatter.code, file)
      assert.ok(snippet.code.length > 0)
      assert.equal(frontmatter.code.editable, false)
      if (index === 1) {
        assert.match(body, /capital letter/)
        assert.match(body, /Lowercase tags come from React Three Fiber/)
        assert.match(snippet.code, /<StudioEnvironment \/>/)
        assert.doesNotMatch(snippet.code, /<primitive|useStudioEnvironment/)
      }
      if (index === 2) {
        assert.match(body, /`Selectable` is an imported/)
        assert.match(snippet.code, /<Selectable id="box">/)
      }
      if (index === 5) {
        for (const geometry of ['sphereGeometry', 'cylinderGeometry', 'torusKnotGeometry']) assert.ok(snippet.code.includes(geometry))
        assert.match(body, /48, 48/)
      }
      report.push({ step: file, words, lines: snippet.code.split('\n').length, target: frontmatter.code, startLine: snippet.startLine })
    } else report.push({ step: file, words, lines: 0 })
  }
  assert.deepEqual(practiceSteps, ['03-entities-geometry-and-transform.mdx', '11-moving-the-camera.mdx'])
  const source = await readFile(demo, 'utf8')
  const environment = extractSnippet(source, { file: demo, fn: 'StudioEnvironment' }, 'phase3b')
  assert.match(environment.code, /<primitive object=\{studioEnvironment\} attach="environment"/)
  await mkdir('artifacts/phase3b', { recursive: true })
  await writeFile('artifacts/phase3b/content-audit.json', JSON.stringify(report, null, 2))
})
