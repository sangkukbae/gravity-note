import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/providers/auth-provider'
import { QueryProvider } from '@/lib/providers/query-provider'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export const metadata: Metadata = {
  title: {
    default: 'Gravity Note',
    template: '%s | Gravity Note',
  },
  description:
    'A revolutionary minimalist note-taking application that captures your thoughts instantly and keeps them perfectly organized.',
  keywords: [
    'note taking',
    'minimalist',
    'productivity',
    'thoughts',
    'writing',
    'notes',
    'capture',
    'organize',
  ],
  authors: [{ name: 'Gravity Note Team' }],
  creator: 'Gravity Note Team',
  publisher: 'Gravity Note',
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL('https://gravity-note.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://gravity-note.vercel.app',
    title: 'Gravity Note - Revolutionary Minimalist Note-Taking',
    description:
      'Capture your thoughts instantly with our revolutionary minimalist note-taking application.',
    siteName: 'Gravity Note',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Gravity Note - Revolutionary Minimalist Note-Taking',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gravity Note - Revolutionary Minimalist Note-Taking',
    description:
      'Capture your thoughts instantly with our revolutionary minimalist note-taking application.',
    images: ['/og-image.png'],
    creator: '@gravitynote',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        url: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gravity Note',
  },
  applicationName: 'Gravity Note',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Gravity Note',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#0ea5e9',
    'msapplication-config': '/browserconfig.xml',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en' className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <div id='root'>{children}</div>
              <Toaster
                position='bottom-center'
                richColors
                // closeButton
                expand={false}
                offset={24}
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: 'white',
                    border: '1px solid #e5e5e5',
                    color: '#171717',
                    borderRadius: '8px',
                    fontSize: '14px',
                    padding: '12px 16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  },
                  className:
                    'dark:!bg-neutral-800 dark:!border-neutral-700 dark:!text-neutral-100',
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
