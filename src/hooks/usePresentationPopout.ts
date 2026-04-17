'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

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
      closePresentationPopout()
    }
  }, [presentationStream, presentationPopped, closePresentationPopout])

  return {
    presentationPopped,
    openPresentationPopout,
    closePresentationPopout,
  }
}
