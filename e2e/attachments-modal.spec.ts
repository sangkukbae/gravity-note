// @ts-nocheck
import { test, expect } from '@playwright/test'

async function seedAuth(page) {
  await page.addInitScript(() => {
    const data = {
      state: {
        user: {
          id: '00000000-0000-0000-0000-000000000000',
          email: 'test@example.com',
        },
        loading: false,
        initialized: true,
      },
      version: 0,
    }
    try {
      localStorage.setItem('auth-store', JSON.stringify(data))
    } catch {}
  })
}

test.describe('Note creation modal attachments', () => {
  test('attach image in modal and finalize on save', async ({ page }) => {
    await seedAuth(page)
    await page.goto('/dashboard')
    await page.waitForURL('**/dashboard')

    // Open FAB
    const fab = page.locator('[aria-label="Create new note"]').first()
    await expect(fab).toBeVisible()
    await fab.click()

    // Ensure dialog is open
    const dialog = page.locator('[role="dialog"]').first()
    await expect(dialog).toBeVisible()

    // Upload via hidden input inside modal
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHVgK+e0p1WQAAAABJRU5ErkJggg=='
    const buffer = Buffer.from(pngBase64, 'base64')
    await page.setInputFiles('[data-testid="modal-file-input"]', {
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer,
    })

    // Thumbnail should appear in dialog
    const thumbInModal = dialog.locator('img[alt="attachment preview"]').first()
    await expect(thumbInModal).toBeVisible()

    // Fill content and save
    const modalTextarea = dialog.locator('textarea').first()
    await modalTextarea.fill('modal attachment test')
    await dialog.getByRole('button', { name: 'Save' }).click()

    // Verify a note image renders in the stream (allow time for finalize)
    const imgInNote = page.locator('img[alt="attachment"]').first()
    await expect(imgInNote).toBeVisible({ timeout: 20000 })
  })
})
