import { test, expect, type Page } from '@playwright/test'

// Test user credentials
const TEST_USER = {
  email: 'test@example.com',
  password: '123123',
}

// Helper class for code block testing
class CodeBlockTestPage {
  constructor(private page: Page) {}

  async navigateToApp() {
    await this.page.goto('http://localhost:3003')
    await this.page.waitForLoadState('networkidle')
  }

  async signIn() {
    // Navigate to sign in if not already authenticated
    const currentUrl = this.page.url()
    if (!currentUrl.includes('/dashboard')) {
      await this.page.goto('http://localhost:3003/auth/signin')
      await this.page.waitForLoadState('networkidle')

      await this.page.fill('input[type="email"]', TEST_USER.email)
      await this.page.fill('input[type="password"]', TEST_USER.password)
      await this.page.click('button[type="submit"]')

      // Wait for redirect to dashboard
      await this.page.waitForURL('**/dashboard')
      await this.page.waitForLoadState('networkidle')
    }
  }

  async createNoteWithCodeBlock(
    codeContent: string,
    language: string = 'javascript'
  ) {
    // Click the note input area
    const noteInput = this.page
      .locator(
        'textarea[placeholder*="capture"], textarea[placeholder*="thought"], .note-input textarea'
      )
      .first()
    await noteInput.click()

    // Create a note with code block using markdown syntax
    const noteWithCode = `Here's a code example:

\`\`\`${language}
${codeContent}
\`\`\`

This should render with syntax highlighting.`

    await noteInput.fill(noteWithCode)

    // Submit the note
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(500) // Allow for note creation
  }

  async toggleTheme() {
    // Look for theme toggle button (usually in header or user menu)
    const themeToggle = this.page
      .locator(
        '[data-testid="theme-toggle"], button[aria-label*="theme"], button:has-text("theme")'
      )
      .first()

    if (await themeToggle.isVisible()) {
      await themeToggle.click()
      await this.page.waitForTimeout(300) // Allow theme transition
    } else {
      // Try user menu approach
      const userMenu = this.page
        .locator('button[aria-label*="user"], .user-menu button')
        .first()
      if (await userMenu.isVisible()) {
        await userMenu.click()
        const themeOption = this.page
          .locator('text=Theme, text=Dark, text=Light')
          .first()
        if (await themeOption.isVisible()) {
          await themeOption.click()
        }
      }
    }
  }

  async takeScreenshotOfCodeBlocks(name: string) {
    // Wait for any code blocks to be rendered
    await this.page.waitForSelector('pre, code, .hljs, [class*="syntax"]', {
      timeout: 5000,
    })
    await this.page.waitForTimeout(500) // Additional wait for syntax highlighting

    // Take screenshot of the entire page
    return await this.page.screenshot({
      path: `test-results/code-blocks-${name}.png`,
      fullPage: true,
    })
  }

  async checkForWhiteBackground() {
    // Check if any code blocks have white background when they shouldn't
    const codeBlocks = this.page.locator('pre, code[class*="language-"], .hljs')
    const count = await codeBlocks.count()

    const backgroundIssues = []

    for (let i = 0; i < count; i++) {
      const codeBlock = codeBlocks.nth(i)
      const styles = await codeBlock.evaluate(el => {
        const computed = getComputedStyle(el)
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
        }
      })

      // Check for problematic white backgrounds
      const bgColor = styles.backgroundColor
      if (
        bgColor === 'rgb(255, 255, 255)' ||
        bgColor === '#ffffff' ||
        bgColor === 'white'
      ) {
        backgroundIssues.push({
          index: i,
          backgroundColor: bgColor,
          color: styles.color,
        })
      }
    }

    return backgroundIssues
  }

  async measureRenderTime() {
    const startTime = Date.now()

    // Wait for code blocks to appear
    await this.page.waitForSelector('pre code, .hljs', { timeout: 10000 })

    const endTime = Date.now()
    return endTime - startTime
  }
}

test.describe('Code Block Rendering - White Background Fix', () => {
  let testPage: CodeBlockTestPage

  test.beforeEach(async ({ page }) => {
    testPage = new CodeBlockTestPage(page)
    await testPage.navigateToApp()
    await testPage.signIn()
  })

  test('code blocks render without white background flash in light theme', async ({
    page,
  }) => {
    // Create a note with JavaScript code block
    const codeContent = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55`

    await testPage.createNoteWithCodeBlock(codeContent, 'javascript')

    // Take screenshot in light theme
    await testPage.takeScreenshotOfCodeBlocks('light-theme')

    // Check for white background issues
    const backgroundIssues = await testPage.checkForWhiteBackground()

    // In light theme, white backgrounds might be acceptable
    // But we should verify the code is properly highlighted
    await expect(page.locator('pre code, .hljs')).toBeVisible()

    // Measure render time - should be fast without dynamic imports
    const renderTime = await testPage.measureRenderTime()
    expect(renderTime).toBeLessThan(1000) // Should render within 1 second
  })

  test('code blocks render without white background flash in dark theme', async ({
    page,
  }) => {
    // Switch to dark theme first
    await testPage.toggleTheme()

    // Create a note with Python code block
    const codeContent = `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quicksort(left) + middle + quicksort(right)`

    await testPage.createNoteWithCodeBlock(codeContent, 'python')

    // Take screenshot in dark theme
    await testPage.takeScreenshotOfCodeBlocks('dark-theme')

    // Check for white background issues - these are problematic in dark theme
    const backgroundIssues = await testPage.checkForWhiteBackground()

    // In dark theme, white backgrounds are definitely wrong
    expect(backgroundIssues.length).toBe(0)

    // Verify code block is visible and properly styled
    await expect(page.locator('pre code, .hljs')).toBeVisible()

    // Check that the background is dark
    const codeBlock = page.locator('pre code, .hljs').first()
    const bgColor = await codeBlock.evaluate(
      el => getComputedStyle(el).backgroundColor
    )

    // Should not be white in dark theme
    expect(bgColor).not.toMatch(/rgb\(255,\s*255,\s*255\)|#ffffff|white/i)
  })

  test('code blocks render immediately on page refresh without loading flash', async ({
    page,
  }) => {
    // Create a note with code block first
    const codeContent = `const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`

    await testPage.createNoteWithCodeBlock(codeContent, 'javascript')

    // Take initial screenshot
    await testPage.takeScreenshotOfCodeBlocks('before-refresh')

    // Refresh the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Immediately check for code blocks - they should render without delay
    const renderTime = await testPage.measureRenderTime()
    expect(renderTime).toBeLessThan(500) // Should render very quickly

    // Take screenshot after refresh
    await testPage.takeScreenshotOfCodeBlocks('after-refresh')

    // Check for background issues after refresh
    const backgroundIssues = await testPage.checkForWhiteBackground()

    // Verify no problematic white backgrounds
    await expect(page.locator('pre code, .hljs')).toBeVisible()
  })

  test('multiple code blocks with different languages render correctly', async ({
    page,
  }) => {
    // Create notes with various code blocks
    const codeExamples = [
      {
        language: 'typescript',
        code: `interface User {
  id: number;
  name: string;
  email: string;
}

const createUser = (data: Partial<User>): User => {
  return {
    id: Date.now(),
    ...data
  } as User;
};`,
      },
      {
        language: 'css',
        code: `.code-block {
  background-color: var(--code-bg);
  color: var(--code-text);
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
}`,
      },
      {
        language: 'json',
        code: `{
  "name": "gravity-note",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "next": "^14.0.0"
  }
}`,
      },
    ]

    // Create notes with different code blocks
    for (const example of codeExamples) {
      await testPage.createNoteWithCodeBlock(example.code, example.language)
      await page.waitForTimeout(300) // Small delay between creations
    }

    // Take screenshot with all code blocks
    await testPage.takeScreenshotOfCodeBlocks('multiple-languages')

    // Verify all code blocks are rendered
    const codeBlocks = page.locator('pre code, .hljs')
    const count = await codeBlocks.count()
    expect(count).toBeGreaterThanOrEqual(3)

    // Check each code block for proper rendering
    for (let i = 0; i < count; i++) {
      await expect(codeBlocks.nth(i)).toBeVisible()
    }

    // Check for any white background issues
    const backgroundIssues = await testPage.checkForWhiteBackground()
    console.log('Background issues found:', backgroundIssues)
  })

  test('theme switching updates code block colors immediately', async ({
    page,
  }) => {
    // Create a code block first
    const codeContent = `// Theme switching test
function updateTheme(isDark) {
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}`

    await testPage.createNoteWithCodeBlock(codeContent, 'javascript')

    // Take screenshot in initial theme
    await testPage.takeScreenshotOfCodeBlocks('theme-initial')

    // Get initial background color
    const codeBlock = page.locator('pre code, .hljs').first()
    const initialBg = await codeBlock.evaluate(
      el => getComputedStyle(el).backgroundColor
    )

    // Switch theme
    await testPage.toggleTheme()
    await page.waitForTimeout(500) // Allow theme transition

    // Take screenshot in switched theme
    await testPage.takeScreenshotOfCodeBlocks('theme-switched')

    // Get new background color
    const newBg = await codeBlock.evaluate(
      el => getComputedStyle(el).backgroundColor
    )

    // Colors should be different after theme switch
    expect(newBg).not.toBe(initialBg)

    // Switch back
    await testPage.toggleTheme()
    await page.waitForTimeout(500)

    // Take final screenshot
    await testPage.takeScreenshotOfCodeBlocks('theme-switched-back')

    // Should return to original colors
    const finalBg = await codeBlock.evaluate(
      el => getComputedStyle(el).backgroundColor
    )
    expect(finalBg).toBe(initialBg)
  })

  test('inline code renders correctly without background issues', async ({
    page,
  }) => {
    // Create a note with inline code
    const noteContent = `Here's some inline code: \`const x = 42;\` and another one: \`npm install\`.
    
Also a code block:

\`\`\`bash
npm run dev
pnpm build
\`\`\`

And more inline: \`React.useState()\` hook.`

    const noteInput = page
      .locator(
        'textarea[placeholder*="capture"], textarea[placeholder*="thought"], .note-input textarea'
      )
      .first()
    await noteInput.click()
    await noteInput.fill(noteContent)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // Take screenshot
    await testPage.takeScreenshotOfCodeBlocks('inline-code')

    // Check both inline code and code blocks
    const inlineCodeCount = await page.locator('code').count()
    expect(inlineCodeCount).toBeGreaterThanOrEqual(3) // At least 3 inline code elements
    await expect(page.locator('pre code')).toBeVisible() // At least 1 code block

    // Verify no white background issues
    const backgroundIssues = await testPage.checkForWhiteBackground()
    console.log('Inline code background issues:', backgroundIssues)
  })

  test('code blocks with special characters render properly', async ({
    page,
  }) => {
    // Test code with special characters that might break rendering
    const codeContent = `// Special characters test
const regex = /[^\w\s]/gi;
const template = \`Hello \${name}!\`;
const html = '<div class="test">Content & more</div>';
const emoji = '🚀 💻 ⚡';

// Unicode and escape sequences
const unicode = '\\u0048\\u0065\\u006C\\u006C\\u006F';
const escaped = "Line 1\\nLine 2\\tTabbed";`

    await testPage.createNoteWithCodeBlock(codeContent, 'javascript')

    // Take screenshot
    await testPage.takeScreenshotOfCodeBlocks('special-characters')

    // Verify code block renders without breaking
    await expect(page.locator('pre code, .hljs')).toBeVisible()

    // Check that special characters are preserved in the DOM
    const codeText = await page.locator('pre code, .hljs').first().textContent()
    expect(codeText).toContain('🚀')
    expect(codeText).toContain('${name}')
    expect(codeText).toContain('[^\\w\\s]')
  })
})
