import { describe, it, expect } from 'vitest'
import { formatScribeMarkdown, defaultScribeFilename } from '@/utils/scribeMarkdown'
import type { TranscriptEntry } from '@/hooks/useLocalTranscription'

const startedAt = new Date('2026-04-28T14:32:00')

describe('formatScribeMarkdown', () => {
  it('renders empty body when no transcripts', () => {
    const md = formatScribeMarkdown([], startedAt)
    expect(md).toContain('# Scribe — ')
    expect(md).toContain('_No transcript captured._')
  })

  it('renders timestamps and text for each entry', () => {
    const entries: TranscriptEntry[] = [
      { id: 'a', text: 'Hello world.', timestamp: '2026-04-28T14:32:08' },
      { id: 'b', text: 'Second line.', timestamp: '2026-04-28T14:33:01' },
    ]
    const md = formatScribeMarkdown(entries, startedAt)
    expect(md).toContain('*14:32:08* — Hello world.')
    expect(md).toContain('*14:33:01* — Second line.')
  })

  it('trims whitespace inside transcript text', () => {
    const entries: TranscriptEntry[] = [
      { id: 'a', text: '   spaced out  ', timestamp: '2026-04-28T14:32:08' },
    ]
    const md = formatScribeMarkdown(entries, startedAt)
    expect(md).toContain('*14:32:08* — spaced out')
    expect(md).not.toContain('   spaced')
  })

  it('separates entries with a blank line for markdown rendering', () => {
    const entries: TranscriptEntry[] = [
      { id: 'a', text: 'one', timestamp: '2026-04-28T14:32:00' },
      { id: 'b', text: 'two', timestamp: '2026-04-28T14:32:30' },
    ]
    const md = formatScribeMarkdown(entries, startedAt)
    expect(md).toContain('*14:32:00* — one\n\n*14:32:30* — two')
  })
})

describe('defaultScribeFilename', () => {
  it('formats filename as scribe-YYYY-MM-DD-HHmm.md', () => {
    const name = defaultScribeFilename(new Date('2026-04-28T14:32:00'))
    expect(name).toBe('scribe-2026-04-28-1432.md')
  })

  it('zero-pads single-digit components', () => {
    const name = defaultScribeFilename(new Date('2026-01-05T09:07:00'))
    expect(name).toBe('scribe-2026-01-05-0907.md')
  })
})
