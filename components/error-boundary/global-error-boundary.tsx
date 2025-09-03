'use client'

import React, { Component, ReactNode } from 'react'
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  MessageCircle,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ErrorFeedbackModal } from '@/components/error/error-feedback-modal'
import { ErrorDetailsViewer } from '@/components/error/error-details-viewer'
import {
  classifyError,
  getUserErrorMessage,
  isRetryableError,
  getErrorSeverity,
  formatErrorForLogging,
  ErrorSeverity,
} from '@/lib/errors/classification'
import {
  captureCriticalError,
  SENTRY_FEATURES,
  type SentryErrorContext,
} from '@/lib/sentry'
import * as Sentry from '@sentry/nextjs'

interface GlobalErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string | null
  retryCount: number
  showFeedbackModal: boolean
  showErrorDetails: boolean
}

interface GlobalErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?:
    | ((error: Error, errorInfo: React.ErrorInfo, errorId: string) => void)
    | undefined
  maxRetries?: number
  enableSentryLogging?: boolean
}

/**
 * Global Error Boundary for the entire Gravity Note application
 * Catches JavaScript errors anywhere in the child component tree and provides
 * user-friendly error UI with retry functionality and Sentry integration
 */
export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  private retryTimeouts: NodeJS.Timeout[] = []

  constructor(props: GlobalErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      showFeedbackModal: false,
      showErrorDetails: false,
    }
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<GlobalErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      hasError: true,
      error,
      errorId,
      errorInfo: null,
      showFeedbackModal: false,
      showErrorDetails: false,
    }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { enableSentryLogging = true, onError } = this.props
    const errorId =
      this.state.errorId ||
      `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Update state with error info
    this.setState({
      error,
      errorInfo,
      errorId,
    })

    // Log error for debugging
    console.group('🚨 Global Error Boundary - Error Caught')
    console.error('Error:', error)
    console.error('Error Info:', errorInfo)
    console.error('Error ID:', errorId)
    console.groupEnd()

    // Classify error for better handling
    const classifiedError = classifyError(error)

    // Add breadcrumb for error boundary activation
    Sentry.addBreadcrumb({
      category: 'error_boundary',
      message: 'Global Error Boundary caught error',
      level: 'error',
      data: {
        errorId,
        component: 'GlobalErrorBoundary',
        retryCount: this.state.retryCount,
        category: classifiedError.category,
        severity: classifiedError.severity,
      },
    })

    // Send to Sentry if enabled
    if (enableSentryLogging && SENTRY_FEATURES.enabled) {
      try {
        const sentryContext: SentryErrorContext = {
          errorId,
          component: 'GlobalErrorBoundary',
          operation: 'error_boundary_catch',
          componentStack: errorInfo.componentStack || '',
          retryCount: this.state.retryCount,
          timestamp: new Date().toISOString(),
        }

        // Add optional properties only if they exist
        if (typeof window !== 'undefined') {
          sentryContext.url = window.location.href
          sentryContext.userAgent = window.navigator.userAgent
        }

        captureCriticalError(error, sentryContext)
      } catch (sentryError) {
        console.error('Failed to send error to Sentry:', sentryError)
      }
    }

    // Call optional error callback
    if (onError) {
      try {
        onError(error, errorInfo, errorId)
      } catch (callbackError) {
        console.error('Error in onError callback:', callbackError)
      }
    }

    // For critical errors, we might want to reload the page after a delay
    if (classifiedError.severity === ErrorSeverity.CRITICAL) {
      const timeout = setTimeout(() => {
        window.location.reload()
      }, 10000) // 10 seconds delay
      this.retryTimeouts.push(timeout)
    }
  }

  override componentWillUnmount() {
    // Clear any pending timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts = []
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props
    const newRetryCount = this.state.retryCount + 1

    if (newRetryCount <= maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: newRetryCount,
        showFeedbackModal: false,
        showErrorDetails: false,
      })
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleShowFeedback = () => {
    this.setState({ showFeedbackModal: true })
  }

  private handleCloseFeedback = () => {
    this.setState({ showFeedbackModal: false })
  }

  private handleShowDetails = () => {
    this.setState({ showErrorDetails: true })
  }

  private handleCloseDetails = () => {
    this.setState({ showErrorDetails: false })
  }

  override render() {
    const { children, fallback, maxRetries = 3 } = this.props
    const {
      hasError,
      error,
      errorId,
      retryCount,
      showFeedbackModal,
      showErrorDetails,
    } = this.state

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Classify error for appropriate UI
      const classifiedError = classifyError(error)
      const userMessage = getUserErrorMessage(error)
      const canRetry = isRetryableError(error) && retryCount < maxRetries
      const severity = getErrorSeverity(error)

      // Get appropriate icon and colors based on severity
      const getErrorStyles = () => {
        switch (severity) {
          case ErrorSeverity.CRITICAL:
            return {
              iconColor: 'text-red-600 dark:text-red-400',
              borderColor: 'border-red-200 dark:border-red-800',
              bgColor: 'bg-red-50 dark:bg-red-950/20',
            }
          case ErrorSeverity.HIGH:
            return {
              iconColor: 'text-orange-600 dark:text-orange-400',
              borderColor: 'border-orange-200 dark:border-orange-800',
              bgColor: 'bg-orange-50 dark:bg-orange-950/20',
            }
          case ErrorSeverity.MEDIUM:
            return {
              iconColor: 'text-yellow-600 dark:text-yellow-400',
              borderColor: 'border-yellow-200 dark:border-yellow-800',
              bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
            }
          default:
            return {
              iconColor: 'text-blue-600 dark:text-blue-400',
              borderColor: 'border-blue-200 dark:border-blue-800',
              bgColor: 'bg-blue-50 dark:bg-blue-950/20',
            }
        }
      }

      const styles = getErrorStyles()

      return (
        <div className='min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4'>
          <div className='w-full max-w-md'>
            <Card className={`${styles.borderColor} ${styles.bgColor}`}>
              <CardHeader className='text-center pb-4'>
                <div className='flex justify-center mb-4'>
                  <AlertTriangle className={`h-12 w-12 ${styles.iconColor}`} />
                </div>
                <CardTitle className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                  Oops! Something went wrong
                </CardTitle>
                <CardDescription className='text-gray-600 dark:text-gray-400'>
                  {userMessage}
                </CardDescription>
              </CardHeader>

              <CardContent className='space-y-4'>
                {/* Error ID for support */}
                {errorId && (
                  <div className='text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 rounded px-2 py-1'>
                    Error ID: {errorId}
                  </div>
                )}

                {/* Retry attempts info */}
                {retryCount > 0 && (
                  <div className='text-xs text-gray-500 dark:text-gray-400'>
                    Retry attempts: {retryCount}/{maxRetries}
                  </div>
                )}

                {/* Action buttons */}
                <div className='flex flex-col gap-2'>
                  {/* Retry button - only show if error is retryable and under max retries */}
                  {canRetry && (
                    <Button
                      onClick={this.handleRetry}
                      variant='default'
                      className='w-full'
                    >
                      <RefreshCw className='h-4 w-4 mr-2' />
                      Try Again
                    </Button>
                  )}

                  {/* Reload page button */}
                  <Button
                    onClick={this.handleReload}
                    variant='outline'
                    className='w-full'
                  >
                    <RefreshCw className='h-4 w-4 mr-2' />
                    Reload Page
                  </Button>

                  {/* Go to home button */}
                  <Button
                    onClick={this.handleGoHome}
                    variant='outline'
                    className='w-full'
                  >
                    <Home className='h-4 w-4 mr-2' />
                    Go to Home
                  </Button>
                </div>

                {/* Error actions */}
                <div className='pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2'>
                  <div className='flex gap-2'>
                    <Button
                      onClick={this.handleShowFeedback}
                      variant='ghost'
                      size='sm'
                      className='flex-1 text-xs'
                    >
                      <MessageCircle className='h-3 w-3 mr-2' />
                      Send Feedback
                    </Button>
                    <Button
                      onClick={this.handleShowDetails}
                      variant='ghost'
                      size='sm'
                      className='flex-1 text-xs'
                    >
                      <Eye className='h-3 w-3 mr-2' />
                      View Details
                    </Button>
                  </div>
                </div>

                {/* Development info (only in development) */}
                {process.env.NODE_ENV === 'development' && (
                  <details className='mt-4'>
                    <summary className='text-xs text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300'>
                      Developer Details
                    </summary>
                    <div className='mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono'>
                      <div className='mb-2'>
                        <strong>Error:</strong> {error.message}
                      </div>
                      <div className='mb-2'>
                        <strong>Category:</strong> {classifiedError.category}
                      </div>
                      <div className='mb-2'>
                        <strong>Severity:</strong> {severity}
                      </div>
                      {error.stack && (
                        <div>
                          <strong>Stack:</strong>
                          <pre className='mt-1 whitespace-pre-wrap break-all'>
                            {error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>

            {/* Feedback Modal */}
            <ErrorFeedbackModal
              open={showFeedbackModal}
              onClose={this.handleCloseFeedback}
              errorInfo={{
                id: errorId || '',
                message: error.message,
                category: classifiedError.category,
                severity: classifiedError.severity,
                stack: error.stack ?? '',
                timestamp: new Date().toISOString(),
                context: {
                  userAgent:
                    typeof window !== 'undefined'
                      ? window.navigator.userAgent
                      : '',
                  url:
                    typeof window !== 'undefined' ? window.location.href : '',
                  retryCount,
                },
              }}
            />

            {/* Error Details Viewer */}
            <ErrorDetailsViewer
              open={showErrorDetails}
              onClose={this.handleCloseDetails}
              errorInfo={{
                id: errorId || '',
                message: error.message,
                category: classifiedError.category,
                severity: classifiedError.severity,
                stack: error.stack ?? '',
                timestamp: new Date().toISOString(),
                context: {
                  userAgent:
                    typeof window !== 'undefined'
                      ? window.navigator.userAgent
                      : '',
                  url:
                    typeof window !== 'undefined' ? window.location.href : '',
                  retryCount,
                },
              }}
              privacyMode={process.env.NODE_ENV === 'production'}
            />
          </div>
        </div>
      )
    }

    return children
  }
}

/**
 * HOC wrapper for functional components
 */
export function withGlobalErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<GlobalErrorBoundaryProps, 'children'>
) {
  return function WrappedComponent(props: T) {
    return (
      <GlobalErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </GlobalErrorBoundary>
    )
  }
}

/**
 * Simplified global error wrapper for inline use
 */
export function GlobalErrorWrapper({
  children,
  onError,
}: {
  children: ReactNode
  onError?:
    | ((error: Error, errorInfo: React.ErrorInfo, errorId: string) => void)
    | undefined
}) {
  return (
    <GlobalErrorBoundary
      onError={onError}
      enableSentryLogging={true}
      maxRetries={3}
    >
      {children}
    </GlobalErrorBoundary>
  )
}
