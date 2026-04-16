import { describe, it, expect, vi, beforeEach } from 'vitest'
import { acquireUserMedia } from '@/utils/media'

// jsdom doesn't provide navigator.mediaDevices, so we polyfill it for tests
beforeEach(() => {
  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      writable: true,
      configurable: true,
    })
  }
  vi.restoreAllMocks()
})

describe('acquireUserMedia', () => {
  it('returns undefined when getUserMedia is not available', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('not available'))

    const stream = await acquireUserMedia({})
    expect(stream).toBeUndefined()
  })

  it('falls back to audio-only when video fails', async () => {
    const mockStream = { id: 'audio-only' } as unknown as MediaStream
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new Error('video denied'))
      .mockResolvedValueOnce(mockStream)

    navigator.mediaDevices.getUserMedia = getUserMedia

    const stream = await acquireUserMedia({})
    expect(stream).toBe(mockStream)
    expect(getUserMedia).toHaveBeenCalledTimes(2)
    expect(getUserMedia.mock.calls[1][0]).toEqual({ audio: true, video: false })
  })

  it('passes device constraints when provided', async () => {
    const mockStream = { id: 'full' } as unknown as MediaStream
    const getUserMedia = vi.fn().mockResolvedValue(mockStream)
    navigator.mediaDevices.getUserMedia = getUserMedia

    await acquireUserMedia({ audioInput: 'mic-123', videoInput: 'cam-456' })

    expect(getUserMedia.mock.calls[0][0]).toEqual({
      audio: { deviceId: { ideal: 'mic-123' } },
      video: { deviceId: { ideal: 'cam-456' } },
    })
  })
})
