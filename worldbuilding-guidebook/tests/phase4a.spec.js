import { test, expect } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extractSnippet } from '../scripts/extract-code.mjs'

test.beforeAll(async () => {
  const file = 'src/scene/demos/proceduralMaps/noiseMath.js'
  await writeFile('tests/fixtures/phase4a-snippet.json', JSON.stringify(extractSnippet(await readFile(file, 'utf8'), { file, fn: 'shapeValue' }, 'phase4a')))
  await mkdir('artifacts/phase4a', { recursive: true })
})

test('worker isolation, two second termination, fresh runs, and responsive page', async ({ page }) => {
  await page.goto('/tests/fixtures/phase4a.html')
  await page.waitForFunction(() => window.phase4a)
  const result = await page.evaluate(async () => {
    let ticks = 0
    const timer = setInterval(() => ticks++, 20)
    const start = performance.now()
    let error
    try { await window.phase4a.runSandbox({ source: 'function loop() { while (true) {} }', name: 'loop', inputs: [[]] }) }
    catch (failure) { error = failure.message }
    clearInterval(timer)
    const values = await window.phase4a.runSandbox({ source: 'function inspect() { return [typeof document, typeof fetch, typeof window, typeof XMLHttpRequest, typeof navigator] }', name: 'inspect', inputs: [[]] })
    return { elapsed: performance.now() - start, ticks, error, values }
  })
  expect(result.error).toContain('2 seconds')
  expect(result.elapsed).toBeGreaterThanOrEqual(1900)
  expect(result.elapsed).toBeLessThan(4000)
  expect(result.ticks).toBeGreaterThan(30)
  expect(result.values[0]).toEqual(Array(5).fill('undefined'))
  await writeFile('artifacts/phase4a/sandbox.json', JSON.stringify(result, null, 2))
})

test('one override updates terrain and inset, errors retain it, navigation clears it', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/tests/fixtures/phase4a.html')
  await page.waitForFunction(() => window.phase4a?.heights)
  const editor = page.getByRole('textbox', { name: 'Code for fixture/edit' })
  await editor.fill('function shapeValue() { return 0.25 }')
  await page.getByRole('button', { name: 'Apply to scene' }).click()
  await expect.poll(() => page.evaluate(() => Object.keys(window.phase4a.scene.getState().overrides))).toEqual(['shapeValue'])
  await expect.poll(() => page.evaluate(() => Math.max(...window.phase4a.heights))).toBeCloseTo(0.6)
  const pixel = await page.locator('canvas.inset__canvas').evaluate((canvas) => [...canvas.getContext('2d').getImageData(100, 100, 1, 1).data])
  expect(pixel).toEqual([64, 64, 64, 255])
  await editor.fill('function shapeValue() { throw new Error("keep the map") }')
  await page.getByRole('button', { name: 'Apply to scene' }).click()
  await expect(page.getByRole('alert')).toContainText('keep the map')
  expect(await page.evaluate(() => Math.max(...window.phase4a.heights))).toBeCloseTo(0.6)
  await editor.fill('function shapeValue() {')
  await page.getByRole('button', { name: 'Apply to scene' }).click()
  await expect(page.getByRole('alert')).toContainText('Unexpected token')
  await editor.fill('function shapeValue() { while (true) {} }')
  await page.getByRole('button', { name: 'Apply to scene' }).click()
  await expect(page.getByRole('alert')).toContainText('2 seconds')
  expect(await page.evaluate(() => Math.max(...window.phase4a.heights))).toBeCloseTo(0.6)
  await page.evaluate(() => window.phase4a.scene.getState().setParam('mapResolution', 72))
  await expect.poll(() => page.evaluate(() => window.phase4a.heights.length)).toBe(73 * 73)
  await expect(page.getByRole('button', { name: 'Apply to scene' })).toBeEnabled()
  await page.screenshot({ path: 'artifacts/phase4a/override.png' })
  await page.getByRole('button', { name: 'Next fixture step' }).click()
  await expect.poll(() => page.evaluate(() => Object.keys(window.phase4a.scene.getState().overrides).length)).toBe(0)
  await expect.poll(() => page.evaluate(() => Math.max(...window.phase4a.heights))).toBeGreaterThan(0.7)
  await page.reload()
  await page.waitForFunction(() => window.phase4a)
  expect(await page.evaluate(() => Object.keys(window.phase4a.scene.getState().overrides))).toEqual([])
  expect(errors).toEqual([])
})

test('match feedback, fill hints, saved work, explicit reference reveal, and visual maps', async ({ page }) => {
  await page.goto('/tests/fixtures/phase4a.html')
  await page.waitForFunction(() => window.phase4a)
  const match = page.getByRole('region', { name: 'match practice' })
  await page.evaluate(() => window.phase4a.scene.getState().setParam('mapFrequency', 0.5))
  await expect(match.locator('output')).toHaveText('0.0000')
  await match.getByRole('button', { name: 'Check match' }).click()
  await expect(match.getByLabel('Passed')).toBeVisible()
  const fill = page.getByRole('region', { name: 'fill practice' })
  await fill.getByRole('button', { name: 'Check answers' }).click()
  await expect(fill.getByText('Fold the value around the midpoint.')).toBeVisible()
  await fill.getByLabel('Blank 1').selectOption('1 - Math.abs(value * 2 - 1)')
  await fill.getByLabel('Blank 2').fill('  value  ')
  await fill.getByRole('button', { name: 'Check answers' }).click()
  await expect(fill.getByLabel('Passed')).toBeVisible()
  const implement = page.getByRole('region', { name: 'implement practice' })
  for (let i = 0; i < 3; i++) {
    await implement.getByRole('button', { name: 'Run cases' }).click()
    await expect(implement.getByRole('button', { name: 'Run cases' })).toBeEnabled()
  }
  await expect(implement.locator('canvas')).toHaveCount(3)
  await expect(implement.locator('pre')).toHaveCount(0)
  await implement.getByRole('button', { name: 'Compare with the course version' }).click()
  await expect(implement.locator('pre')).toHaveCount(1)
  await implement.screenshot({ path: 'artifacts/phase4a/implement.png' })
  await page.reload()
  await expect(fill.getByLabel('Blank 2')).toHaveValue('  value  ')
  await expect(fill.getByLabel('Passed')).toBeVisible()
})


test('sandbox rejects network escapes and retains structured clone semantics', async ({ page }) => {
  await page.goto('/tests/fixtures/phase4a.html')
  await page.waitForFunction(() => window.phase4a)
  const results = await page.evaluate(async () => {
    const sources = [
      'function probe() { return import("/secret") }',
      'function probe() { return (() => {}).constructor("return fetch")() }',
      'function probe() { return setTimeout("fetch()", 0) }',
      'function probe() { return Object.getPrototypeOf(globalThis).fetch("/secret") }',
    ]
    const errors = []
    for (const source of sources) {
      try { await window.phase4a.runSandbox({ source, name: 'probe', inputs: [[]] }); errors.push(null) }
      catch (error) { errors.push(error.message) }
    }
    const input = { data: new Float32Array([1, 2]) }
    const values = await window.phase4a.runSandbox({ source: 'function clone(value) { value.data[0] = 9; return value }', name: 'clone', inputs: [[input]] })
    return { errors, original: input.data[0], output: values[0].data[0], typed: values[0].data instanceof Float32Array }
  })
  expect(results.errors.every(Boolean)).toBe(true)
  expect(results.original).toBe(1)
  expect(results.output).toBe(9)
  expect(results.typed).toBe(true)
})

test('simulation reaches its configured rate and accepts worker evaluated erosion rules', async ({ page }) => {
  await page.goto('/tests/fixtures/phase4a.html')
  await page.waitForFunction(() => window.phase4a)
  const timing = await page.evaluate(async () => {
    const scene = window.phase4a.scene.getState()
    scene.setDemoKey('simulation-terrain')
    scene.setInsetKey('simulation-map')
    scene.setParam('erosionStepsPerSecond', 20)
    const start = performance.now()
    const iteration = window.phase4a.simulation.getState().simulation.iteration
    scene.setIsRunning(true)
    await new Promise((resolve) => setTimeout(resolve, 2100))
    scene.setIsRunning(false)
    return { elapsedMs: performance.now() - start, steps: window.phase4a.simulation.getState().simulation.iteration - iteration }
  })
  expect(timing.steps).toBeGreaterThanOrEqual(35)
  await writeFile('artifacts/phase4a/browser-rate.json', JSON.stringify(timing, null, 2))
  await page.evaluate(async () => {
    await window.phase4a.evaluateOverride('stepHydraulicErosion', 'function stepHydraulicErosion(state) { return { ...state, iteration: state.iteration + 1, height: new Float32Array(state.height.length).fill(0.25) } }')
    window.phase4a.simulation.getState().step()
  })
  await expect.poll(() => page.evaluate(() => window.phase4a.simulation.getState().simulation.height[0])).toBe(0.25)
  await expect.poll(() => page.evaluate(() => Math.max(...window.phase4a.heights))).toBeCloseTo(0.6)
  await page.screenshot({ path: 'artifacts/phase4a/simulation.png' })
})
