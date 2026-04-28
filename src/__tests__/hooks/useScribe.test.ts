import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useScribe } from '@/hooks/useScribe'

class FakeAudioWorkletNode {
  port = { onmessage: null as ((e: MessageEvent) => void) | null }
  disconnect = vi.fn()
}

class FakeMediaStreamSource {
  connect = vi.fn()
  disconnect = vi.fn()
}

class FakeAudioContext {
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) }
  close = vi.fn().mockResolvedValue(undefined)
  createMediaStreamSource = vi.fn(() => new FakeMediaStreamSource())
}

function fakeMediaStream() {
  const tracks = [{ stop: vi.fn() }]
  return { getTracks: () => tracks } as unknown as MediaStream
}

let resultCallback: ((text: string, speaker?: string) => void) | null = null
const transcriptionStart = vi.fn().mockResolvedValue(true)
const transcriptionStop = vi.fn().mockResolvedValue([])
const transcriptionSendAudio = vi.fn()

beforeEach(() => {
  resultCallback = null
  transcriptionStart.mockClear().mockResolvedValue(true)
  transcriptionStop.mockClear().mockResolvedValue([])
  transcriptionSendAudio.mockClear()

  ;(window as unknown as { electron: unknown }).electron = {
    isElectron: true,
    transcriptionStart,
    transcriptionStop,
    transcriptionSendAudio,
    onTranscriptionResult: (cb: (text: string, speaker?: string) => void) => {
      resultCallback = cb
      return () => {
        resultCallback = null
      }
    },
  }

  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      writable: true,
      configurable: true,
    })
  }
  navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(fakeMediaStream())

  ;(globalThis as unknown as { AudioContext: typeof FakeAudioContext }).AudioContext =
    FakeAudioContext
  ;(globalThis as unknown as { AudioWorkletNode: typeof FakeAudioWorkletNode }).AudioWorkletNode =
    FakeAudioWorkletNode
})

afterEach(() => {
  delete (window as unknown as { electron?: unknown }).electron
  vi.restoreAllMocks()
})

describe('useScribe', () => {
  it('starts in idle status', () => {
    const { result } = renderHook(() => useScribe())
    expect(result.current.status).toBe('idle')
    expect(result.current.transcripts).toEqual([])
  })

  it('moves to recording on start and idle on stop', async () => {
    const { result } = renderHook(() => useScribe())

    await act(async () => {
      await result.current.start()
    })
    expect(result.current.status).toBe('recording')
    expect(transcriptionStart).toHaveBeenCalled()
    expect(result.current.startedAt).not.toBeNull()

    await act(async () => {
      await result.current.stop()
    })
    expect(result.current.status).toBe('idle')
    expect(transcriptionStop).toHaveBeenCalled()
  })

  it('appends transcript entries when the engine emits results', async () => {
    const { result } = renderHook(() => useScribe())
    await act(async () => {
      await result.current.start()
    })

    expect(resultCallback).not.toBeNull()
    act(() => {
      resultCallback?.('First line', 'local')
      resultCallback?.('Second line', 'local')
    })

    await waitFor(() => expect(result.current.transcripts).toHaveLength(2))
    expect(result.current.transcripts[0].text).toBe('First line')
    expect(result.current.transcripts[1].text).toBe('Second line')
  })

  it('flushes drained results from stop() into transcripts', async () => {
    transcriptionStop.mockResolvedValueOnce([{ text: 'tail end', speaker: 'local' }])
    const { result } = renderHook(() => useScribe())

    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      await result.current.stop()
    })

    expect(result.current.transcripts.some((e) => e.text === 'tail end')).toBe(true)
  })

  it('sets error status when getUserMedia fails', async () => {
    navigator.mediaDevices.getUserMedia = vi
      .fn()
      .mockRejectedValue(new Error('Permission denied'))

    const { result } = renderHook(() => useScribe())
    await act(async () => {
      await result.current.start()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toContain('Permission denied')
    expect(transcriptionStart).not.toHaveBeenCalled()
  })

  it('does not start when no electron bridge is available', async () => {
    delete (window as unknown as { electron?: unknown }).electron

    const { result } = renderHook(() => useScribe())
    await act(async () => {
      await result.current.start()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toContain('desktop app')
  })

  it('clear() empties transcripts', async () => {
    const { result } = renderHook(() => useScribe())
    await act(async () => {
      await result.current.start()
    })
    act(() => resultCallback?.('something', 'local'))
    await waitFor(() => expect(result.current.transcripts).toHaveLength(1))

    await act(async () => {
      await result.current.stop()
    })
    act(() => result.current.clear())
    expect(result.current.transcripts).toEqual([])
  })
})
