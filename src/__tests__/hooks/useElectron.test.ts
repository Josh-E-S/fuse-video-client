import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useElectron } from '@/hooks/useElectron'

describe('useElectron', () => {
  afterEach(() => {
    delete (window as any).electron
  })

  it('returns isElectron false when no bridge exists', () => {
    const { result } = renderHook(() => useElectron())
    expect(result.current.isElectron).toBe(false)
    expect(result.current.isExpanded).toBe(false)
  })

  it('returns isElectron true when bridge exists', async () => {
    ;(window as any).electron = {
      isElectron: true,
      toggleExpand: vi.fn().mockResolvedValue(true),
      getExpanded: vi.fn().mockResolvedValue(false),
    }

    const { result } = renderHook(() => useElectron())

    await act(async () => {})

    expect(result.current.isElectron).toBe(true)
    expect(result.current.isExpanded).toBe(false)
  })

  it('toggleExpand updates isExpanded', async () => {
    ;(window as any).electron = {
      isElectron: true,
      toggleExpand: vi.fn().mockResolvedValue(true),
      getExpanded: vi.fn().mockResolvedValue(false),
    }

    const { result } = renderHook(() => useElectron())
    await act(async () => {})

    await act(async () => {
      await result.current.toggleExpand()
    })

    expect(result.current.isExpanded).toBe(true)
  })
})
