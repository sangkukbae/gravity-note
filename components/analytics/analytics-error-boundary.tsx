'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class AnalyticsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to analytics services (if they're working)
    console.error('[Analytics] Error boundary caught:', error)

    // Call the optional error handler
    this.props.onError?.(error, errorInfo)

    // Try to report to Sentry if available
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          errorBoundary: 'AnalyticsErrorBoundary',
        },
        extra: {
          componentStack: errorInfo.componentStack ?? null,
        },
      })
    }
  }

  override render() {
    if (this.state.hasError) {
      // Render fallback UI or nothing at all for analytics
      if (this.props.fallback) {
        return this.props.fallback
      }

      // For analytics, we usually want to silently fail
      if (process.env.NODE_ENV === 'development') {
        return (
          <div className='fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 max-w-sm'>
            <strong>Analytics Error</strong>
            <p className='mt-1 text-xs'>{this.state.error?.message}</p>
          </div>
        )
      }

      return null // Silent failure in production
    }

    return this.props.children
  }
}

export default AnalyticsErrorBoundary
