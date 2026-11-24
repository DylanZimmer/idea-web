import { useMemo, useState, type CSSProperties, type FocusEvent, type MouseEvent } from 'react'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { groupPapersByCategory, paperUrl } from '../paper-graph'
import { readerPath } from '../reader-link'
import type { Paper, PaperToGraph } from '../type-defs'
import { PaperCard } from './PaperCard'

const CARD_WIDTH = 320
/** How far the card reaches over the row: its padding plus about two letters. */
const ROW_OVERLAP = 22
const EDGE = 8

function authorLabel(paper: Paper): string {
  const [first, ...others] = paper.authors
  if (!first) return paper.title
  return others.length > 0 ? `${first} et al.` : first
}

/**
 * Put the card directly left of the hovered row, its right edge covering the
 * start of the author's name so the pointer can move straight onto it. Where
 * there is no room on the left (narrow screens), it sits just under the row.
 */
function cardBesideRow(row: DOMRect): CSSProperties {
  const height = window.innerHeight
  const left = row.left + ROW_OVERLAP - CARD_WIDTH
  const vertical: CSSProperties =
    row.top < height / 2
      ? { top: row.top - EDGE, maxHeight: Math.min(384, height - row.top) }
      : { bottom: height - row.bottom - EDGE, maxHeight: Math.min(384, row.bottom) }

  if (left >= EDGE) return { left, ...vertical }

  const below = row.bottom < height / 2
  return {
    left: EDGE,
    width: Math.min(CARD_WIDTH, window.innerWidth - EDGE * 2),
    ...(below
      ? { top: row.bottom - 4, maxHeight: Math.min(384, height - row.bottom - EDGE) }
      : { bottom: height - row.top - 4, maxHeight: Math.min(384, row.top - EDGE) }),
  }
}

interface CategoryListProps {
  items: PaperToGraph[]
  /** The paper hovered in this list, whose card the list shows. */
  active: string | null
  /** The paper hovered anywhere, whose rows are highlighted. */
  highlighted: string | null
  onActiveChange: (paperId: string | null) => void
}

export function CategoryList({ items, active, highlighted, onActiveChange }: CategoryListProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const activeItem = active ? items.find((item) => item.paper.id === active) : undefined
  const clearActive = () => {
    setAnchor(null)
    onActiveChange(null)
  }
  const groups = useMemo(() => groupPapersByCategory(items), [items])
  const Icon = collapsed ? PanelRightOpen : PanelRightClose
  const toggleLabel = collapsed ? 'Show categories' : 'Hide categories'

  return (
    <aside
      data-testid="category-list"
      aria-label="Categories"
      className={cn(
        'flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground',
        collapsed ? 'lg:w-11 lg:self-start' : 'h-[40%] w-full lg:h-auto lg:w-72',
      )}
      onMouseLeave={clearActive}
      onKeyDown={(event) => {
        if (event.key === 'Escape') clearActive()
      }}
    >
      <div className={cn('flex shrink-0 items-center gap-2 p-2', !collapsed && 'border-b border-border')}>
        {!collapsed && <h2 className="min-w-0 flex-1 px-1 text-sm font-semibold">Categories</h2>}
        {collapsed && <span className="flex-1 px-1 text-sm font-semibold lg:hidden">Categories</span>}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon className="size-4" aria-hidden />
        </button>
      </div>

      {!collapsed && (
        <div
          data-testid="category-scroll"
          className="min-h-0 flex-1 overflow-y-auto p-2"
          onScroll={() => anchor && clearActive()}
        >
          {groups.length === 0 && (
            <p className="px-2 py-1 text-sm text-muted-foreground">No categories found.</p>
          )}
          {groups.map(({ category, paperIndexes }) => (
            <section key={category} className="mb-3 last:mb-0">
              <h3 className="flex items-baseline justify-between gap-2 px-2 py-1 text-xs font-semibold">
                <span className="min-w-0 break-words">{category}</span>
                <span className="shrink-0 font-normal text-muted-foreground">{paperIndexes.length}</span>
              </h3>
              <ul>
                {paperIndexes.map((index) => {
                  const { paper } = items[index]
                  const url = paperUrl(paper)
                  const rowClass = cn(
                    'flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1 text-left text-sm text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    highlighted === paper.id && 'bg-accent text-accent-foreground',
                  )
                  const content = (
                    <>
                      <span className="min-w-0 truncate">{authorLabel(paper)}</span>
                      {paper.year && <span className="shrink-0 text-xs">{paper.year}</span>}
                    </>
                  )
                  const show = (row: HTMLElement) => {
                    setAnchor(row.getBoundingClientRect())
                    onActiveChange(paper.id)
                  }
                  const hoverProps = {
                    onMouseEnter: (event: MouseEvent<HTMLElement>) => show(event.currentTarget),
                    onFocus: (event: FocusEvent<HTMLElement>) => show(event.currentTarget),
                  }

                  return (
                    <li key={paper.id}>
                      {url ? (
                        <a
                          href={readerPath(url)}
                          target="_blank"
                          rel="noopener"
                          aria-label={`${authorLabel(paper)}: ${paper.title}. Opens in the reader`}
                          className={rowClass}
                          {...hoverProps}
                        >
                          {content}
                        </a>
                      ) : (
                        <span tabIndex={0} className={rowClass} {...hoverProps}>
                          {content}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {activeItem && anchor && (
        <PaperCard item={activeItem} style={cardBesideRow(anchor)} className="fixed z-50" />
      )}
    </aside>
  )
}
