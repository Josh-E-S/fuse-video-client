'use client'

import { useEffect, useRef, useState } from 'react'

export default function PresentationPopout() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasStream, setHasStream] = useState(false)

  useEffect(() => {
    function tryAttach() {
      const opener = window.opener as Window & { __presentationStream?: MediaStream } | null
      if (!opener) return false
      const stream = opener.__presentationStream
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
        setHasStream(true)
        return true
      }
      return false
    }

    if (tryAttach()) return

    const interval = setInterval(() => {
      if (tryAttach()) clearInterval(interval)
    }, 200)

    const handleEnded = () => {
      setHasStream(false)
    }
    window.addEventListener('beforeunload', handleEnded)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleEnded)
    }
  }, [])

  useEffect(() => {
    const opener = window.opener as Window & { __presentationStream?: MediaStream } | null
    if (!opener) return

    const check = setInterval(() => {
      const stream = opener.__presentationStream
      if (!stream || !stream.active) {
        setHasStream(false)
        window.close()
      }
    }, 1000)

    return () => clearInterval(check)
  }, [hasStream])

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <div
        className="h-10 absolute top-0 left-0 right-0 z-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      {!hasStream && (
        <span className="text-white/30 text-sm">Waiting for presentation...</span>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-contain ${hasStream ? '' : 'hidden'}`}
      />
    </div>
  )
}
