'use client'

/**
 * Sentry Provider Component
 *
 * Initializes Sentry context and provides error monitoring capabilities
 * to the application. This component should be placed high in the component
 * tree to ensure all child components can benefit from Sentry integration.
 */

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  SENTRY_FEATURES,
  initializeSentryContext,
  setSentryUserContext,
  setApplicationContext,
  addNavigationBreadcrumb,
  addInteractionBreadcrumb,
  clearSentryContext,
  type UserContext,
} from '@/lib/sentry'
import type { Metric } from 'web-vitals'

interface SentryProviderProps {
  children: React.ReactNode
  user?: UserContext
  initialRoute?: string
}

/**
 * Sentry Provider Component
 */
export function SentryProvider({
  children,
  user,
  initialRoute,
}: SentryProviderProps) {
  const router = useRouter()

  /**
   * Initialize Sentry on mount
   */
  useEffect(() => {
    if (!SENTRY_FEATURES.enabled) {
      return
    }

    // Initialize Sentry context with user data
    initializeSentryContext(user)

    // Set initial application context
    setApplicationContext({
      route: initialRoute || window.location.pathname,
      component: 'SentryProvider',
      operation: 'initialization',
    })

    // Track initial page load
    addNavigationBreadcrumb('direct', window.location.pathname)

    console.log('Sentry initialized successfully')
  }, [user, initialRoute])

  /**
   * Update user context when user changes
   */
  useEffect(() => {
    if (!SENTRY_FEATURES.enabled) {
      return
    }

    if (user) {
      setSentryUserContext(user)
    } else {
      clearSentryContext()
    }
  }, [user])

  /**
   * Handle global unhandled errors
   */
  useEffect(() => {
    if (!SENTRY_FEATURES.enabled || typeof window === 'undefined') {
      return
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)

      // Add breadcrumb for unhandled rejection
      addInteractionBreadcrumb('unhandled_rejection', 'promise', {
        reason: event.reason?.toString(),
        url: window.location.href,
      })
    }

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error)

      // Add breadcrumb for global error
      addInteractionBreadcrumb('global_error', 'window', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        url: window.location.href,
      })
    }

    // Listen for unhandled errors
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  /**
   * Track Web Vitals when they become available
   */
  useEffect(() => {
    if (!SENTRY_FEATURES.enabled || typeof window === 'undefined') {
      return
    }

    // Dynamic import to avoid SSR issues
    import('web-vitals')
      .then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
        const { trackWebVital } = require('@/lib/sentry')

        // Track Core Web Vitals
        onCLS((metric: Metric) =>
          trackWebVital(metric.name, metric.value, metric.id)
        )
        onFCP((metric: Metric) =>
          trackWebVital(metric.name, metric.value, metric.id)
        )
        onINP((metric: Metric) =>
          trackWebVital(metric.name, metric.value, metric.id)
        )
        onLCP((metric: Metric) =>
          trackWebVital(metric.name, metric.value, metric.id)
        )
        onTTFB((metric: Metric) =>
          trackWebVital(metric.name, metric.value, metric.id)
        )
      })
      .catch(error => {
        console.warn('Failed to load web-vitals:', error)
      })
  }, [])

  /**
   * Track navigation changes
   */
  useEffect(() => {
    if (!SENTRY_FEATURES.enabled) {
      return
    }

    let currentPath = window.location.pathname

    const handleRouteChange = () => {
      const newPath = window.location.pathname
      if (newPath !== currentPath) {
        addNavigationBreadcrumb(currentPath, newPath)
        setApplicationContext({
          route: newPath,
          component: 'Router',
          operation: 'navigation',
        })
        currentPath = newPath
      }
    }

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange)

    // Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function (...args) {
      originalPushState.apply(window.history, args)
      handleRouteChange()
    }

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(window.history, args)
      handleRouteChange()
    }

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
    }
  }, [])

  // If Sentry is disabled, just render children
  if (!SENTRY_FEATURES.enabled) {
    return <>{children}</>
  }

  return <>{children}</>
}

/**
 * Hook to get current Sentry context
 */
export function useSentryContext() {
  const updateUserContext = useCallback((user: UserContext | null) => {
    if (!SENTRY_FEATURES.enabled) {
      return
    }

    if (user) {
      setSentryUserContext(user)
    } else {
      clearSentryContext()
    }
  }, [])

  const updateApplicationContext = useCallback(
    (context: Parameters<typeof setApplicationContext>[0]) => {
      if (!SENTRY_FEATURES.enabled) {
        return
      }

      setApplicationContext(context)
    },
    []
  )

  const trackUserInteraction = useCallback(
    (action: string, target: string, data?: Record<string, any>) => {
      if (!SENTRY_FEATURES.enabled) {
        return
      }

      addInteractionBreadcrumb(action, target, data)
    },
    []
  )

  return {
    updateUserContext,
    updateApplicationContext,
    trackUserInteraction,
    isEnabled: SENTRY_FEATURES.enabled,
  }
}
