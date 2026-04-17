import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useQuickJoin } from '@/hooks/useQuickJoin'

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      nodeDomain: '',
      displayName: '',
      ringtone: '',
      audioInput: '',
      audioOutput: '',
      videoInput: '',
      otjClientId: '',
      otjClientSecret: '',
      pexipCustomerId: '',
      googleDomain: '',
    },
    saveSettings: vi.fn(),
  }),
}))

beforeEach(() => {
  localStorage.clear()
})

describe('useQuickJoin', () => {
  it('returns all 4 providers', () => {
    const { result } = renderHook(() => useQuickJoin())
    expect(result.current.providers).toHaveLength(4)
    expect(result.current.providers.map((p) => p.id)).toEqual([
      'google-meet',
      'microsoft-teams',
      'zoom',
      'pexip',
    ])
  })

  it('google-meet and teams are disabled without config', () => {
    const { result } = renderHook(() => useQuickJoin())
    const google = result.current.providers.find((p) => p.id === 'google-meet')
    const teams = result.current.providers.find((p) => p.id === 'microsoft-teams')

    expect(google?.configReady).toBe(false)
    expect(teams?.configReady).toBe(false)
    expect(google?.enabled).toBe(false)
    expect(teams?.enabled).toBe(false)
  })

  it('zoom and pexip are always config-ready', () => {
    const { result } = renderHook(() => useQuickJoin())
    const zoom = result.current.providers.find((p) => p.id === 'zoom')
    const pexip = result.current.providers.find((p) => p.id === 'pexip')

    expect(zoom?.configReady).toBe(true)
    expect(pexip?.configReady).toBe(true)
  })

  it('setEnabled toggles a provider off', () => {
    const { result } = renderHook(() => useQuickJoin())

    act(() => {
      result.current.setEnabled('zoom', false)
    })

    expect(result.current.isToggled('zoom')).toBe(false)
    expect(localStorage.getItem('fuse_quickjoin_zoom')).toBe('0')
  })

  it('setEnabled toggles a provider back on', () => {
    localStorage.setItem('fuse_quickjoin_pexip', '0')
    const { result } = renderHook(() => useQuickJoin())

    act(() => {
      result.current.setEnabled('pexip', true)
    })

    expect(result.current.isToggled('pexip')).toBe(true)
    expect(localStorage.getItem('fuse_quickjoin_pexip')).toBe('1')
  })

  it('visibleProviders only includes enabled providers', () => {
    const { result } = renderHook(() => useQuickJoin())

    act(() => {
      result.current.setEnabled('zoom', false)
    })

    const visible = result.current.visibleProviders
    expect(visible.find((p) => p.id === 'zoom')).toBeUndefined()
    expect(visible.find((p) => p.id === 'pexip')).toBeDefined()
  })
})
