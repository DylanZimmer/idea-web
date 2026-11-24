import { Fragment, memo, type ReactNode } from 'react'
import { MathFormula } from './MathFormula'

/**
 * Renders extracted paper text as React elements. It never injects HTML, and
 * only http(s) links and images are kept, so a page cannot run code here.
 */

// Math comes first so that its *, _ and \ are never read as Markdown.
const INLINE =
  /(?<!\\)(\$\$[^$]+\$\$|\$[^$\n]+\$)|!\[([^\]]*)\]\(([^)\s]+)[^)]*\)|\[([^\]]+)\]\(([^)\s]+)[^)]*\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*/g

const unescapeText = (text: string) => text.replace(/\\([\\`*_{}[\]()#+\-.!|])/g, '$1')
/**
 * An http(s) address. Figures pass the paper's page as baseUrl, so a relative
 * "x1.png" still loads; links do not, so in-page references like "#bib1" stay
 * text. Anything else, such as javascript:, is refused.
 */
function webUrl(url: string, baseUrl?: string): string | null {
  try {
    const resolved = new URL(url, baseUrl)
    return resolved.protocol === 'http:' || resolved.protocol === 'https:' ? resolved.toString() : null
  } catch {
    return null
  }
}
const stripMathDelimiters = (math: string) => math.trim().replace(/^\${1,2}|\${1,2}$/g, '').trim()

function renderInline(text: string, baseUrl?: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let cursor = 0

  for (const match of text.matchAll(INLINE)) {
    const index = match.index
    if (index > cursor) nodes.push(unescapeText(text.slice(cursor, index)))
    const [whole, math, alt, imageUrl, label, linkUrl, code, bold, boldAlt, italic] = match

    if (math !== undefined) {
      const display = math.startsWith('$$')
      nodes.push(<MathFormula key={index} source={stripMathDelimiters(math)} display={display} />)
    } else if (imageUrl !== undefined) {
      const src = webUrl(imageUrl, baseUrl)
      if (src) {
        nodes.push(
          <img
            key={index}
            src={src}
            alt={alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            // A figure address that no longer loads is hidden, not shown broken.
            onError={(event) => {
              event.currentTarget.hidden = true
            }}
            className="my-4 inline-block h-auto max-w-full"
          />,
        )
      } else if (alt) {
        nodes.push(alt)
      }
    } else if (linkUrl !== undefined) {
      const href = webUrl(linkUrl)
      nodes.push(
        href ? (
          <a key={index} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
            {renderInline(label, baseUrl)}
          </a>
        ) : (
          <Fragment key={index}>{renderInline(label, baseUrl)}</Fragment>
        ),
      )
    } else if (code !== undefined) {
      nodes.push(<code key={index} className="rounded bg-neutral-100 px-1 font-mono text-[0.9em]">{code}</code>)
    } else if (bold !== undefined || boldAlt !== undefined) {
      nodes.push(<strong key={index}>{renderInline(bold ?? boldAlt, baseUrl)}</strong>)
    } else if (italic !== undefined) {
      nodes.push(<em key={index}>{renderInline(italic, baseUrl)}</em>)
    }
    cursor = index + whole.length
  }

  if (cursor < text.length) nodes.push(unescapeText(text.slice(cursor)))
  return nodes
}

const HEADING = /^(#{1,6})\s+(.+?)\s*#*$/
const LIST_ITEM = /^\s*(?:[-*+]|(\d+)[.)])\s+(.*)$/
const FENCE = /^\s*(```|~~~)/
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/
const TABLE_DIVIDER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

const tableCells = (line: string) =>
  line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((cell) => cell.trim())

const HEADING_CLASS = [
  'mb-4 mt-2 text-3xl font-bold leading-tight',
  'mb-3 mt-8 text-2xl font-bold leading-snug',
  'mb-2 mt-6 text-xl font-semibold',
  'mb-2 mt-5 text-lg font-semibold',
  'mb-2 mt-4 font-semibold',
  'mb-2 mt-4 text-sm font-semibold',
]

function startsBlock(line: string, next?: string) {
  return (
    !line.trim() ||
    HEADING.test(line) ||
    FENCE.test(line) ||
    line.trimStart().startsWith('$$') ||
    RULE.test(line) ||
    LIST_ITEM.test(line) ||
    line.trimStart().startsWith('>') ||
    (line.includes('|') && next !== undefined && TABLE_DIVIDER.test(next))
  )
}

function renderBlocks(markdown: string, baseUrl?: string): ReactNode[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const key = blocks.length

    if (!line.trim()) {
      i++
    } else if (FENCE.test(line)) {
      const code: string[] = []
      i++
      while (i < lines.length && !FENCE.test(lines[i])) code.push(lines[i++])
      i++
      blocks.push(
        <pre key={key} className="my-4 overflow-x-auto rounded bg-neutral-100 p-3 font-mono text-sm">
          {code.join('\n')}
        </pre>,
      )
    } else if (line.trimStart().startsWith('$$')) {
      const math = [line]
      const closesOnSameLine = line.trim().length > 2 && line.trimEnd().endsWith('$$')
      i++
      if (!closesOnSameLine) {
        while (i < lines.length) {
          math.push(lines[i])
          if (lines[i++].trimEnd().endsWith('$$')) break
        }
      }
      blocks.push(<MathFormula key={key} source={stripMathDelimiters(math.join('\n'))} display />)
    } else if (HEADING.test(line)) {
      const [, marks, text] = line.match(HEADING) as RegExpMatchArray
      const Tag = `h${marks.length}` as 'h1'
      blocks.push(<Tag key={key} className={HEADING_CLASS[marks.length - 1]}>{renderInline(text, baseUrl)}</Tag>)
      i++
    } else if (RULE.test(line)) {
      blocks.push(<hr key={key} className="my-6 border-neutral-300" />)
      i++
    } else if (line.includes('|') && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      const header = tableCells(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(tableCells(lines[i++]))
      blocks.push(
        <div key={key} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>{header.map((cell, c) => <th key={c} className="border border-neutral-300 bg-neutral-100 px-2 py-1 text-left">{renderInline(cell, baseUrl)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>{row.map((cell, c) => <td key={c} className="border border-neutral-300 px-2 py-1 align-top">{renderInline(cell, baseUrl)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
    } else if (line.trimStart().startsWith('>')) {
      const quote: string[] = []
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        quote.push(lines[i++].trimStart().replace(/^>\s?/, ''))
      }
      blocks.push(
        <blockquote key={key} className="my-4 border-l-4 border-neutral-300 pl-4 text-neutral-700">
          {renderBlocks(quote.join('\n'), baseUrl)}
        </blockquote>,
      )
    } else if (LIST_ITEM.test(line)) {
      const ordered = Boolean(line.match(LIST_ITEM)?.[1])
      const items: string[] = []
      while (i < lines.length) {
        const item = lines[i].match(LIST_ITEM)
        if (item) {
          items.push(item[2])
          i++
        } else if (lines[i].trim() && /^\s+/.test(lines[i]) && items.length > 0) {
          items[items.length - 1] += ` ${lines[i++].trim()}`
        } else {
          break
        }
      }
      const Tag = ordered ? 'ol' : 'ul'
      blocks.push(
        <Tag key={key} className={`my-3 pl-6 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((item, n) => <li key={n} className="my-1">{renderInline(item, baseUrl)}</li>)}
        </Tag>,
      )
    } else {
      const paragraph = [line]
      i++
      while (i < lines.length && !startsBlock(lines[i], lines[i + 1])) paragraph.push(lines[i++])
      blocks.push(<p key={key} className="my-3">{renderInline(paragraph.join(' '), baseUrl)}</p>)
    }
  }
  return blocks
}

interface PaperMarkdownProps {
  markdown: string
  /** The paper's page, for resolving relative figure and link addresses. */
  baseUrl?: string
}

export const PaperMarkdown = memo(function PaperMarkdown({ markdown, baseUrl }: PaperMarkdownProps) {
  return <>{renderBlocks(markdown, baseUrl)}</>
})
