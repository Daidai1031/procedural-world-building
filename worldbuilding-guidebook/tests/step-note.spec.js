import { test, expect } from '@playwright/test'

const STEP = '/lesson/voxels/marching-cubes'

async function select(page, textarea, phrase) {
  await textarea.evaluate((element, target) => {
    const start = element.value.indexOf(target)
    element.focus()
    element.setSelectionRange(start, start + target.length)
  }, phrase)
}

async function saveNote(page, text) {
  await page.getByRole('button', { name: 'Add a note' }).click()
  await page.getByRole('textbox', { name: 'Your note' }).fill(text)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('a learner writes a note with bold and italic, and it is saved at the foot of the step as a sticky note', async ({ page }) => {
  await page.goto(STEP)
  await expect(page.locator('#step-card-title')).toHaveText('Marching Cubes')

  const pencil = page.getByRole('button', { name: 'Add a note' })
  await expect(pencil).toHaveAttribute('aria-expanded', 'false')
  await pencil.click()
  await expect(pencil).toHaveAttribute('aria-expanded', 'true')

  const textarea = page.getByRole('textbox', { name: 'Your note' })
  await expect(textarea).toBeFocused()
  await textarea.fill('Use 16 or higher\n\nthe table is built once')

  await select(page, textarea, 'higher')
  await page.getByRole('button', { name: 'Bold' }).click()
  await expect(textarea).toHaveValue('Use 16 or **higher**\n\nthe table is built once')
  await expect(textarea).toBeFocused()

  // The outline rail also answers to Ctrl+B. Inside the note it must mean bold.
  const rail = page.locator('.rail')
  const pinnedBefore = await rail.getAttribute('data-pinned')
  await select(page, textarea, 'built once')
  await page.keyboard.press('Control+b')
  await expect(textarea).toHaveValue('Use 16 or **higher**\n\nthe table is **built once**')
  await expect(rail).toHaveAttribute('data-pinned', pinnedBefore)

  await select(page, textarea, 'table')
  await page.keyboard.press('Control+i')
  await expect(textarea).toHaveValue('Use 16 or **higher**\n\nthe _table_ is **built once**')

  await page.getByRole('button', { name: 'Save' }).click()

  const panel = page.locator('#step-note')
  const note = page.locator('.step-note__quote')
  await expect(note).toBeVisible()
  await expect(note.locator('p')).toHaveCount(2)
  await expect(note.locator('strong')).toHaveText(['higher', 'built once'])
  await expect(note.locator('em')).toHaveText('table')
  await expect(page.getByRole('textbox', { name: 'Your note' })).toHaveCount(0)
  await expect(panel).toBeFocused()

  // At the foot of the step: below the lesson prose and every block after it.
  const boxes = await page.evaluate(() => {
    const top = (element) => element.getBoundingClientRect().top + element.closest('.step-card__body').scrollTop
    const blocks = [...document.querySelector('.step-card__body').children].filter((element) => element.id !== 'step-note')
    return { note: top(document.getElementById('step-note')), blockBottoms: blocks.map((element) => top(element) + element.getBoundingClientRect().height) }
  })
  boxes.blockBottoms.forEach((bottom) => expect(boxes.note).toBeGreaterThanOrEqual(bottom - 1))

  // A sticky note: square corners and a soft fill of its own, apart from the lesson prose.
  expect(await panel.evaluate((element) => getComputedStyle(element).borderRadius)).toBe('0px')
  const fills = await page.evaluate(() => {
    const surface = getComputedStyle(document.documentElement).getPropertyValue('--note-surface').trim()
    const probe = document.createElement('div')
    probe.style.background = surface
    document.body.append(probe)
    const expected = getComputedStyle(probe).backgroundColor
    probe.remove()
    return {
      expected,
      note: getComputedStyle(document.getElementById('step-note')).backgroundColor,
      prose: getComputedStyle(document.querySelector('.step-card__prose')).backgroundColor,
    }
  })
  expect(fills.note).toBe(fills.expected)
  expect(fills.prose).not.toBe(fills.note)

  await page.reload()
  await expect(page.locator('.step-note__quote strong')).toHaveText(['higher', 'built once'])
})

test('the three dots open a menu; deleting asks first, and keeping leaves the note alone', async ({ page }) => {
  await page.goto(STEP)
  await saveNote(page, 'keep me')

  const dots = page.getByRole('button', { name: 'Note options' })
  await expect(dots).toHaveAttribute('aria-expanded', 'false')
  await dots.click()
  await expect(dots).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('menuitem', { name: 'Edit note' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Delete note' })).toBeFocused()

  // Escape closes the menu and gives focus back to the dots.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(dots).toBeFocused()

  await dots.click()
  await page.getByRole('menuitem', { name: 'Delete note' }).click()
  const keep = page.getByRole('button', { name: 'Keep', exact: true })
  await expect(keep).toBeFocused()
  await expect(page.getByText('Delete this note?')).toBeVisible()
  await keep.click()
  await expect(page.locator('.step-note__quote')).toContainText('keep me')

  await dots.click()
  await page.getByRole('menuitem', { name: 'Delete note' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.locator('#step-note')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add a note' })).toBeFocused()

  await page.reload()
  await expect(page.locator('#step-note')).toHaveCount(0)
})

test('the menu edits the note, cancel keeps what was saved, an empty save removes it, and note text is never run as markup', async ({ page }) => {
  await page.goto(STEP)
  await page.getByRole('button', { name: 'Add a note' }).click()
  const textarea = page.getByRole('textbox', { name: 'Your note' })
  await textarea.fill('<img src=x onerror="window.__noteRan = true"> keep')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('.step-note__quote')).toContainText('<img src=x')
  expect(await page.evaluate(() => window.__noteRan)).toBeUndefined()

  await page.getByRole('button', { name: 'Note options' }).click()
  await page.getByRole('menuitem', { name: 'Edit note' }).click()
  await expect(textarea).toHaveValue(/keep$/)
  await textarea.fill('changed but abandoned')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.locator('.step-note__quote')).toContainText('keep')
  await expect(page.locator('#step-note')).toBeFocused()

  await page.getByRole('button', { name: 'Edit your note' }).click()
  await textarea.fill('   ')
  await page.getByRole('button', { name: 'Remove note' }).click()
  await expect(page.locator('.step-note')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add a note' })).toBeVisible()
})

test('notes belong to their own step, and typing in the note does not turn the page', async ({ page }) => {
  await page.goto(STEP)
  await page.getByRole('button', { name: 'Add a note' }).click()
  const textarea = page.getByRole('textbox', { name: 'Your note' })
  await textarea.fill('only here')
  await textarea.press('ArrowLeft')
  await expect(page).toHaveURL(new RegExp(`${STEP}$`))
  await page.getByRole('button', { name: 'Save' }).click()

  await page.goto('/lesson/voxels/reading-one-cell')
  await expect(page.locator('#step-card-title')).toHaveText('Reading one cell')
  await expect(page.locator('.step-note')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add a note' })).toBeVisible()
})
