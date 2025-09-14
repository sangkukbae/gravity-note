'use client'

import { useEffect } from 'react'

/**
 * Client-side component that conditionally loads Sentry instrumentation
 * Only loads in production to avoid development noise
 */
export function SentryClientLoader() {
  useEffect(() => {
    // Only load Sentry instrumentation in production or when forced in development
    const forceSentryInDev = process.env.NEXT_PUBLIC_FORCE_SENTRY === 'true'
    if (process.env.NODE_ENV === 'production' || forceSentryInDev) {
      import('../../instrumentation-client').catch(console.error)
    }
  }, [])

  return null
}
