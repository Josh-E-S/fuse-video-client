import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { RegistrationProvider, useRegistration } from '@/contexts/RegistrationContext'

// Minimal EventSource fake. Tests reach into `latestES` to trigger error/close.
class FakeEventSource {
  url: string
  readyState = 1 // OPEN
  onerror: (() => void) | null = null
  listeners = new Map<string, ((e: MessageEvent) => void)[]>()
  closed = false

  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2

  constructor(url: string) {
    this.url = url
    latestES = this
  }

  addEventListener(type: string, cb: (e: MessageEvent) => void) {
    const arr = this.listeners.get(type) ?? []
    arr.push(cb)
    this.listeners.set(type, arr)
  }

  close() {
    this.closed = true
    this.readyState = FakeEventSource.CLOSED
  }
}

let latestES: FakeEventSource | null = null

const tokenResponse = (token = 'tok-1') => ({
  ok: true,
  status: 200,
  json: async () => ({ result: { token } }),
})

function wrapper({ children }: { children: React.ReactNode }) {
  return <RegistrationProvider>{children}</RegistrationProvider>
}

describe('RegistrationContext recovery', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('fuse_node_domain', 'pex.example.com')
    localStorage.setItem('fuse_reg_alias', 'alice')
    localStorage.setItem('fuse_reg_username', 'alice')
    localStorage.setItem('fuse_reg_password', 'pw')

    latestES = null
    ;(globalThis as unknown as { EventSource: typeof FakeEventSource }).EventSource =
      FakeEventSource
    globalThis.fetch = vi.fn().mockResolvedValue(tokenResponse('tok-1')) as unknown as typeof fetch
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as unknown as { electron?: unknown }).electron
  })

  function countRequestTokenCalls() {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    return fetchMock.mock.calls.filter((args) =>
      String(args[0]).includes('/request_token'),
    ).length
  }

  it('marks status as error when SSE socket closes (e.g. after sleep)', async () => {
    const { result } = renderHook(() => useRegistration(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('registered'))
    expect(latestES).not.toBeNull()

    act(() => {
      latestES!.readyState = FakeEventSource.CLOSED
      latestES!.onerror?.()
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('re-registers when the browser fires "online" after a connection drop', async () => {
    const { result } = renderHook(() => useRegistration(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('registered'))
    expect(countRequestTokenCalls()).toBe(1)

    act(() => {
      latestES!.readyState = FakeEventSource.CLOSED
      latestES!.onerror?.()
    })
    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    await waitFor(() => expect(countRequestTokenCalls()).toBe(2))
    await waitFor(() => expect(result.current.status).toBe('registered'))
  })

  it('re-registers when the document becomes visible after being hidden', async () => {
    const { result } = renderHook(() => useRegistration(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('registered'))

    act(() => {
      latestES!.readyState = FakeEventSource.CLOSED
      latestES!.onerror?.()
    })
    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => expect(countRequestTokenCalls()).toBe(2))
  })

  it('re-registers when the Electron bridge fires power:resume', async () => {
    let resumeCallback: (() => void) | null = null
    ;(window as unknown as { electron: unknown }).electron = {
      isElectron: true,
      onPowerResume: (cb: () => void) => {
        resumeCallback = cb
        return () => {
          resumeCallback = null
        }
      },
    }

    const { result } = renderHook(() => useRegistration(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('registered'))

    act(() => {
      latestES!.readyState = FakeEventSource.CLOSED
      latestES!.onerror?.()
    })
    await waitFor(() => expect(result.current.status).toBe('error'))

    expect(resumeCallback).not.toBeNull()
    act(() => {
      resumeCallback!()
    })

    await waitFor(() => expect(countRequestTokenCalls()).toBe(2))
  })

  it('does not re-register if status is still registered', async () => {
    const { result } = renderHook(() => useRegistration(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('registered'))
    expect(countRequestTokenCalls()).toBe(1)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    // Give any (incorrect) async re-register a chance to start.
    await new Promise((r) => setTimeout(r, 10))
    expect(countRequestTokenCalls()).toBe(1)
  })

  it('does not re-register after unregister clears credentials', async () => {
    const { result } = renderHook(() => useRegistration(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('registered'))

    await act(async () => {
      await result.current.unregister()
    })
    expect(result.current.status).toBe('unregistered')
    const callsBefore = countRequestTokenCalls()

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    await new Promise((r) => setTimeout(r, 10))
    expect(countRequestTokenCalls()).toBe(callsBefore)
  })
})
