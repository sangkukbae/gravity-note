import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = '123123'

test.describe('Gravity Note - Offline Functionality', () => {
  test.beforeEach(async ({ page, context }) => {
    // Start with a clean slate - clear all storage
    await context.clearCookies()
    await context.clearPermissions()

    // Navigate to the app
    await page.goto('/')

    // Login with test credentials
    await page.getByText('Sign In').click()
    await page.getByLabel('Email').fill(TEST_EMAIL)
    await page.getByLabel('Password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Wait for dashboard to load
    await page.waitForURL('/dashboard')
    await expect(page.getByText('Gravity Note')).toBeVisible()
  })

  test('should detect online/offline status correctly', async ({
    page,
    context,
  }) => {
    // Initially should be online
    const onlineStatus = await page.evaluate(() => navigator.onLine)
    expect(onlineStatus).toBe(true)

    // Simulate going offline
    await context.setOffline(true)

    // Wait for offline detection (the hook checks every 30 seconds, but online/offline events should trigger immediately)
    await page.waitForFunction(() => !navigator.onLine, { timeout: 5000 })

    // Check if offline indicator appears (according to design doc: "Header indicator: online/offline dot with tooltip")
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible(
      { timeout: 10000 }
    )

    // Go back online
    await context.setOffline(false)
    await page.waitForFunction(() => navigator.onLine, { timeout: 5000 })

    // Offline indicator should disappear or change to online state
    await expect(
      page.locator('[data-testid="offline-indicator"]')
    ).not.toBeVisible({ timeout: 10000 })
  })

  test('should persist drafts when offline and restore on reload', async ({
    page,
    context,
  }) => {
    const testContent = 'This is an offline draft test note'

    // Go offline
    await context.setOffline(true)
    await page.waitForFunction(() => !navigator.onLine)

    // Find the note input field and type content
    const noteInput = page.locator('textarea, input[type="text"]').first()
    await noteInput.fill(testContent)

    // According to design doc: "Save current input to drafts until confirmed"
    // The draft should be saved automatically

    // Reload the page to simulate browser restart
    await page.reload()
    await page.waitForLoadState('networkidle')

    // The draft should be restored
    await expect(noteInput).toHaveValue(testContent)

    // Clean up - go back online and clear the draft
    await context.setOffline(false)
    await noteInput.clear()
  })

  test('should create notes offline and sync when reconnected', async ({
    page,
    context,
  }) => {
    const offlineNote = 'Created while offline - should sync later'

    // Go offline
    await context.setOffline(true)
    await page.waitForFunction(() => !navigator.onLine)

    // Create a note while offline
    const noteInput = page.locator('textarea, input[type="text"]').first()
    await noteInput.fill(offlineNote)
    await page.keyboard.press('Enter')

    // The note should appear in the UI with pending status
    // According to design doc: "Pending badge on notes created offline"
    await expect(page.getByText(offlineNote)).toBeVisible()
    await expect(page.locator('[data-testid="pending-badge"]')).toBeVisible()

    // Go back online
    await context.setOffline(false)
    await page.waitForFunction(() => navigator.onLine)

    // Wait for sync to complete
    // According to design doc: "Toasts: sync started/success/errors (batched)"
    await expect(page.getByText(/sync/i)).toBeVisible({ timeout: 10000 })

    // The pending badge should disappear after successful sync
    await expect(page.locator('[data-testid="pending-badge"]')).not.toBeVisible(
      { timeout: 15000 }
    )

    // The note should still be visible
    await expect(page.getByText(offlineNote)).toBeVisible()
  })

  test('should handle outbox queue processing correctly', async ({
    page,
    context,
  }) => {
    // Create multiple notes while offline
    const offlineNotes = [
      'First offline note',
      'Second offline note',
      'Third offline note',
    ]

    // Go offline
    await context.setOffline(true)
    await page.waitForFunction(() => !navigator.onLine)

    // Create multiple notes
    for (const noteText of offlineNotes) {
      const noteInput = page.locator('textarea, input[type="text"]').first()
      await noteInput.fill(noteText)
      await page.keyboard.press('Enter')
      await expect(page.getByText(noteText)).toBeVisible()
    }

    // All notes should have pending badges
    const pendingBadges = page.locator('[data-testid="pending-badge"]')
    await expect(pendingBadges).toHaveCount(offlineNotes.length)

    // Go back online
    await context.setOffline(false)
    await page.waitForFunction(() => navigator.onLine)

    // Wait for batch sync to complete
    // According to design doc: "Toasts: sync started/success/errors (batched)"
    await expect(page.getByText(/sync.*started/i)).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByText(/sync.*success/i)).toBeVisible({
      timeout: 15000,
    })

    // All pending badges should disappear
    await expect(pendingBadges).toHaveCount(0, { timeout: 20000 })

    // All notes should still be visible
    for (const noteText of offlineNotes) {
      await expect(page.getByText(noteText)).toBeVisible()
    }
  })

  test('should handle connectivity ping fallback', async ({
    page,
    context,
  }) => {
    // This tests the effectiveOnline vs isOnline difference mentioned in the design doc

    // Block network requests to simulate degraded connectivity
    await page.route('**/api/**', route => route.abort())

    // The hook should detect this as effectively offline even if navigator.onLine is true
    // Wait for the ping mechanism to detect the issue (30 second interval by default, but should be faster on failure)
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible(
      { timeout: 35000 }
    )

    // Restore network access
    await page.unroute('**/api/**')

    // Should detect as effectively online again
    await expect(
      page.locator('[data-testid="offline-indicator"]')
    ).not.toBeVisible({ timeout: 35000 })
  })

  test('should preserve drafts across browser sessions', async ({
    page,
    context,
  }) => {
    const draftContent = 'Draft content that should persist across sessions'

    // Create a draft
    const noteInput = page.locator('textarea, input[type="text"]').first()
    await noteInput.fill(draftContent)

    // Close and reopen the browser context to simulate session restart
    await context.close()

    // Create new context and page
    const newContext = await page.context().browser()!.newContext()
    const newPage = await newContext.newPage()

    // Navigate and login again
    await newPage.goto('/')
    await newPage.getByText('Sign In').click()
    await newPage.getByLabel('Email').fill(TEST_EMAIL)
    await newPage.getByLabel('Password').fill(TEST_PASSWORD)
    await newPage.getByRole('button', { name: 'Sign In' }).click()
    await newPage.waitForURL('/dashboard')

    // The draft should be restored
    const restoredInput = newPage
      .locator('textarea, input[type="text"]')
      .first()
    await expect(restoredInput).toHaveValue(draftContent)

    // Clean up
    await restoredInput.clear()
    await newContext.close()
  })

  test('should handle temp ID mapping for offline created notes', async ({
    page,
    context,
  }) => {
    const offlineNote = 'Note with temp ID that should get server ID'

    // Go offline
    await context.setOffline(true)
    await page.waitForFunction(() => !navigator.onLine)

    // Create note - should get temp ID like temp_<uuid>
    const noteInput = page.locator('textarea, input[type="text"]').first()
    await noteInput.fill(offlineNote)
    await page.keyboard.press('Enter')

    // Note should be visible with pending status
    const noteElement = page.getByText(offlineNote)
    await expect(noteElement).toBeVisible()
    await expect(page.locator('[data-testid="pending-badge"]')).toBeVisible()

    // Go online and wait for sync
    await context.setOffline(false)
    await page.waitForFunction(() => navigator.onLine)

    // Wait for sync completion
    await expect(page.getByText(/sync.*success/i)).toBeVisible({
      timeout: 15000,
    })

    // Note should still be visible but now with server ID (pending badge gone)
    await expect(noteElement).toBeVisible()
    await expect(page.locator('[data-testid="pending-badge"]')).not.toBeVisible(
      { timeout: 5000 }
    )

    // The note should now have a permanent server ID and be fully synced
    // We can verify this by checking if the note persists after a page reload
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(noteElement).toBeVisible()
  })
})
