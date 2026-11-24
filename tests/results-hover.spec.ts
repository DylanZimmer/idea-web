/**
 * Hover cards on the results page. Results are seeded into the page's
 * sessionStorage cache, so no paid search runs.
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

test.skip(
  loadAllTestAccounts().length < 1,
  'Needs 1 usable test account. Create one with ' +
    '`npx deepspace test accounts create --email <name>@deepspace.test --name "<name>" --password-stdin`.',
)

function paper(rank: number, title: string, authors: string[]) {
  return {
    paper: {
      id: `test:hover-${rank}`,
      source: 'openalex',
      sourceId: `hover-${rank}`,
      doi: null,
      title,
      abstract: 'Abstract text.',
      authors,
      year: 2020 + rank,
      publicationType: 'article',
      journal: 'Test Journal',
      url: `https://example.org/hover-${rank}`,
      citationCount: rank,
      sourceRank: rank,
    },
    categories: ['Shared'],
  }
}

test('cards drop the source line, and a category-list card can be reached and used', async ({ users }) => {
  const [user] = await users(1)
  const { page } = user
  const query = `hover-${Date.now()}`
  const items = [paper(1, 'Rings & Modules', ['Emmy Noether']), paper(2, 'Second paper', ['Alan Turing'])]

  await page.goto('/')
  await page.evaluate(
    ([key, value]) => sessionStorage.setItem(key, value),
    [`paper-search:${query}`, JSON.stringify(items)],
  )
  await page.goto(`/results?${new URLSearchParams({ q: query })}`)

  // Graph hover: the card starts with the title; no "OpenAlex · Result #1" line.
  await page.getByRole('link', { name: 'Rings & Modules. Opens in the reader', exact: true }).hover()
  const graphCard = page.getByTestId('paper-card')
  await expect(graphCard).toBeVisible({ timeout: 15_000 })
  await expect(graphCard).not.toContainText('Result #')
  await expect(graphCard).not.toContainText('OpenAlex')

  // Category-list hover: the card sits left of the row, over its first letters.
  const row = page.getByTestId('category-list').getByRole('link', { name: /^Alan Turing: Second paper/ })
  await row.hover()
  const card = page.getByTestId('paper-card')
  await expect(card).toContainText('Second paper')
  const [rowBox, cardBox] = await Promise.all([row.boundingBox(), card.boundingBox()])
  const cardRight = cardBox!.x + cardBox!.width
  expect(cardRight).toBeGreaterThan(rowBox!.x)
  expect(cardRight).toBeLessThan(rowBox!.x + 40)
  expect(cardBox!.y).toBeLessThanOrEqual(rowBox!.y)
  expect(cardBox!.y + cardBox!.height).toBeGreaterThanOrEqual(rowBox!.y + rowBox!.height)

  // Move from the row onto the card: it stays open and its Save button works.
  await page.mouse.move(rowBox!.x + 30, rowBox!.y + rowBox!.height / 2)
  await page.mouse.move(cardBox!.x + 40, rowBox!.y + rowBox!.height / 2, { steps: 10 })
  const save = card.getByTestId('save-paper-button')
  await expect(save).toHaveText('Save paper', { timeout: 15_000 })
  await save.click()
  await expect(save).toHaveText('Saved — remove', { timeout: 15_000 })
  await save.click()
  await expect(save).toHaveText('Save paper', { timeout: 15_000 })

  await page.screenshot({ path: '.deepspace/test-results/category-hover-card.png' })
})
