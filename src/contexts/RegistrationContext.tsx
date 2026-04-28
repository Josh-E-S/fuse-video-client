'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { log } from '@/utils/logger'
import { getElectronBridge } from '@/hooks/useElectron'

const STORAGE_KEYS = {
  alias: 'fuse_reg_alias',
  username: 'fuse_reg_username',
  password: 'fuse_reg_password',
  node: 'fuse_node_domain', // Adding node to storage keys for easy access
} as const

export type RegistrationStatus = 'registered' | 'connecting' | 'error' | 'unregistered'

export interface RegistrationCredentials {
  alias: string
  username: string
  password: string
}

export interface IncomingCall {
  conferenceAlias: string
  remoteAlias: string
  remoteDisplayName: string
  token: string
}

interface RegistrationContextValue {
  status: RegistrationStatus
  error: string | null
  incomingCall: IncomingCall | null
  register: (creds?: RegistrationCredentials, overrideNodeDomain?: string) => Promise<void>
  unregister: () => Promise<void>
  answerCall: () => IncomingCall | null
  declineCall: () => void
  getStoredCredentials: () => RegistrationCredentials | null
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null)

export function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RegistrationStatus>('unregistered')
  const [error, setError] = useState<string | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const tokenRef = useRef<string | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const statusRef = useRef<RegistrationStatus>('unregistered')

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const [nodeDomain, setNodeDomain] = useState<string>(
    process.env.NEXT_PUBLIC_DEFAULT_NODE_DOMAIN || '',
  )

  const nodeDomainRef = useRef(nodeDomain)

  // Sync client-only values (like localStorage node domain override) after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNode = localStorage.getItem(STORAGE_KEYS.node)
      if (savedNode) {
        setNodeDomain(savedNode)
        nodeDomainRef.current = savedNode
      }
    }
    nodeDomainRef.current = nodeDomain
  }, [nodeDomain])

  const getStoredCredentials = useCallback((): RegistrationCredentials | null => {
    if (typeof window === 'undefined') return null
    const alias = localStorage.getItem(STORAGE_KEYS.alias) ?? process.env.NEXT_PUBLIC_DEFAULT_ALIAS
    const username =
      localStorage.getItem(STORAGE_KEYS.username) ?? process.env.NEXT_PUBLIC_DEFAULT_REG_USERNAME
    const password =
      localStorage.getItem(STORAGE_KEYS.password) ??
      process.env.NEXT_PUBLIC_DEFAULT_REG_PASSWORD ??
      ''
    if (alias && username) return { alias, username, password }
    return null
  }, [])

  function saveCredentials(creds: RegistrationCredentials) {
    localStorage.setItem(STORAGE_KEYS.alias, creds.alias)
    localStorage.setItem(STORAGE_KEYS.username, creds.username)
    localStorage.setItem(STORAGE_KEYS.password, creds.password)
  }

  function clearCredentials() {
    localStorage.removeItem(STORAGE_KEYS.alias)
    localStorage.removeItem(STORAGE_KEYS.username)
    localStorage.removeItem(STORAGE_KEYS.password)
  }

  function stopHeartbeat() {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }

  function stopEventSource() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }

  function startEventSource(alias: string) {
    stopEventSource()

    const token = tokenRef.current
    if (!token || !nodeDomainRef.current) return

    const url = `https://${nodeDomainRef.current}/api/client/v2/registrations/${encodeURIComponent(alias)}/events?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.addEventListener('incoming', (e) => {
      try {
        const data = JSON.parse(e.data)
        setIncomingCall({
          conferenceAlias: data.conference_alias || data.conferenceAlias || '',
          remoteAlias: data.remote_alias || '',
          remoteDisplayName: data.remote_display_name || data.display_name || 'Unknown Caller',
          token: data.token || '',
        })
      } catch (err) {
        log.registration.debug('Ignoring unparseable SSE event')
      }
    })

    es.addEventListener('incoming_cancelled', () => {
      setIncomingCall(null)
    })

    // EventSource auto-reconnects on transient network blips, but a stale token
    // (e.g. after sleep) means readyState stays CLOSED. Surface that as an error
    // state so the wake/online recovery effect knows to re-register.
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setStatus('error')
        setError('Connection lost')
      }
    }
  }

  function startHeartbeat(alias: string) {
    stopHeartbeat()
    heartbeatRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `https://${nodeDomainRef.current}/api/client/v2/registrations/${encodeURIComponent(alias)}/refresh_token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', token: tokenRef.current! },
            body: JSON.stringify({}),
          },
        )
        if (!res.ok) throw new Error(`Refresh failed: ${res.status}`)
        const data = await res.json()
        tokenRef.current = data.result.token
      } catch (err) {
        log.registration.error('Registration heartbeat lost', err)
        stopHeartbeat()
        stopEventSource()
        tokenRef.current = null
        setStatus('error')
        setError('Heartbeat lost, re-registration required')
      }
    }, 90_000)
  }

  const register = useCallback(
    async (creds?: RegistrationCredentials, overrideNodeDomain?: string) => {
      const credentials = creds ?? getStoredCredentials()
      const node = overrideNodeDomain || nodeDomainRef.current
      if (!credentials || !node) {
        setStatus('unregistered')
        return
      }

      if (overrideNodeDomain) {
        setNodeDomain(overrideNodeDomain)
        nodeDomainRef.current = overrideNodeDomain
      }

      if (creds) saveCredentials(creds)

      setStatus('connecting')
      setError(null)

      try {
        const basicAuth = btoa(String.fromCodePoint(...new TextEncoder().encode(`${credentials.username}:${credentials.password}`)))
        const res = await fetch(
          `https://${node}/api/client/v2/registrations/${encodeURIComponent(credentials.alias)}/request_token`,
          {
            method: 'POST',
            headers: {
              Authorization: `x-pexip-basic ${basicAuth}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          },
        )
        if (!res.ok) {
          const msg =
            res.status === 401
              ? 'Invalid credentials or alias'
              : res.status === 404
                ? 'Alias not found on this node'
                : `Registration failed: ${res.status}`
          throw new Error(msg)
        }

        const data = await res.json()
        tokenRef.current = data.result.token
        setStatus('registered')

        startHeartbeat(credentials.alias)
        startEventSource(credentials.alias)
      } catch (err: unknown) {
        tokenRef.current = null
        setStatus('error')
        const message =
          err instanceof TypeError
            ? `Cannot reach ${node} -- check the domain`
            : err instanceof Error
              ? err.message
              : 'Registration failed'
        setError(message)
      }
    },
    [getStoredCredentials],
  )

  const unregister = useCallback(async () => {
    stopHeartbeat()
    stopEventSource()
    setIncomingCall(null)
    const creds = getStoredCredentials()
    if (tokenRef.current && creds && nodeDomainRef.current) {
      try {
        await fetch(
          `https://${nodeDomainRef.current}/api/client/v2/registrations/${encodeURIComponent(creds.alias)}/release_token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', token: tokenRef.current },
            body: JSON.stringify({}),
          },
        )
      } catch (err) {
        log.registration.warn('Failed to release registration token during unregister')
      }
    }
    tokenRef.current = null
    clearCredentials()
    setStatus('unregistered')
    setError(null)
  }, [getStoredCredentials])

  const answerCall = useCallback(() => {
    const call = incomingCall

    setIncomingCall(null)
    return call
  }, [incomingCall])

  const declineCall = useCallback(() => {

    setIncomingCall(null)
  }, [])

  // Auto-register on mount if credentials exist
  useEffect(() => {
    // Wait until nodeDomain has a chance to hydrate and sync from localStorage
    if (!nodeDomainRef.current) return
    const creds = getStoredCredentials()
    if (creds) {
      register()
    }
    return () => {
      stopHeartbeat()
      stopEventSource()
    }
  }, [getStoredCredentials, register, nodeDomain])

  // Recover the registration after the OS resumes from sleep, the network comes
  // back, or the window becomes visible again. Suspend kills the SSE socket and
  // expires the token server-side; without this the user appears "offline" until
  // they manually re-register.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const recover = () => {
      const current = statusRef.current
      if (current === 'registered' || current === 'connecting') return
      if (!nodeDomainRef.current) return
      if (!getStoredCredentials()) return
      log.registration.debug('Recovering registration after resume/online')
      register()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') recover()
    }

    window.addEventListener('online', recover)
    document.addEventListener('visibilitychange', onVisibility)

    const bridge = getElectronBridge()
    const offPower = bridge?.onPowerResume(recover)

    return () => {
      window.removeEventListener('online', recover)
      document.removeEventListener('visibilitychange', onVisibility)
      offPower?.()
    }
  }, [getStoredCredentials, register])

  return (
    <RegistrationContext.Provider
      value={{
        status,
        error,
        incomingCall,
        register,
        unregister,
        answerCall,
        declineCall,
        getStoredCredentials,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  )
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext)
  if (!ctx) throw new Error('useRegistration must be used inside RegistrationProvider')
  return ctx
}
