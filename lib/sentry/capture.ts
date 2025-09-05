/**
 * Enhanced Error Capture Utilities for Sentry Integration
 *
 * Provides specialized error capture functions that integrate with the existing
 * error classification system while adding Sentry-specific metadata and context.
 */

import * as Sentry from '@sentry/nextjs'
import {
  classifyError,
  formatErrorForLogging,
  ErrorCategory,
  ErrorSeverity,
  type ClassifiedError,
} from '@/lib/errors/classification'
import { SENTRY_FEATURES, shouldIgnoreError, COMMON_TAGS } from './config'

/**
 * Enhanced error capture context
 */
export interface SentryErrorContext {
  operation?: string
  component?: string
  componentStack?: string
  userId?: string
  userEmail?: string
  url?: string
  userAgent?: string
  timestamp?: string
  sessionId?: string
  buildId?: string
  [key: string]: any
}

/**
 * Capture error with enhanced context and classification
 */
export function captureError(
  error: unknown,
  context: SentryErrorContext = {}
): string | null {
  if (!SENTRY_FEATURES.enabled) {
    return null
  }

  // Check if error should be ignored
  if (shouldIgnoreError(error)) {
    return null
  }

  // Classify the error using existing system
  const classifiedError = classifyError(error)

  // Format for logging to get standardized structure
  const formattedError = formatErrorForLogging(error, context)

  // Create error ID for tracking
  const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Configure Sentry scope with enhanced context
  Sentry.withScope(scope => {
    // Set error level based on severity
    const sentryLevel = mapSeverityToSentryLevel(classifiedError.severity)
    scope.setLevel(sentryLevel)

    // Set tags
    scope.setTags({
      ...COMMON_TAGS,
      ...formattedError.tags,
      errorId,
      handled: 'true',
    })

    // Set context
    scope.setContext('error_details', {
      ...formattedError.contexts?.error,
      ...context,
      classification: {
        category: classifiedError.category,
        severity: classifiedError.severity,
        isRetryable: classifiedError.isRetryable,
        userMessage: classifiedError.userMessage,
      },
    })

    // Set extra data
    scope.setExtras({
      ...formattedError.extra,
      originalErrorName: (error as Error)?.name,
      originalErrorStack: (error as Error)?.stack,
    })

    // Set fingerprint for better grouping
    scope.setFingerprint([
      classifiedError.category,
      classifiedError.message.substring(0, 100), // Truncate for grouping
    ])

    // Set user context if available
    if (context.userId || context.userEmail) {
      scope.setUser({
        ...(context.userId ? { id: context.userId } : {}),
        ...(context.userEmail ? { email: context.userEmail } : {}),
      })
    }

    // Capture the error
    Sentry.captureException(error)
  })

  return errorId
}

/**
 * Capture critical error with enhanced reporting
 */
export function captureCriticalError(
  error: unknown,
  context: SentryErrorContext = {}
): string | null {
  if (!SENTRY_FEATURES.enabled) {
    return null
  }

  const errorId = captureError(error, { ...context, critical: true })

  // For critical errors, also capture additional context
  if (errorId) {
    Sentry.withScope(scope => {
      scope.setLevel('fatal')
      scope.setTag('critical', 'true')

      // Add breadcrumb for critical error
      Sentry.addBreadcrumb({
        category: 'critical_error',
        message: 'Critical error captured',
        level: 'fatal',
        data: {
          errorId,
          component: context.component,
          operation: context.operation,
        },
      })

      // Set additional context for critical errors
      scope.setContext('critical_error_context', {
        errorId,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : context.url,
        userAgent:
          typeof window !== 'undefined'
            ? window.navigator.userAgent
            : context.userAgent,
      })
    })
  }

  return errorId
}

/**
 * Capture network error with retry context
 */
export function captureNetworkError(
  error: unknown,
  requestContext: {
    url?: string
    method?: string
    statusCode?: number
    response?: any
    retryAttempt?: number
  } = {}
): string | null {
  if (!SENTRY_FEATURES.enabled) {
    return null
  }

  return captureError(error, {
    operation: 'network_request',
    ...requestContext,
    networkError: true,
  })
}

/**
 * Capture authentication error
 */
export function captureAuthError(
  error: unknown,
  authContext: {
    authMethod?: string
    provider?: string
    redirectUrl?: string
    isSignUp?: boolean
  } = {}
): string | null {
  if (!SENTRY_FEATURES.enabled) {
    return null
  }

  return captureError(error, {
    operation: 'authentication',
    ...authContext,
    authError: true,
  })
}

/**
 * Capture database error with query context
 */
export function captureDatabaseError(
  error: unknown,
  dbContext: {
    table?: string
    operation?: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
    query?: string
    params?: any
  } = {}
): string | null {
  if (!SENTRY_FEATURES.enabled) {
    return null
  }

  // Sanitize sensitive data
  const sanitizedContext = {
    ...dbContext,
    // Remove potentially sensitive query parameters
    params: dbContext.params ? '[REDACTED]' : undefined,
    query: dbContext.query
      ? dbContext.query.substring(0, 200) + '...'
      : undefined,
  }

  return captureError(error, {
    operation: 'database_operation',
    ...sanitizedContext,
    databaseError: true,
  })
}

/**
 * Capture validation error with form context
 */
export function captureValidationError(
  error: unknown,
  validationContext: {
    formName?: string
    fieldName?: string
    fieldValue?: any
    validationRule?: string
  } = {}
): string | null {
  if (!SENTRY_FEATURES.enabled) {
    return null
  }

  // Sanitize sensitive form data
  const sanitizedContext = {
    ...validationContext,
    fieldValue: validationContext.fieldValue ? '[REDACTED]' : undefined,
  }

  return captureError(error, {
    operation: 'validation',
    ...sanitizedContext,
    validationError: true,
  })
}

/**
 * Add breadcrumb for user actions
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
): void {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data: {
      timestamp: new Date().toISOString(),
      ...data,
    },
  })
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string,
  data?: Record<string, any>
): ReturnType<typeof Sentry.startInactiveSpan> | null {
  if (!SENTRY_FEATURES.enabled || !SENTRY_FEATURES.tracing) {
    return null
  }

  return Sentry.startInactiveSpan({
    name,
    op,
    attributes: {
      ...COMMON_TAGS,
      ...(data ?? {}),
    },
  })
}

/**
 * Set user context
 */
export function setUserContext(user: {
  id?: string
  email?: string
  username?: string
}): void {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.setUser(user)
}

/**
 * Clear user context (for sign out)
 */
export function clearUserContext(): void {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.setUser(null)
}

/**
 * Map error severity to Sentry level
 */
function mapSeverityToSentryLevel(
  severity: ErrorSeverity
): Sentry.SeverityLevel {
  switch (severity) {
    case ErrorSeverity.LOW:
      return 'info'
    case ErrorSeverity.MEDIUM:
      return 'warning'
    case ErrorSeverity.HIGH:
      return 'error'
    case ErrorSeverity.CRITICAL:
      return 'fatal'
    default:
      return 'error'
  }
}

/**
 * Capture message with context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: SentryErrorContext
): void {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.withScope(scope => {
    scope.setLevel(level)
    scope.setTags(COMMON_TAGS)

    if (context) {
      scope.setContext('message_context', context)
    }

    Sentry.captureMessage(message)
  })
}
