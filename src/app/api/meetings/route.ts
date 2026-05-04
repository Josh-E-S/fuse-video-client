import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AUTH_URL = process.env.PEXIP_OTJ_AUTH_URL || 'https://auth.otj.pexip.io'
const API_URL = process.env.PEXIP_OTJ_API_URL || 'https://otj.pexip.io'

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

async function exchangeToken(clientId: string, clientSecret: string): Promise<string> {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(`${AUTH_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'x-trackingid': crypto.randomUUID(),
      'user-agent': 'fuse-video-client',
      Authorization: `Basic ${auth}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  })
  if (!response.ok) throw new Error(`OTJ auth failed: ${response.status}`)
  const data = await response.json()
  return data.access_token as string
}

export async function GET(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const clientId = request.headers.get('x-otj-client-id')
  const clientSecret = request.headers.get('x-otj-client-secret')

  if (!clientId || !clientSecret) {
    return NextResponse.json({ meetings: [], reason: 'not_configured' })
  }

  try {
    const token = await exchangeToken(clientId, clientSecret)
    const response = await fetch(`${API_URL}/v1/meetings`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error(`OTJ fetch meetings failed: ${response.status}`)
    return NextResponse.json(await response.json())
  } catch (err) {
    log.api.error('Failed to fetch OTJ meetings', err)
    return NextResponse.json({ meetings: [], reason: 'error' }, { status: 500 })
  }
}
