import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import { PexipProvider } from '@/contexts/PexipContext'
import { PipProvider } from '@/contexts/PipContext'
import { RegistrationProvider } from '@/contexts/RegistrationContext'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fuse Video Client',
  description: 'High-performance video conferencing powered by Pexip.',
}

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('fuse_theme') || 'cosmicDeep';
    document.documentElement.setAttribute('data-theme', t);
    var themes = {
      cosmicDeep:{tb:'255,255,255',sb:'0,0,0',bg:'radial-gradient(ellipse at 30% 20%, #0d1f3c 0%, #060d1a 50%, #030810 100%)',tp:'#eef4f8'},
      mistMorning:{tb:'30,25,20',sb:'255,255,255',bg:'radial-gradient(ellipse at 60% 30%, #f0ebe3 0%, #e8e2d8 45%, #ddd6c8 100%)',tp:'#1a1612'},
      deepForest:{tb:'255,255,255',sb:'0,0,0',bg:'radial-gradient(ellipse at 50% 60%, #0a1a0f 0%, #060f08 55%, #020604 100%)',tp:'#e8f5e9'},
      goldObsidian:{tb:'255,255,255',sb:'0,0,0',bg:'radial-gradient(ellipse at 40% 25%, #1c1306 0%, #0e0a03 45%, #050402 100%)',tp:'#f5edd8'},
      champagneNavy:{tb:'15,30,50',sb:'255,255,255',bg:'radial-gradient(ellipse at 55% 25%, #f7f4ef 0%, #eae6df 45%, #e0dbd0 100%)',tp:'#0f1c30'},
      midnightRose:{tb:'255,255,255',sb:'0,0,0',bg:'radial-gradient(ellipse at 35% 30%, #1a0d14 0%, #0e0810 50%, #060406 100%)',tp:'#f5ede8'},
      arcticWhite:{tb:'15,23,42',sb:'255,255,255',bg:'radial-gradient(ellipse at 50% 20%, #f8fafc 0%, #f0f5fa 50%, #e8f0f8 100%)',tp:'#0f172a'},
      warmSlate:{tb:'255,255,255',sb:'0,0,0',bg:'radial-gradient(ellipse at 45% 35%, #1e1a16 0%, #14110e 50%, #0a0806 100%)',tp:'#f5ede4'},
      cremeGold:{tb:'40,30,10',sb:'255,255,255',bg:'radial-gradient(ellipse at 50% 25%, #faf8f3 0%, #f5efe5 40%, #efe8db 100%)',tp:'#1c1608'},
      porcelainNavy:{tb:'12,27,58',sb:'255,255,255',bg:'radial-gradient(ellipse at 45% 20%, #fbfbfd 0%, #f3f4f8 45%, #eceef4 100%)',tp:'#0a1628'},
      ivoryBlack:{tb:'20,20,20',sb:'255,255,255',bg:'radial-gradient(ellipse at 55% 30%, #faf9f7 0%, #f2f0eb 40%, #eae7e0 100%)',tp:'#111111'}
    };
    var d = themes[t] || themes.cosmicDeep;
    var s = document.documentElement.style;
    s.setProperty('--color-white','rgb('+d.tb+')');
    s.setProperty('--color-black','rgb('+d.sb+')');
    s.setProperty('--theme-bg',d.bg);
    s.setProperty('--theme-text-primary',d.tp);
  } catch(e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.variable} font-[family-name:var(--font-inter)] antialiased min-h-screen`}
      >
        <PexipProvider>
          <RegistrationProvider>
            <PipProvider>{children}</PipProvider>
          </RegistrationProvider>
        </PexipProvider>
        <Toaster
          theme="dark"
          position="bottom-center"
          offset={80}
          toastOptions={{
            className:
              '!bg-black/60 !border !border-white/8 !backdrop-blur-2xl !rounded-2xl !shadow-2xl !text-white/90 !text-[13px] !font-medium',
            descriptionClassName: '!text-white/40 !text-[11px]',
            actionButtonStyle: {
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.9)',
              borderRadius: '0.75rem',
              fontSize: '12px',
              fontWeight: '600',
              padding: '6px 14px',
            },
          }}
        />
      </body>
    </html>
  )
}
