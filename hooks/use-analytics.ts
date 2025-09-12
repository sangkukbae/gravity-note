'use client'

import { useCallback } from 'react'
import { track } from '@vercel/analytics'
import { usePostHog } from 'posthog-js/react'
import { useAuthStore } from '@/lib/stores/auth'
import { useNetworkStatus } from './use-network-status'

export interface NoteAnalyticsProperties extends Record<string, unknown> {
  noteId?: string
  contentLength?: number
  hasMarkdown?: boolean
  creationMethod?: 'input' | 'modal' | 'shortcut'
  timeToCreate?: number
}

export interface SearchAnalyticsProperties extends Record<string, unknown> {
  query: string
  resultCount: number
  searchTime: number
  searchType: 'enhanced' | 'basic'
  temporalGrouping?: boolean
}

export interface PerformanceAnalyticsProperties
  extends Record<string, unknown> {
  metric: string
  value: number
  route?: string
}

export function useAnalytics() {
  const { user } = useAuthStore()
  const networkStatus = useNetworkStatus({
    pingUrl: '/manifest.json',
    pingIntervalMs: 30000,
    enableQualityMonitoring: false,
  })
  const posthog = usePostHog()

  // Helper to track to both Vercel Analytics and PostHog
  const trackToServices = useCallback(
    <P extends object>(eventName: string, properties: P) => {
      const baseProperties = {
        ...properties,
        userId: user?.id ? 'authenticated' : 'anonymous',
        timestamp: Date.now(),
      }

      // Track to Vercel Analytics with allowed primitive values only
      const vercelProps = Object.entries(baseProperties).reduce(
        (acc, [key, value]) => {
          if (
            value === null ||
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            acc[key] = value
          }
          return acc
        },
        {} as Record<string, string | number | boolean | null>
      )

      track(eventName, vercelProps)

      // Track to PostHog if available
      if (posthog) {
        posthog.capture(eventName, {
          ...baseProperties,
          // Add PostHog specific properties
          distinct_id: user?.id,
          $groups: user?.id ? { user: user.id } : undefined,
        })
      }
    },
    [user?.id, posthog]
  )

  const trackNoteCreation = useCallback(
    (properties: NoteAnalyticsProperties) => {
      trackToServices('note_created', {
        ...properties,
        isOffline: !networkStatus.effectiveOnline,
      })
    },
    [trackToServices, networkStatus]
  )

  const trackNoteRescue = useCallback(
    (properties: NoteAnalyticsProperties) => {
      trackToServices('note_rescued', properties)
    },
    [trackToServices]
  )

  const trackSearch = useCallback(
    (properties: SearchAnalyticsProperties) => {
      trackToServices('search_performed', {
        ...properties,
        queryLength: properties.query.length,
      })
    },
    [trackToServices]
  )

  const trackPageView = useCallback(
    (page: string, properties?: Record<string, unknown>) => {
      trackToServices('page_view', {
        page,
        ...properties,
      })
    },
    [trackToServices]
  )

  const trackPerformance = useCallback(
    (properties: PerformanceAnalyticsProperties) => {
      trackToServices('performance_metric', properties)
    },
    [trackToServices]
  )

  const trackUserAction = useCallback(
    (action: string, properties?: Record<string, unknown>) => {
      trackToServices('user_action', {
        action,
        ...properties,
      })
    },
    [trackToServices]
  )

  const trackError = useCallback(
    (error: string, context?: string) => {
      trackToServices('error_occurred', {
        error,
        context: context || 'unknown',
      })
    },
    [trackToServices]
  )

  // PostHog specific methods for beta features
  const identifyUser = useCallback(
    (userProps?: Record<string, unknown>) => {
      if (posthog && user?.id) {
        posthog.identify(user.id, {
          email: user.email,
          name: user.user_metadata?.full_name,
          created_at: user.created_at,
          ...userProps,
        })
      }
    },
    [posthog, user]
  )

  const trackFeatureUsed = useCallback(
    (featureName: string, metadata?: Record<string, unknown>) => {
      trackToServices('feature_used', {
        feature: featureName,
        ...metadata,
      })
    },
    [trackToServices]
  )

  const trackBetaAction = useCallback(
    (action: string, properties?: Record<string, unknown>) => {
      trackToServices('beta_action', {
        action,
        ...properties,
      })
    },
    [trackToServices]
  )

  return {
    // Existing methods
    trackNoteCreation,
    trackNoteRescue,
    trackSearch,
    trackPageView,
    trackPerformance,
    trackUserAction,
    trackError,

    // PostHog specific methods
    identifyUser,
    trackFeatureUsed,
    trackBetaAction,

    // Raw access to PostHog for advanced usage
    posthog,
  }
}
