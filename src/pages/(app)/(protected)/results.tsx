import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PaperGraph } from '@/components/PaperGraph'
import { selectGraphPapers } from '@/paper-graph'
import { search, SearchLimitError, SignInRequiredError } from '@/search'
import type { PaperToGraph } from '@/type-defs'

type SearchState =
  | { status: 'loading' }
  | { status: 'ready'; items: PaperToGraph[] }
  | { status: 'limited'; retryAt: number }
  | { status: 'sign-in' }
  | { status: 'error' }

const inFlight = new Map<string, Promise<PaperToGraph[]>>()
const cacheKey = (query: string) => `paper-search:${query}`

function readCached(query: string): PaperToGraph[] | null {
  try {
    const cached = sessionStorage.getItem(cacheKey(query))
    return cached ? (JSON.parse(cached) as PaperToGraph[]) : null
  } catch {
    return null
  }
}

function writeCached(query: string, items: PaperToGraph[]) {
  try {
    sessionStorage.setItem(cacheKey(query), JSON.stringify(items))
  } catch {
    // The cache only avoids repeat searches on refresh; results still display.
  }
}

/** Each search counts against the limit, so reuse in-flight and finished results. */
function runSearch(query: string): Promise<PaperToGraph[]> {
  const cached = readCached(query)
  if (cached) return Promise.resolve(cached)

  const existing = inFlight.get(query)
  if (existing) return existing

  const request = search(query)
    .then((items) => {
      writeCached(query, items)
      return items
    })
    .finally(() => inFlight.delete(query))
  inFlight.set(query, request)
  return request
}

function Loading() {
  return (
    <div role="status" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
      <span
        className="size-10 animate-spin rounded-full border-4 border-border border-t-primary"
        aria-hidden
      />
      <div>
        <p className="font-medium">Finding and categorizing papers…</p>
        <p className="mt-1 text-sm text-muted-foreground">This can take a little while.</p>
      </div>
    </div>
  )
}

function Message({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
      {children}
    </div>
  )
}

function SearchResults({ query, onRetry }: { query: string; onRetry: () => void }) {
  const [state, setState] = useState<SearchState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    runSearch(query)
      .then((items) => {
        if (!cancelled) setState({ status: 'ready', items })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof SearchLimitError) {
          setState({ status: 'limited', retryAt: error.retryAt })
          return
        }
        if (error instanceof SignInRequiredError) {
          setState({ status: 'sign-in' })
          return
        }
        console.error('Research search failed', error)
        setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [query])

  const graphItems = useMemo(
    () => (state.status === 'ready' ? selectGraphPapers(state.items) : []),
    [state],
  )

  if (state.status === 'loading') return <Loading />
  if (state.status === 'limited') {
    const retryTime = new Date(state.retryAt).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
    return (
      <Message>
        <p className="font-medium">You've used your 3 searches for now</p>
        <p className="text-sm text-muted-foreground">You can search again at {retryTime}.</p>
      </Message>
    )
  }
  if (state.status === 'sign-in') {
    return (
      <Message>
        <p className="font-medium">Your session has expired</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Sign in again
        </button>
      </Message>
    )
  }
  if (state.status === 'error') {
    return (
      <Message>
        <p className="font-medium">The search could not be completed</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Try again
        </button>
      </Message>
    )
  }
  if (graphItems.length === 0) {
    return (
      <Message>
        <p className="font-medium">No papers found</p>
        <p className="text-sm text-muted-foreground">Try describing the idea differently.</p>
      </Message>
    )
  }
  return <PaperGraph items={graphItems} allItems={state.items} />
}

export default function Results() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q')?.trim() ?? ''
  const [attempt, setAttempt] = useState(0)

  return (
    <div className="flex h-full flex-col overflow-hidden px-4 py-3 text-foreground">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">
        <header className="mb-2 flex shrink-0 items-center justify-between gap-4">
          <h1 title={query || undefined} className="min-w-0 truncate text-xl font-semibold tracking-tight">
            {query || 'Results'}
          </h1>
          <Link to="/" className="shrink-0 text-sm font-medium text-primary underline">
            New search
          </Link>
        </header>

        {query ? (
          <SearchResults
            key={`${query}:${attempt}`}
            query={query}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        ) : (
          <Message>
            <p className="font-medium">Enter an idea to see related papers</p>
            <Link to="/" className="text-sm font-medium text-primary underline">
              Start a search
            </Link>
          </Message>
        )}
      </div>
    </div>
  )
}
