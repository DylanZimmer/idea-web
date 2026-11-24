/**
 * Home page — a single search box for finding papers related to an idea.
 *
 * This is a STATIC page (top level of src/pages/) and is prerendered at build,
 * so nothing here touches window/document during render. The textarea grows to
 * fit its content after mount, and the account control loads after hydration.
 */

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { HighlightHelp } from '../components/HighlightHelp'
import { Seo } from '../components/Seo'
import { seo } from '../seo'
import { useNavigate } from 'react-router-dom'
import { normalizeReaderUrl, readerPath } from '../reader-link'

/** Grow the box until this height, then scroll inside it. */
const MAX_HEIGHT_PX = 320

const HomeAccount = lazy(() => import('../components/HomeAccount'))
const subscribeToNothing = () => () => {}

export default function Landing() {
  const navigate = useNavigate()
  const isHydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false)
  const [query, setQuery] = useState('')
  const [paperLink, setPaperLink] = useState('')
  const [paperLinkInvalid, setPaperLinkInvalid] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const next = Math.min(el.scrollHeight, MAX_HEIGHT_PX)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  useEffect(resize, [query, resize])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const searchText = textareaRef.current?.value.trim() ?? ''
    if (!searchText) return
    // The results page runs the search so it can show its loading state.
    navigate(`/results?${new URLSearchParams({ q: searchText })}`)
  }

  const handleReadSubmit = (e: FormEvent) => {
    e.preventDefault()
    const url = normalizeReaderUrl(paperLink)
    setPaperLinkInvalid(!url)
    if (url) window.open(readerPath(url), '_blank', 'noopener')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <>
      <Seo {...seo} path="/" />
      <div
        data-testid="static-landing"
        className="flex min-h-screen flex-col items-center px-4 text-foreground"
      >
        <div className="fixed right-4 top-4 z-20">
          {isHydrated && (
            <Suspense fallback={null}>
              <HomeAccount />
            </Suspense>
          )}
        </div>

        <h1 className="mt-16 max-w-3xl text-center text-3xl font-semibold tracking-tight sm:mt-24 sm:-translate-x-8 sm:text-4xl">
          Find Papers. Discover Connections.
        </h1>

        <form
          onSubmit={handleSubmit}
          className="my-auto grid w-full max-w-2xl grid-cols-[1fr_auto] items-end gap-x-3 gap-y-2 py-16 sm:-translate-x-8"
        >
          <label htmlFor="idea-search" className="col-span-2 text-lg font-medium">
            What would you like to research?
          </label>

          <textarea
            id="idea-search"
            ref={textareaRef}
            rows={1}
            maxLength={500}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Using graph theory to model protein folding"
            className="block w-full resize-none overflow-hidden rounded-xl border border-input bg-card px-4 py-3 text-base leading-6 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          <button
            type="submit"
            className="h-[50px] self-start rounded-xl bg-primary px-6 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Go
          </button>
        </form>

        <form
          onSubmit={handleReadSubmit}
          noValidate
          className="mb-4 w-full max-w-sm self-end sm:fixed sm:bottom-4 sm:right-4 sm:mb-0 sm:w-96"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor="paper-url" className="block text-sm font-medium text-muted-foreground">
              Read a paper from a URL
            </label>
            {/* Lines up over the Read button, which ends the row below. */}
            <HighlightHelp side="top" align="end" className="mr-[22px]" />
          </div>
          <div className="flex gap-2">
            <input
              id="paper-url"
              type="url"
              inputMode="url"
              value={paperLink}
              onChange={(e) => {
                setPaperLink(e.target.value)
                setPaperLinkInvalid(false)
              }}
              aria-invalid={paperLinkInvalid}
              aria-describedby={paperLinkInvalid ? 'paper-url-error' : undefined}
              placeholder="https://arxiv.org/pdf/..."
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Read
            </button>
          </div>
          {paperLinkInvalid && (
            <p id="paper-url-error" role="alert" className="mt-1 text-xs text-destructive">
              Enter a valid public web address.
            </p>
          )}
        </form>
      </div>
    </>
  )
}
