'use client'

import React, { useState, useCallback } from 'react'
import { X, Bug, Send, AlertTriangle, Camera, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ErrorSeverity } from '@/lib/errors/classification'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { ClassifiedError } from '@/lib/errors/classification'

interface ErrorFeedbackModalProps {
  open: boolean
  onClose?: () => void
  errorInfo?: {
    id: string
    message: string
    category: string
    severity: string
    stack?: string
    timestamp: string
    context?: Record<string, any>
  }
  onOpenChange?: (open: boolean) => void
  error?: ClassifiedError | null
  errorId?: string
  onSubmit?: (feedback: ErrorFeedback) => Promise<void>
  isSubmitting?: boolean
}

interface ErrorFeedback {
  type: 'bug' | 'suggestion' | 'question' | 'other'
  description: string
  reproductionSteps: string
  expectedBehavior: string
  includeScreenshot: boolean
  includeTechnicalDetails: boolean
  contactEmail: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  urgency: 'low' | 'normal' | 'high' | 'urgent'
  tags: string[]
}

const FEEDBACK_TYPES = [
  {
    value: 'bug',
    label: 'Bug Report',
    description: 'Something is not working correctly',
  },
  {
    value: 'suggestion',
    label: 'Feature Suggestion',
    description: 'I have an idea for improvement',
  },
  {
    value: 'question',
    label: 'Question',
    description: 'I need help understanding something',
  },
  { value: 'other', label: 'Other', description: 'Something else' },
] as const

const SEVERITY_OPTIONS = [
  {
    value: 'low',
    label: 'Low',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  {
    value: 'medium',
    label: 'Medium',
    color:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  {
    value: 'high',
    label: 'High',
    color:
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  },
  {
    value: 'critical',
    label: 'Critical',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
] as const

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low - Can wait' },
  { value: 'normal', label: 'Normal - Standard timeline' },
  { value: 'high', label: 'High - Needs attention' },
  { value: 'urgent', label: 'Urgent - Blocking work' },
] as const

export function ErrorFeedbackModal({
  open,
  onClose,
  errorInfo,
  onOpenChange,
  error,
  errorId,
  onSubmit,
  isSubmitting = false,
}: ErrorFeedbackModalProps) {
  const { toast } = useToast()
  const [feedback, setFeedback] = useState<ErrorFeedback>({
    type: 'bug',
    description: '',
    reproductionSteps: '',
    expectedBehavior: '',
    includeScreenshot: false,
    includeTechnicalDetails: true,
    contactEmail: '',
    severity: error
      ? error.severity === ErrorSeverity.CRITICAL
        ? 'critical'
        : error.severity === ErrorSeverity.HIGH
          ? 'high'
          : error.severity === ErrorSeverity.MEDIUM
            ? 'medium'
            : 'low'
      : 'medium',
    urgency: 'normal',
    tags: [],
  })

  const [customTag, setCustomTag] = useState('')
  const [copiedErrorId, setCopiedErrorId] = useState(false)

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (open && error) {
      setFeedback(prev => ({
        ...prev,
        type: 'bug',
        description: `Error: ${error.message}`,
        severity:
          error.severity === ErrorSeverity.CRITICAL
            ? 'critical'
            : error.severity === ErrorSeverity.HIGH
              ? 'high'
              : error.severity === ErrorSeverity.MEDIUM
                ? 'medium'
                : 'low',
        tags: [error.category.toLowerCase()],
      }))
    }
  }, [open, error])

  const handleSubmit = useCallback(async () => {
    if (!feedback.description.trim()) {
      toast({
        title: 'Description Required',
        description: 'Please provide a description of the issue.',
        variant: 'destructive',
      })
      return
    }

    try {
      await onSubmit?.(feedback)

      // Reset form
      setFeedback({
        type: 'bug',
        description: '',
        reproductionSteps: '',
        expectedBehavior: '',
        includeScreenshot: false,
        includeTechnicalDetails: true,
        contactEmail: '',
        severity: 'medium',
        urgency: 'normal',
        tags: [],
      })
      setCustomTag('')

      onOpenChange?.(false)

      toast({
        title: 'Feedback Submitted',
        description:
          "Thank you! We've received your feedback and will review it soon.",
      })
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      })
    }
  }, [feedback, onSubmit, onOpenChange, toast])

  const copyErrorId = useCallback(async () => {
    if (errorId) {
      await navigator.clipboard.writeText(errorId)
      setCopiedErrorId(true)
      setTimeout(() => setCopiedErrorId(false), 2000)
      toast({
        title: 'Error ID Copied',
        description: 'Error ID has been copied to your clipboard.',
      })
    }
  }, [errorId, toast])

  const addCustomTag = useCallback(() => {
    if (
      customTag.trim() &&
      !feedback.tags.includes(customTag.trim().toLowerCase())
    ) {
      setFeedback(prev => ({
        ...prev,
        tags: [...prev.tags, customTag.trim().toLowerCase()],
      }))
      setCustomTag('')
    }
  }, [customTag, feedback.tags])

  const removeTag = useCallback((tag: string) => {
    setFeedback(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }))
  }, [])

  const canSubmit = feedback.description.trim().length > 0 && !isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange ?? (() => {})}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Bug className='h-5 w-5 text-blue-600' />
            Submit Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve by sharing details about the issue you encountered.
            {errorId && (
              <div className='flex items-center gap-2 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md'>
                <span className='text-xs font-mono text-gray-600 dark:text-gray-400'>
                  Error ID: {errorId}
                </span>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={copyErrorId}
                  className='h-6 w-6 p-0'
                >
                  {copiedErrorId ? (
                    <Check className='h-3 w-3 text-green-600' />
                  ) : (
                    <Copy className='h-3 w-3' />
                  )}
                </Button>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Feedback Type */}
          <div className='space-y-2'>
            <Label htmlFor='feedback-type'>Feedback Type</Label>
            <Select
              value={feedback.type}
              onValueChange={value =>
                setFeedback(prev => ({
                  ...prev,
                  type: value as ErrorFeedback['type'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className='font-medium'>{type.label}</div>
                      <div className='text-xs text-muted-foreground'>
                        {type.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Context */}
          {error && (
            <div className='p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md'>
              <div className='flex items-center gap-2 mb-2'>
                <AlertTriangle className='h-4 w-4 text-red-600' />
                <span className='font-medium text-red-800 dark:text-red-300'>
                  Detected Error Context
                </span>
              </div>
              <div className='space-y-1 text-sm text-red-700 dark:text-red-300'>
                <div>
                  <strong>Category:</strong> {error.category}
                </div>
                <div>
                  <strong>Severity:</strong> {error.severity}
                </div>
                {error.isRetryable && (
                  <div>
                    <strong>Retryable:</strong> Yes
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className='space-y-2'>
            <Label htmlFor='description'>
              Description *
              <span className='text-xs text-muted-foreground ml-1'>
                (What happened? What went wrong?)
              </span>
            </Label>
            <Textarea
              id='description'
              value={feedback.description}
              onChange={e =>
                setFeedback(prev => ({ ...prev, description: e.target.value }))
              }
              placeholder='Please describe the issue in detail...'
              rows={4}
              className='min-h-[100px]'
            />
            <div className='text-xs text-muted-foreground'>
              {feedback.description.length}/1000 characters
            </div>
          </div>

          {/* Reproduction Steps - only for bugs */}
          {feedback.type === 'bug' && (
            <div className='space-y-2'>
              <Label htmlFor='reproduction'>
                Steps to Reproduce
                <span className='text-xs text-muted-foreground ml-1'>
                  (How can we recreate this issue?)
                </span>
              </Label>
              <Textarea
                id='reproduction'
                value={feedback.reproductionSteps}
                onChange={e =>
                  setFeedback(prev => ({
                    ...prev,
                    reproductionSteps: e.target.value,
                  }))
                }
                placeholder='1. Go to...&#10;2. Click on...&#10;3. See error...'
                rows={3}
              />
            </div>
          )}

          {/* Expected Behavior - only for bugs */}
          {feedback.type === 'bug' && (
            <div className='space-y-2'>
              <Label htmlFor='expected'>
                Expected Behavior
                <span className='text-xs text-muted-foreground ml-1'>
                  (What should have happened instead?)
                </span>
              </Label>
              <Textarea
                id='expected'
                value={feedback.expectedBehavior}
                onChange={e =>
                  setFeedback(prev => ({
                    ...prev,
                    expectedBehavior: e.target.value,
                  }))
                }
                placeholder='I expected...'
                rows={2}
              />
            </div>
          )}

          {/* Severity and Urgency */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>Severity</Label>
              <Select
                value={feedback.severity}
                onValueChange={value =>
                  setFeedback(prev => ({
                    ...prev,
                    severity: value as ErrorFeedback['severity'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className='flex items-center gap-2'>
                        <div
                          className={cn(
                            'px-2 py-1 rounded-full text-xs',
                            option.color
                          )}
                        >
                          {option.label}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>Urgency</Label>
              <Select
                value={feedback.urgency}
                onValueChange={value =>
                  setFeedback(prev => ({
                    ...prev,
                    urgency: value as ErrorFeedback['urgency'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className='space-y-2'>
            <Label>Tags</Label>
            <div className='flex flex-wrap gap-2 mb-2'>
              {feedback.tags.map(tag => (
                <Badge
                  key={tag}
                  variant='secondary'
                  className='flex items-center gap-1'
                >
                  {tag}
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => removeTag(tag)}
                    className='h-4 w-4 p-0 hover:bg-transparent'
                  >
                    <X className='h-3 w-3' />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className='flex gap-2'>
              <input
                type='text'
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
                placeholder='Add tag...'
                className='flex-1 px-3 py-1 text-sm border border-input rounded-md'
                onKeyPress={e => e.key === 'Enter' && addCustomTag()}
              />
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={addCustomTag}
                disabled={!customTag.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Contact Email */}
          <div className='space-y-2'>
            <Label htmlFor='email'>
              Contact Email
              <span className='text-xs text-muted-foreground ml-1'>
                (Optional - for follow-up questions)
              </span>
            </Label>
            <input
              type='email'
              id='email'
              value={feedback.contactEmail}
              onChange={e =>
                setFeedback(prev => ({ ...prev, contactEmail: e.target.value }))
              }
              placeholder='your@email.com'
              className='w-full px-3 py-2 border border-input rounded-md'
            />
          </div>

          {/* Options */}
          <div className='space-y-3'>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='screenshot'
                checked={feedback.includeScreenshot}
                onCheckedChange={(checked: boolean) =>
                  setFeedback(prev => ({
                    ...prev,
                    includeScreenshot: !!checked,
                  }))
                }
              />
              <Label htmlFor='screenshot' className='flex items-center gap-2'>
                <Camera className='h-4 w-4' />
                Include screenshot (if available)
              </Label>
            </div>

            <div className='flex items-center space-x-2'>
              <Checkbox
                id='technical'
                checked={feedback.includeTechnicalDetails}
                onCheckedChange={(checked: boolean) =>
                  setFeedback(prev => ({
                    ...prev,
                    includeTechnicalDetails: !!checked,
                  }))
                }
              />
              <Label htmlFor='technical'>
                Include technical details (browser, device info, error logs)
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className='gap-2'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className='min-w-[100px]'
          >
            {isSubmitting ? (
              <>
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2' />
                Submitting...
              </>
            ) : (
              <>
                <Send className='h-4 w-4 mr-2' />
                Submit Feedback
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type { ErrorFeedback }
