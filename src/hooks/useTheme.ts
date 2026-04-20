'use client'

import { useState, useEffect, useCallback } from 'react'
import { THEMES, DEFAULT_THEME_ID } from '@/themes/themes'
import type { CosmeticTheme } from '@/themes/types'

const STORAGE_KEY = 'fuse_theme'

export function applyThemeToDocument(theme: CosmeticTheme, doc: Document = document) {
  const el = doc.documentElement
  el.setAttribute('data-theme', theme.id)
  el.style.setProperty('--theme-bg', theme.bg)
  el.style.setProperty('--theme-wave-rgb', theme.waveRgb)
  el.style.setProperty('--theme-accent', theme.accentColor)
  el.style.setProperty('--theme-accent-glow', theme.accentGlow)
  el.style.setProperty('--theme-ring-color', theme.ringColor)
  el.style.setProperty('--theme-text-primary', theme.textPrimary)
  el.style.setProperty('--theme-text-secondary', theme.textSecondary)
  el.style.setProperty('--theme-card-bg', theme.cardBg)
  el.style.setProperty('--theme-btn-text', theme.btnText)
  el.style.setProperty('--theme-surface-base', theme.surfaceBase)
  el.style.setProperty('--theme-header-bg', theme.headerBg)
  // Override Tailwind's color tokens so all opacity-based classes adapt to the theme
  el.style.setProperty('--color-white', `rgb(${theme.textBase})`)
  el.style.setProperty('--color-black', `rgb(${theme.surfaceBase})`)
}

export function useTheme() {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const id = stored && stored in THEMES ? stored : DEFAULT_THEME_ID
    setThemeId(id)
    applyThemeToDocument(THEMES[id])
  }, [])

  const setTheme = useCallback((id: string) => {
    if (!(id in THEMES)) return
    setThemeId(id)
    localStorage.setItem(STORAGE_KEY, id)
    applyThemeToDocument(THEMES[id])
  }, [])

  const theme = THEMES[themeId]

  return { theme, themeId, setTheme, applyThemeToDocument }
}
