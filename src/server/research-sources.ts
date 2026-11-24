import {
  normalizeCrossref,
  normalizeOpenAlex,
  normalizeSemanticScholar,
} from '../paper-normalizers'
import type { Paper } from '../type-defs'
import type { Env } from '../../worker.js'

const numReturnResults = '15'

interface OpenAlexResponse {
  results?: unknown[]
}

interface CrossrefResponse {
  message?: {
    items?: unknown[]
  }
}

interface SemanticScholarResponse {
  data?: unknown[]
}

async function fetchJson<T>(url: string, source: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${source} request failed (${response.status})`)
  return response.json() as Promise<T>
}

async function fetchOpenAlex(env: Env, query: string): Promise<Paper[]> {
  if (!env.OPENALEX_API_KEY) throw new Error('OpenAlex API key is not configured')

  const params = new URLSearchParams({
    search: query,
    per_page: numReturnResults,
    api_key: env.OPENALEX_API_KEY,
  })
  const body = await fetchJson<OpenAlexResponse>(
    `https://api.openalex.org/works?${params}`,
    'OpenAlex',
  )
  return (body.results ?? []).map((paper, index) => normalizeOpenAlex(paper, index + 1))
}

async function fetchCrossref(query: string): Promise<Paper[]> {
  const params = new URLSearchParams({
    'query.bibliographic': query,
    rows: numReturnResults,
    select: [
      'DOI',
      'title',
      'author',
      'abstract',
      'published',
      'container-title',
      'type',
      'is-referenced-by-count',
    ].join(','),
  })
  const body = await fetchJson<CrossrefResponse>(
    `https://api.crossref.org/works?${params}`,
    'Crossref',
  )
  return (body.message?.items ?? []).map((paper, index) => normalizeCrossref(paper, index + 1))
}

async function fetchSemanticScholar(query: string): Promise<Paper[]> {
  const params = new URLSearchParams({
    query,
    limit: numReturnResults,
    fields: [
      'title',
      'abstract',
      'authors',
      'year',
      'citationCount',
      'referenceCount',
      'fieldsOfStudy',
      'externalIds',
      'url',
      'openAccessPdf',
    ].join(','),
  })
  const body = await fetchJson<SemanticScholarResponse>(
    `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
    'Semantic Scholar',
  )
  return (body.data ?? []).map((paper, index) => normalizeSemanticScholar(paper, index + 1))
}

/** One provider being down or rate-limited should not fail the whole search. */
export async function fetchResearchPapers(env: Env, query: string): Promise<Paper[]> {
  const results = await Promise.allSettled([
    fetchOpenAlex(env, query),
    fetchCrossref(query),
    fetchSemanticScholar(query),
  ])

  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn('[research]', result.reason instanceof Error ? result.reason.message : result.reason)
    }
  }
  if (results.every((result) => result.status === 'rejected')) {
    throw new Error('All research sources failed')
  }
  return results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
}
