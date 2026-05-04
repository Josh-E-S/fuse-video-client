import { describe, it, expect } from 'vitest'
import {
  buildPrompt,
  stripThinkBlocks,
  estimateTokens,
  countWords,
  composeSavedMarkdown,
  defaultSummaryFilename,
  gateReason,
} from '@/utils/summaryMarkdown'
import type { TranscriptEntry } from '@/hooks/useLocalTranscription'

const entry = (text: string, ts = '2026-04-28T12:00:00.000Z'): TranscriptEntry => ({
  id: Math.random().toString(36).slice(2),
  text,
  timestamp: ts,
})

describe('buildPrompt', () => {
  it('starts with /no_think', () => {
    const p = buildPrompt([entry('hello world')])
    expect(p.startsWith('/no_think')).toBe(true)
  })

  it('joins entries with HH:MM:SS prefix', () => {
    const ts1 = new Date(2026, 3, 28, 12, 0, 0).toISOString()
    const ts2 = new Date(2026, 3, 28, 12, 0, 5).toISOString()
    const p = buildPrompt([entry('first', ts1), entry('second', ts2)])
    expect(p).toMatch(/12:00:00 — first/)
    expect(p).toMatch(/12:00:05 — second/)
  })

  it('asks for the documented section structure', () => {
    const p = buildPrompt([entry('x')])
    expect(p).toMatch(/## Summary/)
    expect(p).toMatch(/## Key Points/)
  })
})

describe('stripThinkBlocks', () => {
  it('removes a single block', () => {
    expect(stripThinkBlocks('a<think>hidden</think>b')).toBe('ab')
  })

  it('removes multi-line blocks', () => {
    const raw = 'before<think>line one\nline two</think>after'
    expect(stripThinkBlocks(raw)).toBe('beforeafter')
  })

  it('removes multiple blocks', () => {
    expect(stripThinkBlocks('a<think>x</think>b<think>y</think>c')).toBe('abc')
  })

  it('leaves unclosed blocks alone', () => {
    expect(stripThinkBlocks('a<think>oops')).toBe('a<think>oops')
  })

  it('returns input unchanged when no blocks present', () => {
    expect(stripThinkBlocks('plain text')).toBe('plain text')
  })
})

describe('countWords', () => {
  it('counts whitespace-separated tokens', () => {
    expect(countWords('one two three')).toBe(3)
  })

  it('handles empty/whitespace strings', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
  })
})

describe('estimateTokens', () => {
  it('returns ceil(words * 0.75)', () => {
    expect(estimateTokens(0)).toBe(0)
    expect(estimateTokens(4)).toBe(3)
    expect(estimateTokens(5)).toBe(4)
  })
})

describe('gateReason', () => {
  const okEntries = Array.from({ length: 6 }, () => entry(`word `.repeat(20).trim()))

  it('returns null when all gates pass', () => {
    expect(gateReason(okEntries)).toBeNull()
  })

  it('flags empty', () => {
    expect(gateReason([])).toBe('No transcript yet')
  })

  it('flags too few entries', () => {
    expect(gateReason([entry('one'), entry('two')])).toBe('Not enough transcript to summarize yet')
  })

  it('flags too few words', () => {
    const shortEntries = Array.from({ length: 6 }, () => entry('hi'))
    expect(gateReason(shortEntries)).toBe('Not enough transcript to summarize yet')
  })

  it('flags too many tokens', () => {
    const huge = Array.from({ length: 200 }, () => entry('word '.repeat(200).trim()))
    expect(gateReason(huge)).toBe(
      'Transcript too long — summary not yet supported for sessions over ~50 min',
    )
  })
})

describe('composeSavedMarkdown', () => {
  const transcripts = [entry('hello', '2026-04-28T12:00:00.000Z')]
  const startedAt = new Date('2026-04-28T12:00:00.000Z')
  const summary = '## Summary\nA concise overview.'

  it('returns summary-only markdown when toggle off', () => {
    const md = composeSavedMarkdown({
      summary,
      transcripts,
      startedAt,
      includeFullTranscript: false,
    })
    expect(md).toContain('## Summary')
    expect(md).not.toContain('## Full Transcript')
    expect(md).not.toContain('hello')
  })

  it('appends transcript section when toggle on', () => {
    const md = composeSavedMarkdown({
      summary,
      transcripts,
      startedAt,
      includeFullTranscript: true,
    })
    expect(md.indexOf('## Summary')).toBeLessThan(md.indexOf('## Full Transcript'))
    expect(md).toContain('hello')
  })

  it('handles empty summary string by emitting an empty-summary placeholder', () => {
    const md = composeSavedMarkdown({
      summary: '',
      transcripts,
      startedAt,
      includeFullTranscript: false,
    })
    expect(md).toContain('_No summary captured._')
  })
})

describe('defaultSummaryFilename', () => {
  it('produces a timestamped filename in local time', () => {
    const d = new Date(2026, 3, 28, 15, 4, 0)
    expect(defaultSummaryFilename(d)).toBe('summary-2026-04-28-1504.md')
  })
})
