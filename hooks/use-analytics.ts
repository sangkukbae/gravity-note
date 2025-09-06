'use client'

import { useCallback } from 'react'
import { track } from '@vercel/analytics'
import { useAuthStore } from '@/lib/stores/auth'
import { useOfflineStatus } from './use-offline-status'

export interface NoteAnalyticsProperties {
  noteId?: string
  contentLength?: number
  hasMarkdown?: boolean
  creationMethod?: 'input' | 'modal' | 'shortcut'
  timeToCreate?: number
}

export interface SearchAnalyticsProperties {
  query: string
  resultCount: number
  searchTime: number
  searchType: 'enhanced' | 'basic'
  temporalGrouping?: boolean
}

export interface PerformanceAnalyticsProperties {
  metric: string
  value: number
  route?: string
}

export function useAnalytics() {
  const { user } = useAuthStore()
  const offline = useOfflineStatus()

  const trackNoteCreation = useCallback(
    (properties: NoteAnalyticsProperties) => {
      track('note_created', {
        ...properties,
        userId: user?.id ? 'authenticated' : 'anonymous', // Anonymize for privacy
        isOffline: offline ? !offline.effectiveOnline : false,
        timestamp: Date.now(),
      })
    },
    [user?.id, offline]
  )

  const trackNoteRescue = useCallback(
    (properties: NoteAnalyticsProperties) => {
      track('note_rescued', {
        ...properties,
        userId: user?.id ? 'authenticated' : 'anonymous',
        timestamp: Date.now(),
      })
    },
    [user?.id]
  )

  const trackSearch = useCallback(
    (properties: SearchAnalyticsProperties) => {
      track('search_performed', {
        ...properties,
        userId: user?.id ? 'authenticated' : 'anonymous',
        queryLength: properties.query.length,
        timestamp: Date.now(),
      })
    },
    [user?.id]
  )

  const trackPageView = useCallback(
    (page: string, properties?: Record<string, unknown>) => {
      track('page_view', {
        page,
        userId: user?.id ? 'authenticated' : 'anonymous',
        timestamp: Date.now(),
        ...properties,
      })
    },
    [user?.id]
  )

  const trackPerformance = useCallback(
    (properties: PerformanceAnalyticsProperties) => {
      track('performance_metric', {
        ...properties,
        userId: user?.id ? 'authenticated' : 'anonymous',
        timestamp: Date.now(),
      })
    },
    [user?.id]
  )

  const trackUserAction = useCallback(
    (action: string, properties?: Record<string, unknown>) => {
      track('user_action', {
        action,
        userId: user?.id ? 'authenticated' : 'anonymous',
        timestamp: Date.now(),
        ...properties,
      })
    },
    [user?.id]
  )

  const trackError = useCallback(
    (error: string, context?: string) => {
      track('error_occurred', {
        error,
        context: context || 'unknown',
        userId: user?.id ? 'authenticated' : 'anonymous',
        timestamp: Date.now(),
      })
    },
    [user?.id]
  )

  return {
    trackNoteCreation,
    trackNoteRescue,
    trackSearch,
    trackPageView,
    trackPerformance,
    trackUserAction,
    trackError,
  }
}
