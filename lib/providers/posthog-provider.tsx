'use client'

import { PostHogProvider } from 'posthog-js/react'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth'

// Lazy load PostHog to optimize bundle size
let posthogPromise: Promise<any> | null = null

async function getPostHog() {
  if (!posthogPromise) {
    posthogPromise = import('posthog-js')
  }
  return posthogPromise
}

export function PostHogAnalyticsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [posthog, setPostHog] = useState<any>(null)
  const { user } = useAuthStore()

  useEffect(() => {
    async function initPostHog() {
      // Only initialize on client side and if PostHog key is available
      if (
        typeof window === 'undefined' ||
        !process.env.NEXT_PUBLIC_POSTHOG_KEY ||
        process.env.NEXT_PUBLIC_POSTHOG_KEY === 'phc_test_key_placeholder'
      ) {
        return
      }

      try {
        const { default: posthog } = await getPostHog()

        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',

          // Next.js App Router optimizations
          capture_pageview: false, // We'll handle this manually
          capture_pageleave: true,

          // Development settings
          loaded: (posthog: any) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('[PostHog] Initialized in development mode')
              posthog.debug(
                process.env.NEXT_PUBLIC_POSTHOG_ENVIRONMENT === 'development'
              )
            }
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

          // Disable features we don't need initially
          disable_session_recording: true,

          // Respect user preferences
          respect_dnt: true,
        })

        setPostHog(posthog)
      } catch (error) {
        console.error('[PostHog] Failed to initialize:', error)
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

  // If PostHog is not initialized, just render children
  if (!posthog) {
    return <>{children}</>
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
