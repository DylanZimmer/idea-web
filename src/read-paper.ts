import { getAuthToken } from 'deepspace'
import type { ReadPaperData } from './actions'
import { SearchLimitError, SignInRequiredError } from './search'

type ReadResult = { success: true; data: ReadPaperData } | { success: false; error: string }

const inFlight = new Map<string, Promise<string>>()
const cacheKey = (url: string) => `paper-reader:${url}`

function readCached(url: string): string | null {
  try {
    return sessionStorage.getItem(cacheKey(url))
  } catch {
    return null
  }
}

function writeCached(url: string, markdown: string) {
  try {
    sessionStorage.setItem(cacheKey(url), markdown)
  } catch {
    // The cache only avoids a repeat extraction on refresh; the paper still displays.
  }
}

async function requestPaper(url: string): Promise<string> {
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
  writeCached(url, result.data.markdown)
  return result.data.markdown
}

/** Each load is a paid extraction, so reuse in-flight and already loaded papers. */
export function readPaper(url: string): Promise<string> {
  const cached = readCached(url)
  if (cached) return Promise.resolve(cached)

  const existing = inFlight.get(url)
  if (existing) return existing

  const request = requestPaper(url).finally(() => inFlight.delete(url))
  inFlight.set(url, request)
  return request
}
