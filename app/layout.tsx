import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Enciclopedia della Vita | Coach AI Personale',
  description: 'Il tuo coach AI personale per ogni aspetto della vita.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="it">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
