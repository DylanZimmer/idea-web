import { memo, useEffect, useRef, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const renderedFormulas = new Map<string, string>()

/** `trust: false` makes KaTeX refuse commands that could add links or scripts. */
function renderFormula(source: string, display: boolean): string {
  const key = `${display ? 'display' : 'inline'}:${source}`
  let html = renderedFormulas.get(key)
  if (html === undefined) {
    // Common LaTeX from papers that KaTeX does not accept as written.
    const compatibleSource = source.replace(/\\begin\{array\}\[[^\]]*\]/g, '\\begin{array}')
    html = katex.renderToString(compatibleSource, {
      macros: { '\\mbox': '\\text{#1}', '\\qed': '\\square' },
      displayMode: display,
      output: 'html',
      throwOnError: false,
      strict: 'ignore',
      trust: false,
    })
    renderedFormulas.set(key, html)
  }
  return html
}

let observer: IntersectionObserver | null = null
const callbacks = new WeakMap<Element, () => void>()

/** Long papers hold thousands of formulas, so each renders as it nears the screen. */
function whenNearViewport(element: Element, callback: () => void): () => void {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        callbacks.get(entry.target)?.()
        callbacks.delete(entry.target)
        observer?.unobserve(entry.target)
      }
    },
    { rootMargin: '1500px 0px' },
  )
  callbacks.set(element, callback)
  observer.observe(element)
  return () => {
    callbacks.delete(element)
    observer?.unobserve(element)
  }
}

export const MathFormula = memo(function MathFormula({
  source,
  display,
}: {
  source: string
  display: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    return whenNearViewport(element, () => setHtml(renderFormula(source, display)))
  }, [source, display])

  const className = display ? 'my-4 block overflow-x-auto overflow-y-hidden' : undefined

  // KaTeX escapes the formula, and data-latex lets highlighting search its source.
  return html === null ? (
    <span ref={ref} data-latex={source} className={`${className ?? ''} font-mono text-[0.85em] text-neutral-500`}>
      {source}
    </span>
  ) : (
    <span
      ref={ref}
      data-latex={source}
      role="img"
      aria-label={source}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})
