import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme, applyThemeToDocument } from '@/hooks/useTheme'
import { THEMES, DEFAULT_THEME_ID } from '@/themes/themes'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('useTheme', () => {
  it('returns the default theme on mount', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.themeId).toBe(DEFAULT_THEME_ID)
    expect(result.current.theme).toBe(THEMES[DEFAULT_THEME_ID])
  })

  it('restores saved theme from localStorage', () => {
    const themeIds = Object.keys(THEMES)
    const altId = themeIds.find((id) => id !== DEFAULT_THEME_ID) ?? DEFAULT_THEME_ID
    localStorage.setItem('fuse_theme', altId)

    const { result } = renderHook(() => useTheme())
    expect(result.current.themeId).toBe(altId)
  })

  it('falls back to default if stored theme is invalid', () => {
    localStorage.setItem('fuse_theme', 'nonexistent-theme')

    const { result } = renderHook(() => useTheme())
    expect(result.current.themeId).toBe(DEFAULT_THEME_ID)
  })

  it('changes theme and persists to localStorage', () => {
    const themeIds = Object.keys(THEMES)
    const altId = themeIds.find((id) => id !== DEFAULT_THEME_ID) ?? DEFAULT_THEME_ID

    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme(altId)
    })

    expect(result.current.themeId).toBe(altId)
    expect(localStorage.getItem('fuse_theme')).toBe(altId)
  })

  it('ignores invalid theme id in setTheme', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('does-not-exist')
    })

    expect(result.current.themeId).toBe(DEFAULT_THEME_ID)
  })
})

describe('applyThemeToDocument', () => {
  it('sets CSS custom properties on document element', () => {
    const theme = THEMES[DEFAULT_THEME_ID]
    applyThemeToDocument(theme)

    const el = document.documentElement
    expect(el.getAttribute('data-theme')).toBe(theme.id)
    expect(el.style.getPropertyValue('--theme-bg')).toBe(theme.bg)
    expect(el.style.getPropertyValue('--theme-accent')).toBe(theme.accentColor)
  })
})
