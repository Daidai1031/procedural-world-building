import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const lessonUrl = '/lesson/procedural-maps/'

test('wide cards and pinned outlines leave simulation controls reachable at 1024 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto(`${lessonUrl}calibrate-the-scales`)
  await page.getByRole('separator', { name: 'Card width' }).focus()
  await page.keyboard.press('End')
  await page.getByRole('button', { name: 'Keep the outline open' }).click()
  const card = await page.locator('.step-card').boundingBox()
  const strip = await page.locator('.control-strip__panel').boundingBox()
  expect(strip.x).toBeGreaterThanOrEqual(card.x + card.width)
  expect(strip.width).toBeGreaterThanOrEqual(160)
  await page.locator('.step-card__nav a[rel="next"]').click()
  await expect(page.locator('.step-card__title')).toHaveText('Read the evolved landscape')
})

test('all 24 actual steps render and navigate across chapters without replacing the canvas', async ({ page }) => {
  test.setTimeout(60000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/lesson/scene-anatomy/moving-the-camera')
  const canvas = await page.locator('.scene-host canvas').elementHandle()
  await page.locator('.step-card__nav a[rel="next"]').click()
  await expect(page).toHaveURL(`${page.url().split('/lesson/')[0]}${lessonUrl}grid-positions`)
  const lesson = await page.evaluate(async () => {
    const { lessons } = await import('/src/content/loader.js')
    const current = lessons.find((entry) => entry.slug === 'procedural-maps')
    return { chapters: current.chapters.map((chapter) => ({ slug: chapter.slug, count: chapter.steps.length })), steps: current.steps.map((step) => ({ slug: step.stepSlug, title: step.frontmatter.title, code: Boolean(step.frontmatter.code), chapter: step.chapterTitle })) }
  })
  expect(lesson.chapters).toEqual([{ slug: 'functions', count: 12 }, { slug: 'simulation', count: 12 }])
  for (const [index, step] of lesson.steps.entries()) {
    await expect(page.locator('.step-card__title')).toHaveText(step.title)
    await expect(page.locator('.step-card__lesson-title')).toHaveText(step.chapter)
    await expect(page.locator('.code-block')).toHaveCount(step.code ? 1 : 0)
    expect(await canvas.evaluate((element) => element === document.querySelector('.scene-host canvas'))).toBe(true)
    if (index < lesson.steps.length - 1) await page.locator('.step-card__nav a[rel="next"]').click()
  }
  await expect(page.locator('.step-card__nav a[rel="next"]')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.step-card__title')).toHaveText('Read the evolved landscape')
  expect(errors).toEqual([])
})

test('actual compare step supports arrows and pointer dragging without step navigation', async ({ page }) => {
  await mkdir('artifacts/phase3', { recursive: true })
  await page.goto(`${lessonUrl}perlin-versus-worley`)
  await expect(page.getByRole('radio', { name: 'Perlin', exact: true })).toBeChecked()
  await page.getByRole('radio', { name: 'Perlin', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'Worley', exact: true })).toBeChecked()
  await expect(page).toHaveURL(new RegExp(`${lessonUrl}perlin-versus-worley$`))
  const divider = page.getByRole('slider', { name: /map divider/ })
  const bounds = await divider.boundingBox()
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width / 2 + 40, bounds.y + bounds.height / 2, { steps: 5 })
  await page.mouse.up()
  expect(Number(await divider.getAttribute('aria-valuenow'))).toBeGreaterThan(60)
  await page.getByRole('button', { name: /Swap it with the 3D scene/ }).click()
  await expect(page.locator('.scene-host')).toHaveAttribute('data-slot', 'corner')
  await page.getByRole('button', { name: 'The scene in 3D' }).click()
  await expect(page.locator('canvas')).toHaveCount(3)
  await page.screenshot({ path: 'artifacts/phase3/compare.png' })
})

test('actual highlighted source shows all five syntax colours on summit', async ({ page }) => {
  await mkdir('artifacts/phase3', { recursive: true })
  await page.goto(`${lessonUrl}shape-the-output`)
  await page.getByRole('separator', { name: 'Card width' }).focus()
  await page.keyboard.press('End')
  await expect(page.getByRole('separator', { name: 'Card width' })).toHaveAttribute('aria-valuenow', '760')
  const row = page.locator('.code-block__line[data-highlighted="true"]')
  await expect(row).toHaveCount(1)
  const appearance = await row.evaluate((element) => ({
    fill: getComputedStyle(element).backgroundColor,
    colours: [...new Set([...element.querySelectorAll('span[style]')].map((span) => getComputedStyle(span).color))],
  }))
  expect(appearance.fill).toBe('rgb(255, 224, 92)')
  expect(appearance.colours).toHaveLength(5)
  await page.locator('.code-block').screenshot({ path: 'artifacts/phase3/highlighted-code.png' })
  await page.screenshot({ path: 'artifacts/phase3/lesson-code.png' })
})

test('simulation keeps running across actual routes and preserves its state on display edits', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${lessonUrl}advance-one-timestep`)
  await page.getByRole('button', { name: 'Start erosion' }).click()
  const timestep = page.getByLabel('Current timestep')
  await expect.poll(async () => Number((await timestep.innerText()).replace('Timestep ', ''))).toBeGreaterThan(3)
  const before = Number((await timestep.innerText()).replace('Timestep ', ''))
  await page.locator('.step-card__nav a[rel="next"]').click()
  await expect(page.locator('.step-card__title')).toHaveText('Read the neighborhood')
  await expect(page.getByRole('button', { name: 'Pause erosion' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => Number((await timestep.innerText()).replace('Timestep ', ''))).toBeGreaterThan(before)
  await page.getByRole('button', { name: 'Pause erosion' }).click()
  const paused = await timestep.innerText()
  await page.getByRole('button', { name: 'Keep the outline open' }).click()
  await page.getByRole('link', { name: /Calibrate the scales/ }).click()
  await expect(timestep).toHaveText(paused)
  await page.getByLabel('Height amplitude', { exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(timestep).toHaveText(paused)
  await page.getByText('Measurements', { exact: true }).click()
  await expect(page.getByText('Cell spacing', { exact: true })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(2)
  await page.getByRole('button', { name: 'Keep the outline open' }).click()
  await page.getByRole('button', { name: 'Start erosion' }).focus()
  await page.mouse.move(1000, 500)
  await expect(page.locator('.rail')).toHaveCSS('width', '48px')
  await page.screenshot({ path: 'artifacts/phase3/simulation.png' })
  await page.getByRole('button', { name: 'Reset terrain' }).click()
  await expect(timestep).toHaveText('Timestep 0')
  expect(errors).toEqual([])
})

test('camera and learner seed persist through five actual step transitions', async ({ page }) => {
  await page.goto(`${lessonUrl}position-function-value`)
  await page.evaluate(async () => {
    const { Mesh } = await import('/node_modules/.vite/deps/three.js')
    Mesh.prototype.onBeforeRender = function (_renderer, _scene, camera) {
      if (camera.isPerspectiveCamera) window.observedCamera = camera
    }
  })
  await expect.poll(() => page.evaluate(() => Boolean(window.observedCamera))).toBe(true)
  const initial = await page.evaluate(() => window.observedCamera.position.toArray())
  await page.mouse.move(1050, 550)
  await page.mouse.down()
  await page.mouse.move(1180, 570, { steps: 8 })
  await page.mouse.up()
  await expect.poll(() => page.evaluate(() => window.observedCamera.position.x)).not.toBeCloseTo(initial[0], 1)
  await page.getByLabel('Seed', { exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  const seed = await page.getByLabel('Seed', { exact: true }).inputValue()
  // Let OrbitControls finish damping before measuring continuity across routes.
  await expect.poll(async () => page.evaluate(async () => {
    const before = window.observedCamera.position.clone()
    await new Promise((resolve) => setTimeout(resolve, 100))
    return before.distanceTo(window.observedCamera.position)
  })).toBeLessThan(0.00001)
  const orbited = await page.evaluate(() => window.observedCamera.position.toArray())
  for (let index = 0; index < 5; index += 1) await page.locator('.step-card__nav a[rel="next"]').click()
  const after = await page.evaluate(() => window.observedCamera.position.toArray())
  after.forEach((coordinate, index) => expect(coordinate).toBeCloseTo(orbited[index], 3))
  await page.getByRole('button', { name: 'Keep the outline open' }).click()
  await page.getByRole('link', { name: /Position, function, value/ }).click()
  await expect(page.getByLabel('Seed', { exact: true })).toHaveValue(seed)
})
