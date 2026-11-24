import { useState } from 'react'
import { AuthOverlay, signOut, useAuthUser } from 'deepspace'
import { Link } from 'react-router-dom'
import { Bookmark, ChevronDown, LogOut } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui'

/** Sign in, or the account menu. Needs only DeepSpaceAuthProvider above it. */
export function AccountControl() {
  const { isLoaded, isSignedIn, user } = useAuthUser()
  const [showSignIn, setShowSignIn] = useState(false)

  if (!isLoaded) {
    return <div className="h-8 w-20 animate-pulse rounded-md bg-muted" aria-hidden />
  }

  if (!isSignedIn || !user) {
    return (
      <>
        <button
          type="button"
          data-testid="nav-sign-in-button"
          onClick={() => setShowSignIn(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Sign in
        </button>
        {showSignIn && <AuthOverlay onClose={() => setShowSignIn(false)} />}
      </>
    )
  }

  const email = user.primaryEmailAddress?.emailAddress ?? ''
  const name = user.fullName || email

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/user_home"
        data-testid="nav-user-home-button"
        aria-label="Saved papers"
        title="Saved papers"
        className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 text-sm text-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bookmark className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Saved</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Account menu"
              className="group flex items-center gap-2 rounded-full border border-border bg-card/60 py-1 pl-1 pr-2.5 text-sm transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="h-6 w-6 ring-1 ring-inset ring-border">
                <AvatarImage src={user.imageUrl ?? undefined} referrerPolicy="no-referrer" />
                <AvatarFallback className="text-[11px]">
                  {(name[0] ?? '?').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span data-testid="nav-user-name" className="hidden max-w-[140px] truncate text-foreground sm:inline">
                {name}
              </span>
              <ChevronDown
                className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 group-data-[popup-open]:rotate-180"
                aria-hidden
              />
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="truncate font-medium text-foreground">{user.fullName || 'Signed in'}</div>
            <div data-testid="nav-user-email" className="truncate text-xs font-normal text-muted-foreground">
              {email}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
