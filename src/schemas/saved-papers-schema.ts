import type { CollectionSchema } from 'deepspace/schema'
import type { Paper, PaperSource } from '../type-defs'

const PAPER_SOURCES: PaperSource[] = ['openalex', 'crossref', 'semantic-scholar']

/**
 * A row of `saved-papers`: the `Paper` type-def plus the signed-in user who
 * saved it. `Paper.id` is stored as `paperId`, because every record already
 * has its own `recordId`.
 */
export type SavedPaper = Omit<Paper, 'id'> & { paperId: string; userId: string }

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
