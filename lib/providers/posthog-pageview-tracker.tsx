'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'
import { Suspense, useEffect } from 'react'

// Inner component that uses useSearchParams
function PostHogPageViewInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()

  useEffect(() => {
    // Track page views only if PostHog is available
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + '?' + searchParams.toString()
      }

      // Capture page view with additional context
      posthog.capture('$pageview', {
        $current_url: url,
        $pathname: pathname,
        $search_params: searchParams?.toString() || '',
        // Add Gravity Note specific context
        app_section: getAppSection(pathname),
      })
    }
  }, [pathname, searchParams, posthog])

  return null
}

// Fallback component for Suspense boundary
function PostHogPageViewFallback() {
  return null
}

// Main export with Suspense wrapper
export function PostHogPageView() {
  return (
    <Suspense fallback={<PostHogPageViewFallback />}>
      <PostHogPageViewInner />
    </Suspense>
  )
}

// Helper function to categorize app sections for analytics
function getAppSection(pathname: string): string {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/auth')) return 'authentication'
  if (pathname.startsWith('/dashboard')) return 'main_app'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/beta')) return 'beta_features'
  return 'other'
}
