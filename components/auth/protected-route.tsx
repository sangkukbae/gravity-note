'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  redirectTo = '/auth/signin',
}: ProtectedRouteProps) {
  const { user, loading, initialized } = useAuthStore()
  const router = useRouter()
  const redirectScheduledRef = useRef<number | null>(null)
  const didRedirectRef = useRef(false)

  // Core guard: after auth initializes, if no user, redirect.
  // Add a small grace period to avoid a false-negative right after
  // OAuth callbacks while Supabase hydrates the session on the client.
  useEffect(() => {
    // Clear any pending redirect when state changes
    if (redirectScheduledRef.current) {
      window.clearTimeout(redirectScheduledRef.current)
      redirectScheduledRef.current = null
    }

    if (!initialized || loading || user || didRedirectRef.current) return

    // Schedule a short, one-off recheck before redirecting
    redirectScheduledRef.current = window.setTimeout(() => {
      const {
        user: currentUser,
        initialized: init,
        loading: isLoading,
      } = useAuthStore.getState()

      if (!currentUser && init && !isLoading && !didRedirectRef.current) {
        didRedirectRef.current = true
        // Use replace to avoid polluting history (prevents back navigation
        // to a protected page after logout).
        router.replace(redirectTo)
      }
    }, 300)

    return () => {
      if (redirectScheduledRef.current) {
        window.clearTimeout(redirectScheduledRef.current)
        redirectScheduledRef.current = null
      }
    }
  }, [user, loading, initialized, router, redirectTo])

  // Note: We rely on server middleware + replace() above rather than
  // BFCache prevention or visibility listeners. This avoids false redirects
  // during the OAuth callback hydration window and keeps history clean.

  // Show loading state while checking auth
  if (!initialized || loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div
          className='animate-spin rounded-full h-32 w-32 border-b-2 border-primary'
          role='status'
          aria-label='Loading authentication status'
        >
          <span className='sr-only'>Loading...</span>
        </div>
      </div>
    )
  }

  // If no user after loading, don't render children (redirect will happen)
  if (!user) {
    return null
  }

  return <>{children}</>
}
