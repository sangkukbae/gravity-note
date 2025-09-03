'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  Wifi,
  User,
  Database,
  Shield,
  Clock,
  Bug,
} from 'lucide-react'
import {
  useErrorHandler,
  useErrorStats,
  useErrorContext,
} from '@/contexts/error-context'
import {
  NetworkError,
  AuthError,
  DatabaseError,
  ValidationError,
  PermissionError,
  RateLimitError,
  RuntimeError,
  ErrorCategory,
} from '@/lib/errors/classification'
import { NetworkStatusIndicator } from './network-status-indicator'
import { EnhancedOfflineIndicator } from './offline-indicator'
import { ErrorRecoveryPanel } from './error-recovery-panel'

/**
 * Error Demo Component
 * Demonstrates the error communication system capabilities
 */
export function ErrorDemo() {
  const errorHandler = useErrorHandler()
  const errorStats = useErrorStats()
  const { state, clearAllErrors, clearErrorsByCategory } = useErrorContext()
  const [selectedErrorType, setSelectedErrorType] = useState<string>('network')
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false)
  const [currentError, setCurrentError] = useState<Error | null>(null)

  /**
   * Demo error generators
   */
  const generateError = (type: string) => {
    let error: Error

    switch (type) {
      case 'network':
        error = new NetworkError(
          'Failed to fetch data from server',
          new Error('Connection timeout')
        )
        break
      case 'auth':
        error = new AuthError(
          'Authentication token expired',
          new Error('Token validation failed')
        )
        break
      case 'database':
        error = new DatabaseError(
          'Failed to save note',
          new Error('Database connection lost')
        )
        break
      case 'validation':
        error = new ValidationError(
          'Invalid email format',
          'Please enter a valid email address'
        )
        break
      case 'permission':
        error = new PermissionError(
          'Access denied to resource',
          new Error('Insufficient privileges')
        )
        break
      case 'rateLimit':
        error = new RateLimitError(
          'Too many API requests',
          new Error('Rate limit exceeded: 100 requests per minute')
        )
        break
      case 'critical':
        error = new RuntimeError(
          'Critical system failure',
          new Error('Memory allocation failed')
        )
        break
      default:
        error = new Error('Unknown error occurred')
    }

    return error
  }

  /**
   * Trigger error with communication
   */
  const triggerError = (type: string) => {
    const error = generateError(type)
    setCurrentError(error)

    // Use appropriate error handler
    switch (type) {
      case 'network':
        errorHandler.handleNetworkError(error, () => {
          console.log('Retrying network operation...')
        })
        break
      case 'auth':
        errorHandler.handleAuthError(error, () => {
          console.log('Redirecting to sign in...')
        })
        break
      case 'database':
        errorHandler.handleDatabaseError(error, () => {
          console.log('Retrying database operation...')
        })
        break
      case 'validation':
        errorHandler.handleValidationError(error, 'email')
        break
      case 'permission':
      case 'rateLimit':
      case 'critical':
        errorHandler.handleError(error, 'demo', type)
        break
      default:
        errorHandler.handleError(error, 'demo', 'unknown')
    }
  }

  /**
   * Get icon for error category
   */
  const getCategoryIcon = (category: ErrorCategory) => {
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

  return (
    <div className='space-y-6 p-6 max-w-4xl'>
      <div className='text-center space-y-2'>
        <h1 className='text-2xl font-bold'>Error Communication System Demo</h1>
        <p className='text-muted-foreground'>
          Test the comprehensive error handling and user communication features
        </p>
      </div>

      {/* Error Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Bug className='h-5 w-5' />
            Error Generation
          </CardTitle>
          <CardDescription>
            Generate different types of errors to test the communication system
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center gap-4'>
            <Select
              value={selectedErrorType}
              onValueChange={setSelectedErrorType}
            >
              <SelectTrigger className='w-48'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='network'>Network Error</SelectItem>
                <SelectItem value='auth'>Authentication Error</SelectItem>
                <SelectItem value='database'>Database Error</SelectItem>
                <SelectItem value='validation'>Validation Error</SelectItem>
                <SelectItem value='permission'>Permission Error</SelectItem>
                <SelectItem value='rateLimit'>Rate Limit Error</SelectItem>
                <SelectItem value='critical'>Critical Error</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => triggerError(selectedErrorType)}
              variant='destructive'
            >
              Trigger Error
            </Button>

            <Button
              onClick={() => setShowRecoveryPanel(!showRecoveryPanel)}
              variant='outline'
              disabled={!currentError}
            >
              {showRecoveryPanel ? 'Hide' : 'Show'} Recovery Panel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Error Statistics</CardTitle>
          <CardDescription>
            Current error state and statistics from the error context
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
            <div className='text-center'>
              <div className='text-2xl font-bold'>{errorStats.totalErrors}</div>
              <div className='text-sm text-muted-foreground'>Total Errors</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-red-600'>
                {errorStats.criticalErrors.length}
              </div>
              <div className='text-sm text-muted-foreground'>Critical</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold'>
                {errorStats.recentErrors.length}
              </div>
              <div className='text-sm text-muted-foreground'>Recent</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold'>
                {errorStats.isRecovering ? '🔄' : '✅'}
              </div>
              <div className='text-sm text-muted-foreground'>Status</div>
            </div>
          </div>

          {/* Error Categories */}
          <div className='space-y-2'>
            <h4 className='font-medium'>Errors by Category</h4>
            <div className='flex flex-wrap gap-2'>
              {(
                Object.entries(
                  errorStats.errorsByCategory as Record<string, number>
                ) as [string, number][]
              ).map(([category, count]) => {
                if (count === 0) return null
                const IconComponent = getCategoryIcon(category as ErrorCategory)
                return (
                  <Badge
                    key={category}
                    variant='secondary'
                    className='flex items-center gap-1'
                  >
                    <IconComponent className='h-3 w-3' />
                    {category}: {count}
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-4 w-4 p-0 ml-1'
                      onClick={() =>
                        clearErrorsByCategory(category as ErrorCategory)
                      }
                    >
                      ×
                    </Button>
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* Clear Actions */}
          {errorStats.hasErrors && (
            <div className='pt-4 border-t'>
              <Button onClick={clearAllErrors} variant='outline' size='sm'>
                Clear All Errors
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Status Indicators</CardTitle>
          <CardDescription>
            Network and offline status indicators
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center gap-4'>
            <div>
              <h4 className='font-medium mb-2'>Network Status</h4>
              <NetworkStatusIndicator showText showQuality />
            </div>

            <div>
              <h4 className='font-medium mb-2'>Offline Indicator</h4>
              <EnhancedOfflineIndicator
                showSyncStatus
                showPendingCount
                onRetrySync={() => console.log('Retrying sync...')}
                onViewOfflineData={() => console.log('Viewing offline data...')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Recovery Panel */}
      {showRecoveryPanel && currentError && (
        <ErrorRecoveryPanel
          error={currentError}
          onRetry={() => console.log('Retrying operation...')}
          onReport={() => console.log('Reporting error...')}
          showTechnicalDetails
        />
      )}

      {/* Recent Errors List */}
      {errorStats.recentErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
            <CardDescription>
              Last {errorStats.recentErrors.length} errors that occurred
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {errorStats.recentErrors.map((error, index) => {
                const IconComponent = getCategoryIcon(error.category)
                return (
                  <div
                    key={index}
                    className='flex items-start gap-3 p-3 rounded-lg bg-muted'
                  >
                    <IconComponent className='h-4 w-4 mt-0.5 text-muted-foreground' />
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-sm'>
                        {error.userMessage}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {error.category} • {error.severity} •{' '}
                        {error.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
