import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const base = '/guidebook/lesson/particles/'
const slugs = [
  'what-is-a-particle', 'emit-age-disappear', 'position-changes-over-time', 'forces-change-velocity',
  'reading-a-vector-field', 'uniform-flow-vortex-turbulence', 'trails-and-visual-variation', 'build-an-atmospheric-effect',
]
const status = (page) => page.locator('.particle-status').first()
test.beforeAll(async () => { await mkdir('artifacts/lesson07', { recursive: true }) })

test('eight scenes, source excerpts and practices share one canvas', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(base + slugs[0])
  const canvas = await page.locator('.scene-host canvas').elementHandle()
  for (let index = 0; index < slugs.length; index += 1) {
    await expect(page).toHaveURL(new RegExp(slugs[index]))
    await expect(page.locator('.particle-panel')).toBeVisible()
    await expect(page.locator('.step-card__body > .code-block-anchor .code-block')).toHaveCount(1)
    await expect(status(page)).not.toBeEmpty()
    const answer = await page.evaluate(async (slug) => {
      const { stepsBySlug } = await import('/guidebook/src/content/loader.js')
      return stepsBySlug.get(`particles/${slug}`).frontmatter.practice.blanks[0].answer
    }, slugs[index])
    await page.getByLabel('Blank 1').selectOption(answer)
    await page.getByRole('button', { name: 'Check answers' }).click()
    await expect(page.locator('.practice__pass')).toBeVisible()
    expect(await canvas.evaluate((element) => element === document.querySelector('.scene-host canvas'))).toBe(true)
    await page.waitForTimeout(2500)
    await page.screenshot({ path: `artifacts/lesson07/step0${index + 1}.png` })
    if (index < slugs.length - 1) await page.locator('.step-card__nav a[rel="next"]').click()
  }
  expect(errors).toEqual([])
})

test('step 1: switching Look leaves the notebook page unchanged', async ({ page }) => {
  await page.goto(base + slugs[0])
  await page.getByRole('button', { name: 'Next speck' }).click()
  const pageText = () => page.locator('.particle-page').innerText()
  const before = await pageText()
  expect(before).toContain('Speck 2 of 90')
  await page.getByLabel('Look').selectOption('Puff')
  await expect(status(page)).toContainText('puff')
  expect(await pageText()).toBe(before)
})

test('step 2: the crowd climbs towards rate × lifetime and a burst adds specks', async ({ page }) => {
  await page.goto(base + slugs[1])
  await expect(status(page)).toContainText('settles near 60')
  await page.waitForTimeout(3500)
  const live = async () => Number((await status(page).innerText()).match(/Live (\d+)/)[1])
  expect(await live()).toBeGreaterThan(35)
  await page.getByRole('button', { name: 'Pause' }).click()
  const paused = await live()
  await page.getByRole('button', { name: 'Burst' }).click()
  await expect.poll(live).toBe(paused + 40)
})

test('step 3: only the dt runner keeps its pace on both screens', async ({ page }) => {
  await page.goto(base + slugs[2])
  await page.getByRole('button', { name: 'Step forward' }).click()
  await expect(status(page)).toContainText('1 frames')
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeDisabled({ timeout: 10000 })
  await expect(status(page)).toContainText('speed × dt runner 5.00 m')
  await expect(status(page)).toContainText(/fixed-step runner 2\.7\d m/)
  await page.getByLabel('Screen speed').selectOption('144')
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeDisabled({ timeout: 10000 })
  await expect(status(page)).toContainText('speed × dt runner 5.00 m')
  await expect(status(page)).toContainText('fixed-step runner 5.00 m')
})

test('step 4: forces off keeps the ringed piece at a steady speed', async ({ page }) => {
  await page.goto(base + slugs[3])
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Forces off' }).click()
  await expect(status(page)).toContainText('gravity 0 · sideways 0')
  await page.getByRole('button', { name: 'Pause' }).click()
  const speed = async () => (await status(page).innerText()).match(/speed ([\d.]+)/)?.[1]
  const first = await speed()
  for (let step = 0; step < 5; step += 1) await page.getByRole('button', { name: 'Step forward' }).click()
  expect(first).toBeTruthy()
  expect(await speed()).toBe(first)
})

test('step 5 to 8: leaves, layers, trails and presets respond', async ({ page }) => {
  await page.goto(base + slugs[4])
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(status(page)).toContainText('Leaves 7')
  await page.getByRole('button', { name: 'Drop leaves' }).click()
  await expect(status(page)).toContainText('Leaves 14')
  await page.getByLabel('Arrow means').selectOption('Push')
  await expect(status(page)).toContainText('push')

  await page.locator('.step-card__nav a[rel="next"]').click()
  await page.getByLabel('Whirlpool', { exact: true }).uncheck()
  await expect(status(page)).toContainText('layers added: Breeze')
  await page.getByLabel('Breeze', { exact: true }).uncheck()
  await expect(status(page)).toContainText('the air is calm')
  await page.getByLabel('Breeze', { exact: true }).check()
  await page.getByLabel('Whirlpool', { exact: true }).check()

  await page.locator('.step-card__nav a[rel="next"]').click()
  await page.getByLabel('Clear trail on respawn').uncheck()
  await expect(status(page)).toContainText('stray lines')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'artifacts/lesson07/step07-stray-lines.png' })
  await page.getByLabel('Clear trail on respawn').check()

  await page.locator('.step-card__nav a[rel="next"]').click()
  await expect(page.locator('.particle-recipe')).toContainText('Dust recipe')
  await page.getByLabel('Preset').selectOption('Rain')
  await expect(page.locator('.particle-recipe')).toContainText('sky · 100 per second')
  await page.waitForTimeout(2500)
  await page.screenshot({ path: 'artifacts/lesson07/step08-rain.png' })
})
