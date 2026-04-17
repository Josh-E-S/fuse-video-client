import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePresentationPopout } from '@/hooks/usePresentationPopout'

let mockPopup: { closed: boolean; focus: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }

beforeEach(() => {
  mockPopup = { closed: false, focus: vi.fn(), close: vi.fn() }
  vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window)
})

describe('usePresentationPopout', () => {
  it('starts with presentationPopped false', () => {
    const { result } = renderHook(() =>
      usePresentationPopout({ presentationStream: null }),
    )
    expect(result.current.presentationPopped).toBe(false)
  })

  it('opens a popup window and sets presentationPopped', () => {
    const stream = { id: 'pres' } as unknown as MediaStream
    const { result } = renderHook(() =>
      usePresentationPopout({ presentationStream: stream }),
    )

    act(() => {
      result.current.openPresentationPopout()
    })

    expect(window.open).toHaveBeenCalledWith('/presentation-popout', 'presentation', 'popup')
    expect(result.current.presentationPopped).toBe(true)
  })

  it('focuses existing popup instead of opening new one', () => {
    const stream = { id: 'pres' } as unknown as MediaStream
    const { result } = renderHook(() =>
      usePresentationPopout({ presentationStream: stream }),
    )

    act(() => {
      result.current.openPresentationPopout()
    })

    const openCountAfterFirst = vi.mocked(window.open).mock.calls.length

    act(() => {
      result.current.openPresentationPopout()
    })

    expect(vi.mocked(window.open).mock.calls.length).toBe(openCountAfterFirst)
    expect(mockPopup.focus).toHaveBeenCalled()
  })

  it('closes the popup', () => {
    const stream = { id: 'pres' } as unknown as MediaStream
    const { result } = renderHook(() =>
      usePresentationPopout({ presentationStream: stream }),
    )

    act(() => {
      result.current.openPresentationPopout()
    })
    act(() => {
      result.current.closePresentationPopout()
    })

    expect(mockPopup.close).toHaveBeenCalled()
    expect(result.current.presentationPopped).toBe(false)
  })

  it('auto-closes when presentation stream becomes null', () => {
    const stream = { id: 'pres' } as unknown as MediaStream
    const { result, rerender } = renderHook(
      ({ stream }) => usePresentationPopout({ presentationStream: stream }),
      { initialProps: { stream: stream as MediaStream | null } },
    )

    act(() => {
      result.current.openPresentationPopout()
    })
    expect(result.current.presentationPopped).toBe(true)

    rerender({ stream: null })
    expect(result.current.presentationPopped).toBe(false)
  })
})
