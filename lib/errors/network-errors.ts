/**
 * Advanced Network Error Classification for Gravity Note
 *
 * Provides comprehensive network error types, classification, and handling strategies
 * with detailed error analysis, retry configurations, and user-friendly messaging.
 */

import type {
  ClassifiedError,
  ErrorCategory,
  ErrorSeverity,
} from './classification'

/**
 * Network error types for specific classification
 */
export enum NetworkErrorType {
  CONNECTION = 'connection',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  HTTP_CLIENT = 'http_client', // 4xx errors
  HTTP_SERVER = 'http_server', // 5xx errors
  AUTHENTICATION = 'authentication', // 401, 403
  PAYLOAD = 'payload', // 413, 422
  DNS = 'dns',
  CORS = 'cors',
  ABORT = 'abort',
  UNKNOWN = 'unknown',
}

/**
 * Network quality estimation
 */
export enum NetworkQuality {
  EXCELLENT = 'excellent', // <100ms, >10Mbps
  GOOD = 'good', // <300ms, >1Mbps
  FAIR = 'fair', // <1000ms, >100Kbps
  POOR = 'poor', // >1000ms, <100Kbps
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
}

/**
 * Retry strategy configuration
 */
export interface RetryStrategy {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  jitterMs: number
  backoffMultiplier: number
  retryCondition: (error: NetworkError) => boolean
}

/**
 * Network error details for comprehensive analysis
 */
export interface NetworkErrorDetails {
  httpStatus?: number
  httpStatusText?: string
  requestMethod?: string
  requestUrl?: string
  responseHeaders?: Record<string, string>
  requestDuration?: number
  retryAttempt?: number
  userAgent?: string
  connectionType?: string
  networkQuality?: NetworkQuality
}

/**
 * Base network error class with comprehensive classification
 */
export class NetworkError extends Error implements ClassifiedError {
  readonly category = 'network' as ErrorCategory
  readonly severity: ErrorSeverity
  readonly userMessage: string
  readonly isRetryable: boolean
  readonly timestamp = new Date()
  readonly originalError?: Error | undefined
  readonly context?: Record<string, any> | undefined

  readonly networkType: NetworkErrorType
  readonly details: NetworkErrorDetails
  readonly retryStrategy: RetryStrategy

  constructor(
    message: string,
    networkType: NetworkErrorType,
    details: NetworkErrorDetails = {},
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message)
    this.name = 'NetworkError'
    this.networkType = networkType
    this.details = details
    this.originalError = originalError
    this.context = context

    // Set severity and retry behavior based on network error type
    const config = getNetworkErrorConfig(networkType, details)
    this.severity = config.severity
    this.isRetryable = config.isRetryable
    this.userMessage = config.userMessage
    this.retryStrategy = config.retryStrategy
  }
}

/**
 * Specific network error types
 */
export class ConnectionError extends NetworkError {
  constructor(
    message: string = 'Network connection failed',
    details: NetworkErrorDetails = {},
    originalError?: Error
  ) {
    super(message, NetworkErrorType.CONNECTION, details, originalError)
    this.name = 'ConnectionError'
  }
}

export class TimeoutError extends NetworkError {
  constructor(
    message: string = 'Request timed out',
    details: NetworkErrorDetails = {},
    originalError?: Error
  ) {
    super(message, NetworkErrorType.TIMEOUT, details, originalError)
    this.name = 'TimeoutError'
  }
}

export class HttpClientError extends NetworkError {
  constructor(
    message: string,
    details: NetworkErrorDetails = {},
    originalError?: Error
  ) {
    super(message, NetworkErrorType.HTTP_CLIENT, details, originalError)
    this.name = 'HttpClientError'
  }
}

export class HttpServerError extends NetworkError {
  constructor(
    message: string,
    details: NetworkErrorDetails = {},
    originalError?: Error
  ) {
    super(message, NetworkErrorType.HTTP_SERVER, details, originalError)
    this.name = 'HttpServerError'
  }
}

export class RateLimitError extends NetworkError {
  readonly retryAfter?: number | undefined

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    details: NetworkErrorDetails = {},
    originalError?: Error
  ) {
    super(message, NetworkErrorType.RATE_LIMIT, details, originalError)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * Network error configuration based on type and details
 */
interface NetworkErrorConfig {
  severity: ErrorSeverity
  isRetryable: boolean
  userMessage: string
  retryStrategy: RetryStrategy
}

/**
 * Default retry strategies for different error types
 */
export const RETRY_STRATEGIES: Record<NetworkErrorType, RetryStrategy> = {
  [NetworkErrorType.CONNECTION]: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    jitterMs: 500,
    backoffMultiplier: 2,
    retryCondition: () => true,
  },
  [NetworkErrorType.TIMEOUT]: {
    maxAttempts: 2,
    baseDelayMs: 2000,
    maxDelayMs: 8000,
    jitterMs: 1000,
    backoffMultiplier: 2,
    retryCondition: () => true,
  },
  [NetworkErrorType.RATE_LIMIT]: {
    maxAttempts: 3,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
    jitterMs: 2000,
    backoffMultiplier: 1.5,
    retryCondition: () => true,
  },
  [NetworkErrorType.HTTP_SERVER]: {
    maxAttempts: 2,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    jitterMs: 500,
    backoffMultiplier: 2,
    retryCondition: (error: NetworkError) => {
      const status = error.details.httpStatus
      return status === 502 || status === 503 || status === 504
    },
  },
  [NetworkErrorType.HTTP_CLIENT]: {
    maxAttempts: 0, // Client errors are not retryable
    baseDelayMs: 0,
    maxDelayMs: 0,
    jitterMs: 0,
    backoffMultiplier: 1,
    retryCondition: () => false,
  },
  [NetworkErrorType.AUTHENTICATION]: {
    maxAttempts: 0, // Auth errors need user intervention
    baseDelayMs: 0,
    maxDelayMs: 0,
    jitterMs: 0,
    backoffMultiplier: 1,
    retryCondition: () => false,
  },
  [NetworkErrorType.PAYLOAD]: {
    maxAttempts: 0, // Payload errors are not retryable
    baseDelayMs: 0,
    maxDelayMs: 0,
    jitterMs: 0,
    backoffMultiplier: 1,
    retryCondition: () => false,
  },
  [NetworkErrorType.DNS]: {
    maxAttempts: 2,
    baseDelayMs: 3000,
    maxDelayMs: 10000,
    jitterMs: 1000,
    backoffMultiplier: 2,
    retryCondition: () => true,
  },
  [NetworkErrorType.CORS]: {
    maxAttempts: 0, // CORS errors need configuration fixes
    baseDelayMs: 0,
    maxDelayMs: 0,
    jitterMs: 0,
    backoffMultiplier: 1,
    retryCondition: () => false,
  },
  [NetworkErrorType.ABORT]: {
    maxAttempts: 0, // Aborted requests are intentional
    baseDelayMs: 0,
    maxDelayMs: 0,
    jitterMs: 0,
    backoffMultiplier: 1,
    retryCondition: () => false,
  },
  [NetworkErrorType.UNKNOWN]: {
    maxAttempts: 1,
    baseDelayMs: 2000,
    maxDelayMs: 5000,
    jitterMs: 1000,
    backoffMultiplier: 2,
    retryCondition: () => true,
  },
}

/**
 * Get network error configuration based on type and details
 */
function getNetworkErrorConfig(
  type: NetworkErrorType,
  details: NetworkErrorDetails
): NetworkErrorConfig {
  const baseStrategy = RETRY_STRATEGIES[type]

  switch (type) {
    case NetworkErrorType.CONNECTION:
      return {
        severity: 'high' as ErrorSeverity,
        isRetryable: true,
        userMessage:
          'Unable to connect. Please check your internet connection and try again.',
        retryStrategy: baseStrategy,
      }

    case NetworkErrorType.TIMEOUT:
      return {
        severity: 'medium' as ErrorSeverity,
        isRetryable: true,
        userMessage:
          'Request timed out. Please check your connection and try again.',
        retryStrategy: baseStrategy,
      }

    case NetworkErrorType.RATE_LIMIT:
      return {
        severity: 'medium' as ErrorSeverity,
        isRetryable: true,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        retryStrategy: baseStrategy,
      }

    case NetworkErrorType.HTTP_CLIENT:
      const clientStatus = details.httpStatus
      return {
        severity: 'medium' as ErrorSeverity,
        isRetryable: false,
        userMessage: getHttpClientErrorMessage(clientStatus),
        retryStrategy: baseStrategy,
      }

    case NetworkErrorType.HTTP_SERVER:
      return {
        severity: 'high' as ErrorSeverity,
        isRetryable: true,
        userMessage:
          'Server error. We are working to fix this. Please try again shortly.',
        retryStrategy: baseStrategy,
      }

    case NetworkErrorType.AUTHENTICATION:
      return {
        severity: 'high' as ErrorSeverity,
        isRetryable: false,
        userMessage: 'Authentication required. Please sign in again.',
        retryStrategy: baseStrategy,
      }

    case NetworkErrorType.PAYLOAD:
      return {
        severity: 'medium' as ErrorSeverity,
        isRetryable: false,
        userMessage:
          'Content too large or invalid format. Please try with smaller content.',
        retryStrategy: baseStrategy,
      }

    case NetworkErrorType.DNS:
      return {
        severity: 'high' as ErrorSeverity,
        isRetryable: true,
        userMessage:
          'Unable to resolve server address. Please check your connection.',
        retryStrategy: baseStrategy,
      }

    case NetworkErrorType.CORS:
      return {
        severity: 'critical' as ErrorSeverity,
        isRetryable: false,
        userMessage:
          'Access blocked by security policy. Please contact support.',
        retryStrategy: baseStrategy,
      }

    case NetworkErrorType.ABORT:
      return {
        severity: 'low' as ErrorSeverity,
        isRetryable: false,
        userMessage: 'Request was cancelled.',
        retryStrategy: baseStrategy,
      }

    default:
      return {
        severity: 'medium' as ErrorSeverity,
        isRetryable: true,
        userMessage: 'Network error occurred. Please try again.',
        retryStrategy: baseStrategy,
      }
  }
}

/**
 * Get specific user message for HTTP client errors
 */
function getHttpClientErrorMessage(status?: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.'
    case 401:
      return 'Authentication required. Please sign in again.'
    case 403:
      return 'Access denied. You do not have permission to perform this action.'
    case 404:
      return 'Requested resource not found.'
    case 409:
      return 'Conflict occurred. The resource may have been modified by another user.'
    case 413:
      return 'Content too large. Please reduce the size and try again.'
    case 422:
      return 'Invalid data format. Please check your input and try again.'
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    default:
      return 'Request failed. Please check your input and try again.'
  }
}

/**
 * Classify network errors from various sources
 */
export function classifyNetworkError(
  error: unknown,
  requestDetails?: Partial<NetworkErrorDetails>
): NetworkError {
  const details: NetworkErrorDetails = {
    ...requestDetails,
    ...(typeof navigator !== 'undefined' && { userAgent: navigator.userAgent }),
  }

  // If already a NetworkError, return as is
  if (error instanceof NetworkError) {
    return error
  }

  // Handle fetch errors and HTTP responses
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const name = error.name?.toLowerCase() || ''

    // Connection errors
    if (
      name === 'networkerror' ||
      message.includes('network error') ||
      message.includes('failed to fetch') ||
      message.includes('load failed') ||
      message.includes('connection refused') ||
      message.includes('connection reset') ||
      message.includes('connection aborted')
    ) {
      return new ConnectionError(error.message, details, error)
    }

    // Timeout errors
    if (
      name === 'timeouterror' ||
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('deadline exceeded')
    ) {
      return new TimeoutError(error.message, details, error)
    }

    // DNS errors
    if (
      message.includes('dns') ||
      message.includes('name not resolved') ||
      message.includes('getaddrinfo') ||
      message.includes('host not found')
    ) {
      return new NetworkError(
        error.message,
        NetworkErrorType.DNS,
        details,
        error
      )
    }

    // CORS errors
    if (
      message.includes('cors') ||
      message.includes('cross-origin') ||
      message.includes('access-control-allow-origin')
    ) {
      return new NetworkError(
        error.message,
        NetworkErrorType.CORS,
        details,
        error
      )
    }

    // Abort errors
    if (
      name === 'aborterror' ||
      message.includes('aborted') ||
      message.includes('cancelled')
    ) {
      return new NetworkError(
        error.message,
        NetworkErrorType.ABORT,
        details,
        error
      )
    }
  }

  // HTTP status code classification
  const httpStatus = details.httpStatus
  if (httpStatus) {
    if (httpStatus === 429) {
      // Extract retry-after header if available
      const retryAfter = details.responseHeaders?.['retry-after']
      const retryAfterSeconds = retryAfter
        ? parseInt(retryAfter, 10)
        : undefined
      return new RateLimitError(
        'Rate limit exceeded',
        retryAfterSeconds,
        details,
        error instanceof Error ? error : undefined
      )
    }

    if (httpStatus >= 400 && httpStatus < 500) {
      if (httpStatus === 401 || httpStatus === 403) {
        return new NetworkError(
          `Authentication error: ${httpStatus}`,
          NetworkErrorType.AUTHENTICATION,
          details,
          error instanceof Error ? error : undefined
        )
      }

      if (httpStatus === 413 || httpStatus === 422) {
        return new NetworkError(
          `Payload error: ${httpStatus}`,
          NetworkErrorType.PAYLOAD,
          details,
          error instanceof Error ? error : undefined
        )
      }

      return new HttpClientError(
        `Client error: ${httpStatus}`,
        details,
        error instanceof Error ? error : undefined
      )
    }

    if (httpStatus >= 500 && httpStatus < 600) {
      return new HttpServerError(
        `Server error: ${httpStatus}`,
        details,
        error instanceof Error ? error : undefined
      )
    }
  }

  // Default to unknown network error
  const errorMessage = error instanceof Error ? error.message : String(error)
  return new NetworkError(
    errorMessage,
    NetworkErrorType.UNKNOWN,
    details,
    error instanceof Error ? error : undefined
  )
}

/**
 * Enhanced retry utility with exponential backoff and jitter
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  strategy: RetryStrategy,
  onRetry?: (attempt: number, error: NetworkError) => void
): Promise<T> {
  let lastError: NetworkError

  for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const networkError = classifyNetworkError(error, {
        retryAttempt: attempt,
      })
      lastError = networkError

      // Check if this error should be retried
      if (
        !strategy.retryCondition(networkError) ||
        attempt === strategy.maxAttempts
      ) {
        throw networkError
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay =
        strategy.baseDelayMs * Math.pow(strategy.backoffMultiplier, attempt - 1)
      const jitter = Math.random() * strategy.jitterMs
      const delay = Math.min(baseDelay + jitter, strategy.maxDelayMs)

      // Notify about retry attempt
      if (onRetry) {
        onRetry(attempt, networkError)
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Check if an error is a retryable network error
 */
export function isRetryableNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return error.isRetryable && error.retryStrategy.retryCondition(error)
  }

  // Classify and check retryability
  const networkError = classifyNetworkError(error)
  return (
    networkError.isRetryable &&
    networkError.retryStrategy.retryCondition(networkError)
  )
}

/**
 * Get retry delay for rate-limited requests
 */
export function getRateLimitDelay(error: NetworkError): number {
  if (error instanceof RateLimitError && error.retryAfter) {
    return error.retryAfter * 1000 // Convert to milliseconds
  }

  // Default rate limit delay from strategy
  return error.retryStrategy.baseDelayMs
}
