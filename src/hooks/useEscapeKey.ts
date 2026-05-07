// Document-level Escape handler. Listens on `document` (not the modal root)
// so it fires before focus is trapped — early in a modal's mount sequence
// the focusable region may not exist yet and a scoped listener would miss
// the keypress. The `enabled` flag lets nested overlays opt out so an inner
// popover can close itself without also dismissing the outer modal.

import { useEffect } from 'react'

export function useEscapeKey(onEscape: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onEscape()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onEscape, enabled])
}
