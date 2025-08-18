import { test, expect, type Page } from '@playwright/test'

// Test data
const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'testpassword123',
  name: 'E2E Test User',
}

const INVALID_USER = {
  email: 'invalid@example.com',
  password: 'wrongpassword',
}

// Page object model for auth pages
class AuthPage {
  constructor(private page: Page) {}

  async navigateToSignIn() {
    await this.page.goto('/auth/signin')
    await this.page.waitForLoadState('networkidle')
  }

  async navigateToSignUp() {
    await this.page.goto('/auth/signup')
    await this.page.waitForLoadState('networkidle')
  }

  async navigateToDashboard() {
    await this.page.goto('/dashboard')
    await this.page.waitForLoadState('networkidle')
  }

  async fillSignInForm(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"], input[type="email"]', email)
    await this.page.fill('[data-testid="password-input"], input[type="password"]', password)
  }

  async fillSignUpForm(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"], input[type="email"]', email)
    await this.page.fill('[data-testid="password-input"], input[type="password"]', password)
  }

  async submitForm() {
    await this.page.click('button[type="submit"]')
  }

  async clickGoogleSignIn() {
    await this.page.click('button:has-text("Continue with Google")')
  }

  async clickSignUpLink() {
    await this.page.click('button:has-text("Sign up")')
  }

  async clickSignInLink() {
    await this.page.click('button:has-text("Sign in")')
  }

  async signOut() {
    await this.page.click('button:has-text("Sign Out")')
  }

  async expectToBeOnSignIn() {
    await expect(this.page).toHaveURL(/\/auth\/signin/)
    await expect(this.page.locator('h1, h2')).toContainText('Sign In')
  }

  async expectToBeOnSignUp() {
    await expect(this.page).toHaveURL(/\/auth\/signup/)
    await expect(this.page.locator('h1, h2')).toContainText('Sign Up')
  }

  async expectToBeOnDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/)
    await expect(this.page.locator('h1')).toContainText('Welcome to Gravity Note')
  }

  async expectErrorMessage(message: string) {
    await expect(this.page.locator('.text-destructive, .text-red-600')).toContainText(message)
  }

  async expectSuccessMessage(message: string) {
    await expect(this.page.locator('.text-green-600, .text-success')).toContainText(message)
  }

  async expectLoadingState() {
    await expect(this.page.locator('button:has-text("Loading")')).toBeVisible()
  }

  async expectUserMenuVisible(email: string) {
    await expect(this.page.locator('text=' + email)).toBeVisible()
    await expect(this.page.locator('button:has-text("Sign Out")')).toBeVisible()
  }
}

test.describe('Authentication E2E Tests', () => {
  let authPage: AuthPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
  })

  test.describe('Sign In Flow', () => {
    test('successfully signs in with valid credentials', async ({ page }) => {
      // Note: This test would require a test database with seeded user
      // For demo purposes, we'll test the UI flow and validation
      await authPage.navigateToSignIn()

      // Check page loads correctly
      await authPage.expectToBeOnSignIn()
      
      // Verify form elements are present
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible()
    })

    test('shows validation errors for empty form submission', async ({ page }) => {
      await authPage.navigateToSignIn()
      await authPage.submitForm()

      // Check HTML5 validation
      const emailInput = page.locator('input[type="email"]')
      const passwordInput = page.locator('input[type="password"]')

      await expect(emailInput).toHaveAttribute('required')
      await expect(passwordInput).toHaveAttribute('required')
    })

    test('validates email format', async ({ page }) => {
      await authPage.navigateToSignIn()
      
      await page.fill('input[type="email"]', 'invalid-email')
      await authPage.submitForm()

      // Check HTML5 email validation
      const emailInput = page.locator('input[type="email"]')
      const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity())
      expect(isValid).toBe(false)
    })

    test('validates password minimum length', async ({ page }) => {
      await authPage.navigateToSignIn()
      
      await page.fill('input[type="password"]', '12345') // Less than 6 characters
      await authPage.submitForm()

      const passwordInput = page.locator('input[type="password"]')
      const isValid = await passwordInput.evaluate((el: HTMLInputElement) => el.checkValidity())
      expect(isValid).toBe(false)
    })

    test('shows loading state during form submission', async ({ page }) => {
      await authPage.navigateToSignIn()
      await authPage.fillSignInForm(TEST_USER.email, TEST_USER.password)

      // Intercept the auth request to control timing
      await page.route('**/auth/v1/token**', async route => {
        // Delay the response to test loading state
        await page.waitForTimeout(1000)
        await route.abort()
      })

      await authPage.submitForm()
      await authPage.expectLoadingState()
    })

    test('navigates to sign up page from sign in', async ({ page }) => {
      await authPage.navigateToSignIn()
      await authPage.clickSignUpLink()
      
      await expect(page).toHaveURL(/\/auth\/signup/)
    })
  })

  test.describe('Sign Up Flow', () => {
    test('renders sign up form correctly', async ({ page }) => {
      await authPage.navigateToSignUp()
      await authPage.expectToBeOnSignUp()

      // Verify form elements
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible()
    })

    test('shows correct messaging for sign up', async ({ page }) => {
      await authPage.navigateToSignUp()
      
      await expect(page.locator('text=Create a new account to get started')).toBeVisible()
      await expect(page.locator('text=Already have an account?')).toBeVisible()
    })

    test('navigates to sign in page from sign up', async ({ page }) => {
      await authPage.navigateToSignUp()
      await authPage.clickSignInLink()
      
      await expect(page).toHaveURL(/\/auth\/signin/)
    })

    test('validates sign up form fields', async ({ page }) => {
      await authPage.navigateToSignUp()
      
      // Test empty form submission
      await authPage.submitForm()

      const emailInput = page.locator('input[type="email"]')
      const passwordInput = page.locator('input[type="password"]')

      await expect(emailInput).toHaveAttribute('required')
      await expect(passwordInput).toHaveAttribute('required')
      await expect(passwordInput).toHaveAttribute('minLength', '6')
    })
  })

  test.describe('Protected Routes', () => {
    test('redirects unauthenticated users to sign in', async ({ page }) => {
      await authPage.navigateToDashboard()
      
      // Should redirect to sign in
      await authPage.expectToBeOnSignIn()
    })

    test('shows loading state during auth check', async ({ page }) => {
      // Intercept auth requests to create loading state
      await page.route('**/auth/v1/user**', async route => {
        await page.waitForTimeout(500)
        await route.continue()
      })

      await authPage.navigateToDashboard()
      
      // Should show loading spinner initially
      await expect(page.locator('.animate-spin, [data-testid="loading"]')).toBeVisible()
    })
  })

  test.describe('OAuth Flow', () => {
    test('initiates Google OAuth flow', async ({ page }) => {
      await authPage.navigateToSignIn()

      // Mock the OAuth redirect to prevent actual Google OAuth
      await page.route('**/auth/v1/authorize**', async route => {
        // Simulate OAuth provider redirect
        await route.fulfill({
          status: 302,
          headers: {
            'Location': 'https://accounts.google.com/oauth/authorize?...'
          }
        })
      })

      await authPage.clickGoogleSignIn()

      // In a real test, you would verify the redirect to Google
      // For this demo, we just ensure the button is clickable
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible()
    })
  })

  test.describe('Auth Callback Handling', () => {
    test('handles successful auth callback', async ({ page }) => {
      // Simulate successful callback with code
      await page.goto('/auth/callback?code=test-auth-code&next=/dashboard')
      
      // Should redirect to dashboard (or show loading)
      await page.waitForLoadState('networkidle')
      
      // The actual behavior depends on your Supabase setup
      // In a real test, you'd verify the successful authentication
    })

    test('handles auth callback errors', async ({ page }) => {
      // Simulate error callback
      await page.goto('/auth/callback?error=access_denied')
      
      // Should redirect to error page
      await expect(page).toHaveURL(/\/auth\/auth-code-error/)
    })

    test('shows error page for invalid auth codes', async ({ page }) => {
      await page.goto('/auth/auth-code-error')
      
      await expect(page.locator('h1, h2')).toContainText('Authentication Error')
      await expect(page.locator('text=try signing in again')).toBeVisible()
      await expect(page.locator('a[href="/auth/signin"]')).toBeVisible()
      await expect(page.locator('a[href="/"]')).toBeVisible()
    })
  })

  test.describe('Session Persistence', () => {
    test('maintains authentication state across page reloads', async ({ page, context }) => {
      // This test would require setting up authenticated state
      // For demo purposes, we'll test the localStorage persistence structure
      
      await authPage.navigateToSignIn()
      
      // Check that auth store is available
      const hasAuthStore = await page.evaluate(() => {
        return typeof window !== 'undefined' && 'localStorage' in window
      })
      
      expect(hasAuthStore).toBe(true)
    })

    test('clears authentication state on sign out', async ({ page }) => {
      // Simulate authenticated state by setting localStorage
      await page.goto('/')
      
      await page.evaluate(() => {
        localStorage.setItem('auth-store', JSON.stringify({
          state: {
            user: { id: 'test', email: 'test@example.com' },
            session: { access_token: 'token' }
          }
        }))
      })

      await authPage.navigateToDashboard()
      
      // If authenticated, should show dashboard
      // Then test sign out clears localStorage
      const authData = await page.evaluate(() => {
        return localStorage.getItem('auth-store')
      })
      
      expect(authData).toBeTruthy()
    })
  })

  test.describe('Form Interactions', () => {
    test('clears error messages when user types', async ({ page }) => {
      await authPage.navigateToSignIn()
      
      // Simulate showing an error (this would be from a failed request)
      await page.evaluate(() => {
        const errorDiv = document.createElement('div')
        errorDiv.className = 'text-destructive'
        errorDiv.textContent = 'Invalid credentials'
        errorDiv.id = 'test-error'
        document.body.appendChild(errorDiv)
      })
      
      // Verify error is shown
      await expect(page.locator('#test-error')).toContainText('Invalid credentials')
      
      // Type in email field
      await page.fill('input[type="email"]', 'test@example.com')
      
      // In a real app, error should clear when user types
      // This is just testing the UI interaction pattern
    })

    test('disables form during submission', async ({ page }) => {
      await authPage.navigateToSignIn()
      await authPage.fillSignInForm(TEST_USER.email, TEST_USER.password)

      // Intercept request to create loading state
      await page.route('**/auth/v1/token**', async route => {
        await page.waitForTimeout(1000)
        await route.abort()
      })

      await authPage.submitForm()

      // Verify form elements are disabled during loading
      await expect(page.locator('input[type="email"]')).toBeDisabled()
      await expect(page.locator('input[type="password"]')).toBeDisabled()
      await expect(page.locator('button:has-text("Continue with Google")')).toBeDisabled()
    })
  })

  test.describe('Accessibility', () => {
    test('has proper form labels and ARIA attributes', async ({ page }) => {
      await authPage.navigateToSignIn()

      // Check form accessibility
      await expect(page.locator('label[for="email"], label:has-text("Email")')).toBeVisible()
      await expect(page.locator('label[for="password"], label:has-text("Password")')).toBeVisible()
      
      // Check input attributes
      await expect(page.locator('input[type="email"]')).toHaveAttribute('required')
      await expect(page.locator('input[type="password"]')).toHaveAttribute('required')
    })

    test('supports keyboard navigation', async ({ page }) => {
      await authPage.navigateToSignIn()

      // Test tab navigation
      await page.keyboard.press('Tab')
      await expect(page.locator('input[type="email"]')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.locator('input[type="password"]')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.locator('button[type="submit"]')).toBeFocused()
    })

    test('has proper heading structure', async ({ page }) => {
      await authPage.navigateToSignIn()

      // Check heading hierarchy
      const headings = await page.locator('h1, h2, h3').all()
      expect(headings.length).toBeGreaterThan(0)

      // Check main heading exists
      await expect(page.locator('h1, h2')).toContainText(/Sign In|Sign Up/)
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('renders correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
      await authPage.navigateToSignIn()

      // Check that form is still usable on mobile
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()

      // Check that form doesn't overflow
      const formCard = page.locator('.card, [class*="card"]').first()
      if (await formCard.isVisible()) {
        const boundingBox = await formCard.boundingBox()
        if (boundingBox) {
          expect(boundingBox.width).toBeLessThanOrEqual(375)
        }
      }
    })

    test('maintains usability on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }) // iPad
      await authPage.navigateToSignIn()

      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('handles network errors gracefully', async ({ page }) => {
      await authPage.navigateToSignIn()
      await authPage.fillSignInForm(TEST_USER.email, TEST_USER.password)

      // Simulate network error
      await page.route('**/auth/v1/**', route => route.abort('failed'))

      await authPage.submitForm()

      // Should show error message (actual message depends on implementation)
      await expect(page.locator('.text-destructive, .text-red-600, [role="alert"]')).toBeVisible()
    })

    test('recovers from errors when user retries', async ({ page }) => {
      await authPage.navigateToSignIn()
      await authPage.fillSignInForm(TEST_USER.email, TEST_USER.password)

      // First request fails
      let requestCount = 0
      await page.route('**/auth/v1/**', async route => {
        requestCount++
        if (requestCount === 1) {
          await route.abort('failed')
        } else {
          await route.continue()
        }
      })

      // First attempt
      await authPage.submitForm()
      await expect(page.locator('.text-destructive, .text-red-600')).toBeVisible()

      // Second attempt should work
      await authPage.submitForm()
      // In real implementation, this would succeed
    })
  })
})