'use client'

import React, { useState } from 'react'
import { Bug, MessageSquare, AlertTriangle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ErrorFeedbackModal } from './error-feedback-modal'
import { ErrorReportForm } from './error-report-form'
import type { ClassifiedError } from '@/lib/errors/classification'

interface ErrorFeedbackButtonProps {
  error?: ClassifiedError | null
  errorId?: string
  variant?: 'button' | 'icon' | 'floating' | 'inline'
  size?: 'sm' | 'md' | 'lg'
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  showBadge?: boolean
  badgeCount?: number
  onFeedbackSubmitted?: (type: 'feedback' | 'report') => void
  className?: string
  children?: React.ReactNode
}

interface FeedbackAction {
  type: 'feedback' | 'report' | 'question'
  label: string
  description: string
  icon: React.ReactNode
  color: string
}

const FEEDBACK_ACTIONS: FeedbackAction[] = [
  {
    type: 'feedback',
    label: 'Quick Feedback',
    description: 'Share your thoughts or report an issue',
    icon: <MessageSquare className='h-4 w-4' />,
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    type: 'report',
    label: 'Detailed Report',
    description: 'Submit a comprehensive error report',
    icon: <FileText className='h-4 w-4' />,
    color: 'text-orange-600 dark:text-orange-400',
  },
  {
    type: 'question',
    label: 'Ask Question',
    description: 'Get help or ask for clarification',
    icon: <AlertTriangle className='h-4 w-4' />,
    color: 'text-green-600 dark:text-green-400',
  },
]

export function ErrorFeedbackButton({
  error,
  errorId,
  variant = 'button',
  size = 'md',
  position = 'bottom-right',
  showBadge = false,
  badgeCount = 0,
  onFeedbackSubmitted,
  className,
  children,
}: ErrorFeedbackButtonProps) {
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [reportFormOpen, setReportFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFeedbackSubmit = async (feedback: any) => {
    setIsSubmitting(true)
    try {
      // Submit feedback logic would go here
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      onFeedbackSubmitted?.('feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReportSubmit = async (report: any) => {
    setIsSubmitting(true)
    try {
      // Submit report logic would go here
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      onFeedbackSubmitted?.('report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleActionSelect = (actionType: string) => {
    switch (actionType) {
      case 'feedback':
      case 'question':
        setFeedbackModalOpen(true)
        break
      case 'report':
        setReportFormOpen(true)
        break
    }
  }

  // Floating variant
  if (variant === 'floating') {
    const positionClasses = {
      'bottom-right': 'fixed bottom-4 right-4 z-50',
      'bottom-left': 'fixed bottom-4 left-4 z-50',
      'top-right': 'fixed top-4 right-4 z-50',
      'top-left': 'fixed top-4 left-4 z-50',
    }

    return (
      <>
        <div className={cn(positionClasses[position], className)}>
          <TooltipProvider>
            <Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button
                      size='lg'
                      className={cn(
                        'rounded-full shadow-lg hover:shadow-xl transition-all duration-200',
                        'bg-primary hover:bg-primary/90',
                        showBadge && badgeCount > 0 && 'relative'
                      )}
                    >
                      <Bug className='h-5 w-5' />
                      {showBadge && badgeCount > 0 && (
                        <Badge
                          variant='destructive'
                          className='absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center text-xs'
                        >
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </Badge>
                      )}
                    </Button>
                  </TooltipTrigger>
                </DropdownMenuTrigger>

                <DropdownMenuContent align='end' className='w-64'>
                  {FEEDBACK_ACTIONS.map(action => (
                    <DropdownMenuItem
                      key={action.type}
                      onClick={() => handleActionSelect(action.type)}
                      className='flex flex-col items-start p-3 cursor-pointer'
                    >
                      <div className='flex items-center gap-2 w-full'>
                        <span className={action.color}>{action.icon}</span>
                        <span className='font-medium'>{action.label}</span>
                      </div>
                      <span className='text-xs text-muted-foreground mt-1 ml-6'>
                        {action.description}
                      </span>
                    </DropdownMenuItem>
                  ))}

                  {error && (
                    <>
                      <DropdownMenuSeparator />
                      <div className='p-2 text-xs text-muted-foreground'>
                        {errorId && (
                          <div className='font-mono mb-1'>ID: {errorId}</div>
                        )}
                        <div>Category: {error.category}</div>
                        <div>Severity: {error.severity}</div>
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <TooltipContent>
                <p>Send feedback or report an issue</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Modals */}
        <ErrorFeedbackModal
          open={feedbackModalOpen}
          onOpenChange={setFeedbackModalOpen}
          error={error ?? null}
          errorId={errorId ?? ''}
          onSubmit={handleFeedbackSubmit}
          isSubmitting={isSubmitting}
        />

        {reportFormOpen && (
          <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'>
            <ErrorReportForm
              error={error ?? null}
              errorId={errorId ?? ''}
              onSubmit={handleReportSubmit}
              onCancel={() => setReportFormOpen(false)}
              isSubmitting={isSubmitting}
              className='max-h-[90vh] overflow-y-auto'
            />
          </div>
        )}
      </>
    )
  }

  // Icon variant
  if (variant === 'icon') {
    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
    }

    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    className={cn(
                      sizeClasses[size],
                      'rounded-full p-0 relative',
                      className
                    )}
                  >
                    <Bug className='h-4 w-4' />
                    {showBadge && badgeCount > 0 && (
                      <Badge
                        variant='destructive'
                        className='absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs'
                      >
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
              </DropdownMenuTrigger>

              <DropdownMenuContent align='end' className='w-56'>
                {FEEDBACK_ACTIONS.map(action => (
                  <DropdownMenuItem
                    key={action.type}
                    onClick={() => handleActionSelect(action.type)}
                    className='flex items-center gap-2'
                  >
                    <span className={action.color}>{action.icon}</span>
                    <span>{action.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <TooltipContent>
              <p>Feedback & Support</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Modals */}
        <ErrorFeedbackModal
          open={feedbackModalOpen}
          onOpenChange={setFeedbackModalOpen}
          error={error ?? null}
          errorId={errorId ?? ''}
          onSubmit={handleFeedbackSubmit}
          isSubmitting={isSubmitting}
        />

        {reportFormOpen && (
          <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'>
            <ErrorReportForm
              error={error ?? null}
              errorId={errorId ?? ''}
              onSubmit={handleReportSubmit}
              onCancel={() => setReportFormOpen(false)}
              isSubmitting={isSubmitting}
              className='max-h-[90vh] overflow-y-auto'
            />
          </div>
        )}
      </>
    )
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <>
        <div className={cn('flex gap-1', className)}>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setFeedbackModalOpen(true)}
            className='text-xs'
          >
            <MessageSquare className='h-3 w-3 mr-1' />
            Feedback
          </Button>

          <Button
            variant='ghost'
            size='sm'
            onClick={() => setReportFormOpen(true)}
            className='text-xs'
          >
            <FileText className='h-3 w-3 mr-1' />
            Report
          </Button>
        </div>

        {/* Modals */}
        <ErrorFeedbackModal
          open={feedbackModalOpen}
          onOpenChange={setFeedbackModalOpen}
          error={error ?? null}
          errorId={errorId ?? ''}
          onSubmit={handleFeedbackSubmit}
          isSubmitting={isSubmitting}
        />

        {reportFormOpen && (
          <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'>
            <ErrorReportForm
              error={error ?? null}
              errorId={errorId ?? ''}
              onSubmit={handleReportSubmit}
              onCancel={() => setReportFormOpen(false)}
              isSubmitting={isSubmitting}
              className='max-h-[90vh] overflow-y-auto'
            />
          </div>
        )}
      </>
    )
  }

  // Default button variant
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='outline'
            className={cn(
              sizeClasses[size],
              'flex items-center gap-2 relative',
              className
            )}
          >
            <Bug className='h-4 w-4' />
            {children || 'Feedback'}
            {showBadge && badgeCount > 0 && (
              <Badge variant='destructive' className='ml-1 h-5 px-1.5 text-xs'>
                {badgeCount > 99 ? '99+' : badgeCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align='end' className='w-64'>
          {FEEDBACK_ACTIONS.map(action => (
            <DropdownMenuItem
              key={action.type}
              onClick={() => handleActionSelect(action.type)}
              className='flex flex-col items-start p-3 cursor-pointer'
            >
              <div className='flex items-center gap-2 w-full'>
                <span className={action.color}>{action.icon}</span>
                <span className='font-medium'>{action.label}</span>
              </div>
              <span className='text-xs text-muted-foreground mt-1 ml-6'>
                {action.description}
              </span>
            </DropdownMenuItem>
          ))}

          {error && (
            <>
              <DropdownMenuSeparator />
              <div className='p-2 text-xs text-muted-foreground'>
                {errorId && <div className='font-mono mb-1'>ID: {errorId}</div>}
                <div>Category: {error.category}</div>
                <div>Severity: {error.severity}</div>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals */}
      <ErrorFeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        error={error ?? null}
        errorId={errorId ?? ''}
        onSubmit={handleFeedbackSubmit}
        isSubmitting={isSubmitting}
      />

      {reportFormOpen && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'>
          <ErrorReportForm
            error={error ?? null}
            errorId={errorId ?? ''}
            onSubmit={handleReportSubmit}
            onCancel={() => setReportFormOpen(false)}
            isSubmitting={isSubmitting}
            className='max-h-[90vh] overflow-y-auto'
          />
        </div>
      )}
    </>
  )
}
