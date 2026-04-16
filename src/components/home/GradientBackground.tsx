import type { CosmeticTheme } from '@/themes/types'

interface GradientBackgroundProps {
  theme: CosmeticTheme
}

export function GradientBackground({ theme }: GradientBackgroundProps) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0" style={{ background: theme.bg }} />
      <div
        className="absolute top-[5%] left-[-10%] w-[600px] h-[400px] rounded-full blur-[100px]"
        style={{
          background: `radial-gradient(ellipse, ${theme.accentColor}22 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute top-[25%] right-[-5%] w-[500px] h-[350px] rounded-full blur-[90px]"
        style={{
          background: `radial-gradient(ellipse, ${theme.accentColor}18 0%, transparent 65%)`,
        }}
      />
      <div
        className="absolute bottom-[5%] left-[10%] w-[550px] h-[300px] rounded-full blur-[80px]"
        style={{
          background: `radial-gradient(ellipse, ${theme.accentColor}15 0%, transparent 65%)`,
        }}
      />
      <div
        className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full blur-[70px]"
        style={{
          background: `radial-gradient(circle, ${theme.accentGlow} 0%, transparent 70%)`,
          opacity: 0.12,
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
