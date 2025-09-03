'use client'

import React, {
  createContext,
  useContext,
  useCallback,
  useReducer,
  useEffect,
  useMemo,
} from 'react'
import {
  classifyError,
  ErrorCategory,
  ErrorSeverity,
  type ClassifiedError,
} from '@/lib/errors/classification'
import {
  useErrorCommunication,
  type ErrorCommunicationConfig,
} from '@/hooks/use-error-communication'

/**
 * Global error state interface
 */
interface ErrorState {
  errors: Map<string, ClassifiedError>
  recentErrors: ClassifiedError[]
  errorCounts: Record<ErrorCategory, number>
  criticalErrors: ClassifiedError[]
  isRecovering: boolean
  lastErrorTime?: Date
}

/**
 * Error actions for state management
 */
type ErrorAction =
  | { type: 'ADD_ERROR'; payload: { id: string; error: ClassifiedError } }
  | { type: 'REMOVE_ERROR'; payload: { id: string } }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'CLEAR_CATEGORY'; payload: { category: ErrorCategory } }
  | { type: 'SET_RECOVERING'; payload: { recovering: boolean } }
  | { type: 'MARK_ERROR_HANDLED'; payload: { id: string } }

/**
 * Error context interface
 */
interface ErrorContextValue {
  // State
  state: ErrorState

  // Error handling
  handleError: (error: unknown, context?: string, operation?: string) => string
  handleNetworkError: (error: unknown, onRetry?: () => void) => string
  handleAuthError: (error: unknown, onSignIn?: () => void) => string
  handleValidationError: (error: unknown, fieldName?: string) => string
  handleDatabaseError: (error: unknown, onRetry?: () => void) => string
  handleCriticalError: (error: unknown, onReport?: () => void) => string

  // Error management
  clearError: (errorId: string) => void
  clearAllErrors: () => void
  clearErrorsByCategory: (category: ErrorCategory) => void

  // Recovery
  setRecovering: (recovering: boolean) => void
  isErrorActive: (errorId: string) => boolean

  // Statistics
  getErrorCount: (category?: ErrorCategory) => number
  hasErrors: (category?: ErrorCategory) => boolean
  hasCriticalErrors: () => boolean

  // Configuration
  updateConfig: (config: Partial<ErrorCommunicationConfig>) => void
}

/**
 * Initial error state
 */
const initialState: ErrorState = {
  errors: new Map(),
  recentErrors: [],
  errorCounts: {
    [ErrorCategory.NETWORK]: 0,
    [ErrorCategory.AUTH]: 0,
    [ErrorCategory.DATABASE]: 0,
    [ErrorCategory.VALIDATION]: 0,
    [ErrorCategory.RUNTIME]: 0,
    [ErrorCategory.PERMISSION]: 0,
    [ErrorCategory.RATE_LIMIT]: 0,
    [ErrorCategory.UNKNOWN]: 0,
  },
  criticalErrors: [],
  isRecovering: false,
}

/**
 * Error state reducer
 */
function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
  switch (action.type) {
    case 'ADD_ERROR': {
      const { id, error } = action.payload
      const newErrors = new Map(state.errors)
      newErrors.set(id, error)

      // Update recent errors (keep last 10)
      const recentErrors = [error, ...state.recentErrors.slice(0, 9)]

      // Update error counts
      const errorCounts = { ...state.errorCounts }
      errorCounts[error.category] += 1

      // Update critical errors
      const criticalErrors =
        error.severity === ErrorSeverity.CRITICAL
          ? [error, ...state.criticalErrors.slice(0, 4)] // Keep last 5 critical errors
          : state.criticalErrors

      return {
        ...state,
        errors: newErrors,
        recentErrors,
        errorCounts,
        criticalErrors,
        lastErrorTime: new Date(),
      }
    }

    case 'REMOVE_ERROR': {
      const { id } = action.payload
      const newErrors = new Map(state.errors)
      const removedError = newErrors.get(id)

      if (!removedError) return state

      newErrors.delete(id)

      // Update error counts
      const errorCounts = { ...state.errorCounts }
      errorCounts[removedError.category] = Math.max(
        0,
        errorCounts[removedError.category] - 1
      )

      return {
        ...state,
        errors: newErrors,
        errorCounts,
      }
    }

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: new Map(),
        errorCounts: {
          [ErrorCategory.NETWORK]: 0,
          [ErrorCategory.AUTH]: 0,
          [ErrorCategory.DATABASE]: 0,
          [ErrorCategory.VALIDATION]: 0,
          [ErrorCategory.RUNTIME]: 0,
          [ErrorCategory.PERMISSION]: 0,
          [ErrorCategory.RATE_LIMIT]: 0,
          [ErrorCategory.UNKNOWN]: 0,
        },
      }

    case 'CLEAR_CATEGORY': {
      const { category } = action.payload
      const newErrors = new Map()

      for (const [id, error] of state.errors.entries()) {
        if (error.category !== category) {
          newErrors.set(id, error)
        }
      }

      const errorCounts = { ...state.errorCounts }
      errorCounts[category] = 0

      return {
        ...state,
        errors: newErrors,
        errorCounts,
      }
    }

    case 'SET_RECOVERING':
      return {
        ...state,
        isRecovering: action.payload.recovering,
      }

    case 'MARK_ERROR_HANDLED': {
      const { id } = action.payload
      const newErrors = new Map(state.errors)
      const error = newErrors.get(id)

      if (error) {
        // Mark as handled (you could extend ClassifiedError to include this)
        newErrors.set(id, { ...error, timestamp: new Date() })
      }

      return {
        ...state,
        errors: newErrors,
      }
    }

    default:
      return state
  }
}

/**
 * Error context
 */
const ErrorContext = createContext<ErrorContextValue | null>(null)

/**
 * Error context provider props
 */
interface ErrorContextProviderProps {
  children: React.ReactNode
  config?: ErrorCommunicationConfig
}

/**
 * Error Context Provider Component
 */
export function ErrorContextProvider({
  children,
  config = {},
}: ErrorContextProviderProps) {
  const [state, dispatch] = useReducer(errorReducer, initialState)
  const errorCommunication = useErrorCommunication(config)

  /**
   * Generate unique error ID
   */
  const generateErrorId = useCallback(() => {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  /**
   * Handle error and add to context
   */
  const handleError = useCallback(
    (error: unknown, context?: string, operation?: string): string => {
      const classifiedError = classifyError(error)
      const errorId = generateErrorId()

      // Add to state
      dispatch({
        type: 'ADD_ERROR',
        payload: { id: errorId, error: classifiedError },
      })

      // Communicate error
      const meta: { context?: string; operation?: string } = {}
      if (context !== undefined) meta.context = context
      if (operation !== undefined) meta.operation = operation

      errorCommunication.communicateError(error, {}, meta)

      return errorId
    },
    [generateErrorId, errorCommunication]
  )

  /**
   * Specialized error handlers
   */
  const handleNetworkError = useCallback(
    (error: unknown, onRetry?: () => void): string => {
      const classifiedError = classifyError(error)
      const errorId = generateErrorId()

      dispatch({
        type: 'ADD_ERROR',
        payload: { id: errorId, error: classifiedError },
      })

      errorCommunication.communicateNetworkError(error, onRetry)

      return errorId
    },
    [generateErrorId, errorCommunication]
  )

  const handleAuthError = useCallback(
    (error: unknown, onSignIn?: () => void): string => {
      const classifiedError = classifyError(error)
      const errorId = generateErrorId()

      dispatch({
        type: 'ADD_ERROR',
        payload: { id: errorId, error: classifiedError },
      })

      errorCommunication.communicateAuthError(error, onSignIn)

      return errorId
    },
    [generateErrorId, errorCommunication]
  )

  const handleValidationError = useCallback(
    (error: unknown, fieldName?: string): string => {
      const classifiedError = classifyError(error)
      const errorId = generateErrorId()

      dispatch({
        type: 'ADD_ERROR',
        payload: { id: errorId, error: classifiedError },
      })

      errorCommunication.communicateValidationError(error, fieldName)

      return errorId
    },
    [generateErrorId, errorCommunication]
  )

  const handleDatabaseError = useCallback(
    (error: unknown, onRetry?: () => void): string => {
      const classifiedError = classifyError(error)
      const errorId = generateErrorId()

      dispatch({
        type: 'ADD_ERROR',
        payload: { id: errorId, error: classifiedError },
      })

      errorCommunication.communicateDatabaseError(error, onRetry)

      return errorId
    },
    [generateErrorId, errorCommunication]
  )

  const handleCriticalError = useCallback(
    (error: unknown, onReport?: () => void): string => {
      const classifiedError = classifyError(error)
      const errorId = generateErrorId()

      dispatch({
        type: 'ADD_ERROR',
        payload: { id: errorId, error: classifiedError },
      })

      errorCommunication.communicateCriticalError(error, onReport)

      return errorId
    },
    [generateErrorId, errorCommunication]
  )

  /**
   * Error management functions
   */
  const clearError = useCallback((errorId: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: { id: errorId } })
  }, [])

  const clearAllErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' })
  }, [])

  const clearErrorsByCategory = useCallback((category: ErrorCategory) => {
    dispatch({ type: 'CLEAR_CATEGORY', payload: { category } })
  }, [])

  /**
   * Recovery functions
   */
  const setRecovering = useCallback((recovering: boolean) => {
    dispatch({ type: 'SET_RECOVERING', payload: { recovering } })
  }, [])

  const isErrorActive = useCallback(
    (errorId: string): boolean => {
      return state.errors.has(errorId)
    },
    [state.errors]
  )

  /**
   * Statistics functions
   */
  const getErrorCount = useCallback(
    (category?: ErrorCategory): number => {
      if (category) {
        return state.errorCounts[category]
      }
      return Object.values(state.errorCounts).reduce(
        (sum, count) => sum + count,
        0
      )
    },
    [state.errorCounts]
  )

  const hasErrors = useCallback(
    (category?: ErrorCategory): boolean => {
      return getErrorCount(category) > 0
    },
    [getErrorCount]
  )

  const hasCriticalErrors = useCallback((): boolean => {
    return state.criticalErrors.length > 0
  }, [state.criticalErrors])

  /**
   * Configuration update
   */
  const updateConfig = useCallback(
    (newConfig: Partial<ErrorCommunicationConfig>) => {
      errorCommunication.updateConfig(newConfig)
    },
    [errorCommunication]
  )

  /**
   * Auto-cleanup old errors (after 5 minutes)
   */
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now()
      const fiveMinutesAgo = now - 5 * 60 * 1000

      for (const [id, error] of state.errors.entries()) {
        if (
          error.timestamp.getTime() < fiveMinutesAgo &&
          error.severity !== ErrorSeverity.CRITICAL
        ) {
          dispatch({ type: 'REMOVE_ERROR', payload: { id } })
        }
      }
    }, 60000) // Run every minute

    return () => clearInterval(cleanup)
  }, [state.errors])

  /**
   * Context value
   */
  const contextValue = useMemo(
    () => ({
      // State
      state,

      // Error handling
      handleError,
      handleNetworkError,
      handleAuthError,
      handleValidationError,
      handleDatabaseError,
      handleCriticalError,

      // Error management
      clearError,
      clearAllErrors,
      clearErrorsByCategory,

      // Recovery
      setRecovering,
      isErrorActive,

      // Statistics
      getErrorCount,
      hasErrors,
      hasCriticalErrors,

      // Configuration
      updateConfig,
    }),
    [
      state,
      handleError,
      handleNetworkError,
      handleAuthError,
      handleValidationError,
      handleDatabaseError,
      handleCriticalError,
      clearError,
      clearAllErrors,
      clearErrorsByCategory,
      setRecovering,
      isErrorActive,
      getErrorCount,
      hasErrors,
      hasCriticalErrors,
      updateConfig,
    ]
  )

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  )
}

/**
 * Hook to use error context
 */
export function useErrorContext(): ErrorContextValue {
  const context = useContext(ErrorContext)

  if (!context) {
    throw new Error(
      'useErrorContext must be used within an ErrorContextProvider'
    )
  }

  return context
}

/**
 * Hook to use error statistics
 */
export function useErrorStats() {
  const { state, getErrorCount, hasErrors, hasCriticalErrors } =
    useErrorContext()

  return useMemo(
    () => ({
      totalErrors: getErrorCount(),
      errorsByCategory: state.errorCounts,
      recentErrors: state.recentErrors,
      criticalErrors: state.criticalErrors,
      hasErrors: hasErrors(),
      hasCriticalErrors: hasCriticalErrors(),
      isRecovering: state.isRecovering,
      lastErrorTime: state.lastErrorTime,
    }),
    [state, getErrorCount, hasErrors, hasCriticalErrors]
  )
}

/**
 * Hook for simplified error handling
 */
export function useErrorHandler() {
  const {
    handleError,
    handleNetworkError,
    handleAuthError,
    handleValidationError,
    handleDatabaseError,
    handleCriticalError,
  } = useErrorContext()

  return useMemo(
    () => ({
      handleError,
      handleNetworkError,
      handleAuthError,
      handleValidationError,
      handleDatabaseError,
      handleCriticalError,
    }),
    [
      handleError,
      handleNetworkError,
      handleAuthError,
      handleValidationError,
      handleDatabaseError,
      handleCriticalError,
    ]
  )
}
