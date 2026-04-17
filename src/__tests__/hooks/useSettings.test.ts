import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSettings } from '@/hooks/useSettings'

beforeEach(() => {
  localStorage.clear()
})

describe('useSettings', () => {
  it('returns default values when localStorage is empty', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings.nodeDomain).toBe('')
    expect(result.current.settings.displayName).toBe('')
    expect(result.current.settings.ringtone).toBe('ringtone2.mp3')
  })

  it('reads values from localStorage on mount', () => {
    localStorage.setItem('fuse_node_domain', 'pexip.example.com')
    localStorage.setItem('fuse_display_name', 'Josh')

    const { result } = renderHook(() => useSettings())
    expect(result.current.settings.nodeDomain).toBe('pexip.example.com')
    expect(result.current.settings.displayName).toBe('Josh')
  })

  it('saves partial settings and merges with existing', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.saveSettings({ nodeDomain: 'node.example.com' })
    })

    expect(result.current.settings.nodeDomain).toBe('node.example.com')
    expect(localStorage.getItem('fuse_node_domain')).toBe('node.example.com')
    expect(result.current.settings.ringtone).toBe('ringtone2.mp3')
  })

  it('saves multiple settings at once', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.saveSettings({
        audioInput: 'mic-1',
        videoInput: 'cam-1',
      })
    })

    expect(result.current.settings.audioInput).toBe('mic-1')
    expect(result.current.settings.videoInput).toBe('cam-1')
    expect(localStorage.getItem('fuse_audio_input')).toBe('mic-1')
    expect(localStorage.getItem('fuse_video_input')).toBe('cam-1')
  })

  it('dispatches sync event on save', () => {
    const { result } = renderHook(() => useSettings())
    const events: Event[] = []
    window.addEventListener('fuse-settings-changed', (e) => events.push(e))

    act(() => {
      result.current.saveSettings({ displayName: 'Test' })
    })

    expect(events.length).toBe(1)
  })

  it('syncs across instances via custom event', () => {
    const { result: hook1 } = renderHook(() => useSettings())
    const { result: hook2 } = renderHook(() => useSettings())

    act(() => {
      hook1.current.saveSettings({ displayName: 'Updated' })
    })

    expect(hook2.current.settings.displayName).toBe('Updated')
  })
})
