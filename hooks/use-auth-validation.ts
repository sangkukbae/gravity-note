/**
 * Authentication Form Validation Hooks
 *
 * Specialized validation hooks for authentication forms with real-time feedback,
 * password strength analysis, and integration with the existing error system.
 */

'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { ValidationError } from '@/lib/errors/classification'
import {
  validateEmail,
  validatePassword,
  validateSigninForm,
  validateSignupForm,
  analyzePasswordStrength,
  getAuthValidationErrorMessage,
  isRecoverableAuthValidationError,
  type AuthValidationResult,
  type AuthValidationErrorType,
  type PasswordStrengthAnalysis,
  type PasswordStrength,
} from '@/lib/validations/auth-validation'

/**
 * Auth validation options
 */
export interface UseAuthValidationOptions {
  /** Enable real-time validation (validate on change) */
  realTimeValidation?: boolean
  /** Debounce delay for real-time validation (ms) */
  debounceMs?: number
  /** Mode: signin or signup */
  mode?: 'signin' | 'signup'
  /** Enable password strength analysis */
  enablePasswordStrength?: boolean
}

/**
 * Auth field validation state
 */
export interface AuthFieldValidationState {
  isValid: boolean
  error: string | null
  errorType: AuthValidationErrorType | null
  isValidating: boolean
  hasBeenValidated: boolean
}

/**
 * Auth form validation state
 */
export interface AuthFormValidationState {
  email: AuthFieldValidationState
  password: AuthFieldValidationState
  confirmPassword?: AuthFieldValidationState
  isFormValid: boolean
  isValidating: boolean
}

/**
 * Password strength state
 */
export interface PasswordStrengthState extends PasswordStrengthAnalysis {
  isVisible: boolean
}

/**
 * Default field validation state
 */
const defaultFieldState: AuthFieldValidationState = {
  isValid: false,
  error: null,
  errorType: null,
  isValidating: false,
  hasBeenValidated: false,
}

/**
 * Default options
 */
const defaultOptions: Required<UseAuthValidationOptions> = {
  realTimeValidation: true,
  debounceMs: 300,
  mode: 'signin',
  enablePasswordStrength: true,
}

/**
 * Hook for individual field validation with debouncing
 */
export function useAuthFieldValidation(
  validator: (value: unknown) => AuthValidationResult,
  options: Pick<
    UseAuthValidationOptions,
    'realTimeValidation' | 'debounceMs'
  > = {}
) {
  const opts = { ...defaultOptions, ...options }
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [state, setState] =
    useState<AuthFieldValidationState>(defaultFieldState)

  // Clear debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  /**
   * Validate field synchronously
   */
  const validate = useCallback(
    (value: unknown): AuthValidationResult => {
      setState(prev => ({ ...prev, isValidating: true }))

      const result = validator(value)

      if (result.success) {
        setState({
          isValid: true,
          error: null,
          errorType: null,
          isValidating: false,
          hasBeenValidated: true,
        })
      } else {
        const errorMessage = result.error
          ? getAuthValidationErrorMessage(result.error.type)
          : 'Validation failed'

        setState({
          isValid: false,
          error: errorMessage,
          errorType: result.error?.type || null,
          isValidating: false,
          hasBeenValidated: true,
        })
      }

      return result
    },
    [validator]
  )

  /**
   * Validate field with debouncing for real-time validation
   */
  const validateDebounced = useCallback(
    (value: unknown) => {
      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      setState(prev => ({ ...prev, isValidating: true }))

      // Debounce the validation
      debounceRef.current = setTimeout(() => {
        validate(value)
      }, opts.debounceMs)
    },
    [validate, opts.debounceMs]
  )

  /**
   * Reset validation state
   */
  const reset = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    setState(defaultFieldState)
  }, [])

  /**
   * Set custom error
   */
  const setError = useCallback(
    (error: string, type?: AuthValidationErrorType) => {
      setState({
        isValid: false,
        error,
        errorType: type || null,
        isValidating: false,
        hasBeenValidated: true,
      })
    },
    []
  )

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      errorType: null,
      isValid: prev.hasBeenValidated ? true : false,
    }))
  }, [])

  return {
    state,
    validate,
    validateDebounced: opts.realTimeValidation ? validateDebounced : validate,
    reset,
    setError,
    clearError,
  }
}

/**
 * Hook for email validation
 */
export function useEmailValidation(
  options: Pick<
    UseAuthValidationOptions,
    'realTimeValidation' | 'debounceMs'
  > = {}
) {
  return useAuthFieldValidation(validateEmail, options)
}

/**
 * Hook for password validation
 */
export function usePasswordValidation(
  mode: 'signin' | 'signup' = 'signup',
  options: Pick<
    UseAuthValidationOptions,
    'realTimeValidation' | 'debounceMs'
  > = {}
) {
  const validator = useCallback(
    (value: unknown) => validatePassword(value, mode),
    [mode]
  )

  return useAuthFieldValidation(validator, options)
}

/**
 * Hook for password strength analysis
 */
export function usePasswordStrength(password: string): PasswordStrengthState {
  const analysis = useMemo(() => {
    if (!password) {
      return {
        strength: 'very_weak' as PasswordStrength,
        score: 0,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false,
        length: 0,
        isCommon: false,
        feedback: [],
      }
    }
    return analyzePasswordStrength(password)
  }, [password])

  // Show strength indicator when user starts typing
  const isVisible = password.length > 0

  return {
    ...analysis,
    isVisible,
  }
}

/**
 * Hook for complete auth form validation
 */
export function useAuthFormValidation(options: UseAuthValidationOptions = {}) {
  const opts = { ...defaultOptions, ...options }

  // Individual field validations
  const email = useEmailValidation(opts)
  const password = usePasswordValidation(opts.mode, opts)
  const confirmPasswordValidator = useCallback(
    (value: unknown): AuthValidationResult => {
      if (opts.mode !== 'signup') {
        return { success: true }
      }
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return {
          success: false,
          error: {
            type: 'PASSWORD_REQUIRED' as AuthValidationErrorType,
            message: 'Please confirm your password',
            code: 'required',
            field: 'confirmPassword' as const,
          },
        }
      }
      return { success: true }
    },
    [opts.mode]
  )
  const confirmPassword = useAuthFieldValidation(confirmPasswordValidator, opts)

  // Password strength for signup mode
  const passwordStrength =
    opts.enablePasswordStrength && opts.mode === 'signup'
      ? null // Will be handled in the enhanced AuthForm component
      : null

  /**
   * Validate entire form
   */
  const validateForm = useCallback(
    (formData: {
      email: string
      password: string
      confirmPassword?: string
    }) => {
      const validator =
        opts.mode === 'signin' ? validateSigninForm : validateSignupForm
      return validator(formData)
    },
    [opts.mode]
  )

  /**
   * Get form validation state
   */
  const formState: AuthFormValidationState = useMemo(() => {
    const emailValid = email.state.isValid
    const passwordValid = password.state.isValid
    const confirmPasswordValid =
      opts.mode === 'signup' ? confirmPassword.state.isValid : true

    const isFormValid = emailValid && passwordValid && confirmPasswordValid
    const isValidating =
      email.state.isValidating ||
      password.state.isValidating ||
      (opts.mode === 'signup' && confirmPassword.state.isValidating)

    return {
      email: email.state,
      password: password.state,
      ...(opts.mode === 'signup'
        ? { confirmPassword: confirmPassword.state }
        : {}),
      isFormValid,
      isValidating,
    }
  }, [email.state, password.state, confirmPassword.state, opts.mode])

  /**
   * Reset all fields
   */
  const resetForm = useCallback(() => {
    email.reset()
    password.reset()
    confirmPassword.reset()
  }, [email, password, confirmPassword])

  /**
   * Validate passwords match (for signup)
   */
  const validatePasswordsMatch = useCallback(
    (passwordValue: string, confirmPasswordValue: string) => {
      if (opts.mode !== 'signup') return

      if (passwordValue !== confirmPasswordValue) {
        confirmPassword.setError(
          "Passwords don't match",
          'PASSWORDS_DONT_MATCH' as AuthValidationErrorType
        )
      } else if (confirmPassword.state.error === "Passwords don't match") {
        confirmPassword.clearError()
      }
    },
    [opts.mode, confirmPassword]
  )

  return {
    email,
    password,
    confirmPassword,
    formState,
    validateForm,
    resetForm,
    validatePasswordsMatch,
  }
}

/**
 * Hook for handling auth validation errors with error boundary integration
 */
export function useAuthValidationErrorHandler() {
  /**
   * Convert auth validation error to classified error for error boundary
   */
  const createAuthValidationError = useCallback(
    (validationResult: AuthValidationResult, context?: Record<string, any>) => {
      if (validationResult.success || !validationResult.error) {
        return null
      }

      const { error } = validationResult
      const userMessage = getAuthValidationErrorMessage(error.type)
      const isRecoverable = isRecoverableAuthValidationError(error.type)

      return new ValidationError(
        error.message,
        userMessage,
        undefined, // originalError
        {
          authValidationType: error.type,
          authValidationCode: error.code,
          authValidationField: error.field,
          isRecoverable,
          ...context,
        }
      )
    },
    []
  )

  /**
   * Handle auth validation error (throw for error boundary or return for local handling)
   */
  const handleAuthValidationError = useCallback(
    (
      validationResult: AuthValidationResult,
      throwError: boolean = false,
      context?: Record<string, any>
    ) => {
      const error = createAuthValidationError(validationResult, context)

      if (error && throwError) {
        throw error
      }

      return error
    },
    [createAuthValidationError]
  )

  return {
    createAuthValidationError,
    handleAuthValidationError,
  }
}
