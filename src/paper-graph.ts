import type { Paper, PaperToGraph } from './type-defs'

export const GRAPH_PAPER_COUNT = 12

export interface PaperEdge {
  /** Indexes into the selected paper list. */
  from: number
  to: number
  sharedCategories: string[]
}

/** The same paper often comes back from several providers. */
function paperKey(paper: Paper): string {
  const doi = paper.doi?.trim().toLowerCase()
  if (doi) return `doi:${doi}`
  return `title:${paper.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()}`
}

/** Each paper once, keeping its best-ranked copy. Expects rank order. */
function uniquePapers(ranked: PaperToGraph[]): PaperToGraph[] {
  const seen = new Set<string>()
  return ranked.filter((item) => {
    const key = paperKey(item.paper)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Pick the lowest-sourceRank papers, split evenly across the sources that
 * returned results (12, 6 each, or 4 each). If a source runs short, the next
 * best-ranked papers from the other sources fill its slots. With 12 or fewer
 * distinct papers (for example after out-of-scope papers are removed), every
 * one of them is drawn, in rank order.
 */
export function selectGraphPapers(items: PaperToGraph[]): PaperToGraph[] {
  const ranked = [...items].sort((a, b) => a.paper.sourceRank - b.paper.sourceRank)
  const sourceCount = new Set(items.map((item) => item.paper.source)).size
  if (sourceCount === 0) return []

  const unique = uniquePapers(ranked)
  if (unique.length <= GRAPH_PAPER_COUNT) return unique

  const quota = Math.floor(GRAPH_PAPER_COUNT / sourceCount)
  const selected: PaperToGraph[] = []
  const seen = new Set<string>()
  const perSource = new Map<Paper['source'], number>()

  const take = (item: PaperToGraph) => {
    const key = paperKey(item.paper)
    if (seen.has(key) || selected.length >= GRAPH_PAPER_COUNT) return
    seen.add(key)
    selected.push(item)
    perSource.set(item.paper.source, (perSource.get(item.paper.source) ?? 0) + 1)
  }

  for (const item of ranked) {
    if ((perSource.get(item.paper.source) ?? 0) < quota) take(item)
  }
  for (const item of ranked) take(item)

  return selected
}

export interface CategoryGroup {
  category: string
  /** Indexes into the list of papers that was grouped. */
  paperIndexes: number[]
}

const UNCATEGORIZED = 'Uncategorized'

/**
 * Every category, largest first, then alphabetical. Papers without a category
 * go in a final group so that every loaded paper is listed.
 */
export function groupPapersByCategory(items: PaperToGraph[]): CategoryGroup[] {
  const groups = new Map<string, Set<number>>()
  items.forEach((item, index) => {
    for (const category of item.categories.length > 0 ? item.categories : [UNCATEGORIZED]) {
      if (!groups.has(category)) groups.set(category, new Set())
      groups.get(category)?.add(index)
    }
  })
  return [...groups.entries()]
    .map(([category, indexes]) => ({ category, paperIndexes: [...indexes] }))
    .sort(
      (a, b) =>
        Number(a.category === UNCATEGORIZED) - Number(b.category === UNCATEGORIZED) ||
        b.paperIndexes.length - a.paperIndexes.length ||
        a.category.localeCompare(b.category),
    )
}

export const edgeKey = (edge: Pick<PaperEdge, 'from' | 'to'>) => `${edge.from}-${edge.to}`

export interface GraphHighlight {
  edgeKeys: Set<string>
  paperIndexes: Set<number>
}

/**
 * What to emphasize for a hovered paper. A paper on the graph highlights its
 * own lines. A paper off the graph highlights every line carrying one of its
 * categories, plus every bubble in those categories.
 */
export function getGraphHighlight(
  graphItems: PaperToGraph[],
  edges: PaperEdge[],
  hovered: PaperToGraph,
): GraphHighlight {
  const graphIndex = graphItems.findIndex((item) => item.paper.id === hovered.paper.id)

  if (graphIndex >= 0) {
    const own = edges.filter((edge) => edge.from === graphIndex || edge.to === graphIndex)
    return {
      edgeKeys: new Set(own.map(edgeKey)),
      paperIndexes: new Set([graphIndex, ...own.flatMap((edge) => [edge.from, edge.to])]),
    }
  }

  const categories = new Set(hovered.categories)
  const paperIndexes = new Set<number>()
  graphItems.forEach((item, index) => {
    if (item.categories.some((category) => categories.has(category))) paperIndexes.add(index)
  })
  return {
    edgeKeys: new Set(
      edges
        .filter((edge) => edge.sharedCategories.some((category) => categories.has(category)))
        .map(edgeKey),
    ),
    paperIndexes,
  }
}

/**
 * A web link for the paper, falling back to its DOI. Links come from
 * third-party data, so anything other than http(s) is rejected.
 */
export function paperUrl(paper: Paper): string | null {
  if (paper.url && /^https?:\/\//i.test(paper.url)) return paper.url
  const doi = paper.doi?.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
  return doi ? `https://doi.org/${encodeURI(doi)}` : null
}

/** One edge for every pair of papers that shares at least one category. */
export function buildPaperEdges(items: PaperToGraph[]): PaperEdge[] {
  const edges: PaperEdge[] = []
  for (let from = 0; from < items.length; from++) {
    const categories = new Set(items[from].categories)
    for (let to = from + 1; to < items.length; to++) {
      const sharedCategories = [...new Set(items[to].categories)].filter((category) =>
        categories.has(category),
      )
      if (sharedCategories.length > 0) edges.push({ from, to, sharedCategories })
    }
  }
  return edges
}
