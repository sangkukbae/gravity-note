'use client'

import React, { useState } from 'react'
import {
  AlertTriangle,
  RefreshCw,
  Bug,
  Home,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
  Wifi,
  User,
  Shield,
  Database,
  Clock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  classifyError,
  ErrorCategory,
  ErrorSeverity,
  type ClassifiedError,
} from '@/lib/errors/classification'

/**
 * Recovery action configuration
 */
interface RecoveryAction {
  id: string
  label: string
  description?: string
  action: () => void | Promise<void>
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  icon?: LucideIcon
  loading?: boolean
  disabled?: boolean
}

/**
 * Props for ErrorRecoveryPanel component
 */
interface ErrorRecoveryPanelProps {
  error: unknown
  title?: string
  description?: string
  onRetry?: () => void | Promise<void>
  onReload?: () => void
  onGoHome?: () => void
  onReport?: () => void
  customActions?: RecoveryAction[]
  showTechnicalDetails?: boolean
  className?: string
}

/**
 * Get recovery suggestions based on error category
 */
function getRecoverySuggestions(error: ClassifiedError): string[] {
  switch (error.category) {
    case ErrorCategory.NETWORK:
      return [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and try again',
        'Check if the service is down',
      ]
    case ErrorCategory.AUTH:
      return [
        'Sign out and sign back in',
        'Clear your browser cache and cookies',
        'Check if your session has expired',
        'Verify your account status',
      ]
    case ErrorCategory.DATABASE:
      return [
        'Your changes may have been saved locally',
        'Try syncing when connection improves',
        'Check if the database is accessible',
        'Contact support if the issue persists',
      ]
    case ErrorCategory.VALIDATION:
      return [
        'Check the form inputs for errors',
        'Ensure all required fields are filled',
        'Verify the format of entered data',
        'Try submitting again with corrected information',
      ]
    case ErrorCategory.PERMISSION:
      return [
        'Sign in with an account that has proper permissions',
        'Contact an administrator for access',
        'Verify your account has the required role',
        'Try accessing a different resource',
      ]
    case ErrorCategory.RATE_LIMIT:
      return [
        'Wait before making more requests',
        'Try again in a few minutes',
        'Reduce the frequency of your actions',
        'Consider upgrading your account if applicable',
      ]
    default:
      return [
        'Try refreshing the page',
        'Check your internet connection',
        'Clear your browser cache',
        'Contact support if the problem continues',
      ]
  }
}

/**
 * Get icon for error category
 */
function getCategoryIcon(category: ErrorCategory): LucideIcon {
  switch (category) {
    case ErrorCategory.NETWORK:
      return Wifi
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
 * Copy error details to clipboard
 */
function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackErr) {
        console.error('Failed to copy text:', fallbackErr)
      } finally {
        document.body.removeChild(textArea)
      }
    }
  }

  return { copyToClipboard, copied }
}

/**
 * Error Recovery Panel Component
 * Provides comprehensive error recovery options with suggestions and actions
 */
export function ErrorRecoveryPanel({
  error,
  title,
  description,
  onRetry,
  onReload = () => window.location.reload(),
  onGoHome = () => (window.location.href = '/'),
  onReport,
  customActions = [],
  showTechnicalDetails = false,
  className,
}: ErrorRecoveryPanelProps) {
  const classifiedError = classifyError(error)
  const [showDetails, setShowDetails] = useState(false)
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>(
    {}
  )
  const { copyToClipboard, copied } = useCopyToClipboard()

  const suggestions = getRecoverySuggestions(classifiedError)
  const CategoryIcon = getCategoryIcon(classifiedError.category)

  // Handle async action execution
  const executeAction = async (
    actionId: string,
    action: () => void | Promise<void>
  ) => {
    setLoadingActions(prev => ({ ...prev, [actionId]: true }))
    try {
      await action()
    } catch (actionError) {
      console.error('Recovery action failed:', actionError)
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionId]: false }))
    }
  }

  // Build default recovery actions
  const defaultActions: RecoveryAction[] = [
    ...(onRetry && classifiedError.isRetryable
      ? [
          {
            id: 'retry',
            label: 'Try Again',
            description: 'Attempt the same action',
            action: onRetry,
            variant: 'default' as const,
            icon: RefreshCw,
          },
        ]
      : []),
    {
      id: 'reload',
      label: 'Reload Page',
      description: 'Refresh the current page',
      action: onReload,
      variant: 'outline' as const,
      icon: RefreshCw,
    },
    {
      id: 'home',
      label: 'Go Home',
      description: 'Return to the main page',
      action: onGoHome,
      variant: 'outline' as const,
      icon: Home,
    },
    ...(onReport
      ? [
          {
            id: 'report',
            label: 'Report Issue',
            description: 'Send error report to support',
            action: onReport,
            variant: 'ghost' as const,
            icon: Bug,
          },
        ]
      : []),
  ]

  const allActions = [...customActions, ...defaultActions]

  // Generate error details for copying
  const errorDetails = `
Error Report - Gravity Note
Timestamp: ${new Date().toISOString()}
Error ID: ${classifiedError.timestamp.getTime()}

Error Details:
- Message: ${classifiedError.message}
- Category: ${classifiedError.category}
- Severity: ${classifiedError.severity}
- Retryable: ${classifiedError.isRetryable}

Browser Information:
- User Agent: ${navigator.userAgent}
- URL: ${window.location.href}
- Timestamp: ${new Date().toLocaleString()}

${
  classifiedError.originalError?.stack
    ? `
Stack Trace:
${classifiedError.originalError.stack}
`
    : ''
}
  `.trim()

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader className='pb-4'>
        <div className='flex items-start gap-4'>
          <div className='flex-shrink-0 p-2 rounded-full bg-red-100 dark:bg-red-900/30'>
            <CategoryIcon className='h-6 w-6 text-red-600 dark:text-red-400' />
          </div>
          <div className='flex-1'>
            <CardTitle className='text-xl'>
              {title || 'Something went wrong'}
            </CardTitle>
            <CardDescription className='mt-1 text-base'>
              {description || classifiedError.userMessage}
            </CardDescription>

            {/* Error category badge */}
            <div className='mt-3'>
              <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'>
                <CategoryIcon className='h-3 w-3' />
                {classifiedError.category.charAt(0).toUpperCase() +
                  classifiedError.category.slice(1)}{' '}
                Error
                {classifiedError.severity === ErrorSeverity.CRITICAL && (
                  <span className='px-2 py-0.5 text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded'>
                    Critical
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className='space-y-6'>
        {/* Recovery Actions */}
        <div>
          <h4 className='font-medium text-sm text-gray-900 dark:text-gray-100 mb-3'>
            Recovery Options
          </h4>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {allActions.map(action => (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                className='flex items-center gap-2 justify-start h-auto p-3'
                onClick={() => executeAction(action.id, action.action)}
                disabled={action.disabled || loadingActions[action.id]}
              >
                {loadingActions[action.id] ? (
                  <RefreshCw className='h-4 w-4 animate-spin' />
                ) : (
                  action.icon && <action.icon className='h-4 w-4' />
                )}
                <div className='text-left'>
                  <div className='font-medium'>{action.label}</div>
                  {action.description && (
                    <div className='text-xs text-muted-foreground'>
                      {action.description}
                    </div>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Recovery Suggestions */}
        <div>
          <h4 className='font-medium text-sm text-gray-900 dark:text-gray-100 mb-3'>
            What you can try
          </h4>
          <ul className='space-y-2'>
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className='flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400'
              >
                <span className='w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0' />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Technical Details Section */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='w-full justify-between p-0 h-auto font-normal'
            >
              <span className='text-sm text-gray-600 dark:text-gray-400'>
                Technical Details
              </span>
              {showDetails ? (
                <ChevronUp className='h-4 w-4' />
              ) : (
                <ChevronDown className='h-4 w-4' />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className='mt-4 space-y-3'>
            <div className='p-3 bg-gray-50 dark:bg-gray-900 rounded-lg'>
              <div className='flex items-center justify-between mb-2'>
                <span className='text-xs font-medium text-gray-700 dark:text-gray-300'>
                  Error Information
                </span>
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-6 px-2 text-xs'
                  onClick={() => copyToClipboard(errorDetails)}
                >
                  {copied ? (
                    <CheckCircle2 className='h-3 w-3 mr-1 text-green-600' />
                  ) : (
                    <Copy className='h-3 w-3 mr-1' />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>

              <div className='space-y-2 text-xs font-mono'>
                <div>
                  <span className='text-gray-500 dark:text-gray-400'>
                    Message:
                  </span>{' '}
                  <span className='text-gray-900 dark:text-gray-100'>
                    {classifiedError.message}
                  </span>
                </div>
                <div>
                  <span className='text-gray-500 dark:text-gray-400'>
                    Category:
                  </span>{' '}
                  <span className='text-gray-900 dark:text-gray-100'>
                    {classifiedError.category}
                  </span>
                </div>
                <div>
                  <span className='text-gray-500 dark:text-gray-400'>
                    Severity:
                  </span>{' '}
                  <span className='text-gray-900 dark:text-gray-100'>
                    {classifiedError.severity}
                  </span>
                </div>
                <div>
                  <span className='text-gray-500 dark:text-gray-400'>
                    Time:
                  </span>{' '}
                  <span className='text-gray-900 dark:text-gray-100'>
                    {classifiedError.timestamp.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Stack trace in development */}
            {process.env.NODE_ENV === 'development' &&
              classifiedError.originalError?.stack && (
                <details className='group'>
                  <summary className='cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'>
                    Stack Trace
                  </summary>
                  <pre className='mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto'>
                    {classifiedError.originalError.stack}
                  </pre>
                </details>
              )}

            {/* Support link */}
            <div className='pt-2 border-t border-gray-200 dark:border-gray-700'>
              <p className='text-xs text-gray-600 dark:text-gray-400'>
                Need more help?{' '}
                <a
                  href='mailto:support@gravity-note.com'
                  className='text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1'
                >
                  Contact Support
                  <ExternalLink className='h-3 w-3' />
                </a>
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
