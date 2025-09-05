/**
 * Centralized Sentry Configuration
 *
 * Provides shared configuration values and utilities for Sentry integration
 * across client, server, and edge runtime environments.
 */

/**
 * Environment detection
 */
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isProduction = process.env.NODE_ENV === 'production'
export const isTest = process.env.NODE_ENV === 'test'

/**
 * Sentry configuration values
 */
export const SENTRY_CONFIG = {
  // DSN from environment
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release tracking
  release:
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Sample rates based on environment
  tracesSampleRate: {
    development: 1.0,
    production: 0.1,
    test: 0.0,
  },

  replaysSessionSampleRate: {
    development: 0.0,
    production: 0.1,
    test: 0.0,
  },

  replaysOnErrorSampleRate: {
    development: 0.0,
    production: 1.0,
    test: 0.0,
  },

  profilesSampleRate: {
    development: 0.0,
    production: 0.1,
    test: 0.0,
  },
} as const

/**
 * Get environment-specific sample rate
 */
export function getSampleRate(
  type:
    | 'tracesSampleRate'
    | 'replaysSessionSampleRate'
    | 'replaysOnErrorSampleRate'
    | 'profilesSampleRate',
  environment: keyof typeof SENTRY_CONFIG.tracesSampleRate = SENTRY_CONFIG.environment as keyof typeof SENTRY_CONFIG.tracesSampleRate
) {
  const rates = SENTRY_CONFIG[type]
  return rates[environment] ?? rates.development
}

/**
 * Common error patterns to ignore
 */
export const IGNORED_ERROR_PATTERNS = [
  // Browser extensions
  'top.GLOBALS',
  'originalCreateNotification',
  'canvas.contentDocument',
  'MyApp_RemoveAllHighlights',
  'http://tt.epicplay.com',
  "Can't find variable: ZiteReader",
  'jigsaw is not defined',
  'ComboSearch is not defined',
  'http://loading.retry.widdit.com/',
  'atomicFindClose',

  // Network errors that are handled gracefully
  'NetworkError when attempting to fetch resource',
  'Failed to fetch',
  'fetch failed',
  'connection timeout',

  // Generic script errors (usually from extensions)
  'Script error.',

  // React DevTools
  '__REACT_DEVTOOLS_GLOBAL_HOOK__',

  // Next.js development
  'webpack',
  'next-dev',

  // Expected server errors
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',

  // Edge runtime limitations
  'The edge runtime does not support Node.js',
  'Dynamic Code Evaluation is not allowed in Edge Runtime',
] as const

/**
 * Check if error should be ignored
 */
export function shouldIgnoreError(error: unknown): boolean {
  if (!error) return true

  const errorMessage =
    typeof error === 'string' ? error : (error as Error)?.message || ''
  const errorName = (error as Error)?.name || ''

  return IGNORED_ERROR_PATTERNS.some(
    pattern => errorMessage.includes(pattern) || errorName.includes(pattern)
  )
}

/**
 * Get allowed URLs for error reporting
 */
export function getAllowedUrls(): RegExp[] {
  if (typeof window === 'undefined') {
    // Server-side: allow all
    return [/.*/]
  }

  if (isProduction) {
    // Production: only current domain
    return [new RegExp(window.location.hostname)]
  }

  // Development: allow all
  return [/.*/]
}

/**
 * Common Sentry tags for the application
 */
export const COMMON_TAGS = {
  app: 'gravity-note',
  version: process.env.npm_package_version || 'unknown',
} as const

/**
 * Feature flags for Sentry
 */
export const SENTRY_FEATURES = {
  enabled: process.env.NEXT_PUBLIC_ENABLE_SENTRY !== 'false' && !isTest,
  replay: isProduction && process.env.NEXT_PUBLIC_SENTRY_REPLAY !== 'false',
  profiling:
    isProduction && process.env.NEXT_PUBLIC_SENTRY_PROFILING !== 'false',
  tracing: process.env.NEXT_PUBLIC_SENTRY_TRACING !== 'false',
} as const
