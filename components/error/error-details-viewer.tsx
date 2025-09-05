'use client'

import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  Clock,
  Globe,
  Monitor,
  User,
  Code,
  Layers,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { ClassifiedError } from '@/lib/errors/classification'
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/classification'

interface ErrorDetailsViewerProps {
  open: boolean
  onClose: () => void
  errorInfo: {
    id: string
    message: string
    category: string
    severity: string
    stack?: string
    timestamp: string
    context?: Record<string, any>
  }
  privacyMode?: boolean
  error?: ClassifiedError
  errorId?: string
  context?: Record<string, any>
  showActions?: boolean
  expanded?: boolean
  className?: string
  onRetry?: () => void
  onReport?: () => void
}

interface DetailSection {
  id: string
  title: string
  icon: React.ReactNode
  content: React.ReactNode
  priority: number
  defaultExpanded: boolean
}

const SEVERITY_COLORS = {
  LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  MEDIUM:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
} as const

const CATEGORY_ICONS = {
  NETWORK: <Globe className='h-4 w-4' />,
  DATABASE: <Layers className='h-4 w-4' />,
  AUTH: <User className='h-4 w-4' />,
  VALIDATION: <AlertTriangle className='h-4 w-4' />,
  PERMISSION: <User className='h-4 w-4' />,
  RATE_LIMIT: <Clock className='h-4 w-4' />,
  SYSTEM: <Monitor className='h-4 w-4' />,
  CLIENT: <Code className='h-4 w-4' />,
  SERVER: <Monitor className='h-4 w-4' />,
  UNKNOWN: <AlertTriangle className='h-4 w-4' />,
} as const

export function ErrorDetailsViewer({
  error: propError,
  errorInfo,
  errorId,
  context = {},
  showActions = true,
  expanded = false,
  className,
  onRetry,
  onReport,
}: ErrorDetailsViewerProps) {
  const { toast } = useToast()
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  const [sectionsExpanded, setSectionsExpanded] = useState<
    Record<string, boolean>
  >({
    basic: true,
    technical: false,
    context: false,
    stackTrace: false,
  })

  // Normalize error: prefer provided ClassifiedError, else build from errorInfo
  const error: ClassifiedError =
    propError ??
    ({
      category: (errorInfo?.category as ErrorCategory) ?? ErrorCategory.UNKNOWN,
      severity: (errorInfo?.severity as ErrorSeverity) ?? ErrorSeverity.LOW,
      message: errorInfo?.message ?? 'An unknown error occurred',
      userMessage: errorInfo?.message ?? 'An unknown error occurred',
      originalError: errorInfo?.stack ? new Error(errorInfo.stack) : undefined,
      context: errorInfo?.context,
      timestamp: errorInfo?.timestamp
        ? new Date(errorInfo.timestamp)
        : new Date(),
      isRetryable: false,
    } as ClassifiedError)

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates(prev => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }))
      }, 2000)
      toast({
        title: 'Copied to clipboard',
        description: 'Error details copied successfully.',
      })
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard.',
        variant: 'destructive',
      })
    }
  }

  const toggleSection = (sectionId: string) => {
    setSectionsExpanded(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(timestamp)
  }

  const sanitizeData = (data: any): any => {
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data }

      // Remove or mask sensitive fields
      const sensitiveKeys = [
        'password',
        'token',
        'key',
        'secret',
        'authorization',
        'cookie',
        'session',
        'jwt',
        'bearer',
        'api_key',
        'email',
        'phone',
        'ssn',
        'credit_card',
      ]

      Object.keys(sanitized).forEach(key => {
        const lowerKey = key.toLowerCase()
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          sanitized[key] = showSensitiveData ? sanitized[key] : '[HIDDEN]'
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = sanitizeData(sanitized[key])
        }
      })

      return sanitized
    }
    return data
  }

  const getErrorSummary = () => {
    const summary = {
      'Error ID': errorId || 'Unknown',
      Category: error.category,
      Severity: error.severity,
      Retryable: error.isRetryable ? 'Yes' : 'No',
      Timestamp: formatTimestamp(error.timestamp),
      Message: error.message,
    }

    return Object.entries(summary).map(([key, value]) => (
      <div key={key} className='flex justify-between items-center py-1'>
        <span className='text-sm font-medium text-muted-foreground'>
          {key}:
        </span>
        <span className='text-sm font-mono'>{value}</span>
      </div>
    ))
  }

  const getTechnicalDetails = () => {
    const details = {
      'User Agent': context.userAgent || 'Unknown',
      URL: context.url || window?.location?.href || 'Unknown',
      Viewport: context.viewport
        ? `${context.viewport.width}x${context.viewport.height}`
        : 'Unknown',
      Connection: (navigator as any)?.connection?.effectiveType || 'Unknown',
      Language: navigator?.language || 'Unknown',
      Platform: navigator?.platform || 'Unknown',
      'Cookies Enabled': navigator?.cookieEnabled ? 'Yes' : 'No',
      Online: navigator?.onLine ? 'Yes' : 'No',
    }

    return Object.entries(details).map(([key, value]) => (
      <div key={key} className='flex justify-between items-start py-1'>
        <span className='text-sm font-medium text-muted-foreground flex-shrink-0 mr-4'>
          {key}:
        </span>
        <span className='text-sm font-mono text-right break-all'>{value}</span>
      </div>
    ))
  }

  const sections: DetailSection[] = [
    {
      id: 'basic',
      title: 'Error Summary',
      icon: <Info className='h-4 w-4' />,
      content: <div className='space-y-1'>{getErrorSummary()}</div>,
      priority: 1,
      defaultExpanded: true,
    },
    {
      id: 'technical',
      title: 'Technical Details',
      icon: <Monitor className='h-4 w-4' />,
      content: <div className='space-y-1'>{getTechnicalDetails()}</div>,
      priority: 2,
      defaultExpanded: false,
    },
    {
      id: 'context',
      title: 'Error Context',
      icon: <Layers className='h-4 w-4' />,
      content: (
        <div className='space-y-2'>
          {error.context && Object.keys(error.context).length > 0 ? (
            <pre className='text-xs font-mono bg-muted/50 p-3 rounded border overflow-x-auto'>
              {JSON.stringify(sanitizeData(error.context), null, 2)}
            </pre>
          ) : (
            <p className='text-sm text-muted-foreground'>
              No additional context available
            </p>
          )}

          {context && Object.keys(context).length > 0 && (
            <>
              <h4 className='text-sm font-medium mt-3'>Runtime Context:</h4>
              <pre className='text-xs font-mono bg-muted/50 p-3 rounded border overflow-x-auto'>
                {JSON.stringify(sanitizeData(context), null, 2)}
              </pre>
            </>
          )}
        </div>
      ),
      priority: 3,
      defaultExpanded: false,
    },
    {
      id: 'stackTrace',
      title: 'Stack Trace',
      icon: <Code className='h-4 w-4' />,
      content: error.originalError?.stack ? (
        <div className='space-y-2'>
          <pre className='text-xs font-mono bg-muted/50 p-3 rounded border overflow-x-auto whitespace-pre-wrap'>
            {error.originalError.stack}
          </pre>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() =>
                copyToClipboard(error.originalError?.stack || '', 'stack')
              }
              className='text-xs'
            >
              {copiedStates.stack ? (
                <Check className='h-3 w-3 mr-1' />
              ) : (
                <Copy className='h-3 w-3 mr-1' />
              )}
              Copy Stack Trace
            </Button>
          </div>
        </div>
      ) : (
        <p className='text-sm text-muted-foreground'>
          No stack trace available
        </p>
      ),
      priority: 4,
      defaultExpanded: false,
    },
  ]

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className='pb-4'>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2'>
            {CATEGORY_ICONS[
              error.category.toUpperCase() as keyof typeof CATEGORY_ICONS
            ] || CATEGORY_ICONS.UNKNOWN}
            Error Details
            <Badge
              className={
                SEVERITY_COLORS[
                  error.severity.toUpperCase() as keyof typeof SEVERITY_COLORS
                ] || SEVERITY_COLORS.LOW
              }
            >
              {error.severity}
            </Badge>
          </CardTitle>

          <div className='flex items-center gap-2'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setShowSensitiveData(!showSensitiveData)}
                  >
                    {showSensitiveData ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showSensitiveData ? 'Hide' : 'Show'} sensitive data</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                const errorSummary = `Error ID: ${errorId}
Category: ${error.category}
Severity: ${error.severity}
Message: ${error.message}
Timestamp: ${formatTimestamp(error.timestamp)}
${error.originalError?.stack ? `\nStack Trace:\n${error.originalError.stack}` : ''}`

                copyToClipboard(errorSummary, 'full')
              }}
            >
              {copiedStates.full ? (
                <Check className='h-4 w-4 mr-2' />
              ) : (
                <Copy className='h-4 w-4 mr-2' />
              )}
              Copy All
            </Button>
          </div>
        </div>

        {errorId && (
          <div className='text-xs font-mono text-muted-foreground bg-muted/50 p-2 rounded'>
            ID: {errorId}
          </div>
        )}
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Error message */}
        <div className='p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded'>
          <p className='text-sm font-medium text-red-800 dark:text-red-300'>
            {error.message}
          </p>
        </div>

        {/* Expandable sections */}
        <div className='space-y-2'>
          {sections.map(section => (
            <Collapsible
              key={section.id}
              open={sectionsExpanded[section.id] ?? false}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant='ghost'
                  className='w-full justify-between h-auto p-3 hover:bg-muted/50'
                >
                  <div className='flex items-center gap-2'>
                    {section.icon}
                    <span className='font-medium'>{section.title}</span>
                  </div>
                  {sectionsExpanded[section.id] ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className='px-3 pb-3'>
                {section.content}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {/* Actions */}
        {showActions && (onRetry || onReport) && (
          <div className='flex gap-2 pt-4 border-t'>
            {error.isRetryable && onRetry && (
              <Button onClick={onRetry} size='sm'>
                <RefreshCw className='h-4 w-4 mr-2' />
                Retry
              </Button>
            )}

            {onReport && (
              <Button variant='outline' onClick={onReport} size='sm'>
                <AlertTriangle className='h-4 w-4 mr-2' />
                Report Issue
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
