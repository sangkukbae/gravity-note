'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface SearchErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  className?: string
}

/**
 * Error Boundary specifically designed for search components
 * Prevents search-related errors from crashing the entire application
 */
export class SearchErrorBoundary extends Component<
  SearchErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: SearchErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Log error for debugging
    console.error('Search component error:', error, errorInfo)

    // Call optional error callback
    this.props.onError?.(error, errorInfo)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className={`p-4 text-center ${this.props.className || ''}`}>
          <div className="flex flex-col items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Search Temporarily Unavailable
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                The search feature encountered an error. You can try again or use the header search as an alternative.
              </p>
            </div>
            <button
              onClick={this.handleRetry}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook version of error boundary for functional components
 * Note: This is a simple wrapper - actual error boundaries must be class components
 */
export function withSearchErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<SearchErrorBoundaryProps, 'children'>
) {
  return function WrappedComponent(props: T) {
    return (
      <SearchErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </SearchErrorBoundary>
    )
  }
}

/**
 * Simplified error boundary for inline use
 */
export function SearchErrorWrapper({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <SearchErrorBoundary
      className={className}
      onError={(error, errorInfo) => {
        // Send to error reporting service if available
        if (typeof window !== 'undefined' && 'gtag' in window) {
          ;(window as any).gtag('event', 'exception', {
            description: `Search Error: ${error.message}`,
            fatal: false,
          })
        }
      }}
    >
      {children}
    </SearchErrorBoundary>
  )
}