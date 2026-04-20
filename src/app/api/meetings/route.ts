import { NextResponse } from 'next/server'
import { log } from '@/utils/logger'

const AUTH_URL = process.env.PEXIP_OTJ_AUTH_URL || 'https://auth.otj.pexip.io'
const API_URL = process.env.PEXIP_OTJ_API_URL || 'https://otj.pexip.io'

let accessToken: string | null = null
let tokenExpiry: Date | null = null
let cachedClientId: string | null = null

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  if (accessToken && tokenExpiry && new Date() < tokenExpiry && cachedClientId === clientId) {
    return accessToken
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(`${AUTH_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'x-trackingid': crypto.randomUUID(),
      'user-agent': 'fuse-video-client',
      Authorization: `Basic ${authHeader}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  })

  if (!response.ok) {
    throw new Error(`OTJ auth failed: ${response.status}`)
  }

  const data = await response.json()
  accessToken = data.access_token
  tokenExpiry = new Date(Date.now() + (data.expires_in - 30) * 1000)
  cachedClientId = clientId
  return accessToken!
}

export async function GET(request: Request) {
  const clientId = request.headers.get('x-otj-client-id') || process.env.PEXIP_OTJ_CLIENT_ID || ''
  const clientSecret = request.headers.get('x-otj-client-secret') || process.env.PEXIP_OTJ_CLIENT_SECRET || ''

  if (!clientId || !clientSecret) {
    return NextResponse.json({ meetings: [] })
  }

  try {
    const token = await getAccessToken(clientId, clientSecret)

    const response = await fetch(`${API_URL}/v1/meetings`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`OTJ fetch meetings failed: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    log.api.error('Failed to fetch OTJ meetings', err)
    return NextResponse.json({ meetings: [] }, { status: 500 })
  }
}
