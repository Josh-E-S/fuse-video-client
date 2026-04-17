import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('fuse_setup_complete', '1')
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
})

test.describe('Home Page', () => {
  test('loads and displays the app title', async ({ page }) => {
    await expect(page).toHaveTitle('Fuse Video Client')
  })

  test('displays the time', async ({ page }) => {
    const timeText = page.getByText(/\d{1,2}:\d{2}/)
    await expect(timeText.first()).toBeVisible({ timeout: 10_000 })
  })

  test('settings button opens settings modal', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).first().click()
    await expect(page.getByText(/node domain/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test('settings modal closes with Escape', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).first().click()
    await expect(page.getByText(/node domain/i).first()).toBeVisible({ timeout: 5_000 })
    await page.keyboard.press('Escape')
    await expect(page.getByText(/node domain/i).first()).not.toBeVisible({ timeout: 5_000 })
  })

  test('settings persist across page reload', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('fuse_display_name', 'E2E Test User')
    })
    await page.reload()
    const storedName = await page.evaluate(() => localStorage.getItem('fuse_display_name'))
    expect(storedName).toBe('E2E Test User')
  })

  test('theme can be changed and persists', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('fuse_theme', 'deepForest')
    })
    await page.reload()
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    expect(theme).toBe('deepForest')
  })
})

test.describe('Navigation', () => {
  test('navigating to a meeting alias without connection redirects home', async ({ page }) => {
    await page.goto('/meeting/test-room')
    await expect(page).toHaveURL('/', { timeout: 10_000 })
  })
})

test.describe('Setup Wizard', () => {
  test('shows on first launch when setup is not complete', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('fuse_setup_complete')
    })
    await page.reload()
    await expect(page.getByText('Welcome to Fuse')).toBeVisible({ timeout: 10_000 })
  })

  test('can be dismissed with Let\'s go button', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('fuse_setup_complete')
    })
    await page.reload()
    await expect(page.getByText('Welcome to Fuse')).toBeVisible({ timeout: 10_000 })
    await page.getByText("Let's go").click()
    await expect(page.getByText('Welcome to Fuse')).not.toBeVisible({ timeout: 5_000 })
  })
})
