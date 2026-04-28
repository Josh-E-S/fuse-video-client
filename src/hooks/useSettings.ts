'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEYS = {
  nodeDomain: 'fuse_node_domain',
  displayName: 'fuse_display_name',
  ringtone: 'fuse_ringtone',
  audioInput: 'fuse_audio_input',
  audioOutput: 'fuse_audio_output',
  videoInput: 'fuse_video_input',
  otjClientId: 'fuse_otj_client_id',
  otjClientSecret: 'fuse_otj_client_secret',
  pexipCustomerId: 'fuse_pexip_customer_id',
  googleDomain: 'fuse_google_domain',
} as const

export interface Settings {
  nodeDomain: string
  displayName: string
  ringtone: string
  audioInput: string
  audioOutput: string
  videoInput: string
  otjClientId: string
  otjClientSecret: string
  pexipCustomerId: string
  googleDomain: string
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({
    nodeDomain: '',
    displayName: '',
    ringtone: 'ringtone3.mp3',
    audioInput: '',
    audioOutput: '',
    videoInput: '',
    otjClientId: '',
    otjClientSecret: '',
    pexipCustomerId: '',
    googleDomain: '',
  })

  function readAllSettings(): Settings {
    return {
      nodeDomain:
        localStorage.getItem(STORAGE_KEYS.nodeDomain) ??
        process.env.NEXT_PUBLIC_DEFAULT_NODE_DOMAIN ??
        '',
      displayName:
        localStorage.getItem(STORAGE_KEYS.displayName) ??
        process.env.NEXT_PUBLIC_DEFAULT_DISPLAY_NAME ??
        '',
      ringtone: localStorage.getItem(STORAGE_KEYS.ringtone) ?? 'ringtone3.mp3',
      audioInput: localStorage.getItem(STORAGE_KEYS.audioInput) ?? '',
      audioOutput: localStorage.getItem(STORAGE_KEYS.audioOutput) ?? '',
      videoInput: localStorage.getItem(STORAGE_KEYS.videoInput) ?? '',
      otjClientId:
        localStorage.getItem(STORAGE_KEYS.otjClientId) ??
        process.env.NEXT_PUBLIC_DEFAULT_OTJ_CLIENT_ID ??
        '',
      otjClientSecret:
        localStorage.getItem(STORAGE_KEYS.otjClientSecret) ??
        process.env.NEXT_PUBLIC_DEFAULT_OTJ_CLIENT_SECRET ??
        '',
      pexipCustomerId:
        localStorage.getItem(STORAGE_KEYS.pexipCustomerId) ??
        process.env.NEXT_PUBLIC_DEFAULT_PEXIP_CUSTOMER_ID ??
        '',
      googleDomain:
        localStorage.getItem(STORAGE_KEYS.googleDomain) ??
        process.env.NEXT_PUBLIC_GOOGLE_DOMAIN ??
        '',
    }
  }

  useEffect(() => {
    setSettings(readAllSettings())
    function handleSync() {
      setSettings(readAllSettings())
    }
    window.addEventListener('fuse-settings-changed', handleSync)
    return () => window.removeEventListener('fuse-settings-changed', handleSync)
  }, [])

  function saveSettings(next: Partial<Settings>) {
    if (next.nodeDomain !== undefined) {
      localStorage.setItem(STORAGE_KEYS.nodeDomain, next.nodeDomain)
    }
    if (next.displayName !== undefined) {
      localStorage.setItem(STORAGE_KEYS.displayName, next.displayName)
    }
    if (next.ringtone !== undefined) {
      localStorage.setItem(STORAGE_KEYS.ringtone, next.ringtone)
    }
    if (next.audioInput !== undefined) {
      localStorage.setItem(STORAGE_KEYS.audioInput, next.audioInput)
    }
    if (next.audioOutput !== undefined) {
      localStorage.setItem(STORAGE_KEYS.audioOutput, next.audioOutput)
    }
    if (next.videoInput !== undefined) {
      localStorage.setItem(STORAGE_KEYS.videoInput, next.videoInput)
    }
    if (next.otjClientId !== undefined) {
      localStorage.setItem(STORAGE_KEYS.otjClientId, next.otjClientId)
    }
    if (next.otjClientSecret !== undefined) {
      localStorage.setItem(STORAGE_KEYS.otjClientSecret, next.otjClientSecret)
    }
    if (next.pexipCustomerId !== undefined) {
      localStorage.setItem(STORAGE_KEYS.pexipCustomerId, next.pexipCustomerId)
    }
    if (next.googleDomain !== undefined) {
      localStorage.setItem(STORAGE_KEYS.googleDomain, next.googleDomain)
    }
    setSettings((prev) => ({ ...prev, ...next }))
    window.dispatchEvent(new Event('fuse-settings-changed'))
  }

  return { settings, saveSettings }
}
