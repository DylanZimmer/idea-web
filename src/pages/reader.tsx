/**
 * Full-screen paper reader at /reader?url=...
 *
 * It sits outside (app)/ because it needs no realtime data, and mounts
 * DeepSpace's auth itself because loading a paper is a paid, signed-in action.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthGate, DeepSpaceAuthProvider } from 'deepspace'
import Navigation from '../components/Navigation'
import { PaperSheet } from '../components/PaperSheet'
import { readPaper } from '../read-paper'
import { normalizeReaderUrl } from '../reader-link'
import { SearchLimitError, SignInRequiredError } from '../search'

type ReaderState =
  | { status: 'loading' }
  | { status: 'ready'; markdown: string }
  | { status: 'limited'; retryAt: number }
  | { status: 'sign-in' }
  | { status: 'error' }

function Screen({ children, role }: { children: ReactNode; role: 'status' | 'alert' }) {
  return (
    <div role={role} className="flex h-full flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
      {children}
    </div>
  )
}

function PaperLoader({ url, onTitle }: { url: string; onTitle: (title: string | null) => void }) {
  const [state, setState] = useState<ReaderState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    readPaper(url)
      .then(({ markdown, title }) => {
        if (cancelled) return
        onTitle(title)
        setState({ status: 'ready', markdown })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof SearchLimitError) setState({ status: 'limited', retryAt: error.retryAt })
        else if (error instanceof SignInRequiredError) setState({ status: 'sign-in' })
        else {
          console.error('Paper failed to load', error)
          setState({ status: 'error' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [url, onTitle])

  if (state.status === 'ready') return <PaperSheet markdown={state.markdown} sourceUrl={url} />
  if (state.status === 'loading') {
    return (
      <Screen role="status">
        <span className="size-10 animate-spin rounded-full border-4 border-neutral-700 border-t-white" aria-hidden />
        <p className="font-medium">Loading paper…</p>
      </Screen>
    )
  }
  if (state.status === 'limited') {
    const time = new Date(state.retryAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return (
      <Screen role="alert">
        <p className="font-medium">You've reached the reading limit for now</p>
        <p className="text-sm text-neutral-400">You can open more papers at {time}.</p>
      </Screen>
    )
  }
  if (state.status === 'sign-in') {
    return (
      <Screen role="alert">
        <p className="font-medium">Your session has expired</p>
        <button type="button" onClick={() => window.location.reload()} className="text-sm underline">
          Sign in again
        </button>
      </Screen>
    )
  }
  return (
    <Screen role="alert">
      <p className="font-medium">This paper could not be loaded</p>
      <p className="max-w-md text-sm text-neutral-400">
        The publisher may block automated access or require a subscription.
      </p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline">
        Open the original page
      </a>
    </Screen>
  )
}

function ReaderScreen({ url, onTitle }: { url: string | null; onTitle: (title: string | null) => void }) {

  if (!url) {
    return (
      <Screen role="alert">
        <p className="font-medium">Enter a valid paper URL to read</p>
      </Screen>
    )
  }
  return <PaperLoader key={url} url={url} onTitle={onTitle} />
}

export default function Reader() {
  const [searchParams] = useSearchParams()
  const sourceUrl = normalizeReaderUrl(searchParams.get('url') ?? '')
  // The tab shows the paper's name: the title the link carried, else the one
  // found on the page, else the site it came from.
  const linkTitle = searchParams.get('title')?.trim().slice(0, 300) || null
  const [pageTitle, setPageTitle] = useState<{ url: string; title: string | null } | null>(null)
  const onTitle = useCallback((title: string | null) => setPageTitle({ url: sourceUrl ?? '', title }), [sourceUrl])
  const loadedTitle = pageTitle?.url === sourceUrl ? pageTitle.title : null
  const tabTitle = linkTitle ?? loadedTitle ?? (sourceUrl ? new URL(sourceUrl).hostname : null) ?? 'Reader'

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black">
      <title>{tabTitle}</title>
      <DeepSpaceAuthProvider>
        <Navigation sourceUrl={sourceUrl} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <AuthGate>
            <ReaderScreen url={sourceUrl} onTitle={onTitle} />
          </AuthGate>
        </main>
      </DeepSpaceAuthProvider>
    </div>
  )
}
