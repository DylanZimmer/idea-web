import { describe, expect, it } from 'vitest'
import {
  buildPaperEdges,
  getGraphHighlight,
  groupPapersByCategory,
  paperUrl,
  selectGraphPapers,
} from './paper-graph'
import type { Paper, PaperSource, PaperToGraph } from './type-defs'

function item(source: PaperSource, sourceRank: number, categories: string[] = [], doi?: string): PaperToGraph {
  const paper: Paper = {
    id: `${source}:${sourceRank}`,
    source,
    sourceId: String(sourceRank),
    doi: doi ?? null,
    title: `${source} paper ${sourceRank}`,
    abstract: null,
    authors: [],
    year: null,
    publicationType: null,
    journal: null,
    url: null,
    citationCount: null,
    sourceRank,
  }
  return { paper, categories }
}

const many = (source: PaperSource, count: number) =>
  Array.from({ length: count }, (_, i) => item(source, count - i))

const countBySource = (items: PaperToGraph[]) =>
  items.reduce<Record<string, number>>((counts, { paper }) => {
    counts[paper.source] = (counts[paper.source] ?? 0) + 1
    return counts
  }, {})

describe('selectGraphPapers', () => {
  it('takes 12 from one source, lowest ranks first', () => {
    const selected = selectGraphPapers(many('openalex', 15))
    expect(selected.map(({ paper }) => paper.sourceRank)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    )
  })

  it('takes 6 each from two sources', () => {
    const selected = selectGraphPapers([...many('openalex', 15), ...many('crossref', 15)])
    expect(countBySource(selected)).toEqual({ openalex: 6, crossref: 6 })
  })

  it('takes 4 each from three sources', () => {
    const selected = selectGraphPapers([
      ...many('openalex', 15),
      ...many('crossref', 15),
      ...many('semantic-scholar', 15),
    ])
    expect(countBySource(selected)).toEqual({ openalex: 4, crossref: 4, 'semantic-scholar': 4 })
  })

  it('fills a short source from the others and skips duplicate DOIs', () => {
    const selected = selectGraphPapers([
      item('crossref', 1, [], '10.1/SAME'),
      item('openalex', 1, [], '10.1/same'),
      ...many('openalex', 15).slice(0, 14),
    ])
    expect(selected).toHaveLength(12)
    expect(selected.filter(({ paper }) => paper.doi?.toLowerCase() === '10.1/same')).toHaveLength(1)
  })

  it('draws every paper, in rank order, when there are fewer than 12', () => {
    const selected = selectGraphPapers([...many('openalex', 4), ...many('crossref', 3)])
    expect(selected).toHaveLength(7)
    expect(selected.map(({ paper }) => paper.sourceRank)).toEqual([1, 1, 2, 2, 3, 3, 4])
  })

  it('draws fewer than 12 without duplicates', () => {
    const selected = selectGraphPapers([
      item('crossref', 1, [], '10.1/SAME'),
      item('openalex', 2, [], '10.1/same'),
      item('openalex', 1),
    ])
    expect(selected.map(({ paper }) => paper.id)).toEqual(['crossref:1', 'openalex:1'])
  })
})

describe('groupPapersByCategory', () => {
  it('lists every category with its papers, largest first', () => {
    expect(
      groupPapersByCategory([
        item('openalex', 1, ['B', 'A']),
        item('openalex', 2, ['A']),
        item('openalex', 3, ['C']),
      ]),
    ).toEqual([
      { category: 'A', paperIndexes: [0, 1] },
      { category: 'B', paperIndexes: [0] },
      { category: 'C', paperIndexes: [2] },
    ])
  })
})

describe('groupPapersByCategory with uncategorized papers', () => {
  it('keeps them in a final group', () => {
    expect(
      groupPapersByCategory([item('openalex', 1), item('openalex', 2), item('openalex', 3, ['A'])]),
    ).toEqual([
      { category: 'A', paperIndexes: [2] },
      { category: 'Uncategorized', paperIndexes: [0, 1] },
    ])
  })
})

describe('getGraphHighlight', () => {
  const graph = [
    item('openalex', 1, ['A', 'B']),
    item('openalex', 2, ['A']),
    item('openalex', 3, ['B', 'C']),
    item('openalex', 4, ['C']),
    item('openalex', 5, ['D']),
  ]
  const edges = buildPaperEdges(graph)

  it('highlights only its own lines for a paper on the graph', () => {
    const highlight = getGraphHighlight(graph, edges, graph[1])
    expect([...highlight.edgeKeys]).toEqual(['0-1'])
    expect([...highlight.paperIndexes].sort()).toEqual([0, 1])
  })

  it('highlights lines carrying the categories of a paper off the graph', () => {
    const highlight = getGraphHighlight(graph, edges, item('crossref', 9, ['B', 'C']))
    expect([...highlight.edgeKeys]).toEqual(['0-2', '2-3'])
    expect([...highlight.paperIndexes].sort()).toEqual([0, 2, 3])
  })

  it('highlights a bubble even when its category has no line', () => {
    const highlight = getGraphHighlight(graph, edges, item('crossref', 9, ['D']))
    expect(highlight.edgeKeys.size).toBe(0)
    expect([...highlight.paperIndexes]).toEqual([4])
  })
})

describe('paperUrl', () => {
  it('uses web URLs, falls back to the DOI, and rejects other schemes', () => {
    const { paper } = item('crossref', 1, [], '10.1/abc')
    expect(paperUrl({ ...paper, url: 'https://example.com/a' })).toBe('https://example.com/a')
    expect(paperUrl({ ...paper, url: 'javascript:alert(1)' })).toBe('https://doi.org/10.1/abc')
    expect(paperUrl({ ...paper, url: 'javascript:alert(1)', doi: null })).toBeNull()
  })
})

describe('buildPaperEdges', () => {
  it('connects only papers that share categories and counts them', () => {
    const edges = buildPaperEdges([
      item('openalex', 1, ['A', 'B']),
      item('openalex', 2, ['B', 'A', 'C']),
      item('openalex', 3, ['C']),
      item('openalex', 4, ['D']),
    ])
    expect(edges).toEqual([
      { from: 0, to: 1, sharedCategories: ['B', 'A'] },
      { from: 1, to: 2, sharedCategories: ['C'] },
    ])
  })
})
