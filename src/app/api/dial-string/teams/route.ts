import { NextResponse } from 'next/server'
import { z } from 'zod'

const CUSTOMER_ID = process.env.PEXIP_CUSTOMER_ID || ''

const TeamsDialStringSchema = z.object({
  meetingId: z.string().min(1, 'meetingId is required'),
  passcode: z.string().min(1, 'passcode is required'),
})

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

export async function POST(request: Request) {
  const customerId = request.headers.get('x-pexip-customer-id') || CUSTOMER_ID
  if (!customerId) {
    return NextResponse.json({ error: 'Pexip Cloud Customer ID not configured' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = TeamsDialStringSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    )
  }

  const { meetingId, passcode } = parsed.data
  const encodedPasscode = toBase32(`e|${passcode}`).replace(/=+$/, '')
  const alias = `${meetingId}.${encodedPasscode}..${customerId}@pex.ms`

  return NextResponse.json({ alias })
}
