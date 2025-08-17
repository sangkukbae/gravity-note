import { test, expect } from '@playwright/test'

test.describe('Gravity Note - Basic functionality', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/')

    // Check if the main heading is visible
    await expect(
      page.getByRole('heading', { name: 'Gravity Note' })
    ).toBeVisible()

    // Check if the description is visible
    await expect(
      page.getByText(
        'A revolutionary minimalist note-taking application that captures your thoughts instantly'
      )
    ).toBeVisible()

    // Check if the CTA buttons are visible
    await expect(
      page.getByRole('button', { name: 'Get Started' })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Learn More' })).toBeVisible()
  })

  test('page has correct title and meta description', async ({ page }) => {
    await page.goto('/')

    // Check page title
    await expect(page).toHaveTitle(
      /Gravity Note - Revolutionary Minimalist Note-Taking/
    )

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveAttribute(
      'content',
      /Capture your thoughts instantly with our revolutionary minimalist note-taking application/
    )
  })

  test('features section is displayed correctly', async ({ page }) => {
    await page.goto('/')

    // Check if all three feature cards are visible
    await expect(page.getByText('Instant Capture')).toBeVisible()
    await expect(page.getByText('Smart Search')).toBeVisible()
    await expect(page.getByText('Universal Access')).toBeVisible()

    // Check feature descriptions
    await expect(
      page.getByText('Capture your thoughts in under 100ms')
    ).toBeVisible()
    await expect(
      page.getByText('Find any note instantly with our powerful search')
    ).toBeVisible()
    await expect(
      page.getByText('PWA-first design means your notes work everywhere')
    ).toBeVisible()
  })

  test('development status section is visible', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Development Status')).toBeVisible()
    await expect(
      page.getByText('Phase 1: Foundation & Core Features')
    ).toBeVisible()
  })

  test('page is responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Check if main content is still visible and properly laid out
    await expect(
      page.getByRole('heading', { name: 'Gravity Note' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Get Started' })
    ).toBeVisible()

    // Check if feature cards stack properly on mobile
    const featureCards = page.locator('.card')
    await expect(featureCards).toHaveCount(3)
  })
})
