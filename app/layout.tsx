// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'theMEMES.net',
  description: 'Chaotic neon memeverse',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
