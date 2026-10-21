import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const lessonUrl = '/guidebook/lesson/distributions/'

test.beforeAll(async () => {
  await mkdir('artifacts/lesson05', { recursive: true })
})

test('all eight steps have a scene, source, practice, and one persistent canvas', async ({ page }) => {
  await page.goto(`${lessonUrl}from-one-asset-to-many`)
  const canvas = await page.locator('.scene-host canvas').elementHandle()
  const steps = await page.evaluate(async () => {
    const { lessons } = await import('/guidebook/src/content/loader.js')
    return lessons.find((lesson) => lesson.slug === 'distributions').steps.map((step) => ({
      title: step.frontmatter.title,
      scene: Boolean(step.frontmatter.scene?.demo),
      code: Boolean(step.frontmatter.code),
      practice: Boolean(step.frontmatter.practice),
    }))
  })
  expect(steps).toHaveLength(8)
  expect(steps.every((step) => step.scene && step.code && step.practice)).toBe(true)

  for (const [index, step] of steps.entries()) {
    await expect(page.locator('.step-card__title')).toHaveText(step.title)
    await expect(page.locator('.step-card__body > .code-block-anchor .code-block')).toHaveCount(1)
    await expect(page.locator('.practice')).toHaveCount(1)
    expect(await canvas.evaluate((element) => element === document.querySelector('.scene-host canvas'))).toBe(true)
    if (index < steps.length - 1) await page.locator('.step-card__nav a[rel="next"]').evaluate((link) => link.click())
  }
})

test('orientation step renders every asset and keeps its practice usable', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${lessonUrl}surface-orientation`)

  await expect(page.locator('.step-card__title')).toHaveText('Surface orientation')
  await expect(page.locator('.scene-host canvas')).toHaveCount(1)
  await expect(page.getByLabel('Asset', { exact: true })).toBeVisible()
  await page.getByLabel('Asset', { exact: true }).selectOption('tree')
  await page.getByLabel('Orientation', { exact: true }).selectOption('upright')
  await expect(page.locator('.scene-status')).toContainText('upright')

  await page.getByLabel('Blank 1').selectOption('tilt.multiply(turn)')
  await page.getByRole('button', { name: 'Check answers' }).click()
  await expect(page.getByText(/Passed/)).toBeVisible()
  await page.screenshot({ path: 'artifacts/lesson05/step05-orientation.png' })
  expect(errors).toEqual([])
})

test('slope step updates accepted counts without replacing the canvas', async ({ page }) => {
  await page.goto(`${lessonUrl}filtering-by-slope`)
  const canvas = await page.locator('.scene-host canvas').elementHandle()
  const status = page.locator('.scene-status')
  await expect(status).toContainText('accepted / 100 candidates')
  const before = Number((await status.innerText()).split(' ')[0])

  await page.getByLabel('Max slope', { exact: true }).fill('5')
  await expect.poll(async () => Number((await status.innerText()).split(' ')[0])).toBeLessThanOrEqual(before)
  await page.getByLabel('Asset', { exact: true }).selectOption('antenna')
  expect(await canvas.evaluate((element) => element === document.querySelector('.scene-host canvas'))).toBe(true)
  await page.screenshot({ path: 'artifacts/lesson05/step06-slope.png' })
})

test('layer step toggles one layer and compares terrain-driven variation', async ({ page }) => {
  await page.goto(`${lessonUrl}layers-and-variation`)
  await expect(page.getByRole('radio', { name: 'Random only', exact: true })).toBeChecked()
  await page.getByRole('radio', { name: 'Terrain driven', exact: true }).check()
  await expect(page.getByRole('radio', { name: 'Terrain driven', exact: true })).toBeChecked()
  await page.getByLabel('Trees', { exact: true }).uncheck()
  await expect(page.getByLabel('Rocks', { exact: true })).toBeChecked()
  await expect(page.locator('.scene-status')).toContainText('antenna')
  await page.screenshot({ path: 'artifacts/lesson05/step07-layers.png' })
})

test('population step exposes spacing, protocols, and a working final practice', async ({ page }) => {
  await page.goto(`${lessonUrl}build-a-population`)
  const status = page.locator('.scene-status')
  await expect(status).toContainText('tree')
  await expect(status).toContainText('antenna')
  await page.getByLabel('Antenna spacing', { exact: true }).fill('2')
  await expect(page.getByText('Population protocol', { exact: true })).toBeVisible()
  await expect(page.getByRole('table')).toContainText(/minimum spacing/i)
  await page.getByLabel('Blank 1').selectOption('<')
  await page.getByRole('button', { name: 'Check answers' }).click()
  await expect(page.getByText(/Passed/)).toBeVisible()
  await page.screenshot({ path: 'artifacts/lesson05/step08-population.png' })
})
