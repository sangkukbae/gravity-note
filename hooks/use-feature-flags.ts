'use client'

import {
  useFeatureFlagEnabled,
  useFeatureFlagVariantKey,
} from 'posthog-js/react'
import { usePostHog } from 'posthog-js/react'
import { useCallback } from 'react'

export interface FeatureFlagVariants {
  [key: string]: string | boolean | undefined
}

export function useFeatureFlag(flagKey: string): boolean {
  const isEnabled = useFeatureFlagEnabled(flagKey)
  return isEnabled ?? false
}

export function useFeatureFlagVariant(flagKey: string): string | undefined {
  const variantKeyOrEnabled = useFeatureFlagVariantKey(flagKey)
  return typeof variantKeyOrEnabled === 'string'
    ? variantKeyOrEnabled
    : undefined
}

export function useFeatureFlags() {
  const posthog = usePostHog()

  // Check multiple flags at once
  const checkFlags = useCallback(
    (flagKeys: string[]): Record<string, boolean> => {
      if (!posthog) return {}

      return flagKeys.reduce(
        (flags, key) => {
          flags[key] = posthog.isFeatureEnabled(key) ?? false
          return flags
        },
        {} as Record<string, boolean>
      )
    },
    [posthog]
  )

  // Get all active feature flags
  const getActiveFlags = useCallback(() => {
    if (!posthog) return {}
    try {
      return (posthog as any).getFeatureFlags?.() || {}
    } catch (error) {
      console.warn('Failed to get feature flags:', error)
      return {}
    }
  }, [posthog])

  // Override feature flag for development/testing
  const overrideFlag = useCallback(
    (flagKey: string, value: boolean | string) => {
      if (posthog && process.env.NODE_ENV === 'development') {
        try {
          ;(posthog as any).override_feature_flag?.(flagKey, value)
          console.log(`[Feature Flag] Overridden ${flagKey} to:`, value)
        } catch (error) {
          console.warn('Failed to override feature flag:', error)
        }
      }
    },
    [posthog]
  )

  // Clear all feature flag overrides
  const clearOverrides = useCallback(() => {
    if (posthog && process.env.NODE_ENV === 'development') {
      try {
        ;(posthog as any).clear_feature_flag_overrides?.()
        console.log('[Feature Flag] Cleared all overrides')
      } catch (error) {
        console.warn('Failed to clear overrides:', error)
      }
    }
  }, [posthog])

  return {
    checkFlags,
    getActiveFlags,
    overrideFlag,
    clearOverrides,
  }
}

// Hook for feature flag with fallback value
export function useFeatureFlagWithFallback(
  flagKey: string,
  fallbackValue: boolean = false
): boolean {
  const isEnabled = useFeatureFlagEnabled(flagKey)
  return isEnabled ?? fallbackValue
}

// Hook for A/B testing variants
export function useABTest(
  flagKey: string,
  variants: Record<string, any> = {}
): { variant: string | undefined; value: any } {
  const variant = useFeatureFlagVariant(flagKey)

  return {
    variant,
    value: variant && variants[variant] ? variants[variant] : variants.default,
  }
}
