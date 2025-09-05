'use client'

import React from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  X,
  RefreshCw,
  Bug,
  WifiOff,
  Shield,
  Database,
  User,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  classifyError,
  ErrorCategory,
  ErrorSeverity,
  type ClassifiedError,
} from '@/lib/errors/classification'
import type { LucideIcon } from 'lucide-react'

/**
 * Configuration for error toast appearance and behavior
 */
interface ErrorToastConfig {
  title?: string
  description?: string
  actions?: ErrorToastAction[]
  dismissible?: boolean
  persistent?: boolean
  showIcon?: boolean
  showCategory?: boolean
}

/**
 * Action button configuration for error toasts
 */
interface ErrorToastAction {
  label: string
  action: () => void
  variant?: 'default' | 'outline' | 'ghost'
  icon?: React.ComponentType<any>
}

/**
 * Get appropriate icon for error category
 */
function getErrorIcon(category: ErrorCategory): LucideIcon {
  switch (category) {
    case ErrorCategory.NETWORK:
      return WifiOff
    case ErrorCategory.AUTH:
      return User
    case ErrorCategory.DATABASE:
      return Database
    case ErrorCategory.PERMISSION:
      return Shield
    case ErrorCategory.RATE_LIMIT:
      return Clock
    default:
      return AlertTriangle
  }
}

/**
 * Get severity-based styling for error toasts
 */
function getSeverityStyles(severity: ErrorSeverity) {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return {
        borderColor: 'border-red-200 dark:border-red-800',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        iconColor: 'text-red-600 dark:text-red-400',
        textColor: 'text-red-900 dark:text-red-100',
      }
    case ErrorSeverity.HIGH:
      return {
        borderColor: 'border-orange-200 dark:border-orange-800',
        bgColor: 'bg-orange-50 dark:bg-orange-950/20',
        iconColor: 'text-orange-600 dark:text-orange-400',
        textColor: 'text-orange-900 dark:text-orange-100',
      }
    case ErrorSeverity.MEDIUM:
      return {
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        textColor: 'text-yellow-900 dark:text-yellow-100',
      }
    default:
      return {
        borderColor: 'border-blue-200 dark:border-blue-800',
        bgColor: 'bg-blue-50 dark:bg-blue-950/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
        textColor: 'text-blue-900 dark:text-blue-100',
      }
  }
}

/**
 * Custom error toast component for displaying errors with actions
 */
function ErrorToastContent({
  error,
  config,
  onDismiss,
}: {
  error: ClassifiedError
  config: ErrorToastConfig
  onDismiss?: () => void
}) {
  const ErrorIcon = getErrorIcon(error.category)
  const styles = getSeverityStyles(error.severity)

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border',
        styles.borderColor,
        styles.bgColor,
        'min-w-[320px] max-w-[480px]'
      )}
    >
      {/* Error Icon */}
      {config.showIcon !== false && (
        <div className='flex-shrink-0 mt-0.5'>
          <ErrorIcon className={cn('h-5 w-5', styles.iconColor)} />
        </div>
      )}

      {/* Content */}
      <div className='flex-1 min-w-0'>
        {/* Title */}
        <div className={cn('font-medium text-sm', styles.textColor)}>
          {config.title || error.userMessage}
        </div>

        {/* Description */}
        {config.description && (
          <div className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
            {config.description}
          </div>
        )}

        {/* Category badge */}
        {config.showCategory && (
          <div className='mt-2'>
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              )}
            >
              {error.category.charAt(0).toUpperCase() + error.category.slice(1)}{' '}
              Error
            </span>
          </div>
        )}

        {/* Actions */}
        {config.actions && config.actions.length > 0 && (
          <div className='flex flex-wrap gap-2 mt-3'>
            {config.actions.map((action, index) => (
              <Button
                key={index}
                size='sm'
                variant={action.variant || 'outline'}
                onClick={action.action}
                className='text-xs h-7'
              >
                {action.icon && <action.icon className='h-3 w-3 mr-1' />}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Dismiss button */}
      {config.dismissible !== false && onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            'flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors',
            styles.textColor
          )}
        >
          <X className='h-4 w-4' />
        </button>
      )}
    </div>
  )
}

/**
 * Show error toast with enhanced functionality
 */
export function showErrorToast(error: unknown, config: ErrorToastConfig = {}) {
  const classifiedError = classifyError(error)

  // Generate unique toast ID for tracking
  const toastId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const toastOptions = {
    id: toastId,
    duration: config.persistent
      ? Infinity
      : classifiedError.severity === ErrorSeverity.CRITICAL
        ? 10000
        : 5000,
    dismissible: config.dismissible !== false,
  }

  return toast.custom(
    t => (
      <ErrorToastContent
        error={classifiedError}
        config={config}
        onDismiss={() => toast.dismiss(t)}
      />
    ),
    toastOptions
  )
}

/**
 * Pre-configured error toast variants
 */
export const errorToastVariants = {
  /**
   * Network error toast with retry action
   */
  network: (error: unknown, onRetry?: () => void) =>
    showErrorToast(error, {
      title: 'Connection Error',
      description:
        'Unable to connect to the server. Please check your internet connection.',
      ...(onRetry
        ? {
            actions: [
              {
                label: 'Retry',
                action: onRetry,
                variant: 'default',
                icon: RefreshCw,
              },
            ],
          }
        : {}),
      showCategory: true,
    }),

  /**
   * Authentication error toast with sign in action
   */
  auth: (error: unknown, onSignIn?: () => void) =>
    showErrorToast(error, {
      title: 'Authentication Required',
      description: 'Please sign in to continue using Gravity Note.',
      ...(onSignIn
        ? {
            actions: [
              {
                label: 'Sign In',
                action: onSignIn,
                variant: 'default',
                icon: User,
              },
            ],
          }
        : {}),
    }),

  /**
   * Database error toast with retry action
   */
  database: (error: unknown, onRetry?: () => void) =>
    showErrorToast(error, {
      title: 'Save Error',
      description:
        'Unable to save your changes. Your note has been saved locally.',
      ...(onRetry
        ? {
            actions: [
              {
                label: 'Try Again',
                action: onRetry,
                variant: 'default',
                icon: RefreshCw,
              },
            ],
          }
        : {}),
    }),

  /**
   * Critical error toast with report action
   */
  critical: (error: unknown, onReport?: () => void) =>
    showErrorToast(error, {
      title: 'Critical Error',
      description:
        'Something went wrong. Please report this issue to help us improve.',
      actions: [
        {
          label: 'Reload Page',
          action: () => window.location.reload(),
          variant: 'default',
          icon: RefreshCw,
        },
        ...(onReport
          ? [
              {
                label: 'Report Issue',
                action: onReport,
                variant: 'outline' as const,
                icon: Bug,
              },
            ]
          : []),
      ],
      persistent: true,
      showCategory: true,
    }),

  /**
   * Validation error toast (usually dismissible)
   */
  validation: (error: unknown, fieldName?: string) =>
    showErrorToast(error, {
      title: fieldName ? `${fieldName} Error` : 'Validation Error',
      dismissible: true,
    }),

  /**
   * Permission error toast
   */
  permission: (error: unknown, onSignIn?: () => void) =>
    showErrorToast(error, {
      title: 'Access Denied',
      description: 'You do not have permission to perform this action.',
      ...(onSignIn
        ? {
            actions: [
              {
                label: 'Sign In',
                action: onSignIn,
                variant: 'default',
                icon: User,
              },
            ],
          }
        : {}),
    }),

  /**
   * Rate limit error toast with wait message
   */
  rateLimit: (error: unknown, retryAfter?: number) =>
    showErrorToast(error, {
      title: 'Too Many Requests',
      description: retryAfter
        ? `Please wait ${retryAfter} seconds before trying again.`
        : 'Please wait a moment before trying again.',
      actions: [
        {
          label: 'Understood',
          action: () => toast.dismiss(),
          variant: 'outline',
        },
      ],
    }),
}

/**
 * Dismiss all error toasts
 */
export function dismissAllErrorToasts() {
  toast.dismiss()
}

/**
 * Check if there are any active error toasts
 */
export function hasActiveErrorToasts(): boolean {
  // Note: This is a simplified check since Sonner doesn't expose active toast count
  // In a real implementation, you might want to track this manually
  return false
}
