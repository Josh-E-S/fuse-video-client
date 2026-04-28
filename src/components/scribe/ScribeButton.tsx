'use client'

import { NotebookPen, ArrowRight } from 'lucide-react'
import { useElectron } from '@/hooks/useElectron'
import { useModelStatus } from '@/hooks/useModelStatus'

interface ScribeButtonProps {
  onClick: () => void
}

export function ScribeButton({ onClick }: ScribeButtonProps) {
  const { isElectron } = useElectron()
  const { downloaded, checked } = useModelStatus()

  if (!isElectron || !checked) return null

  const enabled = downloaded

  return (
    <button
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      title={enabled ? 'Open scribe mode' : 'Download the transcription model in Settings'}
      aria-label="Local scribe mode"
      className={`group inline-flex items-center gap-2 py-1 transition-colors ${
        enabled
          ? 'text-white/45 hover:text-white/85 cursor-pointer'
          : 'text-white/20 cursor-not-allowed'
      }`}
    >
      <NotebookPen size={12} strokeWidth={1.75} />
      <span className="text-[10px] font-semibold tracking-[0.12em] uppercase">
        Local Scribe Mode
      </span>
      <ArrowRight
        size={11}
        strokeWidth={1.75}
        className="transition-transform group-hover:translate-x-0.5"
      />
    </button>
  )
}
