'use client'

import {
  useFeatureFlag,
  useFeatureFlagVariant,
} from '@/hooks/use-feature-flags'
import { useAuthStore } from '@/lib/stores/auth'
import { ReactNode } from 'react'

interface FeatureGateProps {
  /**
   * The feature flag key to check
   */
  flag: string

  /**
   * What to render when the feature is disabled
   */
  fallback?: ReactNode

  /**
   * Children to render when the feature is enabled
   */
  children: ReactNode

  /**
   * Only show to beta users (requires user to have beta_status: 'active')
   */
  betaOnly?: boolean

  /**
   * Required user roles or permissions
   */
  requiredRoles?: string[]

  /**
   * Invert the flag (show content when flag is OFF)
   */
  invert?: boolean
}

export function FeatureGate({
  flag,
  fallback = null,
  children,
  betaOnly = false,
  requiredRoles = [],
  invert = false,
}: FeatureGateProps) {
  const isEnabled = useFeatureFlag(flag)
  const { user } = useAuthStore()

  // Check beta user requirement
  if (betaOnly) {
    const isBetaUser = user?.app_metadata?.beta_status === 'active'
    if (!isBetaUser) {
      return <>{fallback}</>
    }
  }

  // Check user roles requirement
  if (requiredRoles.length > 0) {
    const userRoles = user?.app_metadata?.roles || []
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role))
    if (!hasRequiredRole) {
      return <>{fallback}</>
    }
  }

  // Apply feature flag logic
  const shouldShow = invert ? !isEnabled : isEnabled

  return shouldShow ? <>{children}</> : <>{fallback}</>
}

/**
 * Component for A/B testing with variants
 */
interface VariantGateProps {
  flag: string
  variants: Record<string, ReactNode>
  fallback?: ReactNode
}

export function VariantGate({
  flag,
  variants,
  fallback = null,
}: VariantGateProps) {
  const variant = useFeatureFlagVariant(flag)

  if (!variant || !(variant in variants)) {
    return <>{fallback}</>
  }

  return <>{variants[variant]}</>
}

/**
 * Beta feature badge component
 */
export function BetaBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200 ${className}`}
    >
      Beta
    </span>
  )
}

/**
 * Wrapper for experimental features
 */
interface ExperimentalFeatureProps {
  flag: string
  name: string
  description?: string
  children: ReactNode
  fallback?: ReactNode
}

export function ExperimentalFeature({
  flag,
  name,
  description,
  children,
  fallback = null,
}: ExperimentalFeatureProps) {
  const isEnabled = useFeatureFlag(flag)

  if (!isEnabled) {
    return <>{fallback}</>
  }

  return (
    <div className='relative'>
      {/* Show beta badge in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className='absolute -top-2 -right-2 z-10'>
          <BetaBadge />
        </div>
      )}

      {description && process.env.NODE_ENV === 'development' && (
        <div className='mb-2 p-2 text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded'>
          <strong>Experimental:</strong> {description}
        </div>
      )}

      {children}
    </div>
  )
}
