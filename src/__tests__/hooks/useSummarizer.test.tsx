import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSummarizer } from '@/hooks/useSummarizer'
import type { TranscriptEntry } from '@/hooks/useTranscription'

type ProgressPayload = { tokenCount: number; elapsedMs: number }

interface MockBridge {
  isElectron: boolean
  summarizeRun: ReturnType<typeof vi.fn>
  summarizeModelStatus: ReturnType<typeof vi.fn>
  onSummarizeProgress: (cb: (p: ProgressPayload) => void) => () => void
}

let progressCb: ((p: ProgressPayload) => void) | null = null

function installBridge(overrides: Partial<MockBridge> = {}) {
  const bridge: MockBridge = {
    isElectron: true,
    summarizeRun: vi.fn(),
    summarizeModelStatus: vi.fn().mockResolvedValue({ downloaded: true }),
    onSummarizeProgress: (cb) => {
      progressCb = cb
      return () => {
        progressCb = null
      }
    },
    ...overrides,
  }
  ;(window as unknown as { electron: MockBridge }).electron = bridge
  return bridge
}

const longEntries: TranscriptEntry[] = Array.from({ length: 6 }, (_, i) => ({
  id: `e-${i}`,
  text: 'This is a sentence with several words to clear the gate threshold.',
  timestamp: new Date(Date.UTC(2026, 3, 28, 12, 0, i)).toISOString(),
}))

describe('useSummarizer', () => {
  beforeEach(() => {
    progressCb = null
    vi.useFakeTimers()
  })

  afterEach(() => {
    delete (window as unknown as { electron?: MockBridge }).electron
    vi.useRealTimers()
  })

  it('starts idle', () => {
    installBridge()
    const { result } = renderHook(() => useSummarizer())
    expect(result.current.status).toBe('idle')
    expect(result.current.summary).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('transitions idle → preparing → running → done on success', async () => {
    let resolveRun: (v: { ok: true; markdown: string; tokenCount: number; elapsedMs: number }) => void = () => {}
    const runPromise = new Promise<{ ok: true; markdown: string; tokenCount: number; elapsedMs: number }>(
      (resolve) => {
        resolveRun = resolve
      },
    )
    installBridge({ summarizeRun: vi.fn().mockReturnValue(runPromise) })

    const { result } = renderHook(() => useSummarizer())
    let runP: Promise<void>
    await act(async () => {
      runP = result.current.run(longEntries)
    })

    expect(result.current.status).toBe('running')

    await act(async () => {
      resolveRun({ ok: true, markdown: '## Summary\nText', tokenCount: 42, elapsedMs: 1234 })
      await runP!
    })

    expect(result.current.status).toBe('done')
    expect(result.current.summary).toBe('## Summary\nText')
    expect(result.current.tokenCount).toBeGreaterThanOrEqual(0)
  })

  it('transitions to error on { ok: false } result', async () => {
    installBridge({
      summarizeRun: vi.fn().mockResolvedValue({ ok: false, error: 'boom' }),
    })

    const { result } = renderHook(() => useSummarizer())
    await act(async () => {
      await result.current.run(longEntries)
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('boom')
    expect(result.current.summary).toBeNull()
  })

  it('clear() resets state to idle', async () => {
    installBridge({
      summarizeRun: vi.fn().mockResolvedValue({ ok: true, markdown: 'x', tokenCount: 1, elapsedMs: 1 }),
    })

    const { result } = renderHook(() => useSummarizer())
    await act(async () => {
      await result.current.run(longEntries)
    })
    expect(result.current.status).toBe('done')

    act(() => {
      result.current.clear()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.summary).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('ignores re-entry while running', async () => {
    const runFn = vi.fn().mockImplementation(() => new Promise(() => {}))
    installBridge({ summarizeRun: runFn })

    const { result } = renderHook(() => useSummarizer())
    await act(async () => {
      result.current.run(longEntries)
    })
    expect(result.current.status).toBe('running')

    await act(async () => {
      result.current.run(longEntries)
    })
    expect(runFn).toHaveBeenCalledTimes(1)
  })

  it('updates tokenCount from progress events', async () => {
    let resolveRun: (v: { ok: true; markdown: string; tokenCount: number; elapsedMs: number }) => void = () => {}
    installBridge({
      summarizeRun: vi
        .fn()
        .mockReturnValue(
          new Promise((resolve) => {
            resolveRun = resolve as typeof resolveRun
          }),
        ),
    })

    const { result } = renderHook(() => useSummarizer())
    await act(async () => {
      result.current.run(longEntries)
    })

    await act(async () => {
      progressCb?.({ tokenCount: 17, elapsedMs: 500 })
    })
    expect(result.current.tokenCount).toBe(17)

    await act(async () => {
      resolveRun({ ok: true, markdown: 'x', tokenCount: 17, elapsedMs: 500 })
    })
  })

  it('clear() during a running summary cancels its result', async () => {
    let resolveRun: (v: { ok: true; markdown: string; tokenCount: number; elapsedMs: number }) => void = () => {}
    installBridge({
      summarizeRun: vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveRun = resolve as typeof resolveRun
        }),
      ),
    })

    const { result } = renderHook(() => useSummarizer())
    let runP: Promise<void>
    await act(async () => {
      runP = result.current.run(longEntries)
    })
    expect(result.current.status).toBe('running')

    // User clicks Clear mid-run.
    act(() => {
      result.current.clear()
    })
    expect(result.current.status).toBe('idle')

    // Late-arriving result should NOT flip back to 'done' or set summary.
    await act(async () => {
      resolveRun({ ok: true, markdown: 'cancelled', tokenCount: 99, elapsedMs: 999 })
      await runP!
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.summary).toBeNull()
  })

  it('run is referentially stable across renders', async () => {
    installBridge({
      summarizeRun: vi.fn().mockResolvedValue({ ok: true, markdown: 'x', tokenCount: 1, elapsedMs: 1 }),
    })
    const { result, rerender } = renderHook(() => useSummarizer())
    const firstRun = result.current.run

    // Trigger re-renders by running through a complete lifecycle.
    await act(async () => {
      await result.current.run(longEntries)
    })
    rerender()

    // run identity must not change just because status changed.
    expect(result.current.run).toBe(firstRun)
  })

  it('sets error when no Electron bridge is present', async () => {
    delete (window as unknown as { electron?: unknown }).electron
    const { result } = renderHook(() => useSummarizer())
    await act(async () => {
      await result.current.run(longEntries)
    })
    expect(result.current.status).toBe('error')
    expect(result.current.error).toMatch(/desktop app/i)
  })
})
