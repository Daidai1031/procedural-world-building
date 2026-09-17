import { test, expect } from '@playwright/test'
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import { extractSnippet } from '../scripts/extract-code.mjs'

test.beforeAll(async () => {
  const file = 'src/scene/demos/proceduralMaps/noiseMath.js'
  const source = await readFile(file, 'utf8')
  await writeFile('tests/fixtures/snippet.json', JSON.stringify(extractSnippet(source, { file, fn: 'shapeValue' }, 'verification/shape')))
  await mkdir('artifacts/phase3', { recursive: true })
})

test.afterAll(async () => {
  await unlink('tests/fixtures/snippet.json')
})

test('code colours, keyboard compare, clipped maps, and shared simulation playback', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/tests/fixtures/phase3.html')
  await expect(page.getByRole('radio', { name: 'Perlin', exact: true })).toBeChecked()
  await expect(page.locator('canvas')).toHaveCount(3)
  await expect(page.locator('.code-block__line[data-highlighted="true"]')).toHaveCount(1)
  const colours = await page.locator('.code-block__line[data-highlighted="true"]').evaluate((line) => ({
    background: getComputedStyle(line).backgroundColor,
    colours: [...new Set([...line.querySelectorAll('span[style]')].map((span) => getComputedStyle(span).color))],
    numbersSelectable: getComputedStyle(line.querySelector('.code-block__number')).userSelect,
  }))
  expect(colours.background).toBe('rgb(255, 224, 92)')
  expect(colours.colours).toHaveLength(5)
  expect(colours.numbersSelectable).toBe('none')
  await page.locator('.code-block').screenshot({ path: 'artifacts/phase3/fixture-highlighted-code.png' })
  await page.screenshot({ path: 'artifacts/phase3/fixture-compare.png' })

  await page.getByRole('radio', { name: 'Perlin', exact: true }).focus()
  const startingHeight = await page.evaluate(() => window.phase3.frames.at(-1).checksum)
  await page.evaluate(() => { window.phase3.frames = [] })
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'Worley', exact: true })).toBeChecked()
  expect(await page.evaluate(() => window.phase3.scene.getState().params.mapNoiseType)).toBe('worley')
  await expect.poll(() => page.evaluate(() => window.phase3.frames.length)).toBeGreaterThan(30)
  const frames = await page.evaluate(() => window.phase3.frames)
  expect(new Set(frames.map((frame) => Math.round(frame.checksum * 1000))).size).toBeGreaterThan(3)
  expect(frames.at(-1).checksum).not.toBeCloseTo(startingHeight)
  await page.getByRole('slider', { name: /map divider/ }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('slider', { name: /map divider/ })).toHaveAttribute('aria-valuenow', '55')
  await expect(page.locator('.compare-inset__layer').first()).toHaveCSS('clip-path', 'inset(0px 45% 0px 0px)')
  await page.getByRole('button', { name: /Swap it with the 3D scene/ }).click()
  await expect(page.locator('.scene-host')).toHaveAttribute('data-slot', 'corner')
  await page.getByRole('button', { name: 'The scene in 3D' }).click()

  await page.evaluate(() => {
    const state = window.phase3.scene.getState()
    state.setDemoKey('simulation-terrain')
    state.setCompare(null)
    state.setInsetKey('simulation-map')
    state.setUnlocked(['erosionRainfall'])
  })
  await expect(page.locator('canvas')).toHaveCount(2)
  await page.getByRole('button', { name: 'Step once', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.phase3.simulation.getState().simulation.iteration)).toBe(1)
  await page.getByRole('button', { name: 'Start erosion' }).click()
  await expect.poll(() => page.evaluate(() => window.phase3.simulation.getState().simulation.iteration)).toBeGreaterThan(2)
  await page.evaluate(() => {
    const state = window.phase3.scene.getState()
    state.setDemoKey('simulation-terrain')
    state.setUnlocked(['erosionStrength'])
    state.setCompare(null)
  })
  await expect(page.getByRole('button', { name: 'Pause erosion' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Pause erosion' }).click()
  await page.getByRole('button', { name: 'Reset terrain' }).click()
  await expect.poll(() => page.evaluate(() => window.phase3.simulation.getState().simulation.iteration)).toBe(0)
  await page.screenshot({ path: 'artifacts/phase3/fixture-simulation.png' })
  expect(errors).toEqual([])
})

test('reduced motion cuts directly to the comparison target', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/tests/fixtures/phase3.html')
  await expect.poll(() => page.evaluate(() => window.phase3?.frames?.length ?? 0)).toBeGreaterThan(2)
  await page.evaluate(() => { window.phase3.frames = [] })
  await page.getByRole('radio', { name: 'Worley', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.phase3.frames.length)).toBeGreaterThan(10)
  const frames = await page.evaluate(() => window.phase3.frames)
  expect(new Set(frames.map((frame) => Math.round(frame.checksum * 1000))).size).toBeLessThanOrEqual(2)
})

