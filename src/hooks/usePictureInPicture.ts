'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { log } from '@/utils/logger'

interface PipState {
  isSupported: boolean
  isActive: boolean
  pipWindow: Window | null
  openPip: () => Promise<void>
  closePip: () => void
}

const PIP_WIDTH = 430
const PIP_HEIGHT = 900

function copyStyles(source: Document, target: Document) {
  // Copy all <link rel="stylesheet"> and <style> elements
  source.head.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    target.head.appendChild(node.cloneNode(true))
  })
}

export function usePictureInPicture(): PipState {
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const pipRef = useRef<Window | null>(null)

  useEffect(() => {
    setIsSupported('documentPictureInPicture' in window)
  }, [])

  // Keep ref in sync for cleanup
  useEffect(() => {
    pipRef.current = pipWindow
  }, [pipWindow])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pipRef.current) {
        pipRef.current.close()
      }
    }
  }, [])

  const openPip = useCallback(async () => {
    if (!('documentPictureInPicture' in window)) return

    // Close existing PiP if open
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

      // Copy all styles so Tailwind classes work in the PiP window
      copyStyles(document, pip.document)

      // Match theme background on the PiP document body
      pip.document.body.style.margin = '0'
      pip.document.body.style.padding = '0'
      pip.document.body.style.overflow = 'hidden'

      // Listen for the PiP window closing
      pip.addEventListener('pagehide', () => {
        setPipWindow(null)
      })

      setPipWindow(pip)
    } catch (err) {
      log.pip.warn('PiP request failed: user cancelled or API not available')
    }
  }, [])

  const closePip = useCallback(() => {
    if (pipRef.current) {
      pipRef.current.close()
      setPipWindow(null)
    }
  }, [])

  return {
    isSupported,
    isActive: !!pipWindow,
    pipWindow,
    openPip,
    closePip,
  }
}
