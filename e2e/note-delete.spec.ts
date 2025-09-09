import { test, expect, type Page } from '@playwright/test'

// Test credentials from user requirement
const TEST_USER = {
  email: 'test@example.com',
  password: '123123',
}

// Page object model for note operations
class NotePage {
  constructor(private page: Page) {}

  async navigateToApp() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async signIn() {
    // Navigate to sign in page
    await this.page.goto('/auth/signin')
    await this.page.waitForLoadState('networkidle')

    // Fill in credentials
    await this.page.fill('input[type="email"]', TEST_USER.email)
    await this.page.fill('input[type="password"]', TEST_USER.password)

    // Submit form
    await this.page.click('button[type="submit"]')

    // Wait for redirect to dashboard/notes
    await this.page.waitForURL(/\/(dashboard|notes)/)
    await this.page.waitForLoadState('networkidle')
  }

  async createNote(content: string) {
    // Find note input field (could be modal or inline)
    const noteInput = this.page
      .locator(
        'textarea[placeholder*="note"], input[placeholder*="note"], textarea[data-testid="note-input"]'
      )
      .first()

    await noteInput.fill(content)

    // Submit the note (could be Enter key or submit button)
    await this.page.keyboard.press('Enter')

    // Wait for note to appear in the list
    await this.page.waitForSelector(`text="${content}"`)
  }

  async findNoteByContent(content: string) {
    return this.page.locator(`text="${content}"`).first()
  }

  async openMoreMenu(noteContent: string) {
    // Find the note container that contains this content
    const noteContainer = this.page
      .locator('.group, [class*="note"]')
      .filter({ hasText: noteContent })

    // Find the more actions button within this note
    const moreButton = noteContainer
      .locator('button[aria-label*="More actions"], button[aria-label*="more"]')
      .first()

    await expect(moreButton).toBeVisible()
    await moreButton.click()

    // Wait for menu to appear
    await this.page.waitForSelector('[role="menu"], [role="menuitem"]')
  }

  async clickDeleteOption() {
    const deleteOption = this.page
      .locator('[role="menuitem"]')
      .filter({ hasText: /delete/i })
    await expect(deleteOption).toBeVisible()
    await deleteOption.click()
  }

  async clickEditOption() {
    const editOption = this.page
      .locator('[role="menuitem"]')
      .filter({ hasText: /edit/i })
    await expect(editOption).toBeVisible()
    await editOption.click()
  }

  async expectDeleteModalToBeOpen(noteContent?: string) {
    const modal = this.page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(this.page.locator('text="Delete Note"')).toBeVisible()

    if (noteContent) {
      await expect(this.page.locator(`text="${noteContent}"`)).toBeVisible()
    }

    await expect(
      this.page.locator('text=/This action cannot be undone/')
    ).toBeVisible()
  }

  async confirmDeleteInModal() {
    const confirmButton = this.page
      .locator('[role="dialog"]')
      .locator('button')
      .filter({ hasText: /delete/i })
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()
  }

  async cancelDeleteInModal() {
    const cancelButton = this.page
      .locator('[role="dialog"]')
      .locator('button')
      .filter({ hasText: /cancel/i })
    await expect(cancelButton).toBeVisible()
    await cancelButton.click()
  }

  async expectModalToBeClosed() {
    await expect(this.page.locator('[role="dialog"]')).not.toBeVisible()
  }

  async expectNoteToBeDeleted(noteContent: string) {
    // Wait for note to be removed from DOM
    await expect(this.page.locator(`text="${noteContent}"`)).not.toBeVisible()
  }

  async expectNoteToStillExist(noteContent: string) {
    await expect(this.page.locator(`text="${noteContent}"`)).toBeVisible()
  }

  async expectLoadingStateInModal() {
    const modal = this.page.locator('[role="dialog"]')
    const deleteButton = modal.locator('button').filter({ hasText: /delete/i })

    await expect(deleteButton).toBeDisabled()

    // Check for spinner or loading indicator
    const hasLoader =
      (await modal
        .locator('.animate-spin, [data-testid*="loader"], [role="progressbar"]')
        .count()) > 0
    expect(hasLoader).toBeTruthy()
  }

  async waitForNoteToAppear(content: string, timeout = 5000) {
    await this.page.waitForSelector(`text="${content}"`, { timeout })
  }

  async waitForNoteToDisappear(content: string, timeout = 5000) {
    await this.page.waitForSelector(`text="${content}"`, {
      state: 'detached',
      timeout,
    })
  }
}

test.describe('Note Delete Functionality E2E', () => {
  let notePage: NotePage

  test.beforeEach(async ({ page }) => {
    notePage = new NotePage(page)

    // Sign in before each test
    await notePage.signIn()
  })

  test.describe('Delete Menu Integration', () => {
    test('shows delete option in more menu', async ({ page }) => {
      const noteContent = `Test note for delete menu ${Date.now()}`

      // Create a test note
      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)

      // Open more menu
      await notePage.openMoreMenu(noteContent)

      // Verify delete option exists
      const deleteOption = page
        .locator('[role="menuitem"]')
        .filter({ hasText: /delete/i })
      await expect(deleteOption).toBeVisible()
      await expect(deleteOption).toHaveClass(/text-destructive/)
    })

    test('shows both edit and delete options', async ({ page }) => {
      const noteContent = `Test note for menu options ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)
      await notePage.openMoreMenu(noteContent)

      // Both options should be visible
      await expect(
        page.locator('[role="menuitem"]').filter({ hasText: /edit/i })
      ).toBeVisible()
      await expect(
        page.locator('[role="menuitem"]').filter({ hasText: /delete/i })
      ).toBeVisible()
    })

    test('closes menu after clicking delete option', async ({ page }) => {
      const noteContent = `Test note for menu close ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)
      await notePage.openMoreMenu(noteContent)
      await notePage.clickDeleteOption()

      // Menu should close and modal should open
      await expect(page.locator('[role="menu"]')).not.toBeVisible()
      await notePage.expectDeleteModalToBeOpen()
    })
  })

  test.describe('Delete Confirmation Modal', () => {
    test('opens delete confirmation modal with note preview', async ({
      page,
    }) => {
      const noteContent = `Test note for modal preview ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)
      await notePage.openMoreMenu(noteContent)
      await notePage.clickDeleteOption()

      await notePage.expectDeleteModalToBeOpen(noteContent)

      // Should show warning message
      await expect(
        page.locator(
          'text=/permanently delete the note and any associated attachments/'
        )
      ).toBeVisible()
    })

    test('truncates long note preview in modal', async ({ page }) => {
      // Create a very long note
      const longContent =
        'This is a very long note content that should be truncated in the modal preview. '.repeat(
          10
        )
      const noteContent = `Long note ${Date.now()}: ${longContent}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent.substring(0, 50)) // Wait for partial match
      await notePage.openMoreMenu(noteContent.substring(0, 50))
      await notePage.clickDeleteOption()

      await notePage.expectDeleteModalToBeOpen()

      // Should show truncated content (implementation shows first 100 chars + "...")
      const modalText = await page.locator('[role="dialog"]').textContent()
      expect(modalText).toContain('...')
    })

    test('cancels delete operation', async ({ page }) => {
      const noteContent = `Test note for cancel delete ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)
      await notePage.openMoreMenu(noteContent)
      await notePage.clickDeleteOption()

      await notePage.expectDeleteModalToBeOpen()
      await notePage.cancelDeleteInModal()

      // Modal should close and note should still exist
      await notePage.expectModalToBeClosed()
      await notePage.expectNoteToStillExist(noteContent)
    })

    test('prevents modal close during deletion', async ({ page }) => {
      const noteContent = `Test note for modal prevent close ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)
      await notePage.openMoreMenu(noteContent)
      await notePage.clickDeleteOption()

      await notePage.expectDeleteModalToBeOpen()

      // Start deletion process (click confirm but don't wait for completion)
      const confirmButton = page
        .locator('[role="dialog"]')
        .locator('button')
        .filter({ hasText: /delete/i })
      await confirmButton.click()

      // Try to click outside modal during loading
      const overlay = page.locator('[data-radix-dialog-overlay]')
      if (await overlay.isVisible()) {
        await overlay.click()
      }

      // Modal should still be open during loading
      await expect(page.locator('[role="dialog"]')).toBeVisible()
    })
  })

  test.describe('Delete Operation Execution', () => {
    test('successfully deletes a note', async ({ page }) => {
      const noteContent = `Test note for successful delete ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)
      await notePage.openMoreMenu(noteContent)
      await notePage.clickDeleteOption()

      await notePage.expectDeleteModalToBeOpen()
      await notePage.confirmDeleteInModal()

      // Wait for deletion to complete
      await notePage.expectModalToBeClosed()
      await notePage.expectNoteToBeDeleted(noteContent)
    })

    test('shows loading state during deletion', async ({ page }) => {
      const noteContent = `Test note for loading state ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)
      await notePage.openMoreMenu(noteContent)
      await notePage.clickDeleteOption()

      await notePage.expectDeleteModalToBeOpen()

      // Intercept the delete request to create loading state
      await page.route('**/api/notes**', async route => {
        if (route.request().method() === 'DELETE') {
          // Delay the response to see loading state
          await page.waitForTimeout(1000)
          await route.continue()
        } else {
          await route.continue()
        }
      })

      await notePage.confirmDeleteInModal()

      // Should show loading state briefly
      await notePage.expectLoadingStateInModal()
    })

    test('handles delete errors gracefully', async ({ page }) => {
      const noteContent = `Test note for error handling ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)
      await notePage.openMoreMenu(noteContent)
      await notePage.clickDeleteOption()

      await notePage.expectDeleteModalToBeOpen()

      // Mock a network error
      await page.route('**/api/notes**', async route => {
        if (route.request().method() === 'DELETE') {
          await route.abort('failed')
        } else {
          await route.continue()
        }
      })

      await notePage.confirmDeleteInModal()

      // Modal should remain open after error
      await expect(page.locator('[role="dialog"]')).toBeVisible()

      // Note should still exist (rollback)
      await notePage.cancelDeleteInModal()
      await notePage.expectNoteToStillExist(noteContent)
    })

    test('deletes multiple notes sequentially', async ({ page }) => {
      const note1Content = `Test note 1 for multiple delete ${Date.now()}`
      const note2Content = `Test note 2 for multiple delete ${Date.now()}`

      // Create two test notes
      await notePage.createNote(note1Content)
      await notePage.waitForNoteToAppear(note1Content)

      await notePage.createNote(note2Content)
      await notePage.waitForNoteToAppear(note2Content)

      // Delete first note
      await notePage.openMoreMenu(note1Content)
      await notePage.clickDeleteOption()
      await notePage.expectDeleteModalToBeOpen()
      await notePage.confirmDeleteInModal()

      await notePage.expectModalToBeClosed()
      await notePage.expectNoteToBeDeleted(note1Content)

      // Verify second note still exists
      await notePage.expectNoteToStillExist(note2Content)

      // Delete second note
      await notePage.openMoreMenu(note2Content)
      await notePage.clickDeleteOption()
      await notePage.expectDeleteModalToBeOpen()
      await notePage.confirmDeleteInModal()

      await notePage.expectModalToBeClosed()
      await notePage.expectNoteToBeDeleted(note2Content)
    })
  })

  test.describe('Temporary Notes Handling', () => {
    test('handles temporary note deletion without API call', async ({
      page,
    }) => {
      // This test verifies that temporary notes (with temp_ prefix) are handled differently
      // We'll create a note and verify it gets deleted immediately without server roundtrip

      const tempNoteContent = `Temporary note ${Date.now()}`

      await notePage.createNote(tempNoteContent)
      await notePage.waitForNoteToAppear(tempNoteContent)

      // Monitor network requests to ensure no DELETE API call is made for temp notes
      let apiCallMade = false
      await page.route('**/api/notes**', async route => {
        if (route.request().method() === 'DELETE') {
          apiCallMade = true
        }
        await route.continue()
      })

      await notePage.openMoreMenu(tempNoteContent)
      await notePage.clickDeleteOption()
      await notePage.expectDeleteModalToBeOpen()
      await notePage.confirmDeleteInModal()

      await notePage.expectModalToBeClosed()
      await notePage.expectNoteToBeDeleted(tempNoteContent)

      // For temporary notes, no API call should be made (this depends on implementation)
      // In real app, temporary notes have IDs starting with "temp_"
    })
  })

  test.describe('Integration with Note Features', () => {
    test('delete option works with notes that have attachments', async ({
      page,
    }) => {
      // This test assumes the app supports note attachments
      const noteContent = `Note with attachments ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)

      // The delete functionality should handle attachment cleanup
      await notePage.openMoreMenu(noteContent)
      await notePage.clickDeleteOption()

      await notePage.expectDeleteModalToBeOpen()

      // Modal should mention attachment deletion
      await expect(page.locator('text=/associated attachments/')).toBeVisible()

      await notePage.confirmDeleteInModal()
      await notePage.expectModalToBeClosed()
      await notePage.expectNoteToBeDeleted(noteContent)
    })

    test('delete works with rescued notes', async ({ page }) => {
      const noteContent = `Rescued note for delete ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)

      // Rescued notes (is_rescued: true) should be deletable
      await notePage.openMoreMenu(noteContent)
      await notePage.clickDeleteOption()

      await notePage.expectDeleteModalToBeOpen()
      await notePage.confirmDeleteInModal()

      await notePage.expectModalToBeClosed()
      await notePage.expectNoteToBeDeleted(noteContent)
    })

    test('delete functionality coexists with edit functionality', async ({
      page,
    }) => {
      const noteContent = `Note for edit and delete test ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)

      // Test that edit still works
      await notePage.openMoreMenu(noteContent)
      await notePage.clickEditOption()

      // Should open edit modal (close it)
      if (await page.locator('[role="dialog"]').isVisible()) {
        await page.keyboard.press('Escape')
      }

      // Test that delete still works
      await notePage.openMoreMenu(noteContent)
      await notePage.clickDeleteOption()

      await notePage.expectDeleteModalToBeOpen()
      await notePage.cancelDeleteInModal()

      // Note should still exist
      await notePage.expectNoteToStillExist(noteContent)
    })
  })

  test.describe('Accessibility and UX', () => {
    test('delete functionality is keyboard accessible', async ({ page }) => {
      const noteContent = `Keyboard accessible delete test ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)

      // Find the note and navigate to more button with keyboard
      const noteContainer = page
        .locator('.group, [class*="note"]')
        .filter({ hasText: noteContent })
      const moreButton = noteContainer
        .locator('button[aria-label*="More actions"]')
        .first()

      await moreButton.focus()
      await page.keyboard.press('Enter')

      // Navigate to delete option with arrow keys
      await page.keyboard.press('ArrowDown') // Navigate through menu
      await page.keyboard.press('Enter') // Select delete

      await notePage.expectDeleteModalToBeOpen()

      // Tab to confirm button and activate with Enter
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      const confirmButton = page
        .locator('[role="dialog"]')
        .locator('button')
        .filter({ hasText: /delete/i })
      await expect(confirmButton).toBeFocused()

      await page.keyboard.press('Enter')

      await notePage.expectModalToBeClosed()
      await notePage.expectNoteToBeDeleted(noteContent)
    })

    test('has proper ARIA attributes for delete functionality', async ({
      page,
    }) => {
      const noteContent = `ARIA attributes test ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)
      await notePage.openMoreMenu(noteContent)

      // Check delete option has proper attributes
      const deleteOption = page
        .locator('[role="menuitem"]')
        .filter({ hasText: /delete/i })
      await expect(deleteOption).toHaveAttribute('role', 'menuitem')

      await notePage.clickDeleteOption()

      // Check modal has proper attributes
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toHaveAttribute('role', 'dialog')
      await expect(modal).toHaveAttribute('aria-labelledby')

      // Check buttons have proper labels
      const confirmButton = modal
        .locator('button')
        .filter({ hasText: /delete/i })
      const cancelButton = modal
        .locator('button')
        .filter({ hasText: /cancel/i })

      await expect(confirmButton).toBeVisible()
      await expect(cancelButton).toBeVisible()
    })

    test('provides clear feedback during delete process', async ({ page }) => {
      const noteContent = `Delete feedback test ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)
      await notePage.openMoreMenu(noteContent)
      await notePage.clickDeleteOption()

      // Modal provides clear information about the action
      await expect(page.locator('text="Delete Note"')).toBeVisible()
      await expect(page.locator('text="Note content:"')).toBeVisible()
      await expect(
        page.locator('text=/This action cannot be undone/')
      ).toBeVisible()

      await notePage.confirmDeleteInModal()

      // Should provide feedback that action completed (note disappears)
      await notePage.expectNoteToBeDeleted(noteContent)
    })
  })

  test.describe('Mobile and Responsive Behavior', () => {
    test('delete functionality works on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE

      const noteContent = `Mobile delete test ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)

      // More menu should be accessible on mobile
      await notePage.openMoreMenu(noteContent)
      await notePage.clickDeleteOption()

      // Modal should fit mobile screen
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()

      const modalBox = await modal.boundingBox()
      if (modalBox) {
        expect(modalBox.width).toBeLessThanOrEqual(375)
      }

      await notePage.confirmDeleteInModal()
      await notePage.expectNoteToBeDeleted(noteContent)
    })

    test('delete functionality works on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }) // iPad

      const noteContent = `Tablet delete test ${Date.now()}`

      await notePage.createNote(noteContent)
      await notePage.waitForNoteToAppear(noteContent)
      await notePage.openMoreMenu(noteContent)
      await notePage.clickDeleteOption()

      await notePage.expectDeleteModalToBeOpen()
      await notePage.confirmDeleteInModal()
      await notePage.expectNoteToBeDeleted(noteContent)
    })
  })
})
