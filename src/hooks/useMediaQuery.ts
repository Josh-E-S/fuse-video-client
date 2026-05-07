// SSR-safe matchMedia wrapper. Always initializes to `false` and syncs to the
// real value inside the effect — initializing from `window.matchMedia` at
// render time would trigger hydration mismatches under Next's App Router
// (server has no window, client does), which the audit batch in 3664b3e
// already had to clean up across other hooks.

import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    // Bridge: read the real client-side match once after hydration. Cannot be
    // derived (window doesn't exist on the server) — this is the SSR fix.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatches(media.matches)

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}
