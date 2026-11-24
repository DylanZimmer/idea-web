import type { Paper } from './type-defs'

function reconstructAbstract(index: Record<string, number[]> | null): string | null {
  if (!index) return null

  const words: { word: string; position: number }[] = []

  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) {
      words.push({ word, position })
    }
  }

  words.sort((a, b) => a.position - b.position)

  return words.map(item => item.word).join(' ')
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
}

/**
 * Providers send some text still HTML-encoded ("Theory &amp; Practice") and
 * Crossref wraps parts of it in markup (<i>, <sub>, <jats:p>). Strip the tags
 * first, then decode, so a decoded "<" is never mistaken for a tag.
 */
export function cleanText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/<\/?(i|b|em|strong|sub|sup|scp|span|u|mml:[a-z]+)(\s[^>]*)?>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code[0] === '#') {
        const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
        return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity
      }
      return NAMED_ENTITIES[code.toLowerCase()] ?? entity
    })
    .replace(/\s+/g, ' ')
    .trim()
}

const cleanOptional = (text: string | null | undefined): string | null => cleanText(text) || null

const cleanAuthors = (names: unknown[]): string[] =>
  names.map((name) => cleanText(typeof name === 'string' ? name : null)).filter(Boolean)

export function normalizeOpenAlex(record: any,rank: number): Paper {
  return {
    id: `openalex:${record.id}`,
    source: 'openalex',
    sourceId: record.id,

    doi: record.doi?.replace(/^https:\/\/doi\.org\//i, '') ?? null,
    title: cleanText(record.title),
    abstract: cleanOptional(reconstructAbstract(record.abstract_inverted_index)),
    authors: cleanAuthors((record.authorships ?? []).map((a: any) => a.author?.display_name)),

    year: record.publication_year ?? null,
    publicationType: record.type ?? null,
    journal: cleanOptional(record.primary_location?.source?.display_name),
    // Prefer the open-access PDF so the reader can show the full paper.
    url:
      record.best_oa_location?.pdf_url ||
      record.primary_location?.landing_page_url ||
      record.doi ||
      null,

    citationCount: record.cited_by_count ?? null,
    sourceRank: rank
  }
}

export function normalizeCrossref(record: any,rank: number): Paper {
  const dateParts = record.published?.['date-parts']?.[0]

  return {
    id: `crossref:${record.DOI}`,
    source: 'crossref',
    sourceId: record.DOI,

    doi: record.DOI ?? null,
    title: cleanText(record.title?.[0]),
    abstract: cleanOptional(record.abstract),
    authors: cleanAuthors(
      (record.author ?? []).map((a: any) => [a.given, a.family].filter(Boolean).join(' ')),
    ),

    year: dateParts?.[0] ?? null,
    publicationType: record.type ?? null,
    journal: cleanOptional(record['container-title']?.[0]),
    url: record.URL ?? null,

    citationCount: record['is-referenced-by-count'] ?? null,
    sourceRank: rank
  }
}

export function normalizeSemanticScholar(
  record: any,
  rank: number
): Paper {
  const doi = record.externalIds?.DOI ?? null

  return {
    id: `semantic-scholar:${record.paperId}`,
    source: 'semantic-scholar',
    sourceId: record.paperId,

    doi,
    title: cleanText(record.title),
    abstract: cleanOptional(record.abstract),
    authors: cleanAuthors((record.authors ?? []).map((a: any) => a.name)),

    year: record.year ?? null,
    publicationType: null,
    journal: cleanOptional(record.journal?.name),
    // Prefer the open-access PDF so the reader can show the full paper.
    url: record.openAccessPdf?.url || record.url || null,

    citationCount: record.citationCount ?? null,
    sourceRank: rank
  }
}