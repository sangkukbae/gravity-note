/**
 * Reusable Validation Hook for Form Validation with Zod
 *
 * Provides real-time validation feedback and integrates with the
 * existing error classification system in Gravity Note.
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { z } from 'zod'
import { ValidationError } from '@/lib/errors/classification'
import {
  validateNoteContent,
  validateCreateNote,
  getValidationErrorMessage,
  isRecoverableValidationError,
  getContentStats,
  type ValidationResult,
  type NoteValidationErrorType,
  type CreateNoteValidationResult,
} from '@/lib/validations/note-validation'

/**
 * Validation hook options
 */
export interface UseValidationOptions {
  /** Enable real-time validation (validate on change) */
  realTimeValidation?: boolean
  /** Debounce delay for real-time validation (ms) */
  debounceMs?: number
  /** Enable validation statistics (character count, etc.) */
  enableStats?: boolean
}

/**
 * Validation state interface
 */
export interface ValidationState {
  isValid: boolean
  error: string | null
  errorType: NoteValidationErrorType | null
  isValidating: boolean
  hasBeenValidated: boolean
  stats: ReturnType<typeof getContentStats> | undefined
}

/**
 * Validation hook return type
 */
export interface UseValidationReturn {
  state: ValidationState
  validate: (value: unknown) => ValidationResult
  validateAsync: (value: unknown) => Promise<ValidationResult>
  reset: () => void
  setError: (error: string, type?: NoteValidationErrorType) => void
  clearError: () => void
}

/**
 * Default options
 */
const defaultOptions: Required<UseValidationOptions> = {
  realTimeValidation: true,
  debounceMs: 300,
  enableStats: true,
}

/**
 * Reusable validation hook for form fields with Zod integration
 */
export function useValidation(
  options: UseValidationOptions = {}
): UseValidationReturn {
  const opts = { ...defaultOptions, ...options }
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Validation state
  const [state, setState] = useState<ValidationState>({
    isValid: false,
    error: null,
    errorType: null,
    isValidating: false,
    hasBeenValidated: false,
    stats: opts.enableStats ? getContentStats('') : undefined,
  })

  // Clear debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  /**
   * Update validation state
   */
  const updateState = useCallback((updates: Partial<ValidationState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  /**
   * Validate value synchronously
   */
  const validate = useCallback(
    (value: unknown): ValidationResult => {
      updateState({ isValidating: true })

      const result = validateNoteContent(value)

      // Update stats if enabled
      const stats =
        opts.enableStats && typeof value === 'string'
          ? getContentStats(value)
          : undefined

      if (result.success) {
        updateState({
          isValid: true,
          error: null,
          errorType: null,
          isValidating: false,
          hasBeenValidated: true,
          ...(stats !== undefined ? { stats } : {}),
        })
      } else {
        const errorMessage = result.error
          ? getValidationErrorMessage(result.error.type)
          : 'Validation failed'

        updateState({
          isValid: false,
          error: errorMessage,
          errorType: result.error?.type || null,
          isValidating: false,
          hasBeenValidated: true,
          ...(stats !== undefined ? { stats } : {}),
        })
      }

      return result
    },
    [opts.enableStats, updateState]
  )

  /**
   * Validate value asynchronously (with debouncing for real-time validation)
   */
  const validateAsync = useCallback(
    async (value: unknown): Promise<ValidationResult> => {
      return new Promise(resolve => {
        // Clear existing debounce
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
        }

        updateState({ isValidating: true })

        // Debounce the validation
        debounceRef.current = setTimeout(() => {
          const result = validate(value)
          resolve(result)
        }, opts.debounceMs)
      })
    },
    [validate, opts.debounceMs, updateState]
  )

  /**
   * Reset validation state
   */
  const reset = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    setState({
      isValid: false,
      error: null,
      errorType: null,
      isValidating: false,
      hasBeenValidated: false,
      stats: opts.enableStats ? getContentStats('') : undefined,
    })
  }, [opts.enableStats])

  /**
   * Set custom error (for external validation failures)
   */
  const setError = useCallback(
    (error: string, type?: NoteValidationErrorType) => {
      updateState({
        isValid: false,
        error,
        errorType: type || null,
        isValidating: false,
        hasBeenValidated: true,
      })
    },
    [updateState]
  )

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    updateState({
      error: null,
      errorType: null,
      isValid: state.hasBeenValidated ? true : false,
    })
  }, [updateState, state.hasBeenValidated])

  return {
    state,
    validate,
    validateAsync,
    reset,
    setError,
    clearError,
  }
}

/**
 * Specialized hook for note content validation
 */
export function useNoteContentValidation(
  options: UseValidationOptions = {}
): UseValidationReturn & {
  validateForSubmit: (content: string) => CreateNoteValidationResult
} {
  const validation = useValidation(options)

  /**
   * Validate content for note submission
   */
  const validateForSubmit = useCallback((content: string) => {
    return validateCreateNote({ content })
  }, [])

  return {
    ...validation,
    validateForSubmit,
  }
}

/**
 * Hook for handling validation errors with error boundary integration
 */
export function useValidationErrorHandler() {
  /**
   * Convert validation error to classified error for error boundary
   */
  const createValidationError = useCallback(
    (validationResult: ValidationResult, context?: Record<string, any>) => {
      if (validationResult.success || !validationResult.error) {
        return null
      }

      const { error } = validationResult
      const userMessage = getValidationErrorMessage(error.type)
      const isRecoverable = isRecoverableValidationError(error.type)

      return new ValidationError(
        error.message,
        userMessage,
        undefined, // originalError
        {
          validationType: error.type,
          validationCode: error.code,
          isRecoverable,
          ...context,
        }
      )
    },
    []
  )

  /**
   * Handle validation error (throw for error boundary or return for local handling)
   */
  const handleValidationError = useCallback(
    (
      validationResult: ValidationResult,
      throwError: boolean = false,
      context?: Record<string, any>
    ) => {
      const error = createValidationError(validationResult, context)

      if (error && throwError) {
        throw error
      }

      return error
    },
    [createValidationError]
  )

  return {
    createValidationError,
    handleValidationError,
  }
}

/**
 * Utility hook for real-time content statistics
 */
export function useContentStats(content: string) {
  const [stats, setStats] = useState(() => getContentStats(content))

  useEffect(() => {
    setStats(getContentStats(content))
  }, [content])

  return stats
}
