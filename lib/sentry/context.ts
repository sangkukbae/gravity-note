/**
 * Sentry Context Management
 *
 * Provides utilities for setting and managing Sentry context including
 * user information, application state, and performance data.
 */

import * as Sentry from '@sentry/nextjs'
import { SENTRY_FEATURES, COMMON_TAGS } from './config'

/**
 * Application context interface
 */
export interface ApplicationContext {
  route?: string
  component?: string
  feature?: string
  operation?: string
  buildId?: string
  deploymentId?: string
  [key: string]: any
}

/**
 * User context interface (privacy-aware)
 */
export interface UserContext {
  id?: string
  email?: string
  role?: string
  plan?: string
  createdAt?: string
  lastLoginAt?: string
  // Never include sensitive data like passwords, tokens, etc.
}

/**
 * Performance context interface
 */
export interface PerformanceContext {
  [key: string]: unknown
  connectionType?: string
  deviceMemory?: number
  hardwareConcurrency?: number
  effectiveType?: string
  downlink?: number
  rtt?: number
}

/**
 * Set user context with privacy considerations
 */
export function setSentryUserContext(user: UserContext): void {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  // Only set non-sensitive user information
  const sanitizedUser = {
    ...(user.id ? { id: user.id } : {}),
    ...(user.email ? { email: user.email } : {}), // Only include if explicitly consented
    // Don't include role or plan in production for privacy
    ...(process.env.NODE_ENV === 'development' && {
      role: user.role,
      plan: user.plan,
    }),
  }

  Sentry.setUser(sanitizedUser)

  // Add user metadata as context (not as user object)
  Sentry.setContext('user_metadata', {
    hasEmail: !!user.email,
    hasRole: !!user.role,
    hasPlan: !!user.plan,
    accountAge: user.createdAt
      ? Math.floor(
          (Date.now() - new Date(user.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : undefined,
    lastLogin: user.lastLoginAt,
  })
}

/**
 * Set application context
 */
export function setApplicationContext(context: ApplicationContext): void {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.setContext('application', {
    ...context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    referrer: typeof window !== 'undefined' ? document.referrer : undefined,
  })

  // Set route as tag for better filtering
  if (context.route) {
    Sentry.setTag('route', context.route)
  }

  // Set component as tag
  if (context.component) {
    Sentry.setTag('component', context.component)
  }
}

/**
 * Set performance context from browser APIs
 */
export function setPerformanceContext(): void {
  if (!SENTRY_FEATURES.enabled || typeof window === 'undefined') {
    return
  }

  const context: PerformanceContext = {}

  // Network Information API
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection
  if (connection) {
    context.connectionType = connection.type
    context.effectiveType = connection.effectiveType
    context.downlink = connection.downlink
    context.rtt = connection.rtt
  }

  // Device Memory API
  const deviceMemory = (navigator as any).deviceMemory
  if (deviceMemory) {
    context.deviceMemory = deviceMemory
  }

  // Hardware Concurrency
  if (navigator.hardwareConcurrency) {
    context.hardwareConcurrency = navigator.hardwareConcurrency
  }

  Sentry.setContext('performance', context as Record<string, unknown>)
}

/**
 * Set device context
 */
export function setDeviceContext(): void {
  if (!SENTRY_FEATURES.enabled || typeof window === 'undefined') {
    return
  }

  const screen = window.screen
  const context = {
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    orientation: screen.orientation?.type,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    languages: navigator.languages,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
  }

  Sentry.setContext('device', context)
}

/**
 * Set build and deployment context
 */
export function setBuildContext(): void {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  const context = {
    buildId: process.env.NEXT_PUBLIC_BUILD_ID,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    deploymentUrl: process.env.VERCEL_URL,
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA,
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF,
    gitRepo: process.env.VERCEL_GIT_REPO_SLUG,
    buildTime: process.env.BUILD_TIME,
    nodeEnv: process.env.NODE_ENV,
  }

  Sentry.setContext('build', context)
}

/**
 * Add breadcrumb for navigation
 */
export function addNavigationBreadcrumb(from: string, to: string): void {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated from ${from} to ${to}`,
    level: 'info',
    data: {
      from,
      to,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Add breadcrumb for user interaction
 */
export function addInteractionBreadcrumb(
  action: string,
  target: string,
  data?: Record<string, any>
): void {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.addBreadcrumb({
    category: 'user',
    message: `User ${action} ${target}`,
    level: 'info',
    data: {
      action,
      target,
      timestamp: new Date().toISOString(),
      ...data,
    },
  })
}

/**
 * Add breadcrumb for API calls
 */
export function addApiCallBreadcrumb(
  method: string,
  url: string,
  statusCode?: number,
  duration?: number
): void {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.addBreadcrumb({
    category: 'http',
    message: `${method} ${url}`,
    level: statusCode && statusCode >= 400 ? 'error' : 'info',
    data: {
      method,
      url: url.replace(/\/[0-9a-f-]{36}/g, '/[ID]'), // Replace UUIDs with placeholder
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Add breadcrumb for database operations
 */
export function addDatabaseBreadcrumb(
  operation: string,
  table: string,
  success: boolean,
  duration?: number
): void {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.addBreadcrumb({
    category: 'db',
    message: `${operation} on ${table}`,
    level: success ? 'info' : 'error',
    data: {
      operation,
      table,
      success,
      duration,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Clear all context (useful for user logout)
 */
export function clearSentryContext(): void {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.setUser(null)

  // Clear specific contexts but keep application/build context
  Sentry.setContext('user_metadata', null)
  Sentry.setContext('performance', null)

  // Remove user-specific tags
  Sentry.setTag('userId', null)
  Sentry.setTag('userRole', null)
}

/**
 * Initialize all context on app start
 */
export function initializeSentryContext(user?: UserContext): void {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  // Set common tags
  Object.entries(COMMON_TAGS).forEach(([key, value]) => {
    Sentry.setTag(key, value)
  })

  // Set build context
  setBuildContext()

  // Set device context (client-side only)
  if (typeof window !== 'undefined') {
    setDeviceContext()
    setPerformanceContext()
  }

  // Set user context if provided
  if (user) {
    setSentryUserContext(user)
  }
}
