import { useMemo, useState, type CSSProperties } from 'react'
import { CategoryList } from './CategoryList'
import { buildPaperEdges, edgeKey, getGraphHighlight, paperUrl } from '../paper-graph'
import { readerPath } from '../reader-link'
import { PaperCard } from './PaperCard'
import type { Paper, PaperToGraph } from '../type-defs'

const WIDTH = 800
const HEIGHT = 640
const RADIUS_X = 320
const RADIUS_Y = 260
const BUBBLE_RADIUS = 46

const lineWidth = (sharedCount: number) => 1.5 + (sharedCount - 1) * 2.5

function bubblePosition(index: number, count: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count
  return {
    x: WIDTH / 2 + RADIUS_X * Math.cos(angle),
    y: HEIGHT / 2 + RADIUS_Y * Math.sin(angle),
  }
}

function bubbleName(paper: Paper): string {
  const author = paper.authors[0]?.trim()
  const name = author
    ? author.includes(',')
      ? author.split(',')[0].trim()
      : (author.split(/\s+/).at(-1) ?? author)
    : (paper.title.split(/\s+/)[0] ?? 'Paper')
  return name.length > 10 ? `${name.slice(0, 9)}…` : name
}

const openPaper = (url: string | null) => {
  if (url) window.open(readerPath(url), '_blank', 'noopener')
}

function cardPosition(x: number, y: number): CSSProperties {
  const offsetX = ((BUBBLE_RADIUS + 10) / WIDTH) * 100
  const xPercent = (x / WIDTH) * 100
  const yPercent = (y / HEIGHT) * 100
  const sideInset = xPercent > 50 ? 100 - xPercent + offsetX : xPercent + offsetX
  const verticalInset = Math.max(yPercent > 50 ? 100 - yPercent - 8 : yPercent - 8, 0)
  // The limits keep the card inside the graph at any browser size.
  return {
    [xPercent > 50 ? 'right' : 'left']: `${sideInset}%`,
    [yPercent > 50 ? 'bottom' : 'top']: `${verticalInset}%`,
    maxWidth: `${100 - sideInset}%`,
    maxHeight: `min(24rem, ${100 - verticalInset}%)`,
  }
}

interface PaperGraphProps {
  /** The papers drawn as bubbles. */
  items: PaperToGraph[]
  /** Every paper the search loaded, shown in the category list. */
  allItems: PaperToGraph[]
}

export function PaperGraph({ items, allItems }: PaperGraphProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  // The category list draws its own card beside the hovered row.
  const [hoverFrom, setHoverFrom] = useState<'graph' | 'list'>('graph')
  const showGraphHover = (paperId: string) => {
    setActiveId(paperId)
    setHoverFrom('graph')
  }
  const edges = useMemo(() => buildPaperEdges(items), [items])
  const positions = useMemo(
    () => items.map((_, index) => bubblePosition(index, items.length)),
    [items],
  )
  const activeItem = useMemo(
    () => allItems.find((item) => item.paper.id === activeId) ?? null,
    [allItems, activeId],
  )
  const highlight = useMemo(
    () => (activeItem ? getGraphHighlight(items, edges, activeItem) : null),
    [activeItem, items, edges],
  )
  const activeIndex = activeItem
    ? items.findIndex((item) => item.paper.id === activeItem.paper.id)
    : -1

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className="flex min-h-0 flex-1 items-center justify-center"
        style={{ containerType: 'size' }}
      >
      <div
        className="relative"
        style={{ width: `min(100cqw, ${(WIDTH / HEIGHT) * 100}cqh)`, aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        onMouseLeave={() => setActiveId(null)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setActiveId(null)
        }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block h-auto w-full"
          role="group"
          aria-label={`Graph of ${items.length} papers connected by shared categories`}
        >
          {edges.map((edge) => {
            const isHighlighted = highlight?.edgeKeys.has(edgeKey(edge)) ?? false
            return (
              <line
                key={edgeKey(edge)}
                data-highlighted={isHighlighted || undefined}
                data-shared={edge.sharedCategories.length}
                x1={positions[edge.from].x}
                y1={positions[edge.from].y}
                x2={positions[edge.to].x}
                y2={positions[edge.to].y}
                stroke={isHighlighted ? 'var(--color-primary)' : 'var(--color-muted-foreground)'}
                strokeWidth={lineWidth(edge.sharedCategories.length) + (isHighlighted ? 1.5 : 0)}
                strokeLinecap="round"
                opacity={!highlight ? 0.45 : isHighlighted ? 0.95 : 0.06}
                className="transition-opacity duration-150"
              >
                <title>{`Shared: ${edge.sharedCategories.join(', ')}`}</title>
              </line>
            )
          })}

          {items.map((item, index) => {
            const { x, y } = positions[index]
            const { paper } = item
            const url = paperUrl(paper)
            return (
              <g
                key={paper.id}
                role={url ? 'link' : 'img'}
                tabIndex={0}
                aria-label={url ? `${paper.title}. Opens in the reader` : paper.title}
                className={`${url ? 'cursor-pointer' : 'cursor-default'} outline-none transition-opacity duration-150`}
                opacity={highlight && !highlight.paperIndexes.has(index) ? 0.3 : 1}
                onMouseEnter={() => showGraphHover(paper.id)}
                onFocus={() => showGraphHover(paper.id)}
                onClick={() => openPaper(url)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openPaper(url)
                }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={BUBBLE_RADIUS}
                  fill="var(--color-card)"
                  stroke={activeIndex === index ? 'var(--color-primary)' : 'var(--color-muted-foreground)'}
                  strokeWidth={activeIndex === index ? 5 : 3}
                />
                <text
                  x={x}
                  y={paper.year ? y - 3 : y + 5}
                  textAnchor="middle"
                  fill="var(--color-foreground)"
                  fontSize="15"
                  fontWeight="600"
                  className="pointer-events-none select-none"
                >
                  {bubbleName(paper)}
                </text>
                {paper.year && (
                  <text
                    x={x}
                    y={y + 16}
                    textAnchor="middle"
                    fill="var(--color-muted-foreground)"
                    fontSize="13"
                    className="pointer-events-none select-none"
                  >
                    {paper.year}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {activeItem && hoverFrom === 'graph' && activeIndex >= 0 && (
          <PaperCard
            item={activeItem}
            style={cardPosition(positions[activeIndex].x, positions[activeIndex].y)}
            className="absolute z-10 max-sm:!inset-x-0 max-sm:!bottom-0 max-sm:!top-auto max-sm:!max-h-full max-sm:!max-w-full max-sm:w-auto"
          />
        )}
      </div>
      </div>

      <p className="mt-2 shrink-0 text-center text-xs text-muted-foreground">
        {edges.length > 0
          ? 'Thicker lines mean more shared categories'
          : 'These papers do not share any categories'}
      </p>
      </div>

      <CategoryList
        items={allItems}
        active={hoverFrom === 'list' ? activeId : null}
        highlighted={activeId}
        onActiveChange={(paperId) => {
          setActiveId(paperId)
          setHoverFrom('list')
        }}
      />
    </div>
  )
}
