import type { CosmeticTheme } from './types'

export const DEFAULT_THEME_ID = 'cosmicDeep'

export const CATEGORY_ORDER = ['Dark', 'Light'] as const

export const THEMES: Record<string, CosmeticTheme> = {
  cosmicDeep: {
    id: 'cosmicDeep',
    label: 'Dark',
    category: 'Dark',
    description: 'Deep navy · Teal accent',
    preview: ['#060d1a', '#0d1f3c', '#20d2be'],
    bg: 'radial-gradient(ellipse at 30% 20%, #0d1f3c 0%, #0a1628 50%, #071020 100%)',
    waveRgb: '32, 178, 170',
    accentColor: '#20d2be',
    accentGlow: 'rgba(32,210,190,0.4)',
    ringColor: 'rgba(32,210,190,0.55)',
    textPrimary: '#eef4f8',
    textSecondary: 'rgba(180,210,230,0.5)',
    cardBg: 'rgba(255,255,255,0.05)',
    btnText: '#fff',
    textBase: '255,255,255',
    surfaceBase: '0,0,0',
    headerBg: 'rgba(3,8,16,0.7)',
  },
  arcticWhite: {
    id: 'arcticWhite',
    label: 'Light',
    category: 'Light',
    description: 'Clean light · Teal accent',
    preview: ['#eef1f5', '#ffffff', '#1ab5a0'],
    bg: '#eef1f5',
    waveRgb: '26, 181, 160',
    accentColor: '#1ab5a0',
    accentGlow: 'rgba(26,181,160,0.25)',
    ringColor: 'rgba(26,181,160,0.4)',
    textPrimary: '#1a1a2e',
    textSecondary: 'rgba(26,26,46,0.55)',
    cardBg: 'rgba(255,255,255,0.7)',
    btnText: '#fff',
    textBase: '26,26,46',
    surfaceBase: '255,255,255',
    headerBg: 'rgba(255,255,255,0.92)',
  },
}
