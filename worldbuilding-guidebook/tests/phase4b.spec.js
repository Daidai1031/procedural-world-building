import { test, expect } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { parse } from 'yaml'

// CodeMirror is a contenteditable, so its contents cannot be read back through
// inputValue. The editors are seeded from these files, which is what the page
// would show anyway.
const snippets = JSON.parse(await readFile('src/generated/snippets.json', 'utf8'))

async function authoredStarter(path) {
  const raw = await readFile(path, 'utf8')
  return parse(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]).practice.starter
}

const evidence = 'artifacts/phase4b'
const lesson01 = '/lesson/scene-anatomy/'
const lesson02 = '/lesson/procedural-maps/'
const EROSION_RATE_FLOOR = 0.8

test.beforeAll(async () => {
  await mkdir(evidence, { recursive: true })
})

// The 2D inset draws the same field as the terrain and is cheap to read, so it
// stands in for "the scene changed" without reaching into the WebGL canvas.
async function insetSignature(page) {
  return page.locator('canvas.inset__canvas').first().evaluate((canvas) => {
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
    let signature = 0
    for (let index = 0; index < data.length; index += 401) signature = (signature * 31 + data[index]) % 1000000007
    return signature
  })
}

async function timestep(page) {
  return Number((await page.getByLabel('Current timestep').innerText()).replace('Timestep ', ''))
}

test('a JSX fill renders inside the snippet, scores both ways, and never shows its own answer', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${lesson01}entities-geometry-and-transform`)
  const practice = page.getByRole('region', { name: 'fill practice' })
  const shown = page.locator('.step-card__body > .code-block-anchor .code-block')
  await expect(shown).toContainText('<boxGeometry args={[1.5, 1.5, 1.5]} />')
  await expect(shown).not.toContainText('sphereGeometry')
  // The question comes before the code block it is asked about.
  const prompt = practice.locator('p').first()
  await expect(prompt).toContainText('rests on the floor')
  expect(await prompt.evaluate((element) => element.compareDocumentPosition(element.closest('.practice').querySelector('.code-block')) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeGreaterThan(0)
  // Attributes, the self-closing tag and the bracketed args all survive the
  // jsx grammar, and the control replaces only the answer.
  await expect(practice).toContainText('<sphereGeometry args={[1, 48, 48]} />')
  await expect(practice).toContainText('castShadow receiveShadow')
  const blank = practice.getByLabel('Blank 1')
  await expect(blank).toBeVisible()
  // The answer appears only inside the control, never in the code around it.
  const spliced = await blank.evaluate((element) => {
    const line = element.closest('.code-block__line').cloneNode(true)
    for (const control of line.querySelectorAll('select, input')) control.remove()
    return line.textContent
  })
  expect(spliced.trim()).toBe('1<mesh position={} castShadow receiveShadow>')
  await blank.selectOption('[0, 2, 0]')
  await practice.getByRole('button', { name: 'Check answers' }).click()
  await expect(practice.getByText('A mesh sits at the centre of its own shape')).toBeVisible()
  await expect(practice.getByLabel('Passed')).toHaveCount(0)
  // A wrong answer offers to reveal the right one instead of leaving the
  // learner to keep guessing.
  const showAnswer = practice.getByRole('button', { name: 'Show answer' })
  await expect(showAnswer).toBeVisible()
  await showAnswer.click()
  await expect(practice.getByText('Answer: [0, 1, 0]')).toBeVisible()
  await blank.selectOption('[0, 1, 0]')
  await practice.getByRole('button', { name: 'Check answers' }).click()
  await expect(practice.getByLabel('Passed')).toBeVisible()
  await page.locator('.step-card').screenshot({ path: `${evidence}/fill-jsx.png` })
  await page.reload()
  await expect(practice.getByLabel('Blank 1')).toHaveValue('[0, 1, 0]')
  await expect(practice.getByLabel('Passed')).toBeVisible()
  // Practice never gates Next.
  await expect(page.locator('.step-card__nav a[rel="next"]')).toBeEnabled()
  expect(errors).toEqual([])
})

test('the loader refuses a fill with no prompt and names the file', async ({ page }) => {
  await page.goto(`${lesson01}entities-geometry-and-transform`)
  const refusals = await page.evaluate(async () => {
    const { validateStepFrontmatter } = await import('/src/content/loader.js')
    const step = (practice) => {
      try {
        validateStepFrontmatter({ title: 'Fill', goal: 'Complete it.', practice }, 'content/lessons/01-scene-anatomy/steps/09-example.mdx')
        return null
      } catch (error) { return error.message }
    }
    return {
      missing: step({ kind: 'fill', blanks: [] }),
      blank: step({ kind: 'fill', prompt: '   ', blanks: [] }),
      unknown: step({ kind: 'guess' }),
      accepted: step({ kind: 'fill', prompt: 'Rest it on the floor.', blanks: [] }),
      otherKinds: [step({ kind: 'match' }), step({ kind: 'implement' })],
    }
  })
  for (const message of [refusals.missing, refusals.blank]) {
    expect(message).toContain('content/lessons/01-scene-anatomy/steps/09-example.mdx')
    expect(message).toContain('"practice.prompt" is required for a fill')
  }
  expect(refusals.unknown).toContain('"practice.kind" must be one of match, fill, implement')
  expect(refusals.accepted).toBe(null)
  // Only fill gains a required field; nothing else changes.
  expect(refusals.otherKinds).toEqual([null, null])
})

test('the camera clipping fill reads the canvas the previous step showed', async ({ page }) => {
  await page.goto(`${lesson01}moving-the-camera`)
  const practice = page.getByRole('region', { name: 'fill practice' })
  await expect(page.locator('.step-card__body > .code-block-anchor .code-block')).toContainText('minDistance={3}')
  await expect(practice).toContainText('<Canvas')
  const blank = practice.getByLabel('Blank 1')
  await blank.selectOption('near: 3, far: 40')
  await practice.getByRole('button', { name: 'Check answers' }).click()
  await expect(practice.getByLabel('Passed')).toHaveCount(0)
  await blank.selectOption('near: 0.1, far: 200')
  await practice.getByRole('button', { name: 'Check answers' }).click()
  await expect(practice.getByLabel('Passed')).toBeVisible()
})

test('both fills in the simulation chapter score against the region the step before them showed', async ({ page }) => {
  for (const [slug, blanks] of [
    ['water-follows-surface-height', [
      ['state.water[index] + settings.rainfall', 'state.water[index] * settings.rainfall'],
      ['state.height[index] + water', 'state.height[index] - water'],
    ]],
    ['carrying-sediment', [
      ['surface - neighborSurface', 'neighborSurface - surface'],
      ['drop > largestDrop', 'drop > 0'],
    ]],
  ]) {
    await page.goto(`${lesson02}${slug}`)
    const practice = page.getByRole('region', { name: 'fill practice' })
    await practice.getByLabel('Blank 1').selectOption(blanks[0][1])
    await practice.getByLabel('Blank 2').selectOption(blanks[1][0])
    await practice.getByRole('button', { name: 'Check answers' }).click()
    // One blank wrong, one right: exactly one hint, and no pass.
    await expect(practice.getByRole('status')).toHaveCount(1)
    await expect(practice.getByLabel('Passed')).toHaveCount(0)
    await practice.getByLabel('Blank 1').selectOption(blanks[0][0])
    await practice.getByRole('button', { name: 'Check answers' }).click()
    await expect(practice.getByLabel('Passed')).toBeVisible()
  }
})

test('the frequency match rewards the goal and rejects the settings the learner arrives with', async ({ page }) => {
  await page.goto(`${lesson02}frequency`)
  const practice = page.getByRole('region', { name: 'match practice' })
  await expect(practice).toContainText('twice as wide')
  const distance = practice.locator('output')
  const arrival = Number(await distance.innerText())
  expect(arrival).toBeGreaterThan(0.015)
  await practice.getByRole('button', { name: 'Check match' }).click()
  await expect(practice.getByLabel('Passed')).toHaveCount(0)
  await expect(practice.getByText('Frequency multiplies a position')).toBeVisible()
  await page.getByLabel('Frequency', { exact: true }).fill('0.16')
  await expect.poll(async () => Number(await distance.innerText())).toBe(0)
  await practice.getByRole('button', { name: 'Check match' }).click()
  await expect(practice.getByLabel('Passed')).toBeVisible()
  await page.locator('.step-card').screenshot({ path: `${evidence}/match-frequency.png` })
})

test('the roughness match refuses each half of the answer and accepts both together', async ({ page }) => {
  await page.goto(`${lesson02}persistence`)
  const practice = page.getByRole('region', { name: 'match practice' })
  const distance = practice.locator('output')
  const octaves = page.getByLabel('Octaves', { exact: true })
  const persistence = page.getByLabel('Persistence', { exact: true })
  await octaves.fill('6')
  await expect.poll(async () => Number(await distance.innerText())).toBeGreaterThan(0.008)
  await octaves.fill('4')
  await persistence.fill('0.8')
  await expect.poll(async () => Number(await distance.innerText())).toBeGreaterThan(0.008)
  await octaves.fill('5')
  await persistence.fill('0.65')
  await expect.poll(async () => Number(await distance.innerText())).toBe(0)
  await practice.getByRole('button', { name: 'Check match' }).click()
  await expect(practice.getByLabel('Passed')).toBeVisible()
})

test('both implements fail their starter and pass a correct answer with a difference map', async ({ page }) => {
  test.setTimeout(90000)
  for (const [slug, step, solution] of [
    ['terraces-and-power', 'content/lessons/02-procedural-maps/chapters/1-functions/steps/10-terraces-and-power.mdx', [
      ["if (shaping === 'terracing') return value // your code here", "if (shaping === 'terracing') return Math.round(value * 6) / 6"],
      ["if (shaping === 'power') return value // your code here", "if (shaping === 'power') return value ** 2.2"],
    ]],
    ['values-become-height', 'content/lessons/02-procedural-maps/chapters/1-functions/steps/12-values-become-height.mdx', [
      ['// your code here', 'value += layer * amplitude\n    amplitude *= settings.persistence\n    frequency *= 2'],
    ]],
  ]) {
    await page.goto(`${lesson02}${slug}`)
    const practice = page.getByRole('region', { name: 'implement practice' })
    await practice.getByRole('button', { name: 'Run cases' }).click()
    await expect(practice.getByRole('alert')).toContainText('differ from the course version')
    await expect(practice.getByLabel('Passed')).toHaveCount(0)
    await expect(practice.locator('canvas')).toHaveCount(3)
    const editor = practice.getByRole('textbox', { name: /Implementation for/ })
    let source = await authoredStarter(step)
    for (const [from, to] of solution) {
      expect(source).toContain(from)
      source = source.replace(from, to)
    }
    await editor.fill(source)
    await practice.getByRole('button', { name: 'Run cases' }).click()
    await expect(practice.getByLabel('Passed')).toBeVisible()
    await expect(practice.getByRole('alert')).toHaveCount(0)
    // The reference is only ever offered, never revealed.
    await expect(practice.getByRole('button', { name: 'Compare with the course version' })).toHaveCount(0)
    await practice.screenshot({ path: `${evidence}/implement-${slug}.png` })
  }
})

test('every live edit marks the lines it teaches and reports how long the scene takes to answer', async ({ page }) => {
  test.setTimeout(180000)
  const measurements = []
  for (const [slug, marked, edit] of [
    ['white-to-value-noise', 3, ['const tx = fade(x - x0)', 'const tx = x - x0']],
    ['perlin-versus-worley', 4, ['gradientDot(x0, y0, x, y, seed),', '0,']],
    ['erosion-removes-terrain', 5, ['Math.max(0, state.height[index] - 0.02),', 'Math.max(0, state.height[index] - 0.5),']],
  ]) {
    await page.goto(`${lesson02}${slug}`)
    // valueNoise2D only runs once the learner picks Value, which is what the
    // step's own prose asks them to do first.
    if (slug === 'white-to-value-noise') await page.getByLabel('Noise function', { exact: true }).selectOption('value')
    const editable = page.getByRole('region', { name: /^Edit / })
    await expect(editable.locator(".cm-line[data-highlighted='true']")).toHaveCount(marked)
    expect(await editable.locator(".cm-line[data-highlighted='true']").first().evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(255, 224, 92)')
    const editor = editable.getByRole('textbox', { name: /^Code for / })
    const apply = editable.getByRole('button', { name: /Apply to scene|Evaluating/ })
    const seeded = snippets[`procedural-maps/${slug}`].code.replaceAll('export ', '')
    expect(seeded).toContain(edit[0])
    const before = await insetSignature(page)
    await editor.fill(seeded.replace(edit[0], edit[1]))
    // Typing alone must not disturb the scene; only Apply does.
    expect(await insetSignature(page)).toBe(before)
    const started = Date.now()
    const samples = []
    await apply.click()
    await expect(apply).toHaveText('Apply to scene', { timeout: 20000 })
    const evaluated = Date.now() - started
    await expect(editable.getByRole('alert')).toHaveCount(0)
    // An erosion edit only shows up in the next timestep; a map edit redraws
    // the field it just produced.
    if (slug === 'erosion-removes-terrain') await page.getByRole('button', { name: 'Step once' }).click()
    await expect.poll(async () => {
      const signature = await insetSignature(page)
      samples.push({ afterMs: Date.now() - started, signature })
      return signature !== before
    }, { timeout: 20000, intervals: [40] }).toBe(true)
    const settled = Date.now() - started
    // A held frame reads as responding; several different frames on the way
    // would read as flickering.
    const intermediate = new Set(samples.slice(0, -1).map((sample) => sample.signature))
    measurements.push({
      step: slug,
      evaluatedMs: evaluated,
      sceneChangedMs: settled,
      framesSampledBefore: samples.length - 1,
      distinctIntermediateFrames: intermediate.size,
      heldLastGoodFrame: [...intermediate].every((signature) => signature === before),
    })
    await editable.getByRole('button', { name: 'Reset to original' }).click()
    await expect.poll(async () => insetSignature(page)).toBe(before)
  }
  await writeFile(`${evidence}/editable-latency.json`, `${JSON.stringify(measurements, null, 2)}\n`)
  for (const measurement of measurements) {
    expect(measurement.heldLastGoodFrame).toBe(true)
    expect(measurement.sceneChangedMs).toBeLessThan(4000)
  }
})

test('the erosion timestep holds its configured rate while a live edit is driving it', async ({ page }) => {
  test.setTimeout(180000)
  // Updates per second is unlocked two steps earlier, and params carry forward.
  async function configure(stepsPerSecond) {
    await page.goto(`${lesson02}advance-one-timestep`)
    await page.getByLabel('Updates per second', { exact: true }).fill(String(stepsPerSecond))
    await page.goto(`${lesson02}erosion-removes-terrain`)
  }

  async function rate(seconds) {
    const first = await timestep(page)
    const started = Date.now()
    await page.getByRole('button', { name: 'Start erosion' }).click()
    await page.waitForTimeout(seconds * 1000)
    const last = await timestep(page)
    const elapsed = (Date.now() - started) / 1000
    await page.getByRole('button', { name: 'Pause erosion' }).click()
    return (last - first) / elapsed
  }

  const seeded = snippets['procedural-maps/erosion-removes-terrain'].code.replaceAll('export ', '')
  const report = []
  // The default this step arrives with, and the fastest the slider allows.
  for (const configured of [10, 20]) {
    await configure(configured)
    const plain = await rate(5)
    const editable = page.getByRole('region', { name: /^Edit / })
    const apply = editable.getByRole('button', { name: /Apply to scene|Evaluating/ })
    // Water that never survives a timestep is the plainest proof through the
    // interface that every step is running the learner's code, not the course's.
    await editable.getByRole('textbox', { name: /^Code for / }).fill(seeded.replace('nextWater[index] *= 1 - settings.evaporation', 'nextWater[index] = 0'))
    await apply.click()
    await expect(apply).toHaveText('Apply to scene', { timeout: 20000 })
    await expect(editable.getByRole('alert')).toHaveCount(0)
    await page.getByRole('button', { name: 'Step once' }).click()
    await page.getByText('Measurements', { exact: true }).click()
    await expect(page.getByRole('definition').filter({ hasText: /^0\.0$/ })).toHaveCount(1)
    const overridden = await rate(8)
    report.push({
      configuredStepsPerSecond: configured,
      withoutOverride: Number(plain.toFixed(2)),
      withOverride: Number(overridden.toFixed(2)),
      fractionOfConfigured: Number((overridden / configured).toFixed(3)),
      fractionOfAchievable: Number((overridden / plain).toFixed(3)),
      floor: EROSION_RATE_FLOOR,
    })
  }
  await writeFile(`${evidence}/erosion-override-rate.json`, `${JSON.stringify(report, null, 2)}\n`)
  await page.screenshot({ path: `${evidence}/erosion-editable.png` })
  // A live edit must not cost the simulation its speed. Above roughly ten
  // updates a second the lesson page cannot keep up with or without an
  // override, which is why the ceiling is measured rather than assumed: the
  // override is held to what the page achieves without one.
  for (const reading of report) expect(reading.fractionOfAchievable).toBeGreaterThan(EROSION_RATE_FLOOR)
  expect(report[0].fractionOfConfigured).toBeGreaterThan(EROSION_RATE_FLOOR)
})
