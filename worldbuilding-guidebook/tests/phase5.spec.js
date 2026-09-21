import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// Phase 5 is shelved: the tutor has no interface and the search index is no
// longer built, so there is nothing here to test. See src/tutor/tutorEnabled.js
// for how to bring it back. Delete this line and restore the index in the
// prebuild script when it returns.
test.skip(true, 'Phase 5 (course tutor) is shelved until every lesson is written')

// The file does not exist while the tutor is shelved, and a failed read at the
// top of the file would stop it from loading at all, so a missing index is null.
const courseIndex = await readFile('public/rag-index.json', 'utf8').then(JSON.parse, () => null)

async function mockServices(page, { authenticated = false, failModel = true, chatStatus = 200 } = {}) {
  const requests = []
  await page.route('**/api/auth', async (route) => {
    if (route.request().method() === 'POST') authenticated = true
    await route.fulfill({ json: { authenticated } })
  })
  await page.route('**/api/translate-query', async (route) => {
    requests.push({ endpoint: 'translate', ...route.request().postDataJSON() })
    await route.fulfill({ json: { englishQuery: 'Why does the same seed give deterministic noise?', detectedLanguage: 'zh' } })
  })
  await page.route('**/api/chat', async (route) => {
    requests.push({ endpoint: 'chat', ...route.request().postDataJSON() })
    if (chatStatus !== 200) { await route.fulfill({ status: chatStatus, json: { error: "The tutor is at today's limit." } }); return }
    await route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ text: '相同的 seed 与坐标会产生相同的结果。\nPosition, function, value' }) + '\n' + JSON.stringify({ done: true }) + '\n' })
  })
  await page.route('**/rag-index.json', (route) => route.fulfill({ json: courseIndex }))
  if (failModel) await page.route('**/embeddingWorker.js*', (route) => route.abort())
  return requests
}

test('guest can search without authentication; first use lazily fails over to ranked keyword links', async ({ page }) => {
  const resources = []
  page.on('request', (request) => resources.push(request.url()))
  const requests = await mockServices(page)
  await page.goto('/lesson/procedural-maps/position-function-value')
  await expect(page.getByLabel('Ask about this step')).toBeVisible()
  expect(resources.some((url) => /embeddingWorker|rag-index\.json|huggingface/.test(url))).toBe(false)
  await page.getByLabel('Ask about this step').fill('determinism seed noise')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page.getByText('Search model unavailable; using keyword search.')).toBeVisible()
  const result = page.getByRole('region', { name: 'Tutor response' })
  await expect(result.getByRole('heading', { name: 'Related in this course' })).toBeVisible()
  await expect(result.locator('li')).toHaveCount(6)
  await expect(page.getByText('Course search is open to everyone.', { exact: false })).toBeVisible()
  expect(requests).toEqual([])
  await result.scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'artifacts/phase5/guest-search.png' })
})

test('CJK translates before retrieval, streams in Chinese and renders course citations', async ({ page }) => {
  const requests = await mockServices(page, { authenticated: true })
  await page.goto('/lesson/procedural-maps/position-function-value')
  await page.getByLabel('Ask about this step').fill('为什么同样的 seed 每次结果都一样？')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page.locator('.tutor-answer')).toContainText('相同的 seed')
  expect(requests.map((request) => request.endpoint)).toEqual(['translate', 'chat'])
  expect(requests[1].answerLanguage).toBe('zh')
  expect(requests[1].question).toContain('为什么')
  expect(requests[1].chunks.some((chunk) => chunk.stepSlug === 'position-function-value')).toBe(true)
  expect(requests[1].chunks.every((chunk) => !('vector' in chunk))).toBe(true)
  await expect(page.locator('.tutor-answer a')).toHaveAttribute('href', '/lesson/procedural-maps/position-function-value')
})

test('inline question moves into session drawer; shortcut, rail, passphrase and daily cap work', async ({ page }) => {
  await mockServices(page, { chatStatus: 429 })
  await page.goto('/lesson/scene-anatomy/what-is-a-scene')
  await page.getByLabel('Ask about this step').fill('What is a mesh?')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Related in this course' })).toBeVisible()
  await page.getByRole('button', { name: 'Open in drawer' }).click()
  const drawer = page.getByRole('dialog', { name: 'Course tutor', exact: true })
  await expect(drawer).toContainText('What is a mesh?')
  await drawer.getByText('Have a tutor passphrase?').click()
  await drawer.getByLabel('Passphrase', { exact: true }).fill('mock-only-phrase')
  await drawer.getByRole('button', { name: 'Enable answers' }).click()
  await expect(drawer).toContainText('Generated answers are enabled.')
  await drawer.getByLabel('Ask about this step').fill('Explain the camera')
  await drawer.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(drawer.getByRole('alert')).toHaveText("The tutor is at today's limit.")
  await page.keyboard.press('Escape')
  await expect(drawer).not.toBeVisible()
  await page.keyboard.press('Control+k')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByLabel('Ask about this step')).toBeFocused()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Open course tutor' }).click()
  await expect(drawer).toBeVisible()
})

test('selection explanation is one-shot with source context and transfers into the drawer', async ({ page }) => {
  const requests = await mockServices(page, { authenticated: true })
  await page.goto('/lesson/scene-anatomy/a-scene-file')
  // Use the displayed DOM to make the same selection a mouse drag makes.
  const displayed = page.locator('pre.code-block__scroll').first()
  await displayed.evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element.querySelector('.code-block__line > span:last-child'))
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })
  await page.getByRole('button', { name: 'Explain this', exact: true }).click()
  const popover = page.getByRole('dialog', { name: 'Explain selected code' })
  await expect(popover.locator('.tutor-answer')).toBeVisible()
  expect(requests[0].context.selection).toContain('The scene groups its environment')
  expect(requests[0].context.selectionSource).toMatch(/SceneAnatomyDemo.jsx:\d+/)
  expect(requests[0].history).toEqual([])
  await popover.getByRole('button', { name: 'Open in drawer' }).click()
  await expect(page.getByRole('dialog', { name: 'Course tutor', exact: true })).toContainText('Explain what this selected code does.')
  await expect(popover).not.toBeVisible()
})

test('wrong fill sends prompt and learner attempt without the expected answer', async ({ page }) => {
  const requests = await mockServices(page, { authenticated: true })
  await page.goto('/lesson/scene-anatomy/entities-geometry-and-transform')
  await page.getByLabel('Blank 1').selectOption('[0, 2, 0]')
  await page.getByRole('button', { name: 'Check answers' }).click()
  await page.getByRole('button', { name: 'Ask about this blank' }).click()
  const drawer = page.getByRole('dialog', { name: 'Course tutor', exact: true })
  await drawer.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(drawer.locator('.tutor-answer')).toBeVisible()
  const context = requests[0].context
  expect(context.task.kind).toBe('fill')
  expect(context.task.prompt).toContain('rests on the floor')
  expect(context.attempt).toBe('[0, 2, 0]')
  expect(JSON.stringify(context)).not.toContain('[0, 1, 0]')
  expect(Object.keys(context.task).sort()).toEqual(['kind', 'prompt'])
})

test('model progress is determinate and the successful worker path returns semantic results', async ({ page }) => {
  await mockServices(page, { failModel: false })
  const vector = courseIndex.chunks.find((chunk) => chunk.id === 'step:procedural-maps/position-function-value').vector.map((value) => value / 127)
  // Deterministic worker transport fixture; real MiniLM ranking is measured separately.
  await page.route('**/embeddingWorker.js*', (route) => route.fulfill({ contentType: 'text/javascript', body: `self.onmessage = ({data}) => { self.postMessage({id:data.id,progress:50}); setTimeout(() => self.postMessage({id:data.id,vector:${JSON.stringify(vector)}}), 1000) }` }))
  await page.goto('/lesson/procedural-maps/position-function-value')
  await page.getByLabel('Ask about this step').fill('Why is noise deterministic?')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '50')
  await expect(page.getByRole('heading', { name: 'Related in this course' })).toBeVisible()
  await expect(page.getByText('Search model unavailable;', { exact: false })).not.toBeVisible()
  await expect(page.getByRole('region', { name: 'Tutor response' }).locator('li').first()).toContainText('Position, function, value')
})

test('failed implementation sends the brief and learner source, never reference data', async ({ page }) => {
  const requests = await mockServices(page, { authenticated: true })
  await page.goto('/lesson/procedural-maps/terraces-and-power')
  await page.getByRole('textbox', { name: /^Implementation for/ }).fill('function shapeValue(value, shaping) { return 0 }')
  await page.getByRole('button', { name: 'Run cases' }).click()
  await page.getByRole('button', { name: 'Ask about this task' }).click()
  const drawer = page.getByRole('dialog', { name: 'Course tutor', exact: true })
  await drawer.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(drawer.locator('.tutor-answer')).toBeVisible()
  expect(requests[0].context.task.kind).toBe('implement')
  expect(requests[0].context.task.prompt).toContain('Terracing')
  expect(requests[0].context.attempt).toBe('function shapeValue(value, shaping) { return 0 }')
  expect(Object.keys(requests[0].context.task).sort()).toEqual(['kind', 'prompt'])
  await drawer.screenshot({ path: 'artifacts/phase5/practice-drawer.png' })
})

test('real browser MiniLM worker embeds a query using the downloaded model files', async ({ page }) => {
  test.setTimeout(60000)
  await mockServices(page, { failModel: false })
  await page.route('https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/**', async (route) => {
    const filename = new URL(route.request().url()).pathname.split('/resolve/main/')[1]
    if (!['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx'].includes(filename)) { await route.fulfill({ status: 404 }); return }
    const body = await readFile(`.cache/transformers/Xenova/all-MiniLM-L6-v2/${filename}`)
    await route.fulfill({ body, headers: { 'Content-Length': String(body.length), 'Access-Control-Allow-Origin': '*' }, contentType: filename.endsWith('.json') ? 'application/json' : 'application/octet-stream' })
  })
  await page.route('https://cdn.jsdelivr.net/npm/@xenova/transformers@*/dist/*.wasm', async (route) => {
    const filename = new URL(route.request().url()).pathname.split('/').at(-1)
    const body = await readFile(`node_modules/onnxruntime-web/dist/${filename}`)
    await route.fulfill({ body, contentType: 'application/wasm', headers: { 'Access-Control-Allow-Origin': '*' } })
  })
  await page.goto('/lesson/procedural-maps/position-function-value')
  await page.getByLabel('Ask about this step').fill('Why do the same coordinates and seed always give the same noise?')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Related in this course' })).toBeVisible({ timeout: 45000 })
  await expect(page.getByText('Search model unavailable;', { exact: false })).not.toBeVisible()
  await expect(page.getByRole('region', { name: 'Tutor response' }).locator('li').first()).toContainText('Position, function, value')
  await page.getByRole('region', { name: 'Tutor response' }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'artifacts/phase5/semantic-search.png' })
})
