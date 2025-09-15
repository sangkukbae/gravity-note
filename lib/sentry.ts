/**
 * Sentry Integration Utilities
 *
 * This module provides a wrapper around Sentry functionality to maintain
 * compatibility with existing error handling and monitoring code while
 * using the new instrumentation-based setup.
 */

import * as Sentry from '@sentry/nextjs'
import type { Metric } from 'web-vitals'

// Sentry configuration and feature flags
export const SENTRY_FEATURES = {
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  performance: true,
  replay: process.env.NODE_ENV === 'production',
  profiling: process.env.NODE_ENV === 'production',
} as const

// User context interface
export interface UserContext {
  id: string
  email?: string
  username?: string
  name?: string
  avatar_url?: string
}

// Sentry error context interface
export interface SentryErrorContext {
  component?: string
  operation?: string
  extra?: Record<string, any>
  tags?: Record<string, string>
  errorId?: string
  url?: string
  userAgent?: string
  componentStack?: string
  retryCount?: number
  timestamp?: string
  userFeedback?: string | { description: string; type: string; email?: string }
}

/**
 * Initialize Sentry context with user information
 */
export function initializeSentryContext(user?: UserContext) {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  if (user) {
    const sentryUser: Record<string, string> = {
      id: user.id,
    }

    if (user.email) {
      sentryUser.email = user.email
    }

    if (user.username || user.name) {
      sentryUser.username = user.username || user.name || ''
    }

    Sentry.setUser(sentryUser)
  }

  // Set initial tags
  Sentry.setTag('app.name', 'gravity-note')
  Sentry.setTag(
    'app.version',
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development'
  )
  Sentry.setTag('app.environment', process.env.NODE_ENV || 'development')
}

/**
 * Set user context in Sentry
 */
export function setSentryUserContext(user: UserContext) {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  const sentryUser: Record<string, string> = {
    id: user.id,
  }

  if (user.email) {
    sentryUser.email = user.email
  }

  if (user.username || user.name) {
    sentryUser.username = user.username || user.name || ''
  }

  Sentry.setUser(sentryUser)

  Sentry.setTag('user.authenticated', 'true')
}

/**
 * Clear Sentry user context (on logout)
 */
export function clearSentryContext() {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.setUser(null)
  Sentry.setTag('user.authenticated', 'false')
}

/**
 * Set application context information
 */
export function setApplicationContext(context: {
  route?: string
  component?: string
  operation?: string
  [key: string]: any
}) {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.setContext('application', {
    route: context.route,
    component: context.component,
    operation: context.operation,
    timestamp: new Date().toISOString(),
    ...context,
  })
}

/**
 * Add navigation breadcrumb
 */
export function addNavigationBreadcrumb(from: string, to: string) {
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
 * Add interaction breadcrumb
 */
export function addInteractionBreadcrumb(
  action: string,
  target: string,
  data?: Record<string, any>
) {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.addBreadcrumb({
    category: 'user',
    message: `User ${action} on ${target}`,
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
 * Add breadcrumb wrapper (alias for consistency) - supports both call patterns
 */
export function addBreadcrumb(
  categoryOrBreadcrumb:
    | string
    | {
        category?: string
        message: string
        level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal'
        data?: Record<string, any>
      },
  message?: string,
  dataOrLevel?:
    | Record<string, any>
    | 'debug'
    | 'info'
    | 'warning'
    | 'error'
    | 'fatal',
  level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal'
) {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  let breadcrumbData: {
    category: string
    message: string
    level: 'debug' | 'info' | 'warning' | 'error' | 'fatal'
    data: Record<string, any>
  }

  if (typeof categoryOrBreadcrumb === 'string') {
    // Legacy call pattern: addBreadcrumb(category, message, data, level)
    breadcrumbData = {
      category: categoryOrBreadcrumb,
      message: message || '',
      level: (typeof dataOrLevel === 'string' ? dataOrLevel : level) || 'info',
      data: typeof dataOrLevel === 'object' ? dataOrLevel : {},
    }
  } else {
    // New call pattern: addBreadcrumb({ category, message, level, data })
    breadcrumbData = {
      category: categoryOrBreadcrumb.category || 'default',
      message: categoryOrBreadcrumb.message,
      level: categoryOrBreadcrumb.level || 'info',
      data: categoryOrBreadcrumb.data || {},
    }
  }

  Sentry.addBreadcrumb({
    category: breadcrumbData.category,
    message: breadcrumbData.message,
    level: breadcrumbData.level,
    data: {
      timestamp: new Date().toISOString(),
      ...breadcrumbData.data,
    },
  })
}

/**
 * Track Web Vitals with Sentry
 */
export function trackWebVital(name: string, value: number, id: string) {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  // Use Sentry's built-in web vitals tracking
  Sentry.addBreadcrumb({
    category: 'vitals',
    message: `${name}: ${value}`,
    level: 'info',
    data: {
      name,
      value,
      id,
      timestamp: new Date().toISOString(),
    },
  })

  // Also set as context for the current transaction
  Sentry.setContext('webVitals', {
    [name]: {
      value,
      id,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Capture an exception with additional context
 */
export function captureException(error: Error, context?: SentryErrorContext) {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  return Sentry.withScope(scope => {
    // Set tags for better filtering and categorization
    scope.setTag('component', context?.component || 'unknown')
    scope.setTag('operation', context?.operation || 'unknown')

    // Add custom tags
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value)
      })
    }

    // Set context for detailed debugging
    scope.setContext('error_context', {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent:
        typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      component: context?.component,
      operation: context?.operation,
      errorId: context?.errorId,
      retryCount: context?.retryCount || 0,
      ...context?.extra,
    })

    // Set fingerprint for better grouping if provided
    if (context?.component && context?.operation) {
      scope.setFingerprint([context.component, context.operation, error.name])
    }

    // Set level based on context
    if (context?.tags?.severity === 'critical') {
      scope.setLevel('fatal')
    } else if (
      error.name.includes('Network') ||
      error.message.includes('fetch')
    ) {
      scope.setLevel('warning')
    } else {
      scope.setLevel('error')
    }

    return Sentry.captureException(error, scope)
  })
}

/**
 * Capture error (alias for consistency)
 */
export function captureError(error: Error, context?: SentryErrorContext) {
  return captureException(error, context)
}

/**
 * Capture a message with additional context
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: SentryErrorContext
) {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  return Sentry.captureMessage(message, {
    level,
    tags: {
      component: context?.component || 'unknown',
      operation: context?.operation || 'unknown',
      ...context?.tags,
    },
    extra: {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      ...context?.extra,
    },
  })
}

/**
 * Start a new Sentry transaction (v8 compatible)
 */
export function startTransaction(name: string, operation: string) {
  if (!SENTRY_FEATURES.enabled) {
    return null
  }

  return Sentry.startSpan(
    {
      name,
      op: operation,
    },
    span => span
  )
}

/**
 * Add span to current transaction
 */
export function startSpan(operation: string, description: string) {
  if (!SENTRY_FEATURES.enabled) {
    return null
  }

  return Sentry.startSpan(
    {
      op: operation,
      name: description,
    },
    span => span
  )
}

/**
 * Capture critical error with enhanced context
 */
export function captureCriticalError(
  error: Error,
  context?: SentryErrorContext
) {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  return Sentry.captureException(error, {
    level: 'fatal',
    tags: {
      component: context?.component || 'unknown',
      operation: context?.operation || 'unknown',
      severity: 'critical',
      ...context?.tags,
    },
    extra: {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent:
        typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      ...context?.extra,
    },
  })
}

/**
 * Flush Sentry events (useful for serverless functions)
 */
export async function flush(timeout = 5000) {
  if (!SENTRY_FEATURES.enabled) {
    return true
  }

  return Sentry.flush(timeout)
}

/**
 * Capture network error
 */
export function captureNetworkError(
  error: Error,
  context?: SentryErrorContext & {
    url?: string
    status?: number
    method?: string
  }
) {
  return captureException(error, {
    ...context,
    tags: {
      ...context?.tags,
      error_type: 'network',
    },
  })
}

/**
 * Capture authentication error
 */
export function captureAuthError(
  error: Error,
  context?: SentryErrorContext & {
    auth_flow?: string
    provider?: string
  }
) {
  return captureException(error, {
    ...context,
    tags: {
      ...context?.tags,
      error_type: 'auth',
    },
  })
}

/**
 * Capture feature-specific error with enhanced context
 */
export function captureFeatureError(
  error: Error,
  feature: string,
  action: string,
  userId?: string,
  additionalContext?: SentryErrorContext
) {
  return captureException(error, {
    ...additionalContext,
    component: feature,
    operation: action,
    tags: {
      feature,
      action,
      ...(userId && { user_id: userId }),
      ...additionalContext?.tags,
    },
  })
}

/**
 * Capture performance issue
 */
export function capturePerformanceIssue(
  name: string,
  duration: number,
  threshold: number,
  context?: {
    component?: string
    operation?: string
    url?: string
    additional?: Record<string, any>
  }
) {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  return captureMessage(
    `Performance issue detected: ${name} took ${duration}ms (threshold: ${threshold}ms)`,
    'warning',
    {
      component: context?.component || 'performance',
      operation: context?.operation || 'timing',
      tags: {
        performance_issue: 'true',
        metric_name: name,
      },
      extra: {
        duration,
        threshold,
        exceeded_by: duration - threshold,
        url: context?.url,
        ...context?.additional,
      },
    }
  )
}

/**
 * Capture user action with context
 */
export function captureUserAction(
  action: string,
  component: string,
  success: boolean,
  context?: {
    userId?: string
    duration?: number
    additional?: Record<string, any>
  }
) {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  addBreadcrumb({
    category: 'user_action',
    message: `User ${success ? 'successfully' : 'unsuccessfully'} performed ${action} in ${component}`,
    level: success ? 'info' : 'warning',
    data: {
      action,
      component,
      success,
      userId: context?.userId,
      duration: context?.duration,
      ...context?.additional,
    },
  })
}

/**
 * Check if Sentry is properly enabled and configured
 */
export function isSentryEnabled(): boolean {
  return SENTRY_FEATURES.enabled && !!process.env.NEXT_PUBLIC_SENTRY_DSN
}
