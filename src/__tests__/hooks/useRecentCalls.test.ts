import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRecentCalls } from '@/hooks/useRecentCalls'

beforeEach(() => {
  localStorage.clear()
})

describe('useRecentCalls', () => {
  it('starts with empty list', () => {
    const { result } = renderHook(() => useRecentCalls())
    expect(result.current.recentCalls).toEqual([])
  })

  it('adds a call to the list', () => {
    const { result } = renderHook(() => useRecentCalls())

    act(() => {
      result.current.addRecentCall('meet@example.com')
    })

    expect(result.current.recentCalls).toHaveLength(1)
    expect(result.current.recentCalls[0].alias).toBe('meet@example.com')
  })

  it('deduplicates by alias (case-insensitive) and bumps to top', () => {
    const { result } = renderHook(() => useRecentCalls())

    act(() => {
      result.current.addRecentCall('room-a')
      result.current.addRecentCall('room-b')
      result.current.addRecentCall('Room-A')
    })

    expect(result.current.recentCalls).toHaveLength(2)
    expect(result.current.recentCalls[0].alias).toBe('Room-A')
    expect(result.current.recentCalls[1].alias).toBe('room-b')
  })

  it('limits to 10 entries', () => {
    const { result } = renderHook(() => useRecentCalls())

    act(() => {
      for (let i = 0; i < 15; i++) {
        result.current.addRecentCall(`room-${i}`)
      }
    })

    expect(result.current.recentCalls).toHaveLength(10)
    expect(result.current.recentCalls[0].alias).toBe('room-14')
  })

  it('ignores empty/whitespace aliases', () => {
    const { result } = renderHook(() => useRecentCalls())

    act(() => {
      result.current.addRecentCall('')
      result.current.addRecentCall('   ')
    })

    expect(result.current.recentCalls).toHaveLength(0)
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useRecentCalls())

    act(() => {
      result.current.addRecentCall('persisted-room')
    })

    const stored = JSON.parse(localStorage.getItem('fuse_recent_calls')!)
    expect(stored).toHaveLength(1)
    expect(stored[0].alias).toBe('persisted-room')
  })

  it('loads from localStorage on mount', () => {
    localStorage.setItem(
      'fuse_recent_calls',
      JSON.stringify([{ alias: 'saved-room', timestamp: 1000 }]),
    )

    const { result } = renderHook(() => useRecentCalls())
    expect(result.current.recentCalls).toHaveLength(1)
    expect(result.current.recentCalls[0].alias).toBe('saved-room')
  })

  it('clears all calls', () => {
    const { result } = renderHook(() => useRecentCalls())

    act(() => {
      result.current.addRecentCall('room-1')
      result.current.addRecentCall('room-2')
    })

    act(() => {
      result.current.clearRecentCalls()
    })

    expect(result.current.recentCalls).toEqual([])
    expect(localStorage.getItem('fuse_recent_calls')).toBeNull()
  })

  it('stores providerId when given', () => {
    const { result } = renderHook(() => useRecentCalls())

    act(() => {
      result.current.addRecentCall('teams-room', 'microsoft-teams')
    })

    expect(result.current.recentCalls[0].providerId).toBe('microsoft-teams')
  })
})
