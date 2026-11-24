import { test, expect } from '@playwright/test'
import { captureConsoleErrors } from './helpers/errors'

/**
 * Smoke tests covering both page kinds this template ships:
 *   - '/'      → the static landing (top level of src/pages/): it checks the
 *                session for its Sign in control, but opens no records WebSocket.
 *   - '/results' → a dynamic page (under src/pages/(app)/): the providers mount,
 *                the nav shell renders, and the records WebSocket connects.
 *
 * The "static contract" test is the guardrail for the per-page opt-out: if
 * someone moves the providers back up into _app.tsx, it fails.
 */

/** Wait for the React app shell (present on every page). */
async function waitForApp(page: import('@playwright/test').Page) {
  await page.waitForSelector('[data-testid="app-root"]', { timeout: 15000 })
}

test.describe('Smoke tests', () => {
  test('static landing loads without JS errors', async ({ page }) => {
    const errors = captureConsoleErrors(page)
    await page.goto('/')
    await waitForApp(page)
    await expect(page.getByTestId('static-landing')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('landing carries one title, one description, one canonical', async ({ page }) => {
    // <Seo> (src/pages/index.tsx, values from src/seo.ts) hoists these into
    // <head>. Exactly one of each: index.html ships no static description or
    // canonical, because React 19 would not dedupe against them on mount.
    await page.goto('/')
    await expect(page.getByTestId('static-landing')).toBeVisible()
    await expect(page).toHaveTitle(/\S/)
    expect(await page.locator('head meta[name="description"]').count()).toBe(1)
    expect(await page.locator('head link[rel="canonical"]').count()).toBe(1)
  })

  test('landing shows sign-in when logged out', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('nav-sign-in-button')).toBeVisible({ timeout: 15000 })
  })

  test('static contract: landing opens no websocket', async ({ page }) => {
    const offenders: string[] = []
    // Only the DO room route counts — vite's own HMR socket is a dev artifact.
    page.on('websocket', (ws) => {
      if (new URL(ws.url()).pathname.startsWith('/ws/')) offenders.push(`ws: ${ws.url()}`)
    })
    await page.goto('/')
    await expect(page.getByTestId('static-landing')).toBeVisible()
    await page.waitForTimeout(1500)
    expect(offenders).toEqual([])
  })

  test('dynamic app boundary mounts on /results', async ({ page }) => {
    await page.goto('/results')
    await expect(page.getByTestId('app-navigation')).toBeVisible({ timeout: 15000 })
  })

  test('sign-in button visible when logged out', async ({ page }) => {
    await page.goto('/results')
    await expect(page.getByTestId('nav-sign-in-button')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('nav-user-name')).toHaveCount(0)
  })

  test('unknown route shows 404', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz')
    await waitForApp(page)
    await expect(page.locator('text=404')).toBeVisible()
  })
})

test('the search page has a highlight help button above Read', async ({ page }) => {
  await page.goto('/')
  const help = page.getByTestId('highlight-help')
  const read = page.getByRole('button', { name: 'Read', exact: true })
  await expect(help).toBeVisible({ timeout: 15_000 })
  const [helpBox, readBox] = await Promise.all([help.boundingBox(), read.boundingBox()])
  expect(helpBox!.y + helpBox!.height).toBeLessThanOrEqual(readBox!.y)
  expect(Math.abs(helpBox!.x + helpBox!.width / 2 - (readBox!.x + readBox!.width / 2))).toBeLessThan(6)
  await help.hover()
  await expect(page.getByText(/highlight text inside the reader/)).toBeVisible()
})
