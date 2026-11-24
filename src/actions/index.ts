import type { ActionHandler } from 'deepspace/worker'
import { z } from 'zod/v4'
import { categorizePapers, removeOutOfScopePapers } from '../ai/paper-analysis'
import { fetchResearchPapers } from '../server/research-sources'
import { addFigures, MAX_FIGURES } from '../paper-figures'
import { normalizeReaderUrl } from '../reader-link'
import { releaseRead, releaseSearch, reserveRead, reserveSearch } from '../server/search-limit'
import type { PaperToGraph } from '../type-defs'
import type { Env } from '../../worker'

export type SearchPapersData =
  | { status: 'ready'; papers: PaperToGraph[] }
  | { status: 'limited'; retryAt: number }

export type ReadPaperData =
  | { status: 'ready'; markdown: string }
  | { status: 'limited'; retryAt: number }

interface ExaContents {
  results?: { text?: string; extras?: { imageLinks?: unknown } }[]
}

const searchPapersParams = z.object({
  query: z.string().trim().min(1).max(500),
})

const readPaperParams = z.object({
  url: z.string().max(2_000),
})

export const actions: Record<string, ActionHandler<Env>> = {
  /** Signed-in callers only, 3 per 2 hours; the LLM call is billed to the app owner. */
  searchPapers: async ({ userId, params, env }) => {
    const parsed = searchPapersParams.safeParse(params)
    if (!parsed.success) return { success: false, error: 'Invalid search' }
    const { query } = parsed.data

    let reservedAt: number | null = null
    try {
      const reservation = await reserveSearch(env, userId)
      if (!reservation.allowed) {
        const data: SearchPapersData = { status: 'limited', retryAt: reservation.retryAt }
        return { success: true, data }
      }
      reservedAt = reservation.reservedAt

      const papers = await fetchResearchPapers(env, query)
      if (papers.length === 0) {
        await releaseSearch(env, userId, reservedAt)
        const data: SearchPapersData = { status: 'ready', papers: [] }
        return { success: true, data }
      }

      const assignments = await categorizePapers(env, query, papers)
      const categoriesById = new Map(assignments.map((item) => [item.id, item.categories]))
      const data: SearchPapersData = {
        status: 'ready',
        papers: removeOutOfScopePapers(
          papers.map((paper) => ({ paper, categories: categoriesById.get(paper.id) ?? [] })),
        ),
      }
      return { success: true, data }
    } catch (error) {
      console.error('[searchPapers] failed', error instanceof Error ? error.message : error)
      if (reservedAt !== null) {
        await releaseSearch(env, userId, reservedAt).catch((releaseError: unknown) => {
          console.error('[searchPapers] could not release search', releaseError)
        })
      }
      return { success: false, error: 'The search could not be completed' }
    }
  },

  /** Signed-in callers only, rate-limited; the Exa text extraction is billed to the app owner. */
  readPaper: async ({ userId, params, tools, env }) => {
    const parsed = readPaperParams.safeParse(params)
    const url = parsed.success ? normalizeReaderUrl(parsed.data.url) : null
    if (!url) return { success: false, error: 'Enter a valid public web address' }

    let reservedAt: number | null = null
    const failed = async () => {
      if (reservedAt !== null) {
        await releaseRead(env, userId, reservedAt).catch((releaseError: unknown) => {
          console.error('[readPaper] could not release read', releaseError)
        })
      }
      return { success: false as const, error: 'This paper could not be loaded' }
    }

    try {
      const reservation = await reserveRead(env, userId)
      if (!reservation.allowed) {
        const data: ReadPaperData = { status: 'limited', retryAt: reservation.retryAt }
        return { success: true, data }
      }
      reservedAt = reservation.reservedAt

      const result = await tools.integration<ExaContents>('exa/contents', {
        urls: [url],
        text: true,
        // The text has no images, only figure captions; this returns the
        // figures' addresses so the reader can show them.
        extras: { imageLinks: MAX_FIGURES },
      })
      if (!result.success) {
        console.error('[readPaper] text extraction failed', result.error)
        return failed()
      }

      const page = result.data.results?.[0]
      const text = page?.text?.trim()
      if (!text) {
        console.error('[readPaper] no text returned')
        return failed()
      }
      const data: ReadPaperData = { status: 'ready', markdown: addFigures(text, page?.extras?.imageLinks) }
      return { success: true, data }
    } catch (error) {
      console.error('[readPaper] failed', error instanceof Error ? error.message : error)
      return failed()
    }
  },
}
