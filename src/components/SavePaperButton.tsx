import { useAuthUser, useMutations, useQuery } from 'deepspace'
import type { SavedPaper } from '../schemas/saved-papers-schema'
import type { Paper } from '../type-defs'

/** Saves the paper to the signed-in user's list, or removes it if already saved. */
export function SavePaperButton({ paper }: { paper: Paper }) {
  const { isSignedIn } = useAuthUser()
  const { records } = useQuery<SavedPaper>('saved-papers', { where: { paperId: paper.id } })
  const { ready, create, remove } = useMutations<Omit<SavedPaper, 'userId'>>('saved-papers')

  if (!isSignedIn) return null
  const saved = records[0]

  const toggle = () => {
    if (saved) {
      void remove(saved.recordId)
      return
    }
    const { id, ...rest } = paper
    void create({ ...rest, paperId: id })
  }

  return (
    <button
      type="button"
      data-testid="save-paper-button"
      disabled={!ready}
      aria-pressed={Boolean(saved)}
      onClick={toggle}
      className="text-xs font-medium text-primary underline disabled:opacity-50"
    >
      {saved ? 'Saved — remove' : 'Save paper'}
    </button>
  )
}
