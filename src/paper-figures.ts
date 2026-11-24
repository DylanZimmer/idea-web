/**
 * Put a paper's figures back into its extracted text.
 *
 * The text extraction drops images and keeps only each figure's caption line
 * ("Figure 1: The Transformer…"); the figure addresses come back separately,
 * in page order. When there is exactly one image per numbered figure, each
 * image goes just above its caption. Otherwise (a figure made of several
 * images, or figures the page did not expose) there is no safe pairing, so the
 * images are listed together in a Figures section at the end.
 */

const CAPTION = /^\s*(?:\*\*)?(?:Figure|Fig\.?)\s*(\d+)\s*[:.|]/i
/** Page furniture that is not part of the paper. */
const NOT_A_FIGURE = /(logo|icon|sprite|badge|avatar|banner|favicon|button|arrow|spinner|loading|pixel|tracking|social|orcid|creativecommons)/i
const IMAGE_FILE = /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i
export const MAX_FIGURES = 20

/**
 * arXiv serves figures from the HTML version of a paper, but extracting the
 * PDF resolves them against the /pdf/ address, which does not exist.
 */
function fixFigureUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  if (/(^|\.)arxiv\.org$/i.test(parsed.hostname) && parsed.pathname.startsWith('/pdf/')) {
    parsed.pathname = parsed.pathname.replace(/^\/pdf\//, '/html/')
  }
  return parsed.toString()
}

/** Keep the Markdown image syntax intact whatever the address or caption holds. */
const markdownUrl = (url: string) =>
  url.replace(/\s/g, encodeURIComponent).replace(/\(/g, '%28').replace(/\)/g, '%29')
const altText = (text: string) =>
  text.replace(/[[\]\n\r]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)

export function figureLinks(imageLinks: unknown): string[] {
  if (!Array.isArray(imageLinks)) return []
  const seen = new Set<string>()
  const links: string[] = []
  for (const link of imageLinks) {
    if (typeof link !== 'string') continue
    const url = fixFigureUrl(link)
    if (!url || seen.has(url)) continue
    const path = new URL(url).pathname
    if (NOT_A_FIGURE.test(path) || !IMAGE_FILE.test(path)) continue
    seen.add(url)
    links.push(url)
    if (links.length === MAX_FIGURES) break
  }
  return links
}

export function addFigures(markdown: string, imageLinks: unknown): string {
  const figures = figureLinks(imageLinks)
  if (figures.length === 0) return markdown

  const lines = markdown.split('\n')
  // The first caption line for each figure number, in page order.
  const captions: { line: number; text: string }[] = []
  const numbers = new Set<string>()
  lines.forEach((line, index) => {
    const number = line.match(CAPTION)?.[1]
    if (number && !numbers.has(number)) {
      numbers.add(number)
      captions.push({ line: index, text: line })
    }
  })

  if (captions.length === figures.length) {
    const byLine = new Map(captions.map((caption, i) => [caption.line, { ...caption, url: figures[i] }]))
    return lines
      .flatMap((line, index) => {
        const figure = byLine.get(index)
        return figure ? ['', `![${altText(figure.text)}](${markdownUrl(figure.url)})`, '', line] : [line]
      })
      .join('\n')
  }

  const gallery = figures.map((url, i) => `![Figure image ${i + 1} from the paper](${markdownUrl(url)})`)
  return `${markdown.trimEnd()}\n\n## Figures\n\n${gallery.join('\n\n')}\n`
}
