import { getAuthToken } from 'deepspace'
import type { ReadPaperData } from './actions'
import { SearchLimitError, SignInRequiredError } from './search'

type ReadResult = { success: true; data: ReadPaperData } | { success: false; error: string }

/** A loaded paper: its text, and the page title the extraction found, if any. */
export interface LoadedPaper {
  markdown: string
  title: string | null
}

const inFlight = new Map<string, Promise<LoadedPaper>>()
const cacheKey = (url: string) => `paper-reader:${url}`

function readCached(url: string): LoadedPaper | null {
  try {
    const stored = sessionStorage.getItem(cacheKey(url))
    if (!stored) return null
    const parsed = JSON.parse(stored) as Partial<LoadedPaper>
    if (typeof parsed.markdown !== 'string') return null
    return { markdown: parsed.markdown, title: typeof parsed.title === 'string' ? parsed.title : null }
  } catch {
    // Missing storage, or an entry from before titles were cached: load it again.
    return null
  }
}

function writeCached(url: string, paper: LoadedPaper) {
  try {
    sessionStorage.setItem(cacheKey(url), JSON.stringify(paper))
  } catch {
    // The cache only avoids a repeat extraction on refresh; the paper still displays.
  }
}

async function requestPaper(url: string): Promise<LoadedPaper> {
  const token = await getAuthToken()
  if (!token) throw new SignInRequiredError()

  const response = await fetch('/api/actions/readPaper', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  })

  if (response.status === 401) throw new SignInRequiredError()
  if (!response.ok) throw new Error(`Paper request failed (${response.status})`)

  const result = (await response.json()) as ReadResult
  if (!result.success) throw new Error(result.error)
  if (result.data.status === 'limited') throw new SearchLimitError(result.data.retryAt)
  const paper = { markdown: result.data.markdown, title: result.data.title ?? null }
  writeCached(url, paper)
  return paper
}

/** Each load is a paid extraction, so reuse in-flight and already loaded papers. */
export function readPaper(url: string): Promise<LoadedPaper> {
  const cached = readCached(url)
  if (cached) return Promise.resolve(cached)

  const existing = inFlight.get(url)
  if (existing) return existing

  const request = requestPaper(url).finally(() => inFlight.delete(url))
  inFlight.set(url, request)
  return request
}
