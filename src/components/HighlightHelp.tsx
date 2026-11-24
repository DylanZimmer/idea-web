import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui'

export const HIGHLIGHT_HELP_TEXT =
  'You can highlight text inside the reader and search for related papers from the highlighted passage'

interface HighlightHelpProps {
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  className?: string
}

/**
 * A small "?" button explaining highlight-to-search. The note opens on hover
 * or focus, and a click or tap toggles it, since touch screens cannot hover.
 */
export function HighlightHelp({ side = 'top', align = 'end', className }: HighlightHelpProps) {
  const [open, setOpen] = useState(false)

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        render={
          <button
            type="button"
            data-testid="highlight-help"
            aria-label="How to search from the reader"
            onClick={() => setOpen((value) => !value)}
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              className,
            )}
          >
            ?
          </button>
        }
      />
      <TooltipContent side={side} align={align} className="max-w-64 text-left">
        {HIGHLIGHT_HELP_TEXT}
      </TooltipContent>
    </Tooltip>
  )
}
