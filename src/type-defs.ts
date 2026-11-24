export type PaperSource =
  | 'openalex'
  | 'crossref'
  | 'semantic-scholar'

export interface Paper {
  id: string
  source: PaperSource
  sourceId: string

  doi: string | null
  title: string
  abstract: string | null
  authors: string[]

  year: number | null
  publicationType: string | null
  journal: string | null
  url: string | null

  citationCount: number | null

  // Position in the provider's search results
  sourceRank: number
}

export interface PaperToGraph {
  paper: Paper
  categories: string[]
}