'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface TranscriptEntry {
  id: string
  text: string
  timestamp: string
  speaker?: string
}

interface TranscriptionMessage {
  type: 'transcription' | 'transcript' | 'interim' | 'status' | 'connected'
  text?: string
  timestamp?: string
  speaker?: string
  status?: string
  message?: string
}

interface UseTranscriptionOptions {
  apiUrl?: string
  sipUri?: string | null
  nodeDomain?: string | null
  pin?: string | null
  autoConnect?: boolean
  maxEntries?: number
}

const DEFAULT_API_URL = ''
const INITIAL_RECONNECT_DELAY = 1000
const MAX_RECONNECT_DELAY = 30000
const MAX_RECONNECT_ATTEMPTS = 100

export function useTranscription(options: UseTranscriptionOptions = {}) {
  const {
    apiUrl = process.env.NEXT_PUBLIC_TRANSCRIPTION_API_URL || DEFAULT_API_URL,
    sipUri,
    nodeDomain,
    pin,
    autoConnect = true,
    maxEntries = 500,
  } = options

  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [interimText, setInterimText] = useState<string | null>(null)
  const [interimSpeaker, setInterimSpeaker] = useState<string | undefined>()
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState<string>('disconnected')

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectIdRef = useRef(0)
  const pinRef = useRef(pin)

  useEffect(() => {
    pinRef.current = pin
  }, [pin])

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setStatus('failed')
      return
    }

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * 2 ** reconnectAttemptRef.current,
      MAX_RECONNECT_DELAY,
    )
    reconnectAttemptRef.current += 1
    setStatus('reconnecting')

    reconnectTimerRef.current = setTimeout(() => {
      connect()
    }, delay)
  }, [])

  const connect = useCallback(async () => {
    if (!sipUri || !apiUrl) return

    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    const thisConnectId = ++connectIdRef.current

    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }

    setStatus('starting_agent')
    let wsUrl = ''

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const currentPin = pinRef.current
      if (currentPin) headers['pin'] = currentPin

      const response = await fetch(`${apiUrl}/api/agents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sipUri,
          nodeDomain: nodeDomain || undefined,
          displayName: 'Transcription Agent',
        }),
      })

      if (!response.ok) throw new Error(`Agent API failed: ${response.statusText}`)

      const data = await response.json()
      wsUrl = data.wsUrl
    } catch (error) {
      scheduleReconnect()
      return
    }

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        if (thisConnectId !== connectIdRef.current) return
        setIsConnected(true)
        setStatus('connected')
        reconnectAttemptRef.current = 0
      }

      ws.onmessage = (event) => {
        if (thisConnectId !== connectIdRef.current) return
        try {
          const msg: TranscriptionMessage = JSON.parse(event.data)

          if ((msg.type === 'transcript' || msg.type === 'transcription') && msg.text?.trim()) {
            const entry: TranscriptEntry = {
              id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              text: msg.text.trim(),
              timestamp: msg.timestamp || new Date().toISOString(),
              speaker: msg.speaker,
            }
            setTranscripts((prev) => {
              const next = [...prev, entry]
              return next.length > maxEntries ? next.slice(-maxEntries) : next
            })
            setInterimText(null)
            setInterimSpeaker(undefined)
          } else if (msg.type === 'interim' && msg.text?.trim()) {
            setInterimText(msg.text.trim())
            setInterimSpeaker(msg.speaker)
          } else if (msg.type === 'status' && msg.status) {
            setStatus(msg.status)
          }
        } catch {
          // ignore unparseable
        }
      }

      ws.onclose = (event) => {
        if (thisConnectId !== connectIdRef.current) return
        setIsConnected(false)
        setStatus('disconnected')
        wsRef.current = null
        if (event.code !== 1000) scheduleReconnect()
      }

      ws.onerror = () => {}

      wsRef.current = ws
    } catch {
      scheduleReconnect()
    }
  }, [sipUri, nodeDomain, apiUrl, maxEntries, scheduleReconnect])

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    connectIdRef.current++
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close(1000, 'Client disconnect')
      wsRef.current = null
    }
    setIsConnected(false)
    setStatus('disconnected')
  }, [])

  const clearTranscripts = useCallback(() => {
    setTranscripts([])
    setInterimText(null)
    setInterimSpeaker(undefined)
  }, [])

  useEffect(() => {
    if (autoConnect) connect()

    return () => {
      connectIdRef.current++
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close(1000, 'Component unmount')
        wsRef.current = null
      }
    }
  }, [autoConnect, connect])

  return {
    transcripts,
    interimText,
    interimSpeaker,
    latestTranscript: transcripts.length > 0 ? transcripts[transcripts.length - 1] : null,
    isConnected,
    status,
    connect,
    disconnect,
    clearTranscripts,
  }
}
