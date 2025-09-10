'use client'

import { PostHogProvider } from 'posthog-js/react'
import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '@/lib/stores/auth'
import { analyticsMonitor } from '@/lib/analytics/analytics-monitor'

// Lazy load PostHog to optimize bundle size
let posthogPromise: Promise<any> | null = null
let posthogInstance: any = null
let isInitialized = false

async function getPostHog() {
  if (!posthogPromise) {
    posthogPromise = import('posthog-js')
  }
  return posthogPromise
}

// Health check for PostHog availability
async function checkPostHogHealth(): Promise<{
  available: boolean
  error?: string
}> {
  try {
    // Test with a simple fetch to PostHog endpoints
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const response = await fetch('https://us.i.posthog.com/health', {
      method: 'GET',
      signal: controller.signal,
      mode: 'no-cors', // Bypass CORS for health check
    })

    clearTimeout(timeoutId)
    return { available: true }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { available: false, error: 'timeout' }
      }
      if (
        error.message.includes('blocked') ||
        error.message.includes('ERR_BLOCKED')
      ) {
        return { available: false, error: 'blocked' }
      }
    }
    return { available: false, error: 'network' }
  }
}

export function PostHogAnalyticsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [posthog, setPostHog] = useState<any>(null)
  const [isHealthy, setIsHealthy] = useState<boolean>(true)
  const [healthCheckDone, setHealthCheckDone] = useState<boolean>(false)
  const initializationRef = useRef<boolean>(false)
  const { user } = useAuthStore()

  useEffect(() => {
    async function initPostHog() {
      // Prevent double initialization
      if (initializationRef.current || isInitialized) {
        if (posthogInstance) {
          setPostHog(posthogInstance)
        }
        return
      }

      // Only initialize on client side and if PostHog key is available
      if (
        typeof window === 'undefined' ||
        !process.env.NEXT_PUBLIC_POSTHOG_KEY ||
        process.env.NEXT_PUBLIC_POSTHOG_KEY === 'phc_test_key_placeholder'
      ) {
        setHealthCheckDone(true)
        return
      }

      initializationRef.current = true

      try {
        // Perform health check first
        const healthStatus = await checkPostHogHealth()
        setIsHealthy(healthStatus.available)
        setHealthCheckDone(true)

        // Report health status to analytics monitor
        analyticsMonitor.updatePostHogHealth({
          available: healthStatus.available,
          initialized: false,
          lastError: healthStatus.error ?? null,
        })

        if (!healthStatus.available) {
          console.warn('[PostHog] Health check failed:', healthStatus.error)
          if (healthStatus.error === 'blocked') {
            console.warn(
              '[PostHog] Detected content blocker - PostHog analytics disabled'
            )
          }
          return
        }

        const { default: posthog } = await getPostHog()

        // Check if already initialized (prevents re-initialization warnings)
        if (posthog.__loaded) {
          console.log(
            '[PostHog] Already initialized, reusing existing instance'
          )
          posthogInstance = posthog
          setPostHog(posthog)
          isInitialized = true
          return
        }

        const config = {
          api_host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',

          // Next.js App Router optimizations
          capture_pageview: false, // We'll handle this manually
          capture_pageleave: true,

          // Content blocker resilience
          loaded: (instance: any) => {
            posthogInstance = instance
            isInitialized = true

            // Report successful initialization to analytics monitor
            analyticsMonitor.updatePostHogHealth({
              available: true,
              initialized: true,
              lastError: null,
            })

            if (process.env.NODE_ENV === 'development') {
              console.log('[PostHog] Successfully initialized')
              instance.debug(
                process.env.NEXT_PUBLIC_POSTHOG_ENVIRONMENT === 'development'
              )
            }
          },

          // Enhanced error handling
          on_request_error: (error: any) => {
            console.warn('[PostHog] Request failed:', error)
            // Don't throw - gracefully degrade
          },

          // Retry configuration for network issues
          retry_queue: {
            max_retries: 3,
            retry_delay: 2000,
          },

          // Privacy settings
          autocapture: {
            dom_event_allowlist: ['click', 'submit'],
            element_allowlist: ['button', 'input', 'a', 'form'],
          },

          // Session recording settings (disabled initially for privacy)
          session_recording: {
            maskAllInputs: true,
            maskTextContent: false,
          },

          // Performance optimizations
          persistence: 'localStorage',
          persistence_name: 'gravity_note_posthog',
          bootstrap: {}, // Enable faster loading

          // Network resilience
          request_timeout: 10000, // 10 second timeout

          // Feature flag settings
          advanced_disable_feature_flags_on_first_load: false,
          disable_flags_on_first_load: false,

          // Disable features we don't need initially
          disable_session_recording: true,
          disable_compression: false, // Enable compression for better performance
          disable_external_deps: false,

          // Respect user preferences
          respect_dnt: true,

          // Cross-domain tracking (if needed)
          cross_subdomain_cookie: false,
          secure_cookie: process.env.NODE_ENV === 'production',
        }

        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, config)
        setPostHog(posthog)
      } catch (error) {
        console.error('[PostHog] Failed to initialize:', error)
        setIsHealthy(false)
        setHealthCheckDone(true)

        // Report initialization failure to analytics monitor
        analyticsMonitor.updatePostHogHealth({
          available: false,
          initialized: false,
          lastError:
            error instanceof Error ? error.message : 'Initialization failed',
        })
      } finally {
        initializationRef.current = false
      }
    }

    initPostHog()
  }, [])

  // Handle user identification
  useEffect(() => {
    if (!posthog) return

    if (user) {
      posthog.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        created_at: user.created_at,
        // Add beta user identification if available
        is_beta_user: user.app_metadata?.beta_status === 'active',
      })
    } else {
      posthog.reset()
    }
  }, [posthog, user])

  // If PostHog health check is not done, show loading state
  if (!healthCheckDone) {
    return <>{children}</>
  }

  // If PostHog is not available or healthy, render without analytics
  if (!isHealthy || !posthog) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[PostHog] Analytics disabled - content blocker or network issue detected'
      )
    }
    return <>{children}</>
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
