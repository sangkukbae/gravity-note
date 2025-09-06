import { test, expect, type Page } from '@playwright/test'

test.describe('Manual Code Block Testing', () => {
  test('inspect page and test code blocks manually', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3003')
    await page.waitForLoadState('networkidle')

    // Take screenshot of initial state
    await page.screenshot({
      path: 'test-results/01-initial-page.png',
      fullPage: true,
    })

    // Try to sign in if on auth page
    const currentUrl = page.url()
    console.log('Current URL:', currentUrl)

    if (currentUrl.includes('/auth') || currentUrl.includes('signin')) {
      console.log('On auth page, attempting sign in...')

      // Try to fill credentials
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', '123123')
      await page.click('button[type="submit"]')

      // Wait for redirect
      await page.waitForTimeout(3000)
      await page.screenshot({
        path: 'test-results/02-after-signin.png',
        fullPage: true,
      })
    }

    // Check current URL again
    console.log('URL after auth:', page.url())

    // Look for any input fields available
    const allInputs = await page.locator('input, textarea').count()
    console.log('Found inputs/textareas:', allInputs)

    // Try to identify note input areas
    const possibleInputs = [
      'textarea',
      '[data-testid*="note"]',
      '[placeholder*="mind"]',
      '[placeholder*="thought"]',
      '[placeholder*="capture"]',
      '.note-input',
      '.note-textarea',
    ]

    for (const selector of possibleInputs) {
      const elements = await page.locator(selector).count()
      if (elements > 0) {
        console.log(`Found ${elements} elements matching: ${selector}`)

        // Take screenshot highlighting this element
        const element = page.locator(selector).first()
        if (await element.isVisible()) {
          await element.highlight()
          await page.screenshot({
            path: `test-results/03-found-input-${selector.replace(/[^a-zA-Z0-9]/g, '-')}.png`,
            fullPage: true,
          })
        }
      }
    }

    // Try to find any clickable elements that might open a note input
    const possibleButtons = [
      'button:has-text("+")',
      '.floating-action',
      '[aria-label*="note"]',
      '[data-testid*="add"]',
      'button:has([data-icon="plus"])',
    ]

    for (const selector of possibleButtons) {
      const elements = await page.locator(selector).count()
      if (elements > 0) {
        console.log(`Found ${elements} buttons matching: ${selector}`)
      }
    }

    // Check for any existing notes with code blocks
    const codeBlocks = await page.locator('pre, code, .hljs').count()
    console.log('Found existing code blocks:', codeBlocks)

    if (codeBlocks > 0) {
      await page.screenshot({
        path: 'test-results/04-existing-code-blocks.png',
        fullPage: true,
      })
    }

    // Try clicking on potential FAB or add button
    const fabButton = page
      .locator(
        'button:has-text("+"), .floating-action-button, [aria-label*="Add"], [data-testid*="fab"]'
      )
      .first()
    if (await fabButton.isVisible()) {
      console.log('Found FAB button, clicking...')
      await fabButton.click()
      await page.waitForTimeout(1000)
      await page.screenshot({
        path: 'test-results/05-after-fab-click.png',
        fullPage: true,
      })

      // Look for modal or input that appeared
      const modal = page.locator('[role="dialog"], .modal, .sheet').first()
      if (await modal.isVisible()) {
        console.log('Modal opened')

        // Look for textarea in modal
        const modalTextarea = modal.locator('textarea').first()
        if (await modalTextarea.isVisible()) {
          console.log('Found textarea in modal')

          // Test creating a note with code block
          const codeContent = `Here's a test code block:

\`\`\`javascript
function hello() {
  console.log("Testing code blocks!");
  return "success";
}
\`\`\`

This should render with syntax highlighting.`

          await modalTextarea.fill(codeContent)
          await page.screenshot({
            path: 'test-results/06-filled-code-content.png',
            fullPage: true,
          })

          // Submit the note
          const submitButton = modal
            .locator(
              'button:has-text("Save"), button:has-text("Create"), button[type="submit"]'
            )
            .first()
          if (await submitButton.isVisible()) {
            await submitButton.click()
            await page.waitForTimeout(2000)
            await page.screenshot({
              path: 'test-results/07-after-submit.png',
              fullPage: true,
            })

            // Check if code block was rendered
            await page.waitForSelector('pre, .hljs', { timeout: 5000 })
            const renderedCodeBlocks = await page.locator('pre, .hljs').count()
            console.log('Rendered code blocks:', renderedCodeBlocks)

            if (renderedCodeBlocks > 0) {
              // Take detailed screenshot of code blocks
              const codeBlock = page.locator('pre, .hljs').first()
              await codeBlock.scrollIntoViewIfNeeded()
              await page.screenshot({
                path: 'test-results/08-rendered-code-block.png',
                fullPage: true,
              })

              // Check background colors
              const bgColor = await codeBlock.evaluate(
                el => getComputedStyle(el).backgroundColor
              )
              console.log('Code block background color:', bgColor)

              // Test page refresh
              await page.reload()
              await page.waitForLoadState('networkidle')
              await page.screenshot({
                path: 'test-results/09-after-refresh.png',
                fullPage: true,
              })

              // Check if code blocks still render correctly after refresh
              const afterRefreshCodeBlocks = await page
                .locator('pre, .hljs')
                .count()
              console.log('Code blocks after refresh:', afterRefreshCodeBlocks)

              if (afterRefreshCodeBlocks > 0) {
                await page.screenshot({
                  path: 'test-results/10-code-blocks-after-refresh.png',
                  fullPage: true,
                })
              }
            }
          }
        }
      }
    }

    // Final page state
    await page.screenshot({
      path: 'test-results/11-final-state.png',
      fullPage: true,
    })
  })
})
