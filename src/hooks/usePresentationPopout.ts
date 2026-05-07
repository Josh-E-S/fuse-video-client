'use client'

// Pops the incoming presentation stream into a separate browser window so the
// content can stay visible while the user works in another app. The popup
// route lives at /presentation-popout (src/app/presentation-popout/page.tsx)
// and reads the stream off `window.opener.__presentationStream`.
//
// Why the global stash: a MediaStream cannot be cloned through postMessage or
// passed via a URL param. Sharing the live track requires the popup to grab
// the same object reference from its opener, so we expose it on the opener's
// window object and clean up when the popup closes.
//
// Why the 500ms poll: window.open() popups don't dispatch a reliable cross-
// window close event back to the opener (no equivalent of Document PiP's
// pagehide), so we poll `popup.closed` to keep our local state in sync.

import { useEffect, useRef, useState, useCallback } from 'react'
import { log } from '@/utils/logger'

interface UsePresentationPopoutOptions {
  presentationStream: MediaStream | null
}

export function usePresentationPopout({ presentationStream }: UsePresentationPopoutOptions) {
  const popoutWindowRef = useRef<Window | null>(null)
  const [presentationPopped, setPresentationPopped] = useState(false)

  const openPresentationPopout = useCallback(() => {
    if (popoutWindowRef.current && !popoutWindowRef.current.closed) {
      popoutWindowRef.current.focus()
      return
    }
    const win = window as Window & { __presentationStream?: MediaStream }
    win.__presentationStream = presentationStream ?? undefined
    const popup = window.open('/presentation-popout', 'presentation', 'popup')
    if (popup) {
      popoutWindowRef.current = popup
      setPresentationPopped(true)
      const check = setInterval(() => {
        if (popup.closed) {
          clearInterval(check)
          popoutWindowRef.current = null
          setPresentationPopped(false)
          delete win.__presentationStream
        }
      }, 500)
    } else {
      delete win.__presentationStream
      log.ui.warn('Presentation popout blocked: browser popup blocker prevented opening the window')
    }
  }, [presentationStream])

  const closePresentationPopout = useCallback(() => {
    if (popoutWindowRef.current && !popoutWindowRef.current.closed) {
      popoutWindowRef.current.close()
    }
    popoutWindowRef.current = null
    setPresentationPopped(false)
    const win = window as Window & { __presentationStream?: MediaStream }
    delete win.__presentationStream
  }, [])

  useEffect(() => {
    const win = window as Window & { __presentationStream?: MediaStream }
    if (presentationPopped && presentationStream) {
      win.__presentationStream = presentationStream
    }
    if (!presentationStream && presentationPopped) {
      // Bridge: when the source stream disappears (presenter stopped), close
      // the popup window — that's a real DOM side effect, not derivable.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      closePresentationPopout()
    }
  }, [presentationStream, presentationPopped, closePresentationPopout])

  return {
    presentationPopped,
    openPresentationPopout,
    closePresentationPopout,
  }
}
