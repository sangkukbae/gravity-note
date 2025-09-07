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

test.describe('Note card attachments + fullscreen viewer', () => {
  test('card renders large image and viewer opens fullscreen', async ({
    page,
  }) => {
    await seedAuth(page)
    await page.goto('/dashboard')
    await page.waitForURL('**/dashboard')

    // Attach a tiny PNG for fast test
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAD0lEQVR42mP8/5+hP6gGAAKRAm5J7mPBAAAAAElFTkSuQmCC'
    const buffer = Buffer.from(pngBase64, 'base64')
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'tiny2.png',
      mimeType: 'image/png',
      buffer,
    })

    // Enter content and submit
    await page.fill(
      'textarea[aria-label="Note content input"]',
      'attachment card viewer test'
    )
    await page.press('textarea[aria-label="Note content input"]', 'Enter')

    // The first note should have an image attachment button
    const firstOpenBtn = page
      .getByRole('button', { name: 'Open attachment' })
      .first()
    await expect(firstOpenBtn).toBeVisible({ timeout: 15000 })

    // Clicking opens a fullscreen dialog containing the image
    await firstOpenBtn.click()
    const dialogImg = page.locator('dialog img[alt="attachment"]')
    await expect(dialogImg).toBeVisible()

    // Close with Escape
    await page.keyboard.press('Escape')
    await expect(dialogImg).toBeHidden()
  })
})
