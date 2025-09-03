/**
 * Error Classification System for Gravity Note
 *
 * Defines error types, severity levels, and user-facing messages
 * for comprehensive error handling throughout the application
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTH = 'auth',
  DATABASE = 'database',
  RUNTIME = 'runtime',
  PERMISSION = 'permission',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown',
}

/**
 * Base error interface for all classified errors
 */
export interface ClassifiedError {
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  userMessage: string
  code?: string
  originalError?: Error | undefined
  context?: Record<string, any> | undefined
  timestamp: Date
  isRetryable: boolean
}

/**
 * Network-related errors
 */
export class NetworkError extends Error implements ClassifiedError {
  readonly category = ErrorCategory.NETWORK
  readonly severity = ErrorSeverity.HIGH
  readonly userMessage: string
  readonly isRetryable = true
  readonly timestamp = new Date()
  readonly originalError?: Error | undefined
  readonly context?: Record<string, any> | undefined

  constructor(
    message: string,
    originalError?: Error | undefined,
    context?: Record<string, any> | undefined
  ) {
    super(message)
    this.name = 'NetworkError'
    this.originalError = originalError
    this.context = context
    this.userMessage =
      'Connection error. Please check your internet connection and try again.'
  }
}

/**
 * Validation errors
 */
export class ValidationError extends Error implements ClassifiedError {
  readonly category = ErrorCategory.VALIDATION
  readonly severity = ErrorSeverity.MEDIUM
  readonly userMessage: string
  readonly isRetryable = false
  readonly timestamp = new Date()
  readonly originalError?: Error | undefined
  readonly context?: Record<string, any> | undefined

  constructor(
    message: string,
    userMessage?: string,
    originalError?: Error | undefined,
    context?: Record<string, any> | undefined
  ) {
    super(message)
    this.name = 'ValidationError'
    this.originalError = originalError
    this.context = context
    this.userMessage = userMessage || 'Please check your input and try again.'
  }
}

/**
 * Authentication validation errors (specialized validation error)
 */
export class AuthValidationError extends ValidationError {
  readonly authErrorType?: string | undefined
  readonly authField?: 'email' | 'password' | 'confirmPassword' | undefined

  constructor(
    message: string,
    userMessage?: string,
    authErrorType?: string | undefined,
    authField?: 'email' | 'password' | 'confirmPassword' | undefined,
    originalError?: Error | undefined,
    context?: Record<string, any> | undefined
  ) {
    super(message, userMessage, originalError, context)
    this.name = 'AuthValidationError'
    this.authErrorType = authErrorType
    this.authField = authField
  }
}

/**
 * Authentication errors
 */
export class AuthError extends Error implements ClassifiedError {
  readonly category = ErrorCategory.AUTH
  readonly severity = ErrorSeverity.HIGH
  readonly userMessage: string
  readonly isRetryable = false
  readonly timestamp = new Date()
  readonly originalError?: Error | undefined
  readonly context?: Record<string, any> | undefined

  constructor(
    message: string,
    originalError?: Error | undefined,
    context?: Record<string, any> | undefined
  ) {
    super(message)
    this.name = 'AuthError'
    this.originalError = originalError
    this.context = context
    this.userMessage = 'Authentication failed. Please sign in again.'
  }
}

/**
 * Database operation errors
 */
export class DatabaseError extends Error implements ClassifiedError {
  readonly category = ErrorCategory.DATABASE
  readonly severity = ErrorSeverity.HIGH
  readonly userMessage: string
  readonly isRetryable = true
  readonly timestamp = new Date()
  readonly originalError?: Error | undefined
  readonly context?: Record<string, any> | undefined

  constructor(
    message: string,
    originalError?: Error | undefined,
    context?: Record<string, any> | undefined
  ) {
    super(message)
    this.name = 'DatabaseError'
    this.originalError = originalError
    this.context = context
    this.userMessage = 'Unable to save your changes. Please try again.'
  }
}

/**
 * Runtime errors
 */
export class RuntimeError extends Error implements ClassifiedError {
  readonly category = ErrorCategory.RUNTIME
  readonly severity = ErrorSeverity.CRITICAL
  readonly userMessage: string
  readonly isRetryable = true
  readonly timestamp = new Date()
  readonly originalError?: Error | undefined
  readonly context?: Record<string, any> | undefined

  constructor(
    message: string,
    originalError?: Error | undefined,
    context?: Record<string, any> | undefined
  ) {
    super(message)
    this.name = 'RuntimeError'
    this.originalError = originalError
    this.context = context
    this.userMessage =
      'Something went wrong. Please refresh the page and try again.'
  }
}

/**
 * Permission errors
 */
export class PermissionError extends Error implements ClassifiedError {
  readonly category = ErrorCategory.PERMISSION
  readonly severity = ErrorSeverity.MEDIUM
  readonly userMessage: string
  readonly isRetryable = false
  readonly timestamp = new Date()
  readonly originalError?: Error | undefined
  readonly context?: Record<string, any> | undefined

  constructor(
    message: string,
    originalError?: Error | undefined,
    context?: Record<string, any> | undefined
  ) {
    super(message)
    this.name = 'PermissionError'
    this.originalError = originalError
    this.context = context
    this.userMessage = 'You do not have permission to perform this action.'
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends Error implements ClassifiedError {
  readonly category = ErrorCategory.RATE_LIMIT
  readonly severity = ErrorSeverity.MEDIUM
  readonly userMessage: string
  readonly isRetryable = true
  readonly timestamp = new Date()
  readonly originalError?: Error | undefined
  readonly context?: Record<string, any> | undefined

  constructor(
    message: string,
    originalError?: Error | undefined,
    context?: Record<string, any> | undefined
  ) {
    super(message)
    this.name = 'RateLimitError'
    this.originalError = originalError
    this.context = context
    this.userMessage = 'Too many requests. Please wait a moment and try again.'
  }
}

/**
 * Utility function to classify unknown errors
 */
export function classifyError(error: unknown): ClassifiedError {
  // If already classified, return as is
  if (
    error instanceof Error &&
    'category' in error &&
    'severity' in error &&
    'userMessage' in error &&
    'timestamp' in error &&
    'isRetryable' in error
  ) {
    return error as ClassifiedError
  }

  // If it's a standard Error, try to classify based on message
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      error.name === 'NetworkError'
    ) {
      return new NetworkError(error.message, error)
    }

    // Auth errors
    if (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('token') ||
      message.includes('login') ||
      error.name === 'AuthError'
    ) {
      return new AuthError(error.message, error)
    }

    // Database errors
    if (
      message.includes('database') ||
      message.includes('sql') ||
      message.includes('query') ||
      message.includes('supabase') ||
      error.name === 'PostgrestError'
    ) {
      return new DatabaseError(error.message, error)
    }

    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      error.name === 'ValidationError'
    ) {
      return new ValidationError(error.message, undefined, error)
    }

    // Rate limit errors
    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429')
    ) {
      return new RateLimitError(error.message, error)
    }

    // Permission errors
    if (
      message.includes('forbidden') ||
      message.includes('permission') ||
      message.includes('403')
    ) {
      return new PermissionError(error.message, error)
    }

    // Default to runtime error for unclassified Error instances
    return new RuntimeError(error.message, error)
  }

  // For non-Error objects, create a runtime error
  const errorMessage =
    typeof error === 'string' ? error : 'An unexpected error occurred'
  return new RuntimeError(errorMessage, undefined, { originalValue: error })
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: unknown): string {
  const classifiedError = classifyError(error)
  return classifiedError.userMessage
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const classifiedError = classifyError(error)
  return classifiedError.isRetryable
}

/**
 * Get error severity
 */
export function getErrorSeverity(error: unknown): ErrorSeverity {
  const classifiedError = classifyError(error)
  return classifiedError.severity
}

/**
 * Create error context for logging
 */
export function createErrorContext(
  error: unknown,
  additionalContext?: Record<string, any>
): Record<string, any> {
  const classifiedError = classifyError(error)

  return {
    category: classifiedError.category,
    severity: classifiedError.severity,
    timestamp: classifiedError.timestamp.toISOString(),
    isRetryable: classifiedError.isRetryable,
    userAgent:
      typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    ...classifiedError.context,
    ...additionalContext,
  }
}

/**
 * Format error for logging services
 */
export function formatErrorForLogging(
  error: unknown,
  additionalContext?: Record<string, any>
) {
  const classifiedError = classifyError(error)
  const context = createErrorContext(error, additionalContext)

  return {
    message: classifiedError.message,
    category: classifiedError.category,
    severity: classifiedError.severity,
    fingerprint: [classifiedError.category, classifiedError.message],
    tags: {
      category: classifiedError.category,
      severity: classifiedError.severity,
      retryable: classifiedError.isRetryable.toString(),
    },
    contexts: {
      error: context,
    },
    extra: context,
  }
}
