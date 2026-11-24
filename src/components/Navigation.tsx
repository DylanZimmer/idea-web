/**
 * Header for the results and reader pages: the site icon, which returns to the
 * search page, and the account control. Keep the data-testid hooks in this
 * header and AccountControl; the shipped tests rely on them.
 */

import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { AccountControl } from './AccountControl'

interface NavigationProps {
  /** The reader passes the paper's own page, shown as an "Original Source" link. */
  sourceUrl?: string | null
}

export default function Navigation({ sourceUrl }: NavigationProps = {}) {
  return (
    <nav data-testid="app-navigation" className="shrink-0 border-b border-border bg-background">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-4 px-4">
        <Link
          to="/"
          aria-label="Back to search"
          title="Back to search"
          className="rounded-md transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img src="/icon.png" alt="" width={32} height={32} className="block size-8 rounded-md" />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="nav-original-source"
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 text-sm text-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Original Source
            </a>
          )}
          <AccountControl />
        </div>
      </div>
    </nav>
  )
}
