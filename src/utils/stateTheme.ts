// Centralized semantic state theme resolver
// Every visual element pulls from this to guarantee consistency across all 4 states

export type SemanticState = 'muted' | 'audioOnly' | 'broadcasting' | 'late'

export interface StateTheme {
  state: SemanticState

  // Orb
  orbBorder: string
  orbBorderActive: string

  // Mic button on orb
  micBg: string
  micBorder: string
  micIcon: string
  micPulse: string

  // Join button
  joinBg: string
  joinText: string
  joinShadow: string
  joinHover: string

  // Lock icon
  lockColor: string

  // PrivacyMesh
  meshTheme: 'rose' | 'emerald' | 'blue' | 'amber'

  // GlassPanel
  glassBorder: string
  glassBg: string

  // In-call control: mic
  controlMicBg: string
  controlMicBorder: string
  controlMicText: string

  // In-call control: video
  controlVideoBg: string
  controlVideoBorder: string
  controlVideoText: string
}

export function getSemanticState(
  isMuted: boolean,
  isVideoOff: boolean,
  isLate: boolean,
): SemanticState {
  if (isLate) return 'late'
  if (!isMuted && !isVideoOff) return 'broadcasting'
  if (!isMuted && isVideoOff) return 'audioOnly'
  return 'muted'
}

const themes: Record<SemanticState, StateTheme> = {
  muted: {
    state: 'muted',
    orbBorder: 'border-rose-500/30',
    orbBorderActive: 'border-rose-500/40',
    micBg: 'bg-rose-500/10',
    micBorder: 'border-rose-500/20',
    micIcon: 'text-rose-400',
    micPulse: 'bg-rose-500',
    joinBg: 'bg-rose-500',
    joinText: 'text-white',
    joinShadow: 'shadow-[0_0_40px_rgba(244,63,94,0.3)]',
    joinHover: 'hover:bg-rose-400',
    lockColor: 'text-rose-400',
    meshTheme: 'rose',
    glassBorder: 'rgba(244, 63, 94, 0.2)',
    glassBg: 'rgba(244, 63, 94, 0.03)',
    controlMicBg: 'bg-rose-500/10',
    controlMicBorder: 'border-rose-500/20',
    controlMicText: 'text-rose-500',
    controlVideoBg: 'bg-rose-500/10',
    controlVideoBorder: 'border-rose-500/20',
    controlVideoText: 'text-rose-500',
  },
  audioOnly: {
    state: 'audioOnly',
    orbBorder: 'border-emerald-500/30',
    orbBorderActive: 'border-emerald-500/40',
    micBg: 'bg-emerald-400/10',
    micBorder: 'border-emerald-400/30',
    micIcon: 'text-emerald-400',
    micPulse: 'bg-emerald-500',
    joinBg: 'bg-emerald-500',
    joinText: 'text-black',
    joinShadow: 'shadow-[0_0_40px_rgba(16,185,129,0.3)]',
    joinHover: 'hover:bg-emerald-400',
    lockColor: 'text-emerald-400',
    meshTheme: 'emerald',
    glassBorder: 'rgba(16, 185, 129, 0.3)',
    glassBg: 'rgba(16, 185, 129, 0.03)',
    controlMicBg: 'bg-emerald-400/10',
    controlMicBorder: 'border-emerald-400/30',
    controlMicText: 'text-emerald-400',
    controlVideoBg: 'bg-rose-500/10',
    controlVideoBorder: 'border-rose-500/20',
    controlVideoText: 'text-rose-500',
  },
  broadcasting: {
    state: 'broadcasting',
    orbBorder: 'border-blue-500/40',
    orbBorderActive: 'border-blue-500/50',
    micBg: 'bg-emerald-400/10',
    micBorder: 'border-emerald-400/30',
    micIcon: 'text-emerald-400',
    micPulse: 'bg-emerald-500',
    joinBg: 'bg-blue-600',
    joinText: 'text-white',
    joinShadow: 'shadow-[0_0_40px_rgba(37,99,235,0.4)]',
    joinHover: 'hover:bg-blue-500',
    lockColor: 'text-blue-400',
    meshTheme: 'blue',
    glassBorder: 'rgba(59, 130, 246, 0.4)',
    glassBg: 'rgba(59, 130, 246, 0.05)',
    controlMicBg: 'bg-emerald-400/10',
    controlMicBorder: 'border-emerald-400/30',
    controlMicText: 'text-emerald-400',
    controlVideoBg: 'bg-blue-400/10',
    controlVideoBorder: 'border-blue-400/30',
    controlVideoText: 'text-blue-400',
  },
  late: {
    state: 'late',
    orbBorder: 'border-amber-500/30',
    orbBorderActive: 'border-amber-500/40',
    micBg: 'bg-amber-500/10',
    micBorder: 'border-amber-500/20',
    micIcon: 'text-amber-400',
    micPulse: 'bg-amber-500',
    joinBg: 'bg-amber-500',
    joinText: 'text-black',
    joinShadow: 'shadow-[0_0_40px_rgba(245,158,11,0.3)]',
    joinHover: '',
    lockColor: 'text-amber-400',
    meshTheme: 'amber',
    glassBorder: 'rgba(245, 158, 11, 0.3)',
    glassBg: 'rgba(245, 158, 11, 0.05)',
    controlMicBg: 'bg-amber-500/10',
    controlMicBorder: 'border-amber-500/20',
    controlMicText: 'text-amber-500',
    controlVideoBg: 'bg-amber-500/10',
    controlVideoBorder: 'border-amber-500/20',
    controlVideoText: 'text-amber-500',
  },
}

export function getStateTheme(isMuted: boolean, isVideoOff: boolean, isLate: boolean): StateTheme {
  return themes[getSemanticState(isMuted, isVideoOff, isLate)]
}
