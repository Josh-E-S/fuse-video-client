'use client'

import { motion } from 'framer-motion'

interface GlassPanelProps {
  children: React.ReactNode
  className?: string
  isActive?: boolean
  isAudioOnly?: boolean
  isLate?: boolean
  isCancelling?: boolean
  hoverEffect?: boolean
  onClick?: () => void
}

export function GlassPanel({
  children,
  className = '',
  isActive = false,
  isAudioOnly = false,
  isLate = false,
  isCancelling = false,
  hoverEffect = true,
  onClick,
}: GlassPanelProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hoverEffect ? { scale: 1.01, y: -4 } : {}}
      animate={{
        borderColor: isCancelling
          ? 'rgba(244, 63, 94, 0.3)'
          : isLate
            ? 'rgba(245, 158, 11, 0.3)'
            : isActive
              ? 'rgba(59, 130, 246, 0.4)'
              : isAudioOnly
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(255, 255, 255, 0.08)',
        backgroundColor: isCancelling
          ? 'rgba(244, 63, 94, 0.05)'
          : isLate
            ? 'rgba(245, 158, 11, 0.05)'
            : isActive
              ? 'rgba(59, 130, 246, 0.05)'
              : isAudioOnly
                ? 'rgba(16, 185, 129, 0.03)'
                : 'rgba(255, 255, 255, 0.02)',
      }}
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-3xl transition-all duration-700 shadow-2xl ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/8 to-transparent pointer-events-none" />
      {children}
    </motion.div>
  )
}
