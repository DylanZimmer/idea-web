import { getAuthToken } from 'deepspace'
import type { SearchPapersData } from './actions'
import type { PaperToGraph } from './type-defs'

type SearchResult =
  | { success: true; data: SearchPapersData }
  | { success: false; error: string }

export class SignInRequiredError extends Error {
  constructor() {
    super('Sign in to search')
    this.name = 'SignInRequiredError'
  }
}

export class SearchLimitError extends Error {
  readonly retryAt: number

  constructor(retryAt: number) {
    super('Search limit reached')
    this.name = 'SearchLimitError'
    this.retryAt = retryAt
  }
}

export async function search(query: string): Promise<PaperToGraph[]> {
  const token = await getAuthToken()
  if (!token) throw new SignInRequiredError()

  const response = await fetch('/api/actions/searchPapers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  })

  if (response.status === 401) throw new SignInRequiredError()
  if (!response.ok) throw new Error(`Research search failed (${response.status})`)

  const result = (await response.json()) as SearchResult
  if (!result.success) throw new Error(result.error)
  if (result.data.status === 'limited') throw new SearchLimitError(result.data.retryAt)
  return result.data.papers
}
