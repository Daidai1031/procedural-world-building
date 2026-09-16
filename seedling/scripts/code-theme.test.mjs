import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import javascript from 'shiki/langs/javascript.mjs'
import { createCodeTheme } from '../src/styles/codeTheme.js'

const css = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')
const tokens = Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/gi)].map((match) => [match[1], match[2]]))

function luminance(hex) {
  return hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
}

test('all five syntax colours clear AA on paper and solid summit rows', () => {
  for (const foreground of ['--water-deep', '--moss-deep', '--clay-deep', '--ink-faint', '--ink']) {
    for (const background of ['--paper-2', '--summit']) {
      const ratio = (luminance(tokens[background]) + 0.05) / (luminance(tokens[foreground]) + 0.05)
      assert.ok(ratio >= 4.5, `${foreground} on ${background}: ${ratio.toFixed(2)}:1`)
    }
  }
})

test('Shiki actually assigns the five tokens and italic comments', () => {
  const highlighter = createHighlighterCoreSync({
    themes: [createCodeTheme((name) => tokens[name])],
    langs: [javascript],
    engine: createJavaScriptRegexEngine(),
  })
  const result = highlighter.codeToTokens('const sample = "noise" + 1 // repeatable', { lang: 'javascript', theme: 'seedling-light' }).tokens.flat()
  for (const [content, token] of [['const', '--water-deep'], ['sample', '--ink'], ['noise', '--moss-deep'], ['1', '--clay-deep'], ['repeatable', '--ink-faint']]) {
    const found = result.find((entry) => entry.content.includes(content))
    assert.equal(found?.color.toLowerCase(), tokens[token])
    if (token === '--ink-faint') assert.equal(found.fontStyle & 1, 1)
  }
  highlighter.dispose()
})
