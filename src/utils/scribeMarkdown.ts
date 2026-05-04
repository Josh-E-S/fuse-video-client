import type { TranscriptEntry } from '@/hooks/useLocalTranscription'

const DATE_FMT: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

export function formatScribeMarkdown(transcripts: TranscriptEntry[], startedAt: Date): string {
  const header = `# Scribe — ${startedAt.toLocaleString(undefined, DATE_FMT)}`
  if (transcripts.length === 0) return `${header}\n\n_No transcript captured._\n`

  const body = transcripts
    .map((entry) => {
      const t = new Date(entry.timestamp)
      const time = `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`
      return `*${time}* — ${entry.text.trim()}`
    })
    .join('\n\n')

  return `${header}\n\n${body}\n`
}

export function defaultScribeFilename(startedAt: Date): string {
  const y = startedAt.getFullYear()
  const m = pad(startedAt.getMonth() + 1)
  const d = pad(startedAt.getDate())
  const hh = pad(startedAt.getHours())
  const mm = pad(startedAt.getMinutes())
  return `scribe-${y}-${m}-${d}-${hh}${mm}.md`
}
