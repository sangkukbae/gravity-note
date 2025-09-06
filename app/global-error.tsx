'use client'

/**
 * Global Error Handler for Next.js App Router
 *
 * This component catches JavaScript errors anywhere in the app tree and reports
 * them to Sentry. It replaces the default error boundary in production and provides
 * a user-friendly error UI while ensuring errors are properly tracked.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#create-a-global-error-handler
 */

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Only report errors to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      import('@sentry/nextjs')
        .then(Sentry => {
          // Report the error to Sentry
          Sentry.captureException(error, {
            tags: {
              component: 'global-error',
              location: 'app-root',
            },
            contexts: {
              react: {
                componentStack: error.stack,
              },
            },
            extra: {
              digest: error.digest,
              errorBoundary: 'global',
              timestamp: new Date().toISOString(),
            },
          })
        })
        .catch(console.error)
    } else {
      // In development, just log the error to console
      console.error('Global Error:', error)
    }
  }, [error])

  return (
    <html>
      <body>
        <div className='min-h-screen flex items-center justify-center p-4 bg-background'>
          <Card className='w-full max-w-md'>
            <CardHeader className='text-center'>
              <div className='mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4'>
                <AlertTriangle className='h-6 w-6 text-destructive' />
              </div>
              <CardTitle className='text-xl'>Something went wrong</CardTitle>
              <CardDescription>
                We encountered an unexpected error. The issue has been
                automatically reported to our team.
              </CardDescription>
            </CardHeader>

            <CardContent className='space-y-4'>
              {process.env.NODE_ENV === 'development' && (
                <div className='text-sm text-muted-foreground bg-muted p-3 rounded-md'>
                  <strong>Development Info:</strong>
                  <br />
                  {error.message}
                  {error.digest && (
                    <>
                      <br />
                      <strong>Digest:</strong> {error.digest}
                    </>
                  )}
                </div>
              )}

              <div className='flex flex-col gap-2'>
                <Button onClick={reset} className='w-full'>
                  <RefreshCw className='h-4 w-4 mr-2' />
                  Try again
                </Button>

                <Button
                  variant='outline'
                  className='w-full'
                  onClick={() => (window.location.href = '/')}
                >
                  Go to home page
                </Button>
              </div>

              <p className='text-xs text-muted-foreground text-center'>
                If this problem persists, please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}
