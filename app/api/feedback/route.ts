import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { headers } from 'next/headers'
import { ratelimit } from '@/lib/rate-limit'
import { shouldIgnoreError } from '@/lib/sentry/config'
import type { ErrorFeedback } from '@/components/error/error-feedback-modal'
import type { ErrorReport } from '@/components/error/error-report-form'

// Rate limiting configuration
const RATE_LIMIT_MAX_REQUESTS = 10
const RATE_LIMIT_WINDOW = '1h' // 10 requests per hour

// Validation schemas
const feedbackSchema = z.object({
  type: z.enum(['bug', 'suggestion', 'question', 'other']),
  description: z.string().min(1).max(2000),
  reproductionSteps: z.string().max(2000).optional(),
  expectedBehavior: z.string().max(1000).optional(),
  includeScreenshot: z.boolean(),
  includeTechnicalDetails: z.boolean(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']),
  tags: z.array(z.string()),
})

const reportSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  reproductionSteps: z.array(z.string()).max(20),
  environment: z.object({
    browser: z.string(),
    os: z.string(),
    screenResolution: z.string(),
    userAgent: z.string(),
  }),
  attachments: z.array(z.any()).max(10), // File objects - validated separately
  screenshot: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.array(z.string()).max(10),
  contactInfo: z.object({
    email: z.string().email().optional().or(z.literal('')),
    name: z.string().max(100).optional().or(z.literal('')),
  }),
  allowContact: z.boolean(),
  includeSystemInfo: z.boolean(),
  includeErrorStack: z.boolean(),
})

const errorInfoSchema = z.object({
  id: z.string(),
  message: z.string(),
  category: z.string(),
  severity: z.string(),
  stack: z.string().optional(),
  timestamp: z.string(),
  context: z.record(z.string(), z.any()).optional(),
})

const deviceContextSchema = z.object({
  userAgent: z.string(),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
  }),
  screen: z.object({
    width: z.number(),
    height: z.number(),
  }),
  language: z.string(),
  platform: z.string(),
  cookieEnabled: z.boolean(),
  onLine: z.boolean(),
  timezone: z.string(),
  connection: z
    .object({
      effectiveType: z.string(),
      downlink: z.number(),
      rtt: z.number(),
    })
    .optional(),
})

const submissionSchema = z.object({
  id: z.string(),
  type: z.enum(['feedback', 'report']),
  feedback: z.union([feedbackSchema, reportSchema]),
  error: errorInfoSchema.optional(),
  screenshot: z
    .object({
      data: z.string(),
      timestamp: z.string(),
      dimensions: z.object({
        width: z.number(),
        height: z.number(),
      }),
    })
    .optional(),
  deviceContext: deviceContextSchema.optional(),
  timestamp: z.string(),
})

// Sanitize sensitive data
function sanitizeSubmission(submission: any) {
  const sanitized = { ...submission }

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
  ]

  function sanitizeObject(obj: any, path: string = ''): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => sanitizeObject(item, `${path}[${index}]`))
    }

    const sanitizedObj: any = {}
    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase()
      const fullPath = path ? `${path}.${key}` : key

      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitizedObj[key] = '[SANITIZED]'
      } else if (typeof obj[key] === 'object') {
        sanitizedObj[key] = sanitizeObject(obj[key], fullPath)
      } else {
        sanitizedObj[key] = obj[key]
      }
    })

    return sanitizedObj
  }

  return sanitizeObject(sanitized)
}

// Generate feedback summary for notifications
function generateFeedbackSummary(submission: any): string {
  const { type, feedback, error, deviceContext } = submission

  let summary = `New ${type} submission:\n\n`

  if (type === 'feedback') {
    summary += `Type: ${feedback.type}\n`
    summary += `Severity: ${feedback.severity}\n`
    summary += `Description: ${feedback.description.substring(0, 200)}...\n`

    if (feedback.contactEmail) {
      summary += `Contact: ${feedback.contactEmail}\n`
    }
  } else {
    summary += `Title: ${feedback.title}\n`
    summary += `Priority: ${feedback.priority}\n`
    summary += `Categories: ${feedback.category.join(', ')}\n`
    summary += `Description: ${feedback.description.substring(0, 200)}...\n`

    if (feedback.contactInfo.email) {
      summary += `Contact: ${feedback.contactInfo.email}\n`
    }
  }

  if (error) {
    summary += `\nError Context:\n`
    summary += `Category: ${error.category}\n`
    summary += `Severity: ${error.severity}\n`
    summary += `Message: ${error.message}\n`
  }

  if (deviceContext) {
    summary += `\nDevice: ${deviceContext.platform} - ${deviceContext.userAgent.substring(0, 100)}\n`
  }

  return summary
}

// Send Sentry user feedback
async function sendSentryFeedback(
  submission: any
): Promise<string | undefined> {
  try {
    const { feedback, error } = submission

    // Create Sentry user feedback
    const sentryFeedback = {
      name:
        submission.type === 'report' && feedback.contactInfo?.name
          ? feedback.contactInfo.name
          : 'Anonymous User',
      email:
        submission.type === 'feedback'
          ? feedback.contactEmail
          : feedback.contactInfo?.email || 'anonymous@gravity-note.com',
      comments:
        submission.type === 'feedback'
          ? feedback.description
          : `${feedback.title}\n\n${feedback.description}`,
    }

    // Capture as Sentry event with user feedback
    const sentryEventId = Sentry.captureMessage(
      `User Feedback: ${submission.type}`,
      'info'
    )

    // Add user feedback to the event (using withScope for v8 compatibility)
    Sentry.withScope(scope => {
      scope.setContext('userFeedback', {
        eventId: sentryEventId,
        ...sentryFeedback,
      })
    })

    // Add additional context
    Sentry.withScope(scope => {
      scope.setTag('feedback_type', submission.type)
      scope.setTag('feedback_id', submission.id)

      if (submission.type === 'feedback') {
        scope.setTag('feedback_category', feedback.type)
        scope.setTag('severity', feedback.severity)
      } else {
        scope.setTag('priority', feedback.priority)
        scope.setLevel('info')
      }

      if (error) {
        scope.setContext('error_context', {
          category: error.category,
          severity: error.severity,
          message: error.message,
        })
      }

      if (submission.deviceContext) {
        scope.setContext('device_context', {
          browser: submission.deviceContext.userAgent.split(' ')[0],
          platform: submission.deviceContext.platform,
          viewport: submission.deviceContext.viewport,
          language: submission.deviceContext.language,
        })
      }

      scope.setContext('submission_metadata', {
        id: submission.id,
        timestamp: submission.timestamp,
        hasScreenshot: !!submission.screenshot,
        hasAttachments: submission.feedback.attachments?.length > 0,
      })
    })

    return sentryEventId
  } catch (error) {
    console.error('Failed to send Sentry feedback:', error)
    return undefined
  }
}

// Send email notification (mock implementation)
async function sendEmailNotification(submission: any): Promise<boolean> {
  try {
    // In a real implementation, you would use a service like:
    // - SendGrid
    // - AWS SES
    // - Resend
    // - Postmark

    const summary = generateFeedbackSummary(submission)

    console.log('📧 Email notification would be sent:')
    console.log('To: support@gravity-note.com')
    console.log('Subject: New User Feedback Received')
    console.log('Body:', summary)

    // Mock successful email sending
    return true
  } catch (error) {
    console.error('Failed to send email notification:', error)
    return false
  }
}

// Store feedback in database (mock implementation)
async function storeFeedback(submission: any): Promise<boolean> {
  try {
    // In a real implementation, you would store this in your database
    // For Supabase, this might look like:
    /*
    const { error } = await supabase
      .from('feedback_submissions')
      .insert({
        id: submission.id,
        type: submission.type,
        data: sanitizeSubmission(submission),
        created_at: new Date().toISOString(),
      })
    
    if (error) throw error
    */

    console.log('💾 Feedback would be stored in database:')
    console.log('ID:', submission.id)
    console.log('Type:', submission.type)
    console.log('Timestamp:', submission.timestamp)

    return true
  } catch (error) {
    console.error('Failed to store feedback:', error)
    return false
  }
}

// Main POST handler
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const headersList = headers()
    const forwarded = headersList.get('x-forwarded-for')
    const realIp = headersList.get('x-real-ip')
    const ip = forwarded?.split(',')[0] ?? realIp ?? '127.0.0.1'

    if (process.env.NODE_ENV === 'production') {
      const { success, limit, reset, remaining } = await ratelimit.limit(ip)

      if (!success) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Too many feedback submissions. Please try again later.',
            limit,
            reset,
            remaining,
          },
          { status: 429 }
        )
      }
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedSubmission = submissionSchema.parse(body)

    // Additional validation for file uploads
    if (validatedSubmission.type === 'report') {
      const report = validatedSubmission.feedback as any
      if (report.attachments && report.attachments.length > 0) {
        // Validate file sizes and types
        for (const attachment of report.attachments) {
          if (attachment.size > 10 * 1024 * 1024) {
            // 10MB limit
            return NextResponse.json(
              {
                error: 'File too large',
                message: 'Files must be smaller than 10MB',
              },
              { status: 400 }
            )
          }
        }
      }
    }

    // Check if this is spam or should be ignored
    const isSpam = await detectSpam(validatedSubmission)
    if (isSpam) {
      return NextResponse.json(
        { message: 'Submission received' }, // Don't reveal spam detection
        { status: 200 }
      )
    }

    // Process the submission
    const results = await Promise.allSettled([
      storeFeedback(validatedSubmission),
      sendSentryFeedback(validatedSubmission),
      sendEmailNotification(validatedSubmission),
    ])

    const [storageResult, sentryResult, emailResult] = results

    // Check if critical operations succeeded
    const storageSuccess =
      storageResult.status === 'fulfilled' && storageResult.value
    const sentryEventId =
      sentryResult.status === 'fulfilled' ? sentryResult.value : undefined
    const emailSuccess = emailResult.status === 'fulfilled' && emailResult.value

    if (!storageSuccess) {
      console.error('Failed to store feedback')
      return NextResponse.json(
        {
          error: 'Storage failed',
          message: 'Failed to store your feedback. Please try again.',
        },
        { status: 500 }
      )
    }

    // Log successful submission
    console.log(`✅ Feedback submission processed successfully:`, {
      id: validatedSubmission.id,
      type: validatedSubmission.type,
      storageSuccess,
      sentryEventId: !!sentryEventId,
      emailSuccess,
    })

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      id: validatedSubmission.id,
      sentryEventId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Feedback submission error:', error)

    // Don't expose validation errors to users for security
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid feedback data provided',
        },
        { status: 400 }
      )
    }

    // Capture unexpected errors in Sentry
    if (!shouldIgnoreError(error)) {
      Sentry.captureException(error, {
        tags: {
          operation: 'feedback_submission',
          endpoint: '/api/feedback',
        },
      })
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    )
  }
}

// Simple spam detection
async function detectSpam(submission: any): Promise<boolean> {
  try {
    const { feedback } = submission
    const text =
      submission.type === 'feedback'
        ? feedback.description
        : feedback.description

    // Basic spam indicators
    const spamPatterns = [
      /viagra|cialis|pharmacy/i,
      /\$\$\$|\bmoney\b.*\bfast\b/i,
      /click.*here.*now/i,
      /limited.*time.*offer/i,
      /\b(crypto|bitcoin|investment).*\b(opportunity|profit)/i,
    ]

    const hasSpamPattern = spamPatterns.some(pattern => pattern.test(text))
    if (hasSpamPattern) {
      console.warn('Spam detected in submission:', submission.id)
      return true
    }

    // Check for excessive repetition
    const words = text.toLowerCase().split(/\s+/)
    const wordCounts = words.reduce(
      (acc: Record<string, number>, word: string) => {
        acc[word] = (acc[word] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Ensure correct typing for Object.values result
    const counts = Object.values(wordCounts) as number[]
    const maxRepetition = counts.length > 0 ? Math.max(...counts) : 0
    if (maxRepetition > words.length * 0.3) {
      // More than 30% repetition
      console.warn(
        'Excessive repetition detected in submission:',
        submission.id
      )
      return true
    }

    return false
  } catch (error) {
    console.warn('Spam detection failed:', error)
    return false // Allow submission if spam detection fails
  }
}

// GET handler for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'feedback-api',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  })
}
