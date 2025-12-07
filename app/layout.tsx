import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { CookieBanner } from '@/components/legal/CookieBanner'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Enciclopedia della Vita | Coach AI Personale',
  description: 'Il tuo coach AI personale per ogni aspetto della vita. NUR ti accompagna nel tuo percorso di crescita.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NUR',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#845ef7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="it">
        <head>
          <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/icons/icon.svg" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        </head>
        <body>
          {children}
          <CookieBanner />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js')
                      .then(function(registration) {
                        console.log('SW registered:', registration.scope);
                      })
                      .catch(function(error) {
                        console.log('SW registration failed:', error);
                      });
                  });
                }
              `,
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
