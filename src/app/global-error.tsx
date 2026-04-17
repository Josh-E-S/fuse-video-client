'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])
  return (
    <html lang="en">
      <body className="min-h-screen bg-black flex items-center justify-center font-sans antialiased">
        <div className="flex flex-col items-center gap-6 text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <span className="text-2xl">⚠</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white/90 mb-2">Something went wrong</h1>
            <p className="text-sm text-white/40 max-w-sm">
              An unexpected error occurred. Please restart the application.
            </p>
          </div>
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white/80 text-sm font-medium hover:bg-white/15 transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
