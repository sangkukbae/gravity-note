/**
 * Sentry Performance Monitoring Utilities
 *
 * Provides utilities for tracking application performance including
 * API calls, database operations, and user interactions.
 */

import * as Sentry from '@sentry/nextjs'
import { SENTRY_FEATURES } from './config'
import { addApiCallBreadcrumb, addDatabaseBreadcrumb } from './context'
import { startTransaction as startSentryTransaction } from './capture'

/**
 * Performance monitoring wrapper for async operations
 */
export async function withPerformanceMonitoring<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  if (!SENTRY_FEATURES.enabled || !SENTRY_FEATURES.tracing) {
    return fn()
  }

  const transaction = startSentryTransaction(name, operation, context)

  const startTime = Date.now()

  try {
    const result = await fn()
    transaction?.setAttributes({ status: 'ok' })
    return result
  } catch (error) {
    transaction?.setAttributes({ status: 'error' })
    throw error
  } finally {
    const duration = Date.now() - startTime
    transaction?.setAttributes({ duration })
    transaction?.end()
  }
}

/**
 * Monitor API call performance
 */
export async function monitorApiCall<T>(
  method: string,
  url: string,
  fn: () => Promise<T>,
  options: {
    includeRequestData?: boolean
    includeResponseData?: boolean
    sanitizeUrl?: boolean
  } = {}
): Promise<T> {
  const sanitizedUrl = options.sanitizeUrl
    ? url.replace(/\/[0-9a-f-]{36}/g, '/[ID]') // Replace UUIDs
    : url

  const transactionName = `${method} ${sanitizedUrl}`
  const startTime = Date.now()

  if (!SENTRY_FEATURES.enabled || !SENTRY_FEATURES.tracing) {
    return fn()
  }

  const transaction = startSentryTransaction(transactionName, 'http.client', {
    method,
    url: sanitizedUrl,
  })

  try {
    const result = await fn()
    const duration = Date.now() - startTime

    transaction?.setAttributes({ status: 'ok', duration })

    // Add breadcrumb for successful API call
    addApiCallBreadcrumb(method, sanitizedUrl, 200, duration)

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    // Try to extract status code from error
    const statusCode =
      (error as any)?.status || (error as any)?.statusCode || 500

    transaction?.setAttributes({
      status: 'error',
      error: (error as Error)?.message,
      statusCode,
      duration,
    })

    // Add breadcrumb for failed API call
    addApiCallBreadcrumb(method, sanitizedUrl, statusCode, duration)

    throw error
  } finally {
    transaction?.end()
  }
}

/**
 * Monitor database operation performance
 */
export async function monitorDatabaseOperation<T>(
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert',
  table: string,
  fn: () => Promise<T>,
  context?: {
    query?: string
    params?: any
  }
): Promise<T> {
  const transactionName = `db.${operation}.${table}`
  const startTime = Date.now()

  if (!SENTRY_FEATURES.enabled || !SENTRY_FEATURES.tracing) {
    return fn()
  }

  const transaction = startSentryTransaction(transactionName, 'db', {
    operation,
    table,
    // Don't include sensitive query data
    hasQuery: !!context?.query,
    hasParams: !!context?.params,
  })

  try {
    const result = await fn()
    const duration = Date.now() - startTime

    transaction?.setAttributes({ status: 'ok', duration })

    // Add breadcrumb for successful database operation
    addDatabaseBreadcrumb(operation, table, true, duration)

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    transaction?.setAttributes({
      status: 'error',
      error: (error as Error)?.message,
      duration,
    })

    // Add breadcrumb for failed database operation
    addDatabaseBreadcrumb(operation, table, false, duration)

    throw error
  } finally {
    transaction?.end()
  }
}

/**
 * Monitor component render performance
 */
export function monitorComponentRender(componentName: string) {
  if (
    !SENTRY_FEATURES.enabled ||
    !SENTRY_FEATURES.tracing ||
    typeof window === 'undefined'
  ) {
    return null
  }

  return startSentryTransaction(`render.${componentName}`, 'ui.react.render', {
    component: componentName,
  })
}

/**
 * Monitor route navigation performance
 */
export function monitorNavigation(from: string, to: string) {
  if (!SENTRY_FEATURES.enabled || !SENTRY_FEATURES.tracing) {
    return null
  }

  return startSentryTransaction(`navigation.${to}`, 'navigation', {
    from,
    to,
  })
}

/**
 * Track custom performance metric
 */
export function trackPerformanceMetric(
  name: string,
  value: number,
  unit: string = 'millisecond',
  tags?: Record<string, string>
) {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  Sentry.setMeasurement(name, value, unit)

  if (tags) {
    Sentry.withScope(scope => {
      Object.entries(tags).forEach(([key, value]) => {
        scope.setTag(key, value)
      })

      Sentry.addBreadcrumb({
        category: 'performance',
        message: `Performance metric: ${name}`,
        level: 'info',
        data: {
          name,
          value,
          unit,
          ...tags,
        },
      })
    })
  }
}

/**
 * Track Web Vitals
 */
export function trackWebVital(name: string, value: number, id?: string) {
  if (!SENTRY_FEATURES.enabled) {
    return
  }

  // Map Web Vitals to Sentry measurements
  const metricName = `web_vital.${name.toLowerCase()}`

  Sentry.setMeasurement(metricName, value, 'millisecond')

  Sentry.addBreadcrumb({
    category: 'web-vital',
    message: `Web Vital: ${name}`,
    level: 'info',
    data: {
      name,
      value,
      id,
      rating: getWebVitalRating(name, value),
    },
  })
}

/**
 * Get Web Vital rating based on thresholds
 */
function getWebVitalRating(
  name: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = {
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    FID: { good: 100, poor: 300 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 },
  }

  const threshold = thresholds[name as keyof typeof thresholds]
  if (!threshold) return 'good'

  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

/**
 * Create a span for manual instrumentation
 */
export function createSpan(
  name: string,
  operation: string,
  data?: Record<string, any>
): Sentry.Span | null {
  if (!SENTRY_FEATURES.enabled || !SENTRY_FEATURES.tracing) {
    return null
  }

  return Sentry.startInactiveSpan({
    name,
    op: operation,
    attributes: data ?? {},
  })
}

/**
 * Finish a span with result
 */
export function finishSpan(
  span: Sentry.Span | null,
  success: boolean = true,
  data?: Record<string, any>
) {
  if (!span) return

  if (data) {
    span.setAttributes(data)
  }

  span.setAttributes({ success })
  span.end()
}
