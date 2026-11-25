import type { CollectionSchema } from 'deepspace/schema'
import type { Paper, PaperSource } from '../type-defs'

const PAPER_SOURCES: PaperSource[] = ['openalex', 'crossref', 'semantic-scholar']

/**
 * A row of `saved-papers`: the `Paper` type-def plus the signed-in user who
 * saved it. `Paper.id` is stored as `paperId`, because every record already
 * has its own `recordId`.
 */
export type SavedPaper = Omit<Paper, 'id'> & {
  paperId: string
  userId: string
  /** The paper's research categories from the search it was saved from, in order. */
  category1?: string | null
  category2?: string | null
  category3?: string | null
  category4?: string | null
  /** The user's own notes; blank until they write some. */
  notes?: string
}

/** One column per category: a paper gets at most 4 (MAX_CATEGORIES_PER_PAPER). */
export const CATEGORY_FIELDS = ['category1', 'category2', 'category3', 'category4'] as const

/** The saved paper's categories, skipping empty columns. */
export function savedCategories(paper: SavedPaper): string[] {
  return CATEGORY_FIELDS.map((field) => paper[field]?.trim()).filter((value): value is string => Boolean(value))
}

/** The four category columns for a paper's category list. */
export function categoryColumns(categories: string[]): Pick<SavedPaper, (typeof CATEGORY_FIELDS)[number]> {
  return {
    category1: categories[0] ?? null,
    category2: categories[1] ?? null,
    category3: categories[2] ?? null,
    category4: categories[3] ?? null,
  }
}

/** Papers each signed-in user has saved. Every user sees only their own. */
export const savedPapersSchema: CollectionSchema = {
  name: 'saved-papers',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'paperId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'source', storage: 'text', interpretation: { kind: 'select', options: PAPER_SOURCES }, required: true },
    { name: 'sourceId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'doi', storage: 'text', interpretation: 'plain' },
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'abstract', storage: 'text', interpretation: 'plain' },
    { name: 'authors', storage: 'text', interpretation: { kind: 'json' }, default: [] },
    { name: 'year', storage: 'number', interpretation: 'plain' },
    { name: 'publicationType', storage: 'text', interpretation: 'plain' },
    { name: 'journal', storage: 'text', interpretation: 'plain' },
    { name: 'url', storage: 'text', interpretation: { kind: 'url' } },
    { name: 'citationCount', storage: 'number', interpretation: 'plain' },
    { name: 'sourceRank', storage: 'number', interpretation: 'plain' },
    { name: 'category1', storage: 'text', interpretation: 'plain' },
    { name: 'category2', storage: 'text', interpretation: 'plain' },
    { name: 'category3', storage: 'text', interpretation: 'plain' },
    { name: 'category4', storage: 'text', interpretation: 'plain' },
    { name: 'notes', storage: 'text', interpretation: 'plain', default: '' },
  ],
  // One save per paper per user, enforced by the server.
  uniqueOn: ['userId', 'paperId'],
  ownerField: 'userId',
  permissions: {
    viewer: { read: 'own', create: true, update: 'own', delete: 'own' },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    admin: { read: 'own', create: true, update: 'own', delete: 'own' },
  },
}
