import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import HeaderWrapper from '@/components/HeaderWrapper'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'VisionSearch - Video Subtitle Search Platform',
  description: 'Search for text in video subtitles. Add PeerTube videos and search their content with AI assistance.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`} style={{ '--header-height': '3rem' } as React.CSSProperties}>
        <div className="flex flex-col h-screen bg-background">
          <HeaderWrapper />
          <div className="flex-1 overflow-hidden relative">
            {children}
          </div>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
