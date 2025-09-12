'use client'

import { useEffect } from 'react'
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

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.push(redirectTo)
    }
  }, [user, loading, initialized, router, redirectTo])

  // Security: Prevent BFCache and handle page visibility for auth verification
  useEffect(() => {
    // Prevent BFCache to ensure auth checks run on back navigation
    const preventBFCache = () => {
      // This event ensures the page is removed from BFCache
    }

    // Re-verify auth when page becomes visible (e.g., back navigation)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && initialized && !loading) {
        // OAuth 콜백 후 세션 로드 시간 확보를 위한 딜레이
        // Google SSO와 같은 OAuth 플로우에서 세션이 완전히 로드되기 전에
        // 리다이렉션이 발생하는 것을 방지합니다
        setTimeout(() => {
          // 다시 한 번 현재 user 상태 확인 (Zustand store에서 직접 가져오기)
          const currentState = useAuthStore.getState()
          if (
            !currentState.user &&
            currentState.initialized &&
            !currentState.loading
          ) {
            router.push(redirectTo)
          }
        }, 500) // 500ms 딜레이로 세션 로드 시간 확보
      }
    }

    // Set up event listeners
    window.addEventListener('beforeunload', preventBFCache)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', preventBFCache)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, loading, initialized, router, redirectTo])

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
