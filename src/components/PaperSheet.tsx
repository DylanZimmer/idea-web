import { useCallback, useEffect, useRef, useState } from 'react'
import { HIGHLIGHT_HELP_TEXT } from './HighlightHelp'
import { PaperMarkdown } from './PaperMarkdown'

const MAX_QUERY_LENGTH = 500
const BUTTON_WIDTH = 52
const BUTTON_HEIGHT = 34

interface SelectionButton {
  text: string
  top: number
  left: number
}

/** The highlighted text, using each formula's source rather than its drawn glyphs. */
function selectedText(range: Range): string {
  const container = range.commonAncestorContainer
  const element = container instanceof Element ? container : container.parentElement
  const formula = element?.closest('[data-latex]')
  if (formula) return formula.getAttribute('data-latex') ?? ''

  const fragment = range.cloneContents()
  fragment.querySelectorAll('[data-latex]').forEach((node) => {
    node.replaceWith(node.getAttribute('data-latex') ?? '')
  })
  fragment.querySelectorAll('p, li, div, td, th, blockquote, pre, h1, h2, h3, h4, h5, h6').forEach((node) => {
    node.append(' ')
  })
  return fragment.textContent?.trim() ?? ''
}

/** The paper on its page, with a Go button beside any highlighted text. */
export function PaperSheet({ markdown, sourceUrl }: { markdown: string; sourceUrl?: string }) {
  const sheetRef = useRef<HTMLElement>(null)
  const draggingRef = useRef(false)
  const [button, setButton] = useState<SelectionButton | null>(null)

  const updateButton = useCallback(() => {
    if (draggingRef.current) return
    const selection = window.getSelection()
    const sheet = sheetRef.current
    if (!selection || selection.isCollapsed || !sheet || selection.rangeCount === 0) {
      setButton(null)
      return
    }

    const range = selection.getRangeAt(0)
    const text = selectedText(range)
    if (!text) {
      setButton(null)
      return
    }
    const rects = [...range.getClientRects()].filter((rect) => rect.width > 0)
    const last = rects.at(-1)
    if (!sheet.contains(range.commonAncestorContainer) || !last) {
      setButton(null)
      return
    }

    setButton({
      text,
      top: Math.min(
        Math.max(last.top + last.height / 2 - BUTTON_HEIGHT / 2, 8),
        window.innerHeight - BUTTON_HEIGHT - 8,
      ),
      left: Math.max(Math.min(last.right + 8, window.innerWidth - BUTTON_WIDTH - 8), 8),
    })
  }, [])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as Element).closest?.('[data-selection-go]')) return
      draggingRef.current = true
      setButton(null)
    }
    const onPointerUp = () => {
      draggingRef.current = false
      // The browser finishes updating the selection just after pointerup.
      requestAnimationFrame(updateButton)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerUp)
    document.addEventListener('selectionchange', updateButton)
    window.addEventListener('scroll', updateButton, true)
    window.addEventListener('resize', updateButton)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerUp)
      document.removeEventListener('selectionchange', updateButton)
      window.removeEventListener('scroll', updateButton, true)
      window.removeEventListener('resize', updateButton)
    }
  }, [updateButton])

  const searchSelection = () => {
    if (!button) return
    const query = button.text.replace(/\s+/g, ' ').slice(0, MAX_QUERY_LENGTH).trim()
    window.getSelection()?.removeAllRanges()
    setButton(null)
    window.open(`/results?${new URLSearchParams({ q: query })}`, '_blank', 'noopener')
  }

  return (
    <div className="min-h-full bg-black px-0 py-0 sm:px-6 sm:py-8">
      <div className="relative mx-auto flex w-full max-w-4xl flex-col">
        <article
          ref={sheetRef}
          className="min-h-[calc(100vh-3rem)] w-full overflow-hidden break-words bg-white px-6 py-10 font-serif text-[17px] leading-relaxed text-neutral-900 shadow-2xl selection:bg-blue-200 selection:text-neutral-900 sm:px-14 sm:py-14"
        >
          <PaperMarkdown markdown={markdown} baseUrl={sourceUrl} />
        </article>
        {/* Beside the paper's top edge; above the paper where there is no room. */}
        <p
          data-testid="highlight-note"
          className="order-first px-4 pb-3 pt-3 text-sm text-neutral-400 sm:px-0 sm:pt-0 xl:absolute xl:left-full xl:top-0 xl:ml-6 xl:w-56 xl:p-0"
        >
          {HIGHLIGHT_HELP_TEXT}
        </p>
      </div>

      {button && (
        <button
          type="button"
          data-selection-go
          onMouseDown={(event) => event.preventDefault()}
          onClick={searchSelection}
          style={{ top: button.top, left: button.left, width: BUTTON_WIDTH, height: BUTTON_HEIGHT }}
          className="fixed z-50 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Go
        </button>
      )}
    </div>
  )
}
