/**
 * The saved-papers page: reached from the header button beside the user name,
 * and only available to signed-in users.
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

test('signed-out visitors are asked to sign in on /user_home', async ({ page }) => {
  await page.goto('/user_home')
  await expect(page.getByText('Sign in to continue')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('nav-user-home-button')).toHaveCount(0)
})

test.describe('signed in', () => {
  const usableTestAccounts = loadAllTestAccounts().length
  test.skip(
    usableTestAccounts < 1,
    'Needs 1 usable test account. Create one with ' +
      '`npx deepspace test accounts create --email <name>@deepspace.test --name "<name>" --password-stdin`.',
  )

  test('header button sits left of the user name and opens /user_home', async ({ users }) => {
    const [user] = await users(1)
    await user.page.goto('/results')

    const button = user.page.getByTestId('nav-user-home-button')
    const accountMenu = user.page.getByRole('button', { name: 'Account menu' })
    await expect(button).toBeVisible({ timeout: 15_000 })

    const [buttonBox, menuBox] = await Promise.all([button.boundingBox(), accountMenu.boundingBox()])
    expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(menuBox!.x)

    await button.click()
    await expect(user.page).toHaveURL(/\/user_home$/)
    await expect(
      user.page.getByTestId('saved-papers-list').or(user.page.getByText("You haven't saved any papers yet.")),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('a paper saved from the results page is listed and opens in the reader', async ({ users }) => {
    const [user] = await users(1)
    const { page } = user
    const query = `save-flow-${Date.now()}`
    const title = `Saved paper ${Date.now()}`
    const paper = {
      id: `test:${query}`,
      source: 'openalex',
      sourceId: query,
      doi: null,
      title,
      abstract: 'A paper used by the save-flow test.',
      authors: ['Ada Lovelace'],
      year: 2024,
      publicationType: 'article',
      journal: 'Test Journal',
      url: 'https://example.org/paper',
      citationCount: 3,
      sourceRank: 1,
    }

    // Seed the results cache so the page shows this paper without a paid search.
    await page.goto('/')
    await page.evaluate(
      ([key, value]) => sessionStorage.setItem(key, value),
      [`paper-search:${query}`, JSON.stringify([{ paper, categories: ['Testing'] }])],
    )
    await page.goto(`/results?${new URLSearchParams({ q: query })}`)

    await page.getByRole('link', { name: `${title}. Opens in the reader`, exact: true }).hover()
    const save = page.getByTestId('save-paper-button')
    await expect(save).toHaveText('Save paper', { timeout: 15_000 })
    await save.click()
    await expect(save).toHaveText('Saved — remove', { timeout: 15_000 })

    await page.getByTestId('nav-user-home-button').click()
    const link = page.getByTestId('saved-papers-list').getByRole('link', { name: title })
    await expect(link).toHaveAttribute('href', `/reader?${new URLSearchParams({ url: paper.url })}`, {
      timeout: 15_000,
    })

    // The search's categories show above the title, and notes start blank and save.
    const row = page
      .getByTestId('saved-papers-list')
      .getByRole('listitem')
      .filter({ has: page.getByRole('link', { name: title }) })
    await expect(row.getByTestId('saved-paper-categories')).toHaveText('Testing')
    const notes = row.getByTestId('saved-paper-notes')
    await expect(notes).toHaveValue('')
    await notes.fill('Read section 3 first')
    await notes.blur()
    await page.reload()
    await expect(row.getByTestId('saved-paper-notes')).toHaveValue('Read section 3 first', { timeout: 15_000 })

    // The remove button sits left of the title and the notes box right of it.
    const [removeBox, titleBox, notesBox] = await Promise.all([
      row.getByTestId('remove-saved-paper').boundingBox(),
      row.getByRole('link', { name: title }).boundingBox(),
      row.getByTestId('saved-paper-notes').boundingBox(),
    ])
    expect(removeBox!.x + removeBox!.width).toBeLessThanOrEqual(titleBox!.x)
    expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(notesBox!.x)
    await page.screenshot({ path: '.deepspace/test-results/user-home-layout.png' })

    // Removing it there also leaves the test with no record behind.
    await row.getByTestId('remove-saved-paper').click()
    await expect(page.getByRole('link', { name: title })).toHaveCount(0, { timeout: 15_000 })
    await page.goto(`/results?${new URLSearchParams({ q: query })}`)
    await page.getByRole('link', { name: `${title}. Opens in the reader`, exact: true }).hover()
    await expect(page.getByTestId('save-paper-button')).toHaveText('Save paper', { timeout: 15_000 })
  })
})
