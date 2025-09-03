/**
 * Password Strength Indicator Component
 *
 * Visual indicator showing password strength with progress bar,
 * strength label, and helpful feedback for users.
 */

'use client'

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  PasswordStrength,
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  type PasswordStrengthAnalysis,
} from '@/lib/validations/auth-validation'

interface PasswordStrengthIndicatorProps {
  /** Password strength analysis */
  strength: PasswordStrengthAnalysis
  /** Whether to show detailed feedback */
  showFeedback?: boolean
  /** Whether to show the component (for conditional rendering) */
  isVisible?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Get progress bar color based on strength
 */
function getProgressBarColor(strength: PasswordStrength): string {
  switch (strength) {
    case PasswordStrength.VERY_WEAK:
      return 'bg-red-500'
    case PasswordStrength.WEAK:
      return 'bg-orange-500'
    case PasswordStrength.MEDIUM:
      return 'bg-yellow-500'
    case PasswordStrength.STRONG:
      return 'bg-blue-500'
    case PasswordStrength.VERY_STRONG:
      return 'bg-green-500'
    default:
      return 'bg-gray-300'
  }
}

/**
 * Get background color for the strength container
 */
function getBackgroundColor(strength: PasswordStrength): string {
  switch (strength) {
    case PasswordStrength.VERY_WEAK:
      return 'bg-red-50 border-red-200'
    case PasswordStrength.WEAK:
      return 'bg-orange-50 border-orange-200'
    case PasswordStrength.MEDIUM:
      return 'bg-yellow-50 border-yellow-200'
    case PasswordStrength.STRONG:
      return 'bg-blue-50 border-blue-200'
    case PasswordStrength.VERY_STRONG:
      return 'bg-green-50 border-green-200'
    default:
      return 'bg-gray-50 border-gray-200'
  }
}

export function PasswordStrengthIndicator({
  strength,
  showFeedback = true,
  isVisible = true,
  className,
}: PasswordStrengthIndicatorProps) {
  if (!isVisible || strength.length === 0) {
    return null
  }

  const strengthColor = getPasswordStrengthColor(strength.strength)
  const strengthLabel = getPasswordStrengthLabel(strength.strength)
  const progressColor = getProgressBarColor(strength.strength)
  const backgroundColor = getBackgroundColor(strength.strength)

  return (
    <div
      className={cn(
        'rounded-md border p-3 space-y-2 transition-all duration-200',
        backgroundColor,
        className
      )}
    >
      {/* Strength Label and Progress Bar */}
      <div className='flex items-center justify-between text-sm'>
        <span className='font-medium text-gray-700'>Password Strength:</span>
        <span className={cn('font-semibold', strengthColor)}>
          {strengthLabel}
        </span>
      </div>

      {/* Progress Bar */}
      <div className='space-y-1'>
        <Progress
          value={strength.score}
          className='h-2'
          // Custom progress bar color (using Tailwind utilities)
          style={
            {
              '--progress-background': `var(--${progressColor.replace('bg-', '')}-500)`,
            } as React.CSSProperties
          }
        />
        <div className='flex justify-between text-xs text-gray-500'>
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Character Requirements */}
      <div className='grid grid-cols-2 gap-2 text-xs'>
        <div
          className={cn(
            'flex items-center space-x-1',
            strength.length >= 8 ? 'text-green-600' : 'text-gray-500'
          )}
        >
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              strength.length >= 8 ? 'bg-green-500' : 'bg-gray-300'
            )}
          />
          <span>8+ characters</span>
        </div>

        <div
          className={cn(
            'flex items-center space-x-1',
            strength.hasUppercase ? 'text-green-600' : 'text-gray-500'
          )}
        >
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              strength.hasUppercase ? 'bg-green-500' : 'bg-gray-300'
            )}
          />
          <span>Uppercase</span>
        </div>

        <div
          className={cn(
            'flex items-center space-x-1',
            strength.hasLowercase ? 'text-green-600' : 'text-gray-500'
          )}
        >
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              strength.hasLowercase ? 'bg-green-500' : 'bg-gray-300'
            )}
          />
          <span>Lowercase</span>
        </div>

        <div
          className={cn(
            'flex items-center space-x-1',
            strength.hasNumber ? 'text-green-600' : 'text-gray-500'
          )}
        >
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              strength.hasNumber ? 'bg-green-500' : 'bg-gray-300'
            )}
          />
          <span>Number</span>
        </div>
      </div>

      {/* Feedback Messages */}
      {showFeedback && strength.feedback.length > 0 && (
        <div className='pt-1 border-t border-current/20'>
          <ul className='text-xs space-y-1'>
            {strength.feedback.slice(0, 3).map((message, index) => (
              <li key={index} className='flex items-start space-x-1'>
                <span className='text-gray-400 mt-0.5'>•</span>
                <span className='text-gray-600'>{message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Common Password Warning */}
      {strength.isCommon && (
        <div className='pt-1 border-t border-red-200'>
          <div className='flex items-center space-x-1 text-xs text-red-600'>
            <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                clipRule='evenodd'
              />
            </svg>
            <span>This password is commonly used and less secure</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact version for inline display
 */
export function PasswordStrengthIndicatorCompact({
  strength,
  isVisible = true,
  className,
}: Pick<
  PasswordStrengthIndicatorProps,
  'strength' | 'isVisible' | 'className'
>) {
  if (!isVisible || strength.length === 0) {
    return null
  }

  const strengthColor = getPasswordStrengthColor(strength.strength)
  const strengthLabel = getPasswordStrengthLabel(strength.strength)

  return (
    <div className={cn('flex items-center space-x-2 text-xs', className)}>
      <div className='flex-1'>
        <Progress value={strength.score} className='h-1' />
      </div>
      <span className={cn('font-medium whitespace-nowrap', strengthColor)}>
        {strengthLabel}
      </span>
    </div>
  )
}
