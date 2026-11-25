/**
 * /user_home: the signed-in user's saved papers. Each paper shows its
 * categories above the title, opens in the reader, has a remove button to the
 * left of its title and notes directly to the right of it.
 */

import { useEffect, useRef, useState } from 'react'
import { useMutations, useQuery } from 'deepspace'
import { Trash2 } from 'lucide-react'
import { paperUrl } from '@/paper-graph'
import { readerPath } from '@/reader-link'
import { savedCategories, type SavedPaper } from '@/schemas/saved-papers-schema'

const MAX_NOTES_CHARS = 5_000

/**
 * Notes save when the box loses focus. While it has focus, the user's draft
 * wins; otherwise it follows the stored value, so an edit in another tab shows up.
 */
function NotesField({ recordId, title, notes }: { recordId: string; title: string; notes: string }) {
  const { ready, put } = useMutations<SavedPaper>('saved-papers')
  const [draft, setDraft] = useState(notes)
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setDraft(notes)
  }, [notes])

  const save = () => {
    focused.current = false
    if (draft !== notes) void put(recordId, { notes: draft })
  }

  return (
    <textarea
      data-testid="saved-paper-notes"
      aria-label={`Notes for ${title}`}
      placeholder="Add notes…"
      rows={2}
      maxLength={MAX_NOTES_CHARS}
      disabled={!ready}
      value={draft}
      onFocus={() => {
        focused.current = true
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      className="block w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm leading-5 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    />
  )
}

export default function UserHome() {
  const { records, status } = useQuery<SavedPaper>('saved-papers', {
    orderBy: 'createdAt',
    orderDir: 'desc',
  })
  const { ready, remove } = useMutations<SavedPaper>('saved-papers')

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <title>Saved papers</title>
      {status === 'loading' ? (
        <p role="status" className="text-sm text-muted-foreground">Loading saved papers…</p>
      ) : status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">Your saved papers could not be loaded.</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven't saved any papers yet.</p>
      ) : (
        <ul data-testid="saved-papers-list" className="divide-y divide-border">
          {records.map((record) => {
            const url = paperUrl({ ...record.data, id: record.data.paperId })
            const categories = savedCategories(record.data)
            return (
              <li key={record.recordId} className="flex flex-wrap items-end gap-x-4 gap-y-2 py-4">
                <div className="min-w-0 max-w-full sm:max-w-[55%]">
                  {categories.length > 0 && (
                    <p data-testid="saved-paper-categories" className="mb-1 pl-8 text-xs text-muted-foreground">
                      {categories.join(' · ')}
                    </p>
                  )}
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      data-testid="remove-saved-paper"
                      aria-label={`Remove ${record.data.title} from saved papers`}
                      title="Remove from saved papers"
                      disabled={!ready}
                      onClick={() => void remove(record.recordId)}
                      className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                    {url ? (
                      <a
                        href={readerPath(url)}
                        target="_blank"
                        rel="noopener"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {record.data.title}
                      </a>
                    ) : (
                      <span className="font-medium">{record.data.title}</span>
                    )}
                  </div>
                </div>
                <div className="min-w-48 flex-1">
                  <NotesField
                    recordId={record.recordId}
                    title={record.data.title}
                    notes={record.data.notes ?? ''}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
