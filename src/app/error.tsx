'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('[Fuse] Unhandled error:', error)
  }, [error])

  return (
    <div className="min-h-screen w-full flex items-center justify-center font-sans antialiased"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, #0d1f3c 0%, #060d1a 50%, #030810 100%)' }}
    >
      <div className="flex flex-col items-center gap-6 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <AlertTriangle size={28} className="text-rose-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white/90 mb-2">Something went wrong</h1>
          <p className="text-sm text-white/40 max-w-sm">
            {error.message || 'An unexpected error occurred.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white/80 text-sm font-medium hover:bg-white/15 transition-colors"
          >
            <RotateCcw size={14} />
            Try Again
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white/50 text-sm font-medium hover:bg-white/10 hover:text-white/70 transition-colors"
          >
            <Home size={14} />
            Home
          </button>
        </div>
      </div>
    </div>
  )
}
