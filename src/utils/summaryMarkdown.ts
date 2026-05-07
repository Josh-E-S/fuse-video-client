import type { TranscriptEntry } from '@/hooks/useLocalTranscription'

const TOKENS_PER_WORD = 0.75
const MAX_TOKENS = 25_000
const MIN_ENTRIES = 5
const MIN_WORDS = 50

const PROMPT_INSTRUCTIONS = `You are an AI Meeting Assistant. Analyze the raw, un-diarized transcript below and produce a concise, scannable markdown summary.

Transcripts have no speaker labels and may run from short syncs to longer deep dives. Group related topics thematically rather than chronologically. Ignore filler, pleasantries, and abandoned thoughts — focus on decisions and key topics. Don't invent details; if a date, metric, or decision is vague, say it was discussed without resolution.

This is a casual overview, not a perfect record — prioritize signal over completeness.

If the conversation is casual or has no real business substance, output a single 2-3 sentence paragraph summarizing the gist and stop there.

Otherwise, use exactly this structure. Omit any section that has no content.

**Meeting Type:** Sales/Discovery, Technical/Engineering, Internal Sync, Customer Support/Success, or Casual

## Summary
A 2-3 sentence overview of the meeting's purpose and outcome.

## Key Points
- Concise thematic bullet (decision, debate, or problem)
- Concise thematic bullet

Pexip context: this product is video conferencing, so terms like Infinity, Conferencing Node, Management Node, Pexip Connect, VMR, dial string, gateway call, Teams/Zoom interop, SIP/H.323, PIN, alias, and call quality (jitter, packet loss) may appear. Treat these as real meeting terminology, not transcription errors.`

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function timeOf(ts: string): string {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (trimmed.length === 0) return 0
  return trimmed.split(/\s+/).length
}

export function estimateTokens(wordCount: number): number {
  return Math.ceil(wordCount * TOKENS_PER_WORD)
}

export function buildPrompt(entries: TranscriptEntry[]): string {
  const transcript = entries.map((e) => `${timeOf(e.timestamp)} — ${e.text.trim()}`).join('\n')
  // /no_think is a Qwen3 control directive that suppresses the model's
  // chain-of-thought output. We strip <think> blocks defensively too in
  // stripThinkBlocks; this just prevents them from being generated.
  return `/no_think\n\n${PROMPT_INSTRUCTIONS}\n\nTRANSCRIPT:\n${transcript}`
}

export function stripThinkBlocks(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/g, '')
}

export function gateReason(entries: TranscriptEntry[]): string | null {
  if (entries.length === 0) return 'No transcript yet'
  if (entries.length < MIN_ENTRIES) return 'Not enough transcript to summarize yet'

  const words = entries.reduce((acc, e) => acc + countWords(e.text), 0)
  if (words < MIN_WORDS) return 'Not enough transcript to summarize yet'
  if (estimateTokens(words) > MAX_TOKENS) {
    return 'Transcript too long — summary not yet supported for sessions over ~50 min'
  }
  return null
}

interface ComposeArgs {
  summary: string
  transcripts: TranscriptEntry[]
  startedAt: Date
  includeFullTranscript: boolean
}

const HEADER_FMT: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

export function composeSavedMarkdown({
  summary,
  transcripts,
  startedAt,
  includeFullTranscript,
}: ComposeArgs): string {
  const header = `# Meeting Notes — ${startedAt.toLocaleString(undefined, HEADER_FMT)}`
  const body = summary.trim().length > 0 ? summary.trim() : '_No summary captured._'

  if (!includeFullTranscript) {
    return `${header}\n\n${body}\n`
  }

  const transcriptLines = transcripts
    .map((e) => `*${timeOf(e.timestamp)}* — ${e.text.trim()}`)
    .join('\n\n')
  const transcriptSection = transcripts.length > 0 ? transcriptLines : '_No transcript captured._'

  return `${header}\n\n${body}\n\n## Full Transcript\n\n${transcriptSection}\n`
}

export function defaultSummaryFilename(startedAt: Date): string {
  const y = startedAt.getFullYear()
  const m = pad(startedAt.getMonth() + 1)
  const d = pad(startedAt.getDate())
  const hh = pad(startedAt.getHours())
  const mm = pad(startedAt.getMinutes())
  return `summary-${y}-${m}-${d}-${hh}${mm}.md`
}
