/** /user_home: the signed-in user's saved papers, each opening in the reader. */

import { useQuery } from 'deepspace'
import { paperUrl } from '@/paper-graph'
import { readerPath } from '@/reader-link'
import type { SavedPaper } from '@/schemas/saved-papers-schema'

export default function UserHome() {
  const { records, status } = useQuery<SavedPaper>('saved-papers', {
    orderBy: 'createdAt',
    orderDir: 'desc',
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
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
            return (
              <li key={record.recordId} className="py-3">
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
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
