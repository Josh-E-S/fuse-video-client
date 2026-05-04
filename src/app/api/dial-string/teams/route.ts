import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { log } from '@/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TeamsDialStringSchema = z.object({
  meetingId: z.string().min(1, 'meetingId is required').max(128),
  passcode: z.string().min(1, 'passcode is required').max(128),
})

function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!host) return false
  if (!origin) return true
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function toBase32(input: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bytes = new TextEncoder().encode(input)
  let bits = ''
  for (const b of bytes) {
    bits += b.toString(2).padStart(8, '0')
  }
  while (bits.length % 5 !== 0) {
    bits += '0'
  }
  let result = ''
  for (let i = 0; i < bits.length; i += 5) {
    result += alphabet[parseInt(bits.slice(i, i + 5), 2)]
  }
  return result
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const customerId = request.headers.get('x-pexip-customer-id')
  if (!customerId) {
    return NextResponse.json(
      { error: 'x-pexip-customer-id header required' },
      { status: 400 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch (err) {
    log.api.warn('Teams dial-string: invalid JSON body in request')
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = TeamsDialStringSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json(
      { error: message, errors: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { meetingId, passcode } = parsed.data
  const encodedPasscode = toBase32(`e|${passcode}`).replace(/=+$/, '')
  const alias = `${meetingId}.${encodedPasscode}..${customerId}@pex.ms`

  return NextResponse.json({ alias })
}
