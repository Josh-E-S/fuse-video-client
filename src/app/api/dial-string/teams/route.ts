import { NextResponse } from 'next/server'

const CUSTOMER_ID = process.env.PEXIP_CUSTOMER_ID || ''

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

  const body = await request.json()
  const { meetingId, passcode } = body as { meetingId?: string; passcode?: string }

  if (!meetingId || typeof meetingId !== 'string') {
    return NextResponse.json({ error: 'meetingId is required' }, { status: 400 })
  }
  if (!passcode || typeof passcode !== 'string') {
    return NextResponse.json({ error: 'passcode is required' }, { status: 400 })
  }

  const encodedPasscode = toBase32(`e|${passcode}`).replace(/=+$/, '')
  const alias = `${meetingId}.${encodedPasscode}..${customerId}@pex.ms`

  return NextResponse.json({ alias })
}
