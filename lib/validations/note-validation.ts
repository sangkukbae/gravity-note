/**
 * Note Content Validation Schemas and Functions
 *
 * Comprehensive validation for note creation and updates using Zod.
 * Includes length limits, content sanitization, and security checks.
 */

import { z } from 'zod'

/**
 * Note content validation constants
 */
export const NOTE_VALIDATION = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 10000,
  TRIM_REQUIRED: true,
  SANITIZE_XSS: true,
} as const

/**
 * Validation error types for classification
 */
export enum NoteValidationErrorType {
  REQUIRED = 'REQUIRED',
  TOO_SHORT = 'TOO_SHORT',
  TOO_LONG = 'TOO_LONG',
  INVALID_CHARACTERS = 'INVALID_CHARACTERS',
  XSS_DETECTED = 'XSS_DETECTED',
  RATE_LIMIT = 'RATE_LIMIT',
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  success: boolean
  data?: string
  error?: {
    type: NoteValidationErrorType
    message: string
    code: string
  }
}

/**
 * Note creation validation result interface
 */
export interface CreateNoteValidationResult {
  success: boolean
  data?: { content: string }
  error?: {
    type: NoteValidationErrorType
    message: string
    code: string
  }
}

/**
 * Basic HTML tag detection for XSS prevention
 * Not a comprehensive security solution, but catches basic attempts
 */
function containsSuspiciousContent(content: string): boolean {
  // Basic XSS patterns to detect
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onload
    /<object\b/gi,
    /<embed\b/gi,
    /<form\b/gi,
  ]

  return xssPatterns.some(pattern => pattern.test(content))
}

/**
 * Basic content sanitization
 */
function sanitizeContent(content: string): string {
  // Remove null bytes and other control characters except newlines/tabs
  let out = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  // Strip invisible formatting characters that break substring/FTS search
  // - ZWSP (\u200B), ZWNJ (\u200C), ZWJ (\u200D), BOM (\uFEFF)
  // Note: keep this list minimal to avoid removing meaningful characters.
  out = out.replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
  return out
}

/**
 * Core note content schema
 */
export const noteContentSchema = z
  .string()
  .trim()
  .min(NOTE_VALIDATION.MIN_LENGTH, {
    message: `Note content must be at least ${NOTE_VALIDATION.MIN_LENGTH} character`,
  })
  .max(NOTE_VALIDATION.MAX_LENGTH, {
    message: `Note content must not exceed ${NOTE_VALIDATION.MAX_LENGTH} characters`,
  })
  .refine(content => !containsSuspiciousContent(content), {
    message: 'Note content contains potentially unsafe content',
  })
  .transform(sanitizeContent)

/**
 * Note creation schema
 */
export const createNoteSchema = z.object({
  content: noteContentSchema,
})

/**
 * Note update schema (partial updates allowed)
 */
export const updateNoteSchema = z.object({
  content: noteContentSchema.optional(),
  title: z
    .string()
    .max(200, 'Title must not exceed 200 characters')
    .nullable()
    .optional(),
})

/**
 * Rate limiting validation (client-side hint)
 */
export interface RateLimitOptions {
  maxNotesPerMinute: number
  maxNotesPerHour: number
}

export const defaultRateLimits: RateLimitOptions = {
  maxNotesPerMinute: 10,
  maxNotesPerHour: 100,
}

/**
 * Validate note content with detailed error information
 */
export function validateNoteContent(content: unknown): ValidationResult {
  try {
    const result = noteContentSchema.safeParse(content)

    if (result.success) {
      return {
        success: true,
        data: result.data,
      }
    }

    // Parse Zod errors into our validation error types
    const error = result.error.issues[0]
    if (!error) {
      return {
        success: false,
        error: {
          type: NoteValidationErrorType.INVALID_CHARACTERS,
          message: 'Validation failed',
          code: 'unknown',
        },
      }
    }

    let validationType: NoteValidationErrorType
    let errorMessage: string

    if (error.code === 'too_small') {
      validationType = NoteValidationErrorType.TOO_SHORT
      errorMessage = error.message
    } else if (error.code === 'too_big') {
      validationType = NoteValidationErrorType.TOO_LONG
      errorMessage = error.message
    } else if (
      error.code === 'custom' &&
      error.message.includes('unsafe content')
    ) {
      validationType = NoteValidationErrorType.XSS_DETECTED
      errorMessage = 'Please remove any HTML tags or scripts from your note'
    } else if (error.code === 'invalid_type') {
      validationType = NoteValidationErrorType.REQUIRED
      errorMessage = 'Note content is required'
    } else {
      validationType = NoteValidationErrorType.INVALID_CHARACTERS
      errorMessage = error.message
    }

    return {
      success: false,
      error: {
        type: validationType,
        message: errorMessage,
        code: error.code,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: {
        type: NoteValidationErrorType.INVALID_CHARACTERS,
        message: 'Invalid note content',
        code: 'validation_error',
      },
    }
  }
}

/**
 * Validate note creation input
 */
export function validateCreateNote(input: unknown): CreateNoteValidationResult {
  try {
    const result = createNoteSchema.safeParse(input)

    if (result.success) {
      return {
        success: true,
        data: result.data,
      }
    }

    const error = result.error.issues[0]
    const contentValidation = validateNoteContent((input as any)?.content)

    if (!contentValidation.success) {
      return {
        success: false,
        error: contentValidation.error || {
          type: NoteValidationErrorType.INVALID_CHARACTERS,
          message: 'Validation failed',
          code: 'unknown',
        },
      }
    }

    return {
      success: false,
      error: {
        type: NoteValidationErrorType.INVALID_CHARACTERS,
        message: error?.message || 'Invalid input format',
        code: error?.code || 'unknown',
      },
    }
  } catch (err) {
    return {
      success: false,
      error: {
        type: NoteValidationErrorType.INVALID_CHARACTERS,
        message: 'Invalid input format',
        code: 'validation_error',
      },
    }
  }
}

/**
 * Get user-friendly validation error message
 */
export function getValidationErrorMessage(
  type: NoteValidationErrorType
): string {
  switch (type) {
    case NoteValidationErrorType.REQUIRED:
      return 'Please enter some content for your note'
    case NoteValidationErrorType.TOO_SHORT:
      return 'Your note needs at least one character'
    case NoteValidationErrorType.TOO_LONG:
      return `Your note is too long (max ${NOTE_VALIDATION.MAX_LENGTH.toLocaleString()} characters)`
    case NoteValidationErrorType.XSS_DETECTED:
      return 'Please remove any HTML tags or scripts from your note'
    case NoteValidationErrorType.INVALID_CHARACTERS:
      return 'Your note contains invalid characters'
    case NoteValidationErrorType.RATE_LIMIT:
      return "You're creating notes too quickly. Please wait a moment"
    default:
      return 'Please check your input and try again'
  }
}

/**
 * Check if validation error is user-recoverable
 */
export function isRecoverableValidationError(
  type: NoteValidationErrorType
): boolean {
  switch (type) {
    case NoteValidationErrorType.REQUIRED:
    case NoteValidationErrorType.TOO_SHORT:
    case NoteValidationErrorType.TOO_LONG:
    case NoteValidationErrorType.XSS_DETECTED:
    case NoteValidationErrorType.INVALID_CHARACTERS:
      return true
    case NoteValidationErrorType.RATE_LIMIT:
      return false // User needs to wait
    default:
      return true
  }
}

/**
 * Get character count statistics for UI feedback
 */
export function getContentStats(content: string) {
  const trimmed = content.trim()
  const length = trimmed.length
  const remaining = NOTE_VALIDATION.MAX_LENGTH - length
  const isValid =
    length >= NOTE_VALIDATION.MIN_LENGTH && length <= NOTE_VALIDATION.MAX_LENGTH
  const warningThreshold = NOTE_VALIDATION.MAX_LENGTH * 0.9 // 90% of max length
  const showWarning = length >= warningThreshold

  return {
    length,
    remaining,
    isValid,
    showWarning,
    maxLength: NOTE_VALIDATION.MAX_LENGTH,
    minLength: NOTE_VALIDATION.MIN_LENGTH,
    percentage: Math.min((length / NOTE_VALIDATION.MAX_LENGTH) * 100, 100),
  }
}

/**
 * Export schemas for direct use
 */
// export { noteContentSchema, createNoteSchema, updateNoteSchema }
