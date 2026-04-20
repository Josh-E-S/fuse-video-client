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
    bg: 'radial-gradient(ellipse at 30% 20%, #0d1f3c 0%, #060d1a 50%, #030810 100%)',
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
  },
  arcticWhite: {
    id: 'arcticWhite',
    label: 'Light',
    category: 'Light',
    description: 'Pure white · Blue accent',
    preview: ['#f8fafc', '#f0f5fa', '#2563eb'],
    bg: 'radial-gradient(ellipse at 50% 20%, #f8fafc 0%, #f0f5fa 50%, #e8f0f8 100%)',
    waveRgb: '37, 99, 235',
    accentColor: '#2563eb',
    accentGlow: 'rgba(37,99,235,0.3)',
    ringColor: 'rgba(37,99,235,0.45)',
    textPrimary: '#0f172a',
    textSecondary: 'rgba(15,23,42,0.4)',
    cardBg: 'rgba(37,99,235,0.06)',
    btnText: '#fff',
    textBase: '15,23,42',
    surfaceBase: '255,255,255',
  },
}
