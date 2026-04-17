import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

let listeners: Array<(e: MediaQueryListEvent) => void> = []
let currentMatches = false

beforeEach(() => {
  listeners = []
  currentMatches = false

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: currentMatches,
      media: query,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners.push(cb)
      },
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners = listeners.filter((l) => l !== cb)
      },
    })),
  })
})

describe('useMediaQuery', () => {
  it('returns initial match state', () => {
    currentMatches = true
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))
    expect(result.current).toBe(true)
  })

  it('returns false when query does not match', () => {
    currentMatches = false
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))
    expect(result.current).toBe(false)
  })

  it('updates when media query changes', () => {
    currentMatches = false
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))
    expect(result.current).toBe(false)

    act(() => {
      for (const cb of listeners) {
        cb({ matches: true } as MediaQueryListEvent)
      }
    })

    expect(result.current).toBe(true)
  })

  it('cleans up listener on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'))
    expect(listeners.length).toBe(1)

    unmount()
    expect(listeners.length).toBe(0)
  })
})
