import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useVideoRefs } from '@/hooks/useVideoRefs'

function createMockStream(): MediaStream {
  return { id: 'mock-stream' } as unknown as MediaStream
}

describe('useVideoRefs', () => {
  it('returns ref setters and refs', () => {
    const { result } = renderHook(() =>
      useVideoRefs({
        remoteStream: null,
        localStream: null,
        presentationStream: null,
        isVideoMuted: false,
      }),
    )

    expect(result.current.setRemoteVideoRef).toBeTypeOf('function')
    expect(result.current.setLocalVideoRef).toBeTypeOf('function')
    expect(result.current.setPresentationVideoRef).toBeTypeOf('function')
  })

  it('attaches srcObject when ref callback is called with stream', () => {
    const stream = createMockStream()
    const { result } = renderHook(() =>
      useVideoRefs({
        remoteStream: stream,
        localStream: null,
        presentationStream: null,
        isVideoMuted: false,
      }),
    )

    const el = document.createElement('video')
    result.current.setRemoteVideoRef(el)
    expect(el.srcObject).toBe(stream)
  })

  it('does not attach when element is null', () => {
    const stream = createMockStream()
    const { result } = renderHook(() =>
      useVideoRefs({
        remoteStream: stream,
        localStream: null,
        presentationStream: null,
        isVideoMuted: false,
      }),
    )

    expect(() => result.current.setRemoteVideoRef(null)).not.toThrow()
  })

  it('re-attaches when stream changes on mounted element', () => {
    const stream1 = createMockStream()
    const stream2 = { id: 'stream-2' } as unknown as MediaStream

    const { result, rerender } = renderHook(
      ({ stream }) =>
        useVideoRefs({
          remoteStream: stream,
          localStream: null,
          presentationStream: null,
          isVideoMuted: false,
        }),
      { initialProps: { stream: stream1 } },
    )

    const el = document.createElement('video')
    result.current.setRemoteVideoRef(el)
    expect(el.srcObject).toBe(stream1)

    rerender({ stream: stream2 })
    expect(el.srcObject).toBe(stream2)
  })
})
