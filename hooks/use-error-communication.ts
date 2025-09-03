'use client'

import { useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import {
  classifyError,
  ErrorCategory,
  ErrorSeverity,
  type ClassifiedError,
} from '@/lib/errors/classification'
import {
  showErrorToast,
  errorToastVariants,
  dismissAllErrorToasts,
} from '@/components/error/error-toast'
import { useRouter } from 'next/navigation'

/**
 * Error communication strategy configuration
 */
interface ErrorCommunicationConfig {
  // Toast behavior
  enableToasts?: boolean
  persistentToasts?: boolean
  dismissPreviousErrors?: boolean

  // Error reporting
  enableReporting?: boolean
  reportingEndpoint?: string

  // Recovery actions
  enableRetry?: boolean
  enableReload?: boolean
  enableNavigation?: boolean

  // Context awareness
  context?: string
  operation?: string
  userId?: string
}

/**
 * Error communication result
 */
interface ErrorCommunicationResult {
  id: string
  error: ClassifiedError
  handled: boolean
  actions: string[]
}

/**
 * Recovery action handlers
 */
interface RecoveryActions {
  onRetry?: () => void | Promise<void>
  onReload?: () => void
  onGoHome?: () => void
  onSignIn?: () => void
  onReport?: () => void
  onDismiss?: () => void
}

/**
 * Default error communication configuration
 */
const DEFAULT_CONFIG: Required<ErrorCommunicationConfig> = {
  enableToasts: true,
  persistentToasts: false,
  dismissPreviousErrors: false,
  enableReporting: true,
  reportingEndpoint: '/api/errors',
  enableRetry: true,
  enableReload: true,
  enableNavigation: true,
  context: 'general',
  operation: 'unknown',
  userId: 'anonymous',
}

/**
 * Hook for centralized error communication
 */
export function useErrorCommunication(config: ErrorCommunicationConfig = {}) {
  const router = useRouter()
  const configRef = useRef({ ...DEFAULT_CONFIG, ...config })
  const errorHistory = useRef<Map<string, ErrorCommunicationResult>>(new Map())

  // Update config without re-rendering
  const updateConfig = useCallback(
    (newConfig: Partial<ErrorCommunicationConfig>) => {
      configRef.current = { ...configRef.current, ...newConfig }
    },
    []
  )

  /**
   * Report error to backend/monitoring service
   */
  const reportError = useCallback(
    async (
      error: ClassifiedError,
      context: Record<string, any> = {}
    ): Promise<void> => {
      if (!configRef.current.enableReporting) return

      try {
        const errorReport = {
          errorId: `${error.timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
          message: error.message,
          category: error.category,
          severity: error.severity,
          stack: error.originalError?.stack,
          timestamp: error.timestamp.toISOString(),
          context: {
            ...context,
            operation: configRef.current.operation,
            userId: configRef.current.userId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
            ...error.context,
          },
        }

        // Send to backend (in production, you might want to use a service like Sentry)
        await fetch(configRef.current.reportingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorReport),
        }).catch(reportingError => {
          console.warn('Failed to report error:', reportingError)
        })
      } catch (reportingError) {
        console.warn('Error reporting failed:', reportingError)
      }
    },
    []
  )

  /**
   * Create recovery actions for an error
   */
  const createRecoveryActions = useCallback(
    (
      error: ClassifiedError,
      customActions: RecoveryActions = {}
    ): RecoveryActions => {
      const actions: RecoveryActions = {}

      // Retry action for retryable errors
      if (error.isRetryable && configRef.current.enableRetry) {
        if (customActions.onRetry) {
          actions.onRetry = customActions.onRetry
        }
      }

      // Reload action for critical errors
      if (
        configRef.current.enableReload &&
        (error.severity === ErrorSeverity.CRITICAL || !error.isRetryable)
      ) {
        actions.onReload =
          customActions.onReload || (() => window.location.reload())
      }

      // Navigation actions
      if (configRef.current.enableNavigation) {
        actions.onGoHome = customActions.onGoHome || (() => router.push('/'))

        // Sign in action for auth errors
        if (
          error.category === ErrorCategory.AUTH ||
          error.category === ErrorCategory.PERMISSION
        ) {
          actions.onSignIn =
            customActions.onSignIn || (() => router.push('/auth/signin'))
        }
      }

      // Report action
      if (configRef.current.enableReporting) {
        actions.onReport =
          customActions.onReport ||
          (() => {
            reportError(error, { userInitiated: true })

            // Show success toast
            toast.success(
              'Error reported successfully. Thank you for helping us improve!'
            )
          })
      }

      // Always allow dismiss
      actions.onDismiss = customActions.onDismiss || (() => toast.dismiss())

      return actions
    },
    [router, reportError]
  )

  /**
   * Show contextual error communication
   */
  const communicateError = useCallback(
    (
      error: unknown,
      customActions: RecoveryActions = {},
      options: {
        context?: string
        operation?: string
        showToast?: boolean
        persistent?: boolean
        fieldName?: string
      } = {}
    ): ErrorCommunicationResult => {
      // Classify the error
      const classifiedError = classifyError(error)

      // Generate unique error ID
      const errorId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Create result object
      const result: ErrorCommunicationResult = {
        id: errorId,
        error: classifiedError,
        handled: false,
        actions: [],
      }

      // Store in history
      errorHistory.current.set(errorId, result)

      // Clean up old entries (keep last 50)
      if (errorHistory.current.size > 50) {
        const oldestKey = errorHistory.current.keys().next().value
        if (oldestKey !== undefined) {
          errorHistory.current.delete(oldestKey)
        }
      }

      // Report error automatically for high/critical severity
      if (
        classifiedError.severity === ErrorSeverity.HIGH ||
        classifiedError.severity === ErrorSeverity.CRITICAL
      ) {
        reportError(classifiedError, {
          context: options.context || configRef.current.context,
          operation: options.operation || configRef.current.operation,
        })
        result.actions.push('reported')
      }

      // Show toast if enabled
      if (configRef.current.enableToasts && options.showToast !== false) {
        // Dismiss previous errors if configured
        if (configRef.current.dismissPreviousErrors) {
          dismissAllErrorToasts()
        }

        const recoveryActions = createRecoveryActions(
          classifiedError,
          customActions
        )

        // Choose appropriate toast variant based on error category
        let toastId: string | number

        switch (classifiedError.category) {
          case ErrorCategory.NETWORK:
            toastId = errorToastVariants.network(
              classifiedError,
              recoveryActions.onRetry
            )
            break

          case ErrorCategory.AUTH:
            toastId = errorToastVariants.auth(
              classifiedError,
              recoveryActions.onSignIn
            )
            break

          case ErrorCategory.DATABASE:
            toastId = errorToastVariants.database(
              classifiedError,
              recoveryActions.onRetry
            )
            break

          case ErrorCategory.VALIDATION:
            toastId = errorToastVariants.validation(
              classifiedError,
              options.fieldName
            )
            break

          case ErrorCategory.PERMISSION:
            toastId = errorToastVariants.permission(
              classifiedError,
              recoveryActions.onSignIn
            )
            break

          case ErrorCategory.RATE_LIMIT:
            toastId = errorToastVariants.rateLimit(classifiedError)
            break

          default:
            if (classifiedError.severity === ErrorSeverity.CRITICAL) {
              toastId = errorToastVariants.critical(
                classifiedError,
                recoveryActions.onReport
              )
            } else {
              toastId = showErrorToast(classifiedError, {
                actions: Object.entries(recoveryActions)
                  .filter(([key, action]) => action && key !== 'onDismiss')
                  .map(([key, action]) => ({
                    label: key
                      .replace('on', '')
                      .replace(/([A-Z])/g, ' $1')
                      .trim(),
                    action: action!,
                    variant:
                      key === 'onRetry'
                        ? ('default' as const)
                        : ('outline' as const),
                  })),
                persistent:
                  options.persistent || configRef.current.persistentToasts,
              })
            }
        }

        result.actions.push('toast_shown')
        result.handled = true
      }

      return result
    },
    [createRecoveryActions, reportError]
  )

  /**
   * Specialized error communication methods
   */
  const communicateNetworkError = useCallback(
    (error: unknown, onRetry?: () => void | Promise<void>) => {
      return communicateError(error, onRetry ? { onRetry } : {}, {
        context: 'network',
        operation: 'network_request',
      })
    },
    [communicateError]
  )

  const communicateAuthError = useCallback(
    (error: unknown, onSignIn?: () => void) => {
      return communicateError(error, onSignIn ? { onSignIn } : {}, {
        context: 'auth',
        operation: 'authentication',
      })
    },
    [communicateError]
  )

  const communicateValidationError = useCallback(
    (error: unknown, fieldName?: string) => {
      return communicateError(
        error,
        {},
        {
          context: 'validation',
          operation: 'form_validation',
          ...(fieldName ? { fieldName } : {}),
          persistent: false,
        }
      )
    },
    [communicateError]
  )

  const communicateDatabaseError = useCallback(
    (error: unknown, onRetry?: () => void | Promise<void>) => {
      return communicateError(error, onRetry ? { onRetry } : {}, {
        context: 'database',
        operation: 'data_operation',
      })
    },
    [communicateError]
  )

  const communicateCriticalError = useCallback(
    (error: unknown, onReport?: () => void) => {
      return communicateError(error, onReport ? { onReport } : {}, {
        context: 'critical',
        operation: 'system_error',
        persistent: true,
      })
    },
    [communicateError]
  )

  /**
   * Clear error history
   */
  const clearErrorHistory = useCallback(() => {
    errorHistory.current.clear()
  }, [])

  /**
   * Get error history
   */
  const getErrorHistory = useCallback(() => {
    return Array.from(errorHistory.current.values())
  }, [])

  /**
   * Dismiss all active error communications
   */
  const dismissAll = useCallback(() => {
    dismissAllErrorToasts()
  }, [])

  // Memoized return object
  return useMemo(
    () => ({
      // Primary communication method
      communicateError,

      // Specialized methods
      communicateNetworkError,
      communicateAuthError,
      communicateValidationError,
      communicateDatabaseError,
      communicateCriticalError,

      // Configuration
      updateConfig,

      // History management
      getErrorHistory,
      clearErrorHistory,

      // Control
      dismissAll,

      // Utilities
      reportError,
    }),
    [
      communicateError,
      communicateNetworkError,
      communicateAuthError,
      communicateValidationError,
      communicateDatabaseError,
      communicateCriticalError,
      updateConfig,
      getErrorHistory,
      clearErrorHistory,
      dismissAll,
      reportError,
    ]
  )
}

/**
 * Type exports
 */
export type {
  ErrorCommunicationConfig,
  ErrorCommunicationResult,
  RecoveryActions,
}
