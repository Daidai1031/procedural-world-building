import { test, expect } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const evidence = 'artifacts/phase3b'
const captureBaseline = process.env.PHASE3B_CAPTURE === 'before'

test('Lesson 01 scene and plan remain pixel-identical for each selection', async ({ page }) => {
  test.setTimeout(60000)
  await mkdir(evidence, { recursive: true })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/lesson/scene-anatomy/what-the-camera-sees')
  await expect(page.locator('.entity-panel')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  const rows = []
  for (const id of ['box', 'sphere', 'cone', 'torus']) {
    await page.locator(`.entity-panel__select[data-entity-id="${id}"]`).click()
    await page.evaluate(() => new Promise((resolve) => {
      let frames = 0
      function frame() { if (++frames >= 20) resolve(); else requestAnimationFrame(frame) }
      requestAnimationFrame(frame)
    }))
    const plan = await page.locator('.inset__canvas').screenshot()
    const hide = await page.addStyleTag({ content: '.app > :not(.scene-host), .app > :not(.scene-host) * { visibility: hidden !important; }' })
    const scene = await page.locator('.scene-host canvas').screenshot()
    await hide.evaluate((element) => element.remove())
    for (const [view, png] of [['scene', scene], ['plan', plan]]) {
      const name = `${view}-${id}`
      const mode = captureBaseline ? 'before' : 'after'
      await writeFile(`${evidence}/${name}-${mode}.png`, png)
      if (!captureBaseline) {
        const before = await readFile(`${evidence}/${name}-before.png`)
        // Playwright's PNG encoder is deterministic for identical pixels.
        const identical = png.equals(before)
        rows.push({ name, identical })
      }
    }
  }
  expect(errors).toEqual([])
  if (!captureBaseline) {
    await writeFile(`${evidence}/screenshot-comparison.json`, JSON.stringify(rows, null, 2))
    expect(rows.every((row) => row.identical)).toBe(true)
  }
})

test('all eleven Lesson 01 steps show the approved code and keep the shared canvas', async ({ page }) => {
  test.setTimeout(60000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/lesson/scene-anatomy/what-is-a-scene')
  const canvas = await page.locator('.scene-host canvas').elementHandle()
  const steps = await page.evaluate(async () => {
    const { lessons } = await import('/src/content/loader.js')
    return lessons.find((lesson) => lesson.slug === 'scene-anatomy').steps.map((step) => ({ id: step.id, title: step.frontmatter.title }))
  })
  expect(steps).toHaveLength(11)
  for (const [index, step] of steps.entries()) {
    // A step's own block is the anchor directly under the card body; a practice
    // task renders its own code block further in.
    const ownCode = page.locator('.step-card__body > .code-block-anchor .code-block')
    await expect(page.locator('.step-card__title')).toHaveText(step.title)
    await expect(ownCode).toHaveCount(index === 0 ? 0 : 1)
    if (index > 0) {
      await expect(ownCode.locator('.code-block__line[data-highlighted="true"]').first()).toBeAttached()
      await expect(ownCode.locator('.code-block__scroll')).not.toContainText('#region')
    }
    if (index === 1) {
      await expect(ownCode).toContainText('<StudioEnvironment />')
      await expect(page.locator('.step-card__prose')).toContainText('capital letter')
    }
    if (index === 2) {
      await expect(ownCode).toContainText('<Selectable id="box">')
      await expect(page.locator('.step-card__prose')).toContainText('Selectable is an imported')
    }
    if (index === 5) {
      for (const name of ['sphereGeometry', 'cylinderGeometry', 'torusKnotGeometry']) await expect(ownCode).toContainText(name)
      await expect(page.locator('.step-card__prose')).toContainText('48, 48')
    }
    if ([1, 2, 5, 9].includes(index)) {
      await page.getByRole('separator', { name: 'Card width' }).focus()
      await page.keyboard.press('End')
      await ownCode.screenshot({ path: `${evidence}/step-${String(index + 1).padStart(2, '0')}-code.png` })
    }
    expect(await canvas.evaluate((element) => element === document.querySelector('.scene-host canvas'))).toBe(true)
    if (index < steps.length - 1) await page.locator('.step-card__nav a[rel="next"]').click()
  }
  await page.locator('.step-card__nav a[rel="next"]').click()
  await expect(page).toHaveURL(/\/lesson\/procedural-maps\/grid-positions$/)
  expect(errors).toEqual([])
})
