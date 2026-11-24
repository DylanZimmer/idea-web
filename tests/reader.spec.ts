/**
 * The reader page. The paper is seeded into the reader's sessionStorage cache,
 * so no paid text extraction runs.
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

test.skip(
  loadAllTestAccounts().length < 1,
  'Needs 1 usable test account. Create one with ' +
    '`npx deepspace test accounts create --email <name>@deepspace.test --name "<name>" --password-stdin`.',
)

test('the header links to the original source, and relative figures load from it', async ({ users }) => {
  const [user] = await users(1)
  const { page } = user
  const source = `https://arxiv.org/html/test-${Date.now()}/`

  await page.goto('/')
  await page.evaluate(
    ([key, value]) => sessionStorage.setItem(key, value),
    [`paper-reader:${source}`, '# A paper\n\nSome text.\n\n![Figure 1: A diagram](x1.png)'],
  )
  await page.goto(`/reader?${new URLSearchParams({ url: source })}`)

  const link = page.getByTestId('nav-original-source')
  await expect(link).toHaveText('Original Source', { timeout: 15_000 })
  await expect(link).toHaveAttribute('href', source)
  await expect(link).toHaveAttribute('target', '_blank')

  await expect(page.getByRole('img', { name: 'Figure 1: A diagram' })).toHaveAttribute('src', `${source}x1.png`)
})

test('the header has no Original Source link off the reader', async ({ users }) => {
  const [user] = await users(1)
  await user.page.goto('/results')
  await expect(user.page.getByTestId('nav-user-home-button')).toBeVisible({ timeout: 15_000 })
  await expect(user.page.getByTestId('nav-original-source')).toHaveCount(0)
})

test('the highlighting note sits to the right of the paper as plain text', async ({ users }) => {
  const [user] = await users(1)
  const { page } = user
  const source = `https://example.org/help-${Date.now()}`
  const note =
    'You can highlight text inside the reader and search for related papers from the highlighted passage'

  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/')
  await page.evaluate(
    ([key, value]) => sessionStorage.setItem(key, value),
    [`paper-reader:${source}`, '# A paper\n\nSome text to highlight.'],
  )
  await page.goto(`/reader?${new URLSearchParams({ url: source })}`)

  const text = page.getByTestId('highlight-note')
  await expect(text).toHaveText(note, { timeout: 15_000 })
  await expect(page.getByTestId('highlight-help')).toHaveCount(0)
  const [noteBox, paperBox] = await Promise.all([text.boundingBox(), page.locator('article').boundingBox()])
  expect(noteBox!.x).toBeGreaterThanOrEqual(paperBox!.x + paperBox!.width)
  expect(Math.abs(noteBox!.y - paperBox!.y)).toBeLessThan(4)
  await page.screenshot({ path: '.deepspace/test-results/reader-help-wide.png' })

  // Without room beside the paper, the note sits just above it instead.
  await page.setViewportSize({ width: 800, height: 900 })
  const [narrowNote, narrowPaper] = await Promise.all([text.boundingBox(), page.locator('article').boundingBox()])
  expect(narrowNote!.y + narrowNote!.height).toBeLessThanOrEqual(narrowPaper!.y)
  await page.screenshot({ path: '.deepspace/test-results/reader-help-narrow.png' })
})
