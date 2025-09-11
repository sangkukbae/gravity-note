/**
 * Development environment configuration
 * Centralizes all development-specific settings
 */

export const isDevelopment = process.env.NODE_ENV === 'development'
export const isProduction = process.env.NODE_ENV === 'production'

export const developmentConfig = {
  // Analytics settings
  analytics: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    posthog: {
      enabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
      key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      debug:
        isDevelopment &&
        process.env.NEXT_PUBLIC_POSTHOG_ENVIRONMENT === 'development',
    },
    vercel: {
      enabled: isProduction,
      id: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID,
    },
  },

  // PWA settings
  pwa: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_PWA === 'true',
    serviceWorker: {
      enabled: process.env.NEXT_PUBLIC_ENABLE_PWA === 'true' && isProduction,
    },
  },

  // Error tracking
  sentry: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_SENTRY === 'true' || isProduction,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
  },

  // Logging levels
  logging: {
    enableConsoleLogging: isDevelopment,
    enableAnalyticsLogging:
      isDevelopment && process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enablePWALogging:
      isDevelopment && process.env.NEXT_PUBLIC_ENABLE_PWA === 'true',
  },

  // Features
  features: {
    betaSystem: true,
    realtimeNotes: true,
    advancedSearch: true,
  },
}

/**
 * Utility function to check if a feature is enabled
 */
export function isFeatureEnabled(
  feature: keyof typeof developmentConfig.features
): boolean {
  return developmentConfig.features[feature]
}

/**
 * Utility function to check if analytics should be initialized
 */
export function shouldInitializeAnalytics(): boolean {
  return developmentConfig.analytics.enabled || isProduction
}

/**
 * Utility function to check if PWA should be enabled
 */
export function shouldEnablePWA(): boolean {
  return developmentConfig.pwa.enabled
}

/**
 * Console logging helper that respects development settings
 */
export const devLog = {
  info: (message: string, ...args: any[]) => {
    if (developmentConfig.logging.enableConsoleLogging) {
      console.log(`[DEV] ${message}`, ...args)
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (developmentConfig.logging.enableConsoleLogging) {
      console.warn(`[DEV] ${message}`, ...args)
    }
  },
  error: (message: string, ...args: any[]) => {
    if (developmentConfig.logging.enableConsoleLogging) {
      console.error(`[DEV] ${message}`, ...args)
    }
  },
  analytics: (message: string, ...args: any[]) => {
    if (developmentConfig.logging.enableAnalyticsLogging) {
      console.log(`[ANALYTICS] ${message}`, ...args)
    }
  },
}
