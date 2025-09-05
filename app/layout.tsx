import '../instrumentation-client'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/providers/auth-provider'
import { QueryProvider } from '@/lib/providers/query-provider'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { GlobalErrorBoundary } from '@/components/error-boundary/global-error-boundary'
import { ErrorContextProvider } from '@/contexts/error-context'
import { SentryProvider } from '@/components/providers/sentry-provider'

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
      { url: '/gravity-icon-16.svg', sizes: '16x16', type: 'image/svg+xml' },
      { url: '/gravity-icon-32.svg', sizes: '32x32', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
    other: [
      {
        url: '/gravity-icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        url: '/gravity-icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
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
        <SentryProvider>
          <ThemeProvider
            attribute='class'
            defaultTheme='system'
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <AuthProvider>
                <ErrorContextProvider
                  config={{
                    enableToasts: true,
                    enableReporting: process.env.NODE_ENV === 'production',
                    reportingEndpoint: '/api/errors',
                    enableRetry: true,
                    enableReload: true,
                    enableNavigation: true,
                    context: 'app',
                    operation: 'general',
                  }}
                >
                  <GlobalErrorBoundary
                    enableSentryLogging={true}
                    maxRetries={3}
                  >
                    <div id='root'>{children}</div>
                  </GlobalErrorBoundary>
                  {/* Register Service Worker for offline support (guarded by feature flag) */}
                  <ServiceWorkerRegister />
                  <Toaster
                    position='bottom-center'
                    richColors
                    // closeButton
                    expand={false}
                    offset={24}
                    toastOptions={{
                      duration: 4000, // Increased for better UX with error toasts
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
                </ErrorContextProvider>
              </AuthProvider>
            </QueryProvider>
          </ThemeProvider>
        </SentryProvider>
      </body>
    </html>
  )
}
