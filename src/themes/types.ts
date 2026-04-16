export interface CosmeticTheme {
  id: string
  label: string
  category: 'Dark' | 'Light' | 'Luxury Dark' | 'Luxury Light'
  description: string
  preview: [string, string, string]
  bg: string
  waveRgb: string
  accentColor: string
  accentGlow: string
  ringColor: string
  textPrimary: string
  textSecondary: string
  cardBg: string
  btnText: string
  textBase: string // RGB triplet for opacity-based text (e.g. "255,255,255" or "0,0,0")
  surfaceBase: string // RGB triplet for opacity-based surfaces/borders
}
