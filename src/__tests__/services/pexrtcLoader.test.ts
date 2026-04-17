import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let loader: typeof import('@/services/pexrtcLoader').pexRTCLoader

beforeEach(async () => {
  vi.resetModules()
  delete (window as any).PexRTC
  const mod = await import('@/services/pexrtcLoader')
  loader = mod.pexRTCLoader
  loader.reset()
})

afterEach(() => {
  document.head.querySelectorAll('script[src*="pexrtc"]').forEach((s) => s.remove())
})

describe('PexRTCLoader', () => {
  it('isLibraryLoaded returns false initially', () => {
    expect(loader.isLibraryLoaded()).toBe(false)
  })

  it('createInstance throws when library is not loaded', () => {
    expect(() => loader.createInstance()).toThrow('PexRTC library not loaded')
  })

  it('createInstance returns instance when PexRTC is available', () => {
    const mockInstance = { makeCall: vi.fn() }
    ;(window as any).PexRTC = class { makeCall = mockInstance.makeCall }

    const script = document.createElement('script')
    script.src = 'https://node.example.com/static/webrtc/js/pexrtc.js'
    document.head.appendChild(script)

    loader.loadPexRTC('node.example.com').catch(() => {})
    script.onload?.(new Event('load'))

    expect(loader.createInstance()).toBeDefined()
  })

  it('loadPexRTC appends a script tag with correct src', () => {
    loader.loadPexRTC('pexip.example.com', { timeout: 500 }).catch(() => {})

    const scripts = document.head.querySelectorAll('script')
    const pexScript = Array.from(scripts).find((s) =>
      s.src.includes('pexip.example.com/static/webrtc/js/pexrtc.js'),
    )
    expect(pexScript).toBeDefined()
  })

  it('loadPexRTC rejects on script error', async () => {
    const promise = loader.loadPexRTC('bad.example.com', { timeout: 500, retries: 0 })

    const scripts = document.head.querySelectorAll('script')
    const pexScript = Array.from(scripts).find((s) => s.src.includes('bad.example.com'))
    pexScript?.onerror?.(new Event('error'))

    await expect(promise).rejects.toThrow('Failed to load PexRTC')
  })

  it('reset clears loaded state', async () => {
    ;(window as any).PexRTC = vi.fn()

    const promise = loader.loadPexRTC('node.example.com', { timeout: 500 })
    const scripts = document.head.querySelectorAll('script')
    const pexScript = Array.from(scripts).find((s) => s.src.includes('node.example.com'))
    pexScript?.onload?.(new Event('load'))

    await promise
    expect(loader.isLibraryLoaded()).toBe(true)

    loader.reset()
    expect(loader.isLibraryLoaded()).toBe(false)
  })
})
