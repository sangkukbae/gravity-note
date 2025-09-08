import { test, expect } from '@playwright/test'

// Helper to build a string with a zero-width space between characters
const ZWSP = '\u200B'
function withZwsp(a: string, b: string) {
  return `${a}${ZWSP}${b}`
}

test.describe('ZWSP normalization search', () => {
  test('creating note with ZWSP finds by full substring', async ({ page }) => {
    // NOTE: This test requires the dev server running and network access to Supabase.
    // Start app: pnpm dev (or pnpm start for production build)
    // Configure test account in Supabase: test@example.com / 123123

    await page.goto('http://localhost:3001/auth/signin')

    // Sign in
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('123123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for dashboard
    await page.waitForURL('**/dashboard')

    // Create a note that contains an invisible ZWSP between a and sdf
    const content = withZwsp('a', 'sdf')
    const expectedVisible = 'asdf'

    // Focus note input and submit
    const input = page.getByPlaceholder("What's on your mind?")
    await input.click()
    await input.fill(content)
    await input.press('Enter')

    // Open command palette (Cmd/Ctrl+F per app shortcut)
    await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control')
    await page.keyboard.press('KeyF')
    await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control')

    // Search for the contiguous substring
    const searchBox = page.getByPlaceholder('Search notes...')
    await expect(searchBox).toBeVisible()
    await searchBox.fill(expectedVisible)

    // Should find at least one result and highlight contiguous match
    await expect(page.getByText(/asdf/i).first()).toBeVisible()
  })
})
