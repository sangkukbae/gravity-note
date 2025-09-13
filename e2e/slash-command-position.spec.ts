import { test, expect } from '@playwright/test'

test.describe('Slash command menu positioning', () => {
  test('opens at caret, not at viewport 0,0', async ({ page }) => {
    // Go to sign-in
    await page.goto('/auth/signin')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', '123123')
    const submit = page.locator('button[type="submit"]')
    await expect(submit).toBeEnabled({ timeout: 5000 })
    await submit.click()

    // Arrive at dashboard
    await page.waitForURL('**/dashboard', { timeout: 30_000 })

    // Focus the quick note input
    const input = page
      .locator(
        'textarea[placeholder*="mind"], textarea[placeholder*="thought"], .note-input textarea'
      )
      .first()
    await input.click()
    await input.type('/')

    const menuHeader = page.getByText('Type to search commands...')
    await expect(menuHeader).toBeVisible()

    // Measure the floating menu container (closest with border/background)
    const menu = menuHeader
      .locator('xpath=ancestor-or-self::div[contains(@class, "border")]')
      .first()
    const box = await menu.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    // Assert not near top-left of the page (the original bug)
    expect(box.x).toBeGreaterThan(32)
    expect(box.y).toBeGreaterThan(32)

    // Optionally ensure it stays aligned when pressing ArrowDown (menu navigates)
    await page.keyboard.press('ArrowDown')
    const box2 = await menu.boundingBox()
    expect(box2).not.toBeNull()
    if (!box2) return
    expect(Math.abs((box2?.x ?? 0) - box.x)).toBeLessThan(8)
  })
})
