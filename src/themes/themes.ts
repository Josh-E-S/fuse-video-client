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
    description: 'Warm paper · Teal accent',
    preview: ['#f6f4ef', '#ffffff', '#0d9488'],
    bg: 'linear-gradient(180deg, #fafaf7 0%, #f3f1ec 100%)',
    waveRgb: '13, 148, 136',
    accentColor: '#0d9488',
    accentGlow: 'rgba(13,148,136,0.22)',
    ringColor: 'rgba(13,148,136,0.45)',
    textPrimary: '#0b1220',
    textSecondary: 'rgba(15,23,42,0.62)',
    cardBg: 'rgba(255,255,255,0.85)',
    btnText: '#fff',
    textBase: '15,23,42',
    surfaceBase: '15,23,42',
    headerBg: 'rgba(250,250,247,0.92)',
  },
}
