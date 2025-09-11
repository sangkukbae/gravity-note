'use client'

import { useEffect } from 'react'
import { analyticsMonitor } from '@/lib/analytics/analytics-monitor'

export function AnalyticsInitializer() {
  useEffect(() => {
    // Only enable analytics monitoring if explicitly enabled or in production
    const enableAnalytics =
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' ||
      process.env.NODE_ENV === 'production'

    if (!enableAnalytics) {
      console.log('[Analytics Monitor] Disabled in development environment')
      return
    }

    // Start monitoring analytics health with environment-appropriate frequency
    const monitoringInterval =
      process.env.NODE_ENV === 'development' ? 60000 : 30000 // Less frequent in dev
    analyticsMonitor.startMonitoring(monitoringInterval)

    // In development, only log critical issues to reduce noise
    if (process.env.NODE_ENV === 'development') {
      let lastLogTime = 0
      const unsubscribe = analyticsMonitor.subscribe(health => {
        const now = Date.now()
        // Only log issues once per 2 minutes to reduce console spam
        const shouldLog = now - lastLogTime > 120000

        // Only log critical issues, not regular health updates
        if (
          (!health.posthog.available || !health.posthog.initialized) &&
          shouldLog
        ) {
          console.warn(
            '[Analytics Monitor] PostHog unavailable (content blocker or network issue)'
          )
          lastLogTime = now
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
