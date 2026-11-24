import { describe, expect, it } from 'vitest'
import { finalizeCategories, OUTSIDE_RESEARCH_SCOPE, removeOutOfScopePapers } from './paper-analysis'
import type { PaperSource, PaperToGraph } from '../type-defs'

function item(source: PaperSource, sourceRank: number, categories: string[]): PaperToGraph {
  return {
    paper: {
      id: `${source}:${sourceRank}`,
      source,
      sourceId: String(sourceRank),
      doi: null,
      title: `${source} ${sourceRank}`,
      abstract: null,
      authors: [],
      year: null,
      publicationType: null,
      journal: null,
      url: null,
      citationCount: null,
      sourceRank,
    },
    categories,
  }
}

describe('finalizeCategories', () => {
  it('caps each paper at 4 categories and normalizes duplicates', () => {
    const categories = ['A', 'B', 'C', 'D', 'E']
    const [paper] = finalizeCategories(['p1'], {
      categories,
      papers: [{ paperNumber: 1, categories: ['a', ' A ', 'B', 'C', 'D', 'E'] }],
    })
    expect(paper).toEqual({ id: 'p1', categories: ['A', 'B', 'C', 'D'] })
  })

  it('keeps only the 35 most-used categories', () => {
    const categories = Array.from({ length: 40 }, (_, i) => `Category ${i}`)
    const ids = Array.from({ length: 41 }, (_, i) => `p${i}`)
    const papers = categories.map((category, i) => ({ paperNumber: i + 1, categories: [category] }))
    papers.push({ paperNumber: 41, categories: ['Category 39'] })

    const result = finalizeCategories(ids, { categories, papers })

    expect(new Set(result.flatMap((paper) => paper.categories)).size).toBe(35)
    expect(result[39].categories).toEqual(['Category 39'])
  })

  it('ignores unknown papers and undeclared categories, and keeps every paper', () => {
    expect(
      finalizeCategories(['p1', 'p2'], {
        categories: ['Known'],
        papers: [
          { paperNumber: 1, categories: ['Known', 'Invented'] },
          { paperNumber: 99, categories: ['Known'] },
        ],
      }),
    ).toEqual([
      { id: 'p1', categories: ['Known'] },
      { id: 'p2', categories: [] },
    ])
  })
})

describe('out-of-scope papers', () => {
  it('get only the Outside Research Scope category, even if undeclared or mixed with others', () => {
    expect(
      finalizeCategories(['p1', 'p2', 'p3'], {
        categories: ['Known'],
        papers: [
          { paperNumber: 1, categories: ['Known', 'outside research  scope'] },
          { paperNumber: 2, categories: ['Known'] },
          { paperNumber: 3, categories: [OUTSIDE_RESEARCH_SCOPE] },
        ],
      }),
    ).toEqual([
      { id: 'p1', categories: [OUTSIDE_RESEARCH_SCOPE] },
      { id: 'p2', categories: ['Known'] },
      { id: 'p3', categories: [OUTSIDE_RESEARCH_SCOPE] },
    ])
  })

  it('are removed, and later papers from the same source move up one rank per removal', () => {
    const result = removeOutOfScopePapers([
      item('openalex', 1, ['A']),
      item('openalex', 2, [OUTSIDE_RESEARCH_SCOPE]),
      item('openalex', 3, ['A']),
      item('openalex', 4, [OUTSIDE_RESEARCH_SCOPE]),
      item('openalex', 5, ['B']),
      item('crossref', 1, ['A']),
      item('crossref', 2, ['B']),
    ])
    expect(result.map(({ paper }) => [paper.id, paper.sourceRank])).toEqual([
      ['openalex:1', 1],
      ['openalex:3', 2],
      ['openalex:5', 3],
      ['crossref:1', 1],
      ['crossref:2', 2],
    ])
  })

  it('leaves the list unchanged when every paper is in scope', () => {
    const items = [item('openalex', 1, ['A']), item('crossref', 1, ['B'])]
    expect(removeOutOfScopePapers(items)).toEqual(items)
  })
})
