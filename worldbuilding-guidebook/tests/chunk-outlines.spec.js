import { test, expect } from '@playwright/test'

const CHUNK_STEPS = ['chunking', 'rebuilding-what-changed', 'level-of-detail']

test('the Chunk outlines button is on the chunk demos only, and starts pressed', async ({ page }) => {
  const toolbar = page.getByRole('group', { name: 'Viewport' })

  for (const slug of CHUNK_STEPS) {
    await page.goto(`/lesson/voxels/${slug}`)
    await expect(toolbar.getByRole('button', { name: 'Chunk outlines' })).toHaveAttribute('aria-pressed', 'true')
  }

  await page.goto('/lesson/voxels/marching-cubes')
  await expect(toolbar.getByRole('button', { name: 'Wireframe' })).toBeVisible()
  await expect(toolbar.getByRole('button', { name: 'Chunk outlines' })).toHaveCount(0)
})

test('pressing Chunk outlines hides them, and the choice stays across steps', async ({ page }) => {
  const toolbar = page.getByRole('group', { name: 'Viewport' })
  const button = toolbar.getByRole('button', { name: 'Chunk outlines' })

  await page.goto('/lesson/voxels/level-of-detail')
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'false')

  // Move to another chunk step through the outline, without a reload.
  await page.locator('a[href="/lesson/voxels/rebuilding-what-changed"]').dispatchEvent('click')
  await expect(page.locator('#step-card-title')).toHaveText('Rebuilding what changed')
  await expect(button).toHaveAttribute('aria-pressed', 'false')

  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
})
