import { DeepSpaceAuthProvider } from 'deepspace'
import { AccountControl } from './AccountControl'

/** Loaded after the static page appears, so the search page still paints first. */
export default function HomeAccount() {
  return (
    <DeepSpaceAuthProvider>
      <AccountControl />
    </DeepSpaceAuthProvider>
  )
}
