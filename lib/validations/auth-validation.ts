/**
 * Authentication Form Validation Schemas and Functions
 *
 * Comprehensive validation for authentication forms using Zod.
 * Includes email validation, password strength checks, and security best practices.
 */

import { z } from 'zod'

/**
 * Auth validation constants
 */
export const AUTH_VALIDATION = {
  EMAIL: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 254, // RFC 5321 limit
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false, // Optional for better UX
  },
} as const

/**
 * Auth validation error types for classification
 */
export enum AuthValidationErrorType {
  EMAIL_REQUIRED = 'EMAIL_REQUIRED',
  EMAIL_INVALID = 'EMAIL_INVALID',
  EMAIL_TOO_SHORT = 'EMAIL_TOO_SHORT',
  EMAIL_TOO_LONG = 'EMAIL_TOO_LONG',
  PASSWORD_REQUIRED = 'PASSWORD_REQUIRED',
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  PASSWORD_TOO_LONG = 'PASSWORD_TOO_LONG',
  PASSWORD_WEAK = 'PASSWORD_WEAK',
  PASSWORD_COMMON = 'PASSWORD_COMMON',
  PASSWORDS_DONT_MATCH = 'PASSWORDS_DONT_MATCH',
}

/**
 * Password strength levels
 */
export enum PasswordStrength {
  VERY_WEAK = 'very_weak',
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

/**
 * Auth validation result interface
 */
export interface AuthValidationResult {
  success: boolean
  data?: any
  error?: {
    type: AuthValidationErrorType
    message: string
    code: string
    field?: 'email' | 'password' | 'confirmPassword'
  }
}

/**
 * Password strength analysis interface
 */
export interface PasswordStrengthAnalysis {
  strength: PasswordStrength
  score: number // 0-100
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
  length: number
  isCommon: boolean
  feedback: string[]
}

/**
 * Common weak passwords to detect
 */
const COMMON_PASSWORDS = new Set([
  'password',
  '12345678',
  'qwerty',
  'abc123',
  'password123',
  'admin',
  'letmein',
  'welcome',
  '123456789',
  'password1',
])

/**
 * Special characters regex
 */
const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/

/**
 * Analyze password strength
 */
export function analyzePasswordStrength(
  password: string
): PasswordStrengthAnalysis {
  const length = password.length
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecialChar = SPECIAL_CHARS_REGEX.test(password)
  const isCommon = COMMON_PASSWORDS.has(password.toLowerCase())

  let score = 0
  const feedback: string[] = []

  // Length scoring
  if (length >= 8) score += 20
  if (length >= 12) score += 10
  if (length >= 16) score += 10
  else if (length < 8) feedback.push('Use at least 8 characters')

  // Character variety scoring
  if (hasUppercase) score += 15
  else feedback.push('Add uppercase letters (A-Z)')

  if (hasLowercase) score += 15
  else feedback.push('Add lowercase letters (a-z)')

  if (hasNumber) score += 15
  else feedback.push('Add numbers (0-9)')

  if (hasSpecialChar) score += 15
  else feedback.push('Consider adding special characters (!@#$%...)')

  // Penalize common passwords
  if (isCommon) {
    score = Math.max(0, score - 30)
    feedback.unshift('Avoid common passwords')
  }

  // Determine strength level
  let strength: PasswordStrength
  if (score >= 85) strength = PasswordStrength.VERY_STRONG
  else if (score >= 70) strength = PasswordStrength.STRONG
  else if (score >= 50) strength = PasswordStrength.MEDIUM
  else if (score >= 25) strength = PasswordStrength.WEAK
  else strength = PasswordStrength.VERY_WEAK

  return {
    strength,
    score: Math.max(0, Math.min(100, score)),
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    length,
    isCommon,
    feedback,
  }
}

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .trim()
  .min(AUTH_VALIDATION.EMAIL.MIN_LENGTH, {
    message: `Email must be at least ${AUTH_VALIDATION.EMAIL.MIN_LENGTH} characters`,
  })
  .max(AUTH_VALIDATION.EMAIL.MAX_LENGTH, {
    message: `Email must not exceed ${AUTH_VALIDATION.EMAIL.MAX_LENGTH} characters`,
  })
  .email('Please enter a valid email address')
  .transform(email => email.toLowerCase())

/**
 * Password validation schema for signin (less strict)
 */
export const signinPasswordSchema = z.string().min(1, 'Password is required')

/**
 * Password validation schema for signup (strict)
 */
export const signupPasswordSchema = z
  .string()
  .min(AUTH_VALIDATION.PASSWORD.MIN_LENGTH, {
    message: `Password must be at least ${AUTH_VALIDATION.PASSWORD.MIN_LENGTH} characters`,
  })
  .max(AUTH_VALIDATION.PASSWORD.MAX_LENGTH, {
    message: `Password must not exceed ${AUTH_VALIDATION.PASSWORD.MAX_LENGTH} characters`,
  })
  .refine(
    password => {
      const analysis = analyzePasswordStrength(password)
      return analysis.strength !== PasswordStrength.VERY_WEAK
    },
    {
      message: 'Password is too weak. Please choose a stronger password.',
    }
  )
  .refine(password => !COMMON_PASSWORDS.has(password.toLowerCase()), {
    message: 'This password is too common. Please choose a different one.',
  })

/**
 * Signin form validation schema
 */
export const signinFormSchema = z.object({
  email: emailSchema,
  password: signinPasswordSchema,
})

/**
 * Signup form validation schema
 */
export const signupFormSchema = z
  .object({
    email: emailSchema,
    password: signupPasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

/**
 * Validate email field
 */
export function validateEmail(email: unknown): AuthValidationResult {
  try {
    const result = emailSchema.safeParse(email)

    if (result.success) {
      return {
        success: true,
        data: result.data,
      }
    }

    const error = result.error.issues[0]
    let errorType: AuthValidationErrorType

    if (!email || (typeof email === 'string' && email.trim() === '')) {
      errorType = AuthValidationErrorType.EMAIL_REQUIRED
    } else if (error && error.code === 'too_small') {
      errorType = AuthValidationErrorType.EMAIL_TOO_SHORT
    } else if (error && error.code === 'too_big') {
      errorType = AuthValidationErrorType.EMAIL_TOO_LONG
    } else {
      errorType = AuthValidationErrorType.EMAIL_INVALID
    }

    return {
      success: false,
      error: {
        type: errorType,
        message: error?.message || 'Invalid email address',
        code: error?.code || 'invalid_email',
        field: 'email',
      },
    }
  } catch (err) {
    return {
      success: false,
      error: {
        type: AuthValidationErrorType.EMAIL_INVALID,
        message: 'Invalid email address',
        code: 'validation_error',
        field: 'email',
      },
    }
  }
}

/**
 * Validate password field
 */
export function validatePassword(
  password: unknown,
  mode: 'signin' | 'signup' = 'signup'
): AuthValidationResult {
  try {
    const schema =
      mode === 'signin' ? signinPasswordSchema : signupPasswordSchema
    const result = schema.safeParse(password)

    if (result.success) {
      return {
        success: true,
        data: result.data,
      }
    }

    const error = result.error.issues[0]
    let errorType: AuthValidationErrorType

    if (!password || (typeof password === 'string' && password.trim() === '')) {
      errorType = AuthValidationErrorType.PASSWORD_REQUIRED
    } else if (error && error.code === 'too_small') {
      errorType = AuthValidationErrorType.PASSWORD_TOO_SHORT
    } else if (error && error.code === 'too_big') {
      errorType = AuthValidationErrorType.PASSWORD_TOO_LONG
    } else if (error && error.code === 'custom') {
      if (error.message.includes('too weak')) {
        errorType = AuthValidationErrorType.PASSWORD_WEAK
      } else if (error.message.includes('too common')) {
        errorType = AuthValidationErrorType.PASSWORD_COMMON
      } else {
        errorType = AuthValidationErrorType.PASSWORD_WEAK
      }
    } else {
      errorType = AuthValidationErrorType.PASSWORD_WEAK
    }

    return {
      success: false,
      error: {
        type: errorType,
        message: error?.message || 'Invalid password',
        code: error?.code || 'invalid_password',
        field: 'password',
      },
    }
  } catch (err) {
    return {
      success: false,
      error: {
        type: AuthValidationErrorType.PASSWORD_WEAK,
        message: 'Invalid password',
        code: 'validation_error',
        field: 'password',
      },
    }
  }
}

/**
 * Validate signin form data
 */
export function validateSigninForm(input: unknown): AuthValidationResult {
  try {
    const result = signinFormSchema.safeParse(input)

    if (result.success) {
      return {
        success: true,
        data: result.data,
      }
    }

    // Return the first error
    const error = result.error.issues[0]
    if (!error) {
      return {
        success: false,
        error: {
          type: AuthValidationErrorType.EMAIL_INVALID,
          message: 'Validation failed',
          code: 'unknown',
        },
      }
    }

    const field = error.path[0] as 'email' | 'password'

    // Determine error type based on field and error code
    let errorType: AuthValidationErrorType
    if (field === 'email') {
      if (error.code === 'invalid_type') {
        errorType = AuthValidationErrorType.EMAIL_INVALID
      } else if (error.code === 'too_small') {
        errorType = AuthValidationErrorType.EMAIL_TOO_SHORT
      } else {
        errorType = AuthValidationErrorType.EMAIL_INVALID
      }
    } else {
      errorType = AuthValidationErrorType.PASSWORD_REQUIRED
    }

    return {
      success: false,
      error: {
        type: errorType,
        message: error.message,
        code: error.code,
        field,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: {
        type: AuthValidationErrorType.EMAIL_INVALID,
        message: 'Invalid form data',
        code: 'validation_error',
      },
    }
  }
}

/**
 * Validate signup form data
 */
export function validateSignupForm(input: unknown): AuthValidationResult {
  try {
    const result = signupFormSchema.safeParse(input)

    if (result.success) {
      return {
        success: true,
        data: result.data,
      }
    }

    // Return the first error
    const error = result.error.issues[0]
    if (!error) {
      return {
        success: false,
        error: {
          type: AuthValidationErrorType.EMAIL_INVALID,
          message: 'Validation failed',
          code: 'unknown',
        },
      }
    }

    const field = error.path[0] as 'email' | 'password' | 'confirmPassword'

    // Determine error type based on field and error code
    let errorType: AuthValidationErrorType
    if (field === 'email') {
      if (error.code === 'invalid_type') {
        errorType = AuthValidationErrorType.EMAIL_INVALID
      } else if (error.code === 'too_small') {
        errorType = AuthValidationErrorType.EMAIL_TOO_SHORT
      } else {
        errorType = AuthValidationErrorType.EMAIL_INVALID
      }
    } else if (field === 'confirmPassword') {
      errorType = AuthValidationErrorType.PASSWORDS_DONT_MATCH
    } else {
      if (error.code === 'too_small') {
        errorType = AuthValidationErrorType.PASSWORD_TOO_SHORT
      } else if (error.code === 'custom') {
        if (error.message.includes('too weak')) {
          errorType = AuthValidationErrorType.PASSWORD_WEAK
        } else if (error.message.includes('too common')) {
          errorType = AuthValidationErrorType.PASSWORD_COMMON
        } else {
          errorType = AuthValidationErrorType.PASSWORD_WEAK
        }
      } else {
        errorType = AuthValidationErrorType.PASSWORD_REQUIRED
      }
    }

    return {
      success: false,
      error: {
        type: errorType,
        message: error.message,
        code: error.code,
        field,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: {
        type: AuthValidationErrorType.EMAIL_INVALID,
        message: 'Invalid form data',
        code: 'validation_error',
      },
    }
  }
}

/**
 * Get user-friendly auth validation error message
 */
export function getAuthValidationErrorMessage(
  type: AuthValidationErrorType
): string {
  switch (type) {
    case AuthValidationErrorType.EMAIL_REQUIRED:
      return 'Email address is required'
    case AuthValidationErrorType.EMAIL_INVALID:
      return 'Please enter a valid email address'
    case AuthValidationErrorType.EMAIL_TOO_SHORT:
      return 'Email address is too short'
    case AuthValidationErrorType.EMAIL_TOO_LONG:
      return 'Email address is too long'
    case AuthValidationErrorType.PASSWORD_REQUIRED:
      return 'Password is required'
    case AuthValidationErrorType.PASSWORD_TOO_SHORT:
      return `Password must be at least ${AUTH_VALIDATION.PASSWORD.MIN_LENGTH} characters`
    case AuthValidationErrorType.PASSWORD_TOO_LONG:
      return `Password must not exceed ${AUTH_VALIDATION.PASSWORD.MAX_LENGTH} characters`
    case AuthValidationErrorType.PASSWORD_WEAK:
      return 'Password is too weak. Use a mix of letters, numbers, and symbols'
    case AuthValidationErrorType.PASSWORD_COMMON:
      return 'This password is too common. Please choose a different one'
    case AuthValidationErrorType.PASSWORDS_DONT_MATCH:
      return "Passwords don't match"
    default:
      return 'Please check your input and try again'
  }
}

/**
 * Check if auth validation error is user-recoverable
 */
export function isRecoverableAuthValidationError(
  type: AuthValidationErrorType
): boolean {
  // All auth validation errors are user-recoverable
  return true
}

/**
 * Get password strength color for UI
 */
export function getPasswordStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case PasswordStrength.VERY_WEAK:
      return 'text-red-500'
    case PasswordStrength.WEAK:
      return 'text-orange-500'
    case PasswordStrength.MEDIUM:
      return 'text-yellow-500'
    case PasswordStrength.STRONG:
      return 'text-blue-500'
    case PasswordStrength.VERY_STRONG:
      return 'text-green-500'
    default:
      return 'text-gray-500'
  }
}

/**
 * Get password strength label for UI
 */
export function getPasswordStrengthLabel(strength: PasswordStrength): string {
  switch (strength) {
    case PasswordStrength.VERY_WEAK:
      return 'Very Weak'
    case PasswordStrength.WEAK:
      return 'Weak'
    case PasswordStrength.MEDIUM:
      return 'Medium'
    case PasswordStrength.STRONG:
      return 'Strong'
    case PasswordStrength.VERY_STRONG:
      return 'Very Strong'
    default:
      return 'Unknown'
  }
}
