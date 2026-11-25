import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { paperUrl } from '../paper-graph'
import { readerPath } from '../reader-link'
import type { PaperToGraph } from '../type-defs'
import { SavePaperButton } from './SavePaperButton'

interface PaperCardProps {
  item: PaperToGraph
  style: CSSProperties
  /** Positioning classes; the graph places it absolutely, the category list fixed. */
  className?: string
}

/** The details shown while a paper is hovered, with links to read or save it. */
export function PaperCard({ item, style, className }: PaperCardProps) {
  const { paper, categories } = item
  const url = paperUrl(paper)
  const details = [paper.year, paper.journal].filter(Boolean).join(' · ')
  const authors =
    paper.authors.length > 3
      ? `${paper.authors.slice(0, 3).join(', ')} +${paper.authors.length - 3} more`
      : paper.authors.join(', ')

  return (
    <aside
      data-testid="paper-card"
      style={style}
      className={cn(
        'w-80 overflow-y-auto rounded-xl border border-border bg-card p-4 text-left text-card-foreground shadow-xl',
        className,
      )}
    >
      <h2 className="text-sm font-semibold leading-snug">{paper.title}</h2>
      {authors && <p className="mt-2 text-xs text-muted-foreground">{authors}</p>}
      {details && <p className="mt-1 text-xs text-muted-foreground">{details}</p>}
      {paper.citationCount !== null && (
        <p className="mt-1 text-xs text-muted-foreground">
          {paper.citationCount.toLocaleString()} citations
        </p>
      )}
      {categories.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1">
          {categories.map((category) => (
            <li key={category} className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
              {category}
            </li>
          ))}
        </ul>
      )}
      {paper.abstract && <p className="mt-3 line-clamp-6 text-xs leading-relaxed">{paper.abstract}</p>}
      <div className="mt-3 flex items-center gap-4">
        {url && (
          <a
            href={readerPath(url)}
            target="_blank"
            rel="noopener"
            className="text-xs font-medium text-primary underline"
          >
            Read paper
          </a>
        )}
        <SavePaperButton paper={paper} categories={categories} />
      </div>
    </aside>
  )
}
