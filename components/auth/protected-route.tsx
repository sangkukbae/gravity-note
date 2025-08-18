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
