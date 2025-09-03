'use client'

import React, { useState, useCallback } from 'react'
import { AlertCircle, Send, Upload, X, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { ClassifiedError } from '@/lib/errors/classification'
import type { ErrorFeedback } from './error-feedback-modal'

interface ErrorReportFormProps {
  error?: ClassifiedError | null
  errorId?: string
  onSubmit?: (report: ErrorReport) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
  className?: string
}

interface ErrorReport {
  title: string
  description: string
  reproductionSteps: string[]
  environment: {
    browser: string
    os: string
    screenResolution: string
    userAgent: string
  }
  attachments: File[]
  screenshot?: string // base64 encoded
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string[]
  contactInfo: {
    email: string
    name: string
  }
  allowContact: boolean
  includeSystemInfo: boolean
  includeErrorStack: boolean
}

const PRIORITY_OPTIONS = [
  {
    value: 'low',
    label: 'Low Priority',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    description: 'Minor issue, not blocking',
  },
  {
    value: 'medium',
    label: 'Medium Priority',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    description: 'Moderate issue, some impact',
  },
  {
    value: 'high',
    label: 'High Priority',
    color:
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    description: 'Significant issue, needs attention',
  },
  {
    value: 'critical',
    label: 'Critical Priority',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    description: 'Critical issue, blocking work',
  },
] as const

const CATEGORY_OPTIONS = [
  'UI/UX Issue',
  'Performance Problem',
  'Data Loss',
  'Authentication',
  'Database Error',
  'Network Issue',
  'Browser Compatibility',
  'Mobile Issue',
  'Accessibility',
  'Security Concern',
  'Feature Request',
  'Documentation',
  'Other',
]

// Get system information
const getSystemInfo = () => {
  if (typeof window === 'undefined') {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      screenResolution: 'Unknown',
      userAgent: 'Unknown',
    }
  }

  const ua = navigator.userAgent
  let browser = 'Unknown'
  let os = 'Unknown'

  // Detect browser
  if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari')) browser = 'Safari'
  else if (ua.includes('Edge')) browser = 'Edge'
  else if (ua.includes('Opera')) browser = 'Opera'

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('iOS')) os = 'iOS'
  else if (ua.includes('Android')) os = 'Android'

  return {
    browser,
    os,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    userAgent: ua,
  }
}

export function ErrorReportForm({
  error,
  errorId,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className,
}: ErrorReportFormProps) {
  const { toast } = useToast()

  const [report, setReport] = useState<ErrorReport>({
    title: error ? `Error: ${error.message}` : '',
    description: '',
    reproductionSteps: [''],
    environment: getSystemInfo(),
    attachments: [],
    priority: error
      ? error.severity === 'critical'
        ? 'critical'
        : error.severity === 'high'
          ? 'high'
          : 'medium'
      : 'medium',
    category: error ? [error.category] : [],
    contactInfo: {
      email: '',
      name: '',
    },
    allowContact: false,
    includeSystemInfo: true,
    includeErrorStack: true,
  })

  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Capture screenshot
  const captureScreenshot = useCallback(async () => {
    try {
      // Note: This requires user permission and modern browsers
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      })

      const video = document.createElement('video')
      video.srcObject = stream
      video.play()

      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(video, 0, 0)

        const screenshotData = canvas.toDataURL('image/png')
        setScreenshot(screenshotData)
        setReport(prev => ({ ...prev, screenshot: screenshotData }))

        // Stop the stream
        stream.getTracks().forEach(track => track.stop())

        toast({
          title: 'Screenshot Captured',
          description: 'Screenshot has been added to your report.',
        })
      }
    } catch (error) {
      toast({
        title: 'Screenshot Failed',
        description:
          'Could not capture screenshot. You may need to allow screen sharing.',
        variant: 'destructive',
      })
    }
  }, [toast])

  // Handle file upload
  const handleFileUpload = useCallback(
    (files: FileList | null) => {
      if (!files) return

      const fileArray = Array.from(files)
      const validFiles = fileArray.filter(file => {
        // Limit to 10MB per file
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: 'File Too Large',
            description: `${file.name} is too large. Maximum size is 10MB.`,
            variant: 'destructive',
          })
          return false
        }

        // Allow common file types
        const allowedTypes = [
          'image/*',
          'text/*',
          'application/json',
          'application/pdf',
          '.log',
        ]

        return allowedTypes.some(type =>
          type.includes('*')
            ? file.type.startsWith(type.replace('*', ''))
            : file.type === type
        )
      })

      setReport(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...validFiles],
      }))

      if (validFiles.length > 0) {
        toast({
          title: 'Files Added',
          description: `${validFiles.length} file(s) added to your report.`,
        })
      }
    },
    [toast]
  )

  // Add reproduction step
  const addReproductionStep = useCallback(() => {
    setReport(prev => ({
      ...prev,
      reproductionSteps: [...prev.reproductionSteps, ''],
    }))
  }, [])

  // Update reproduction step
  const updateReproductionStep = useCallback((index: number, value: string) => {
    setReport(prev => ({
      ...prev,
      reproductionSteps: prev.reproductionSteps.map((step, i) =>
        i === index ? value : step
      ),
    }))
  }, [])

  // Remove reproduction step
  const removeReproductionStep = useCallback((index: number) => {
    setReport(prev => ({
      ...prev,
      reproductionSteps: prev.reproductionSteps.filter((_, i) => i !== index),
    }))
  }, [])

  // Remove attachment
  const removeAttachment = useCallback((index: number) => {
    setReport(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }))
  }, [])

  // Toggle category
  const toggleCategory = useCallback((category: string) => {
    setReport(prev => ({
      ...prev,
      category: prev.category.includes(category)
        ? prev.category.filter(c => c !== category)
        : [...prev.category, category],
    }))
  }, [])

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!report.title.trim() || !report.description.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both a title and description.',
        variant: 'destructive',
      })
      return
    }

    if (report.allowContact && !report.contactInfo.email.trim()) {
      toast({
        title: 'Contact Email Required',
        description:
          'Please provide an email address if you want to be contacted.',
        variant: 'destructive',
      })
      return
    }

    try {
      await onSubmit?.(report)
      toast({
        title: 'Report Submitted',
        description: 'Your error report has been submitted successfully.',
      })
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive',
      })
    }
  }, [report, onSubmit, toast])

  const canSubmit =
    report.title.trim() && report.description.trim() && !isSubmitting

  return (
    <Card className={cn('w-full max-w-4xl', className)}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <AlertCircle className='h-5 w-5 text-red-600' />
          Error Report
          {errorId && (
            <Badge variant='outline' className='ml-2 font-mono text-xs'>
              {errorId}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className='space-y-6'>
        {/* Title */}
        <div className='space-y-2'>
          <Label htmlFor='title'>Report Title *</Label>
          <Input
            id='title'
            value={report.title}
            onChange={e =>
              setReport(prev => ({ ...prev, title: e.target.value }))
            }
            placeholder='Brief summary of the issue'
            className='w-full'
          />
        </div>

        {/* Description */}
        <div className='space-y-2'>
          <Label htmlFor='description'>Description *</Label>
          <Textarea
            id='description'
            value={report.description}
            onChange={e =>
              setReport(prev => ({ ...prev, description: e.target.value }))
            }
            placeholder='Detailed description of what happened...'
            rows={4}
            className='min-h-[120px]'
          />
        </div>

        {/* Priority */}
        <div className='space-y-2'>
          <Label>Priority</Label>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
            {PRIORITY_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() =>
                  setReport(prev => ({ ...prev, priority: option.value }))
                }
                className={cn(
                  'p-3 rounded-lg border text-sm transition-all',
                  report.priority === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div
                  className={cn(
                    'px-2 py-1 rounded-full text-xs mb-1',
                    option.color
                  )}
                >
                  {option.label}
                </div>
                <div className='text-xs text-muted-foreground'>
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className='space-y-2'>
          <Label>Categories</Label>
          <div className='flex flex-wrap gap-2'>
            {CATEGORY_OPTIONS.map(category => (
              <Badge
                key={category}
                variant={
                  report.category.includes(category) ? 'default' : 'outline'
                }
                className='cursor-pointer'
                onClick={() => toggleCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Reproduction Steps */}
        <div className='space-y-2'>
          <Label>Steps to Reproduce</Label>
          {report.reproductionSteps.map((step, index) => (
            <div key={index} className='flex gap-2'>
              <span className='flex-shrink-0 w-8 h-10 flex items-center justify-center text-sm font-medium text-muted-foreground'>
                {index + 1}.
              </span>
              <Input
                value={step}
                onChange={e => updateReproductionStep(index, e.target.value)}
                placeholder='Describe this step...'
                className='flex-1'
              />
              {report.reproductionSteps.length > 1 && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => removeReproductionStep(index)}
                >
                  <X className='h-4 w-4' />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant='outline'
            size='sm'
            onClick={addReproductionStep}
            className='mt-2'
          >
            Add Step
          </Button>
        </div>

        {/* Screenshot and Attachments */}
        <div className='space-y-4'>
          <div className='flex items-center gap-4'>
            <Button
              variant='outline'
              onClick={captureScreenshot}
              className='flex items-center gap-2'
            >
              <Upload className='h-4 w-4' />
              Capture Screenshot
            </Button>

            <Label htmlFor='file-upload' className='cursor-pointer'>
              <Button variant='outline' asChild>
                <span className='flex items-center gap-2'>
                  <Upload className='h-4 w-4' />
                  Attach Files
                </span>
              </Button>
              <input
                id='file-upload'
                type='file'
                multiple
                onChange={e => handleFileUpload(e.target.files)}
                className='hidden'
                accept='image/*,text/*,application/json,application/pdf,.log'
              />
            </Label>
          </div>

          {/* Screenshot Preview */}
          {screenshot && (
            <div className='border border-border rounded-lg p-4'>
              <div className='flex items-center justify-between mb-2'>
                <span className='text-sm font-medium'>Screenshot</span>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setScreenshot(null)
                    setReport(prev => {
                      const next = { ...prev } as any
                      delete next.screenshot
                      return next
                    })
                  }}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
              <img
                src={screenshot}
                alt='Screenshot'
                className='max-w-full max-h-64 rounded'
              />
            </div>
          )}

          {/* Attachments List */}
          {report.attachments.length > 0 && (
            <div className='space-y-2'>
              <Label>Attached Files</Label>
              {report.attachments.map((file, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between p-2 border border-border rounded'
                >
                  <span className='text-sm'>
                    {file.name} ({(file.size / 1024).toFixed(1)}KB)
                  </span>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => removeAttachment(index)}
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className='space-y-4'>
          <div className='flex items-center space-x-2'>
            <Checkbox
              id='allow-contact'
              checked={report.allowContact}
              onCheckedChange={(checked: boolean) =>
                setReport(prev => ({ ...prev, allowContact: !!checked }))
              }
            />
            <Label htmlFor='allow-contact'>
              Allow us to contact you about this report
            </Label>
          </div>

          {report.allowContact && (
            <div className='grid grid-cols-2 gap-4 ml-6'>
              <div className='space-y-2'>
                <Label htmlFor='contact-name'>Name</Label>
                <Input
                  id='contact-name'
                  value={report.contactInfo.name}
                  onChange={e =>
                    setReport(prev => ({
                      ...prev,
                      contactInfo: {
                        ...prev.contactInfo,
                        name: e.target.value,
                      },
                    }))
                  }
                  placeholder='Your name'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='contact-email'>Email *</Label>
                <Input
                  id='contact-email'
                  type='email'
                  value={report.contactInfo.email}
                  onChange={e =>
                    setReport(prev => ({
                      ...prev,
                      contactInfo: {
                        ...prev.contactInfo,
                        email: e.target.value,
                      },
                    }))
                  }
                  placeholder='your@email.com'
                />
              </div>
            </div>
          )}
        </div>

        {/* Technical Details */}
        <div className='space-y-4'>
          <div className='flex items-center space-x-2'>
            <Checkbox
              id='include-system'
              checked={report.includeSystemInfo}
              onCheckedChange={(checked: boolean) =>
                setReport(prev => ({ ...prev, includeSystemInfo: !!checked }))
              }
            />
            <Label htmlFor='include-system'>
              Include system information (browser, OS, screen resolution)
            </Label>
          </div>

          {error && (
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='include-stack'
                checked={report.includeErrorStack}
                onCheckedChange={(checked: boolean) =>
                  setReport(prev => ({ ...prev, includeErrorStack: !!checked }))
                }
              />
              <Label htmlFor='include-stack'>
                Include error stack trace and technical details
              </Label>
            </div>
          )}

          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className='flex items-center gap-2'
          >
            {showTechnicalDetails ? (
              <EyeOff className='h-4 w-4' />
            ) : (
              <Eye className='h-4 w-4' />
            )}
            {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
          </Button>

          {showTechnicalDetails && (
            <div className='p-4 bg-muted/50 rounded-lg space-y-2'>
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <strong>Browser:</strong> {report.environment.browser}
                </div>
                <div>
                  <strong>OS:</strong> {report.environment.os}
                </div>
                <div>
                  <strong>Screen:</strong> {report.environment.screenResolution}
                </div>
                <div className='col-span-2'>
                  <strong>User Agent:</strong>
                  <div className='font-mono text-xs mt-1 break-all'>
                    {report.environment.userAgent}
                  </div>
                </div>
              </div>

              {error && report.includeErrorStack && (
                <div className='mt-4'>
                  <strong>Error Details:</strong>
                  <div className='font-mono text-xs mt-1 bg-background p-2 rounded border'>
                    <div>
                      <strong>Message:</strong> {error.message}
                    </div>
                    <div>
                      <strong>Category:</strong> {error.category}
                    </div>
                    <div>
                      <strong>Severity:</strong> {error.severity}
                    </div>
                    {error.originalError?.stack && (
                      <div className='mt-2'>
                        <strong>Stack:</strong>
                        <pre className='whitespace-pre-wrap text-xs mt-1'>
                          {error.originalError.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress */}
        {isSubmitting && (
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span>Submitting report...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Actions */}
        <div className='flex gap-2 pt-4'>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className='flex-1'
          >
            {isSubmitting ? (
              <>
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2' />
                Submitting...
              </>
            ) : (
              <>
                <Send className='h-4 w-4 mr-2' />
                Submit Report
              </>
            )}
          </Button>

          {onCancel && (
            <Button variant='outline' onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export type { ErrorReport }
