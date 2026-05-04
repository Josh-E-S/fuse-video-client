import { describe, it, expect } from 'vitest'

const { POST } = await import('@/app/api/dial-string/teams/route')

type PostArg = Parameters<typeof POST>[0]

function makeRequest(body: unknown, headers: Record<string, string> = {}): PostArg {
  return new Request('http://localhost:3002/api/dial-string/teams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: 'localhost:3002',
      'x-pexip-customer-id': 'test-customer-123',
      ...headers,
    },
    body: JSON.stringify(body),
  }) as unknown as PostArg
}

describe('POST /api/dial-string/teams', () => {
  it('returns a valid alias for valid input', async () => {
    const res = await POST(makeRequest({ meetingId: 'abc123', passcode: '5678' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.alias).toMatch(/^abc123\..+\.\.test-customer-123@pex\.ms$/)
  })

  it('returns 403 when Origin host differs from Host header', async () => {
    const res = await POST(
      makeRequest(
        { meetingId: 'abc', passcode: '1234' },
        { origin: 'http://evil.example.com' },
      ),
    )
    expect(res.status).toBe(403)
  })

  it('returns 400 when x-pexip-customer-id header missing', async () => {
    const req = new Request('http://localhost:3002/api/dial-string/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'localhost:3002' },
      body: JSON.stringify({ meetingId: 'abc', passcode: '1234' }),
    }) as unknown as PostArg
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 with flattened error map for missing fields', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.errors).toBeDefined()
    expect(data.errors.fieldErrors.meetingId).toBeDefined()
    expect(data.errors.fieldErrors.passcode).toBeDefined()
  })

  it('returns actionable error message in error field', async () => {
    const res = await POST(makeRequest({}))
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toBeTruthy()
    expect(data.error).not.toBe('invalid input')
  })

  it('returns 400 for empty strings', async () => {
    const res = await POST(makeRequest({ meetingId: '', passcode: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for inputs longer than 128 characters', async () => {
    const long = 'a'.repeat(129)
    const res = await POST(makeRequest({ meetingId: long, passcode: '1234' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost:3002/api/dial-string/teams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        host: 'localhost:3002',
        'x-pexip-customer-id': 'test-customer-123',
      },
      body: 'not json',
    }) as unknown as PostArg
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('uses customer ID from header', async () => {
    const res = await POST(
      makeRequest(
        { meetingId: 'abc', passcode: '1234' },
        { 'x-pexip-customer-id': 'header-customer' },
      ),
    )
    const data = await res.json()
    expect(data.alias).toContain('header-customer@pex.ms')
  })
})
