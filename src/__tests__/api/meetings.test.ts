import { describe, it, expect, vi, beforeEach } from 'vitest'

const { GET } = await import('@/app/api/meetings/route')

function makeRequest(headers: Record<string, string> = {}) {
  return new Request('http://localhost:3002/api/meetings', {
    method: 'GET',
    headers: { host: 'localhost:3002', ...headers },
  })
}

describe('GET /api/meetings', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 403 when Origin host differs from Host header', async () => {
    const req = makeRequest({
      origin: 'http://evil.example.com',
      'x-otj-client-id': 'c',
      'x-otj-client-secret': 's',
    })
    const res = await GET(req as unknown as Parameters<typeof GET>[0])
    expect(res.status).toBe(403)
  })

  it('allows missing Origin (same-origin same-document fetch)', async () => {
    const req = makeRequest({})
    const res = await GET(req as unknown as Parameters<typeof GET>[0])
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data).toEqual({ meetings: [], reason: 'not_configured' })
  })

  it('returns not_configured when OTJ creds missing', async () => {
    const req = makeRequest({ origin: 'http://localhost:3002' })
    const res = await GET(req as unknown as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ meetings: [], reason: 'not_configured' })
  })

  it('exchanges token and returns upstream meetings on success', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.endsWith('/oauth/token')) {
        return new Response(
          JSON.stringify({ access_token: 'tok', expires_in: 3600 }),
          { status: 200 },
        )
      }
      if (u.endsWith('/v1/meetings')) {
        return new Response(JSON.stringify({ meetings: [{ id: 'm1' }] }), { status: 200 })
      }
      throw new Error(`unexpected fetch: ${u}`)
    })

    const req = makeRequest({
      origin: 'http://localhost:3002',
      'x-otj-client-id': 'cid',
      'x-otj-client-secret': 'csec',
    })
    const res = await GET(req as unknown as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ meetings: [{ id: 'm1' }] })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    fetchMock.mockRestore()
  })

  it('returns 500 with reason=error when upstream meetings fetch fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.endsWith('/oauth/token')) {
        return new Response(
          JSON.stringify({ access_token: 'tok', expires_in: 3600 }),
          { status: 200 },
        )
      }
      if (u.endsWith('/v1/meetings')) {
        return new Response('upstream boom', { status: 500 })
      }
      throw new Error(`unexpected fetch: ${u}`)
    })

    const req = makeRequest({
      origin: 'http://localhost:3002',
      'x-otj-client-id': 'cid',
      'x-otj-client-secret': 'csec',
    })
    const res = await GET(req as unknown as Parameters<typeof GET>[0])
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ meetings: [], reason: 'error' })

    fetchMock.mockRestore()
  })
})
