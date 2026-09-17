import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { test } from 'node:test'
import { parse } from 'yaml'
import { demoParams } from '../src/scene/demoParams.js'
import { extractSnippet } from './extract-code.mjs'

test('Lesson 02 has two complete chapters with valid controls and real snippet references', async () => {
  const root = 'content/lessons/02-procedural-maps'
  const slugs = new Set()
  const introduced = new Set()
  let codeCount = 0
  let compareCount = 0
  for (const chapter of ['1-functions', '2-simulation']) {
    const directory = `${root}/chapters/${chapter}`
    const metadata = await readFile(`${directory}/chapter.yaml`, 'utf8')
    assert.ok(metadata.split('\n').filter(Boolean).every((line) => /^[a-zA-Z]+: [^|>]+$/.test(line)), 'Chapter metadata must stay flat')
    const files = (await readdir(`${directory}/steps`)).filter((file) => file.endsWith('.mdx')).sort()
    assert.equal(files.length, 12)
    for (const [index, file] of files.entries()) {
      assert.ok(file.startsWith(`${String(index + 1).padStart(2, '0')}-`))
      const slug = file.replace(/^\d+-/, '').replace(/\.mdx$/, '')
      assert.ok(!slugs.has(slug), `Duplicate slug ${slug}`)
      slugs.add(slug)
      const filename = `${directory}/steps/${file}`
      const raw = await readFile(filename, 'utf8')
      const [, yaml, prose] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
      const step = parse(yaml)
      assert.ok(step.title && step.goal && step.keywords.length >= 3)
      const words = prose.trim().split(/\s+/).length
      assert.ok(words >= 60 && words <= 100, `${file}: ${words} words`)
      assert.ok(!prose.includes('```'), 'Code must be extracted, not copied')
      const params = demoParams[step.scene.demo]
      assert.ok(params)
      const fresh = step.scene.unlock.filter((key) => !introduced.has(key))
      assert.ok(fresh.length <= 1, `${file} introduces too many parameters: ${fresh}`)
      for (const key of step.scene.unlock) {
        assert.ok(params[key], `${file} unlocks an unknown parameter: ${key}`)
        introduced.add(key)
      }
      if (step.code) {
        const snippet = extractSnippet(await readFile(step.code.file, 'utf8'), step.code, filename)
        for (const line of step.code.highlight ?? []) assert.ok(snippet.code.split('\n')[line - 1].trim())
        codeCount += 1
      }
      if (step.scene.compare) {
        compareCount += 1
        assert.ok(step.scene.inset)
        for (const side of ['a', 'b']) {
          assert.ok(step.scene.compare[side].caption)
          for (const key of Object.keys(step.scene.compare[side].params)) assert.ok(params[key])
        }
      }
    }
  }
  assert.equal(slugs.size, 24)
  assert.equal(codeCount, 13)
  assert.equal(compareCount, 1)
})
