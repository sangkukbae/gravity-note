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
    localStorage.setItem('auth-store', JSON.stringify(data))
  })
}

test.describe('Note attachments finalize flow', () => {
  test('submit note with image shows attachment on note card', async ({
    page,
  }) => {
    await seedAuth(page)
    await page.goto('/dashboard')
    await page.waitForURL('**/dashboard')

    // Attach via hidden input
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHVgK+e0p1WQAAAABJRU5ErkJggg=='
    const buffer = Buffer.from(pngBase64, 'base64')
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer,
    })
    // Enter content and submit
    await page.fill(
      'textarea[aria-label="Note content input"]',
      'attachment test'
    )
    await page.press('textarea[aria-label="Note content input"]', 'Enter')

    // Expect a note card to show an attachment image (first card on page)
    const noteFirst = page.locator('[role="group"]').first()
    await expect(noteFirst).toBeVisible()
    // Look for an image element within the note item attachments region
    const imgInNote = page.locator('img[alt="attachment"]')
    await expect(imgInNote.first()).toBeVisible({ timeout: 15000 })
  })
})
