'use client'

// Manages the Chromium Document Picture-in-Picture popup window. Provides
// open/close + state, and copies the parent document's stylesheets into the
// popup so the rendered React tree looks the same in both windows.
//
// Document PiP is Chromium-only (and not available in some Electron versions),
// so isSupported gates the UI. The popup is owned by the OS — closing it from
// the user side fires pagehide; we listen so our isActive flag stays in sync.

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { log } from '@/utils/logger'

const PIP_WIDTH = 430
const PIP_HEIGHT = 900

// Without this, the popup document has no CSS — Tailwind classes don't apply,
// the React tree renders unstyled. Cloning stylesheet nodes (rather than
// linking) keeps everything self-contained inside the popup.
function copyStyles(source: Document, target: Document) {
  source.head.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    target.head.appendChild(node.cloneNode(true))
  })
}

export interface PipContextValue {
  isSupported: boolean
  isActive: boolean
  pipWindow: Window | null
  openPip: () => Promise<void>
  closePip: () => void
}

const PipContext = createContext<PipContextValue | null>(null)

export function PipProvider({ children }: { children: React.ReactNode }) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const [isSupported] = useState(() =>
    typeof window !== 'undefined' && 'documentPictureInPicture' in window,
  )
  const pipRef = useRef<Window | null>(null)

  useEffect(() => {
    pipRef.current = pipWindow
  }, [pipWindow])

  useEffect(() => {
    return () => {
      if (pipRef.current) {
        pipRef.current.close()
      }
    }
  }, [])

  const openPip = useCallback(async () => {
    if (!('documentPictureInPicture' in window)) return

    if (pipRef.current) {
      pipRef.current.close()
      setPipWindow(null)
    }

    try {
      const pip = await window.documentPictureInPicture!.requestWindow({
        width: PIP_WIDTH,
        height: PIP_HEIGHT,
        preferInitialWindowPlacement: true,
      })

      copyStyles(document, pip.document)

      pip.document.body.style.margin = '0'
      pip.document.body.style.padding = '0'
      pip.document.body.style.overflow = 'hidden'

      pip.addEventListener('pagehide', () => {
        setPipWindow(null)
      })

      setPipWindow(pip)
    } catch {
      log.pip.warn('PiP request failed: user cancelled or API not available')
    }
  }, [])

  const closePip = useCallback(() => {
    if (pipRef.current) {
      pipRef.current.close()
      setPipWindow(null)
    }
  }, [])

  return (
    <PipContext.Provider
      value={{
        isSupported,
        isActive: !!pipWindow,
        pipWindow,
        openPip,
        closePip,
      }}
    >
      {children}
    </PipContext.Provider>
  )
}

export function usePip() {
  const ctx = useContext(PipContext)
  if (!ctx) throw new Error('usePip must be used inside PipProvider')
  return ctx
}
