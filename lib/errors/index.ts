/**
 * Error Handling System Export Index
 *
 * Provides a centralized export point for all error handling utilities
 * and components in the Gravity Note application
 */

// Error Classification System
export {
  ErrorSeverity,
  ErrorCategory,
  type ClassifiedError,
  NetworkError,
  ValidationError,
  AuthError,
  DatabaseError,
  RuntimeError,
  PermissionError,
  RateLimitError,
  classifyError,
  getUserErrorMessage,
  isRetryableError,
  getErrorSeverity,
  createErrorContext,
  formatErrorForLogging,
} from './classification'

// Advanced Network Error System
export {
  NetworkErrorType,
  NetworkQuality,
  type RetryStrategy,
  type NetworkErrorDetails,
  NetworkError as AdvancedNetworkError,
  ConnectionError,
  TimeoutError,
  HttpClientError,
  HttpServerError,
  RateLimitError as NetworkRateLimitError,
  RETRY_STRATEGIES,
  classifyNetworkError,
  retryWithBackoff,
  isRetryableNetworkError,
  getRateLimitDelay,
} from './network-errors'

// Re-export Global Error Boundary for convenience
export {
  GlobalErrorBoundary,
  withGlobalErrorBoundary,
  GlobalErrorWrapper,
} from '../../components/error-boundary/global-error-boundary'
