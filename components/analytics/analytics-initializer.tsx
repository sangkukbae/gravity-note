'use client'

import { useEffect } from 'react'
import { analyticsMonitor } from '@/lib/analytics/analytics-monitor'

export function AnalyticsInitializer() {
  useEffect(() => {
    // Start monitoring analytics health
    analyticsMonitor.startMonitoring(30000) // Check every 30 seconds

    // In development, log health reports for debugging
    if (process.env.NODE_ENV === 'development') {
      const unsubscribe = analyticsMonitor.subscribe(health => {
        console.log('[Analytics Monitor] Health update:', health)

        // Log detailed report for debugging
        if (!health.posthog.available || !health.posthog.initialized) {
          console.warn('[Analytics Monitor] PostHog issues detected:')
          console.log(analyticsMonitor.generateReport())
        }
      })

      // Cleanup subscription on unmount
      return () => {
        unsubscribe()
        analyticsMonitor.stopMonitoring()
      }
    }

    // In production, only clean up monitoring
    return () => {
      analyticsMonitor.stopMonitoring()
    }
  }, [])

  // This component renders nothing - it's purely for side effects
  return null
}
