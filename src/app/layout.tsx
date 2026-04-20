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
    if (t !== 'cosmicDeep' && t !== 'arcticWhite') t = 'cosmicDeep';
    document.documentElement.setAttribute('data-theme', t);
    var themes = {
      cosmicDeep:{tb:'255,255,255',sb:'0,0,0',bg:'radial-gradient(ellipse at 30% 20%, #0d1f3c 0%, #0a1628 50%, #071020 100%)',tp:'#eef4f8'},
      arcticWhite:{tb:'26,26,46',sb:'255,255,255',bg:'#eef1f5',tp:'#1a1a2e'}
    };
    var d = themes[t];
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
          theme="system"
          position="bottom-center"
          offset={80}
          toastOptions={{
            className:
              '!bg-black/60 !border !border-white/8 !backdrop-blur-2xl !rounded-2xl !shadow-2xl !text-white/90 !text-[13px] !font-medium',
            descriptionClassName: '!text-white/40 !text-[11px]',
          }}
        />
      </body>
    </html>
  )
}
