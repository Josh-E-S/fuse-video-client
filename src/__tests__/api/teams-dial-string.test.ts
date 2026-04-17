import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('PEXIP_CUSTOMER_ID', 'test-customer-123')

const { POST } = await import('@/app/api/dial-string/teams/route')

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/dial-string/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/dial-string/teams', () => {
  it('returns a valid alias for valid input', async () => {
    const res = await POST(makeRequest({ meetingId: 'abc123', passcode: '5678' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.alias).toMatch(/^abc123\..+\.\.test-customer-123@pex\.ms$/)
  })

  it('returns 400 for missing meetingId', async () => {
    const res = await POST(makeRequest({ passcode: '5678' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing passcode', async () => {
    const res = await POST(makeRequest({ meetingId: 'abc123' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty strings', async () => {
    const res = await POST(makeRequest({ meetingId: '', passcode: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/dial-string/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('uses customer ID from header over env', async () => {
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
