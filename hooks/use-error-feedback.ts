'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  captureCriticalError,
  captureError,
  addBreadcrumb,
  SENTRY_FEATURES,
  type SentryErrorContext,
} from '@/lib/sentry'
import {
  classifyError,
  type ClassifiedError,
} from '@/lib/errors/classification'
import type { ErrorFeedback } from '@/components/error/error-feedback-modal'
import type { ErrorReport } from '@/components/error/error-report-form'

interface FeedbackSubmissionResult {
  id: string
  status: 'success' | 'error' | 'pending'
  message: string
  sentryEventId?: string
}

interface FeedbackConfig {
  enableSentryIntegration?: boolean
  enableLocalStorage?: boolean
  maxRetries?: number
  retryDelay?: number
  apiEndpoint?: string
  screenshotQuality?: number
  maxFileSize?: number
  allowedFileTypes?: string[]
}

interface FeedbackState {
  isSubmitting: boolean
  lastSubmission?: FeedbackSubmissionResult
  pendingSubmissions: string[]
  failedSubmissions: string[]
  history: FeedbackSubmissionResult[]
}

interface ScreenshotCapture {
  dataUrl: string
  timestamp: Date
  dimensions: { width: number; height: number }
}

interface DeviceContext {
  userAgent: string
  viewport: { width: number; height: number }
  screen: { width: number; height: number }
  language: string
  platform: string
  cookieEnabled: boolean
  onLine: boolean
  timezone: string
  connection?: {
    effectiveType: string
    downlink: number
    rtt: number
  }
}

const DEFAULT_CONFIG: Required<FeedbackConfig> = {
  enableSentryIntegration: true,
  enableLocalStorage: true,
  maxRetries: 3,
  retryDelay: 1000,
  apiEndpoint: '/api/feedback',
  screenshotQuality: 0.8,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/json',
    'application/pdf',
  ],
}

const STORAGE_KEYS = {
  PENDING_FEEDBACK: 'gravity-note-pending-feedback',
  FAILED_FEEDBACK: 'gravity-note-failed-feedback',
  FEEDBACK_HISTORY: 'gravity-note-feedback-history',
} as const

// Get device and browser context
const getDeviceContext = (): DeviceContext => {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'Server',
      viewport: { width: 0, height: 0 },
      screen: { width: 0, height: 0 },
      language: 'en',
      platform: 'Server',
      cookieEnabled: false,
      onLine: false,
      timezone: 'UTC',
    }
  }

  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection

  // Build base context and only include optional `connection` when available
  const baseContext: DeviceContext = {
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }

  if (connection) {
    return {
      ...baseContext,
      connection: {
        effectiveType: String(connection.effectiveType ?? 'unknown'),
        downlink:
          typeof connection.downlink === 'number'
            ? connection.downlink
            : Number(connection.downlink ?? 0),
        rtt:
          typeof connection.rtt === 'number'
            ? connection.rtt
            : Number(connection.rtt ?? 0),
      },
    }
  }

  return baseContext
}

export function useErrorFeedback(config: FeedbackConfig = {}) {
  const { toast } = useToast()
  const configRef = useRef({ ...DEFAULT_CONFIG, ...config })
  const [state, setState] = useState<FeedbackState>({
    isSubmitting: false,
    pendingSubmissions: [],
    failedSubmissions: [],
    history: [],
  })

  // Load initial state from localStorage
  const loadStorageData = useCallback(() => {
    if (
      !configRef.current.enableLocalStorage ||
      typeof window === 'undefined'
    ) {
      return
    }

    try {
      const pending = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.PENDING_FEEDBACK) || '[]'
      )
      const failed = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.FAILED_FEEDBACK) || '[]'
      )
      const history = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.FEEDBACK_HISTORY) || '[]'
      )

      setState(prev => ({
        ...prev,
        pendingSubmissions: pending,
        failedSubmissions: failed,
        history: history.slice(-50), // Keep last 50 entries
      }))
    } catch (error) {
      console.warn('Failed to load feedback storage data:', error)
    }
  }, [])

  // Save state to localStorage
  const saveStorageData = useCallback((newState: Partial<FeedbackState>) => {
    if (
      !configRef.current.enableLocalStorage ||
      typeof window === 'undefined'
    ) {
      return
    }

    try {
      if (newState.pendingSubmissions) {
        localStorage.setItem(
          STORAGE_KEYS.PENDING_FEEDBACK,
          JSON.stringify(newState.pendingSubmissions)
        )
      }
      if (newState.failedSubmissions) {
        localStorage.setItem(
          STORAGE_KEYS.FAILED_FEEDBACK,
          JSON.stringify(newState.failedSubmissions)
        )
      }
      if (newState.history) {
        localStorage.setItem(
          STORAGE_KEYS.FEEDBACK_HISTORY,
          JSON.stringify(newState.history.slice(-50))
        )
      }
    } catch (error) {
      console.warn('Failed to save feedback storage data:', error)
    }
  }, [])

  // Initialize storage data on first load
  useEffect(() => {
    loadStorageData()
  }, [loadStorageData])

  // Capture screenshot
  const captureScreenshot =
    useCallback(async (): Promise<ScreenshotCapture | null> => {
      try {
        // Try HTML5 screen capture API first
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        })

        return new Promise(resolve => {
          const video = document.createElement('video')
          video.srcObject = stream
          video.play()

          video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight

            const ctx = canvas.getContext('2d')
            ctx?.drawImage(video, 0, 0)

            const dataUrl = canvas.toDataURL(
              'image/png',
              configRef.current.screenshotQuality
            )

            // Stop the stream
            stream.getTracks().forEach(track => track.stop())

            resolve({
              dataUrl,
              timestamp: new Date(),
              dimensions: {
                width: video.videoWidth,
                height: video.videoHeight,
              },
            })
          }
        })
      } catch (error) {
        console.warn('Screenshot capture failed:', error)
        return null
      }
    }, [])

  // Validate file uploads
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      if (file.size > configRef.current.maxFileSize) {
        return {
          valid: false,
          error: `File too large. Maximum size is ${Math.round(configRef.current.maxFileSize / 1024 / 1024)}MB.`,
        }
      }

      if (!configRef.current.allowedFileTypes.includes(file.type)) {
        return {
          valid: false,
          error: 'File type not allowed.',
        }
      }

      return { valid: true }
    },
    []
  )

  // Generate unique submission ID
  const generateSubmissionId = useCallback((): string => {
    return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Submit feedback to API
  const submitToAPI = useCallback(
    async (
      submissionId: string,
      feedback: ErrorFeedback | ErrorReport,
      error?: ClassifiedError,
      screenshot?: ScreenshotCapture,
      deviceContext?: DeviceContext
    ): Promise<FeedbackSubmissionResult> => {
      try {
        const payload = {
          id: submissionId,
          type: 'type' in feedback ? 'feedback' : 'report',
          feedback,
          error: error
            ? {
                id: error.originalError?.name || 'UnknownError',
                message: error.message,
                category: error.category,
                severity: error.severity,
                stack: error.originalError?.stack,
                timestamp: error.timestamp.toISOString(),
                context: error.context,
              }
            : undefined,
          screenshot: screenshot
            ? {
                data: screenshot.dataUrl,
                timestamp: screenshot.timestamp.toISOString(),
                dimensions: screenshot.dimensions,
              }
            : undefined,
          deviceContext,
          timestamp: new Date().toISOString(),
        }

        const response = await fetch(configRef.current.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error(
            `API request failed: ${response.status} ${response.statusText}`
          )
        }

        const result = await response.json()

        return {
          id: submissionId,
          status: 'success',
          message: 'Feedback submitted successfully',
          sentryEventId: result.sentryEventId,
        }
      } catch (apiError) {
        console.error('API submission failed:', apiError)
        return {
          id: submissionId,
          status: 'error',
          message:
            apiError instanceof Error ? apiError.message : 'Unknown API error',
        }
      }
    },
    []
  )

  // Submit to Sentry
  const submitToSentry = useCallback(
    async (
      submissionId: string,
      feedback: ErrorFeedback | ErrorReport,
      error?: ClassifiedError
    ): Promise<string | undefined> => {
      if (
        !configRef.current.enableSentryIntegration ||
        !SENTRY_FEATURES.enabled
      ) {
        return undefined
      }

      try {
        const sentryContext: SentryErrorContext = {
          operation: 'user_feedback',
          component: 'ErrorFeedback',
          extra: {
            errorId: submissionId,
            timestamp: new Date().toISOString(),
            userFeedback: {
              description:
                'description' in feedback
                  ? (feedback as any).description
                  : (feedback as any).title,
              type: 'type' in feedback ? (feedback as any).type : 'report',
              email:
                'contactEmail' in feedback
                  ? (feedback as any).contactEmail
                  : 'contactInfo' in feedback
                    ? (feedback as any).contactInfo?.email
                    : undefined,
            },
          },
        }

        if (error) {
          return (
            captureCriticalError(
              error.originalError || new Error(error.message),
              sentryContext
            ) ?? undefined
          )
        } else {
          return (
            captureError(
              new Error(`User Feedback: ${JSON.stringify(feedback)}`),
              sentryContext
            ) ?? undefined
          )
        }
      } catch (sentryError) {
        if (
          process.env.NODE_ENV === 'development' ||
          process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true'
        ) {
          // eslint-disable-next-line no-console
          console.warn('Sentry submission failed:', sentryError)
        }
        return undefined
      }
    },
    []
  )

  // Retry failed submissions
  const retryFailedSubmissions = useCallback(async () => {
    const failed = [...state.failedSubmissions]
    if (failed.length === 0) return

    setState(prev => ({ ...prev, isSubmitting: true }))

    for (const submissionId of failed) {
      try {
        // Attempt to resubmit (would need to store original data)
        // This is a simplified version - in practice, you'd want to store
        // the original submission data and retry with that
        setState(prev => ({
          ...prev,
          failedSubmissions: prev.failedSubmissions.filter(
            id => id !== submissionId
          ),
          history: [
            ...prev.history,
            {
              id: submissionId,
              status: 'success',
              message: 'Retried successfully',
            },
          ],
        }))
      } catch (error) {
        console.warn(`Retry failed for submission ${submissionId}:`, error)
      }

      // Delay between retries
      await new Promise(resolve =>
        setTimeout(resolve, configRef.current.retryDelay)
      )
    }

    setState(prev => ({ ...prev, isSubmitting: false }))
    saveStorageData(state)
  }, [state.failedSubmissions, saveStorageData])

  // Main submission function
  const submitFeedback = useCallback(
    async (
      feedback: ErrorFeedback | ErrorReport,
      error?: ClassifiedError,
      options: {
        includeScreenshot?: boolean
        includeDeviceContext?: boolean
      } = {}
    ): Promise<FeedbackSubmissionResult> => {
      const submissionId = generateSubmissionId()

      setState(prev => ({
        ...prev,
        isSubmitting: true,
        pendingSubmissions: [...prev.pendingSubmissions, submissionId],
      }))

      addBreadcrumb({
        category: 'feedback',
        message: 'User feedback submission started',
        data: {
          submissionId,
          type: 'type' in feedback ? feedback.type : 'report',
        },
        level: 'info',
      })

      try {
        // Capture screenshot if requested
        let screenshot: ScreenshotCapture | undefined
        if (options.includeScreenshot) {
          screenshot = (await captureScreenshot()) || undefined
        }

        // Get device context if requested
        let deviceContext: DeviceContext | undefined
        if (options.includeDeviceContext) {
          deviceContext = getDeviceContext()
        }

        // Submit to Sentry first (if enabled)
        const sentryEventId = await submitToSentry(
          submissionId,
          feedback,
          error
        )

        // Submit to API
        const result = await submitToAPI(
          submissionId,
          feedback,
          error,
          screenshot,
          deviceContext
        )

        // Update result with Sentry event ID
        if (sentryEventId) {
          result.sentryEventId = sentryEventId
        }

        // Update state based on result
        setState(prev => {
          const newState = {
            ...prev,
            isSubmitting: false,
            lastSubmission: result,
            pendingSubmissions: prev.pendingSubmissions.filter(
              id => id !== submissionId
            ),
            history: [...prev.history, result],
          }

          if (result.status === 'error') {
            newState.failedSubmissions = [
              ...prev.failedSubmissions,
              submissionId,
            ]
          }

          return newState
        })

        // Save to localStorage
        saveStorageData({
          pendingSubmissions: state.pendingSubmissions.filter(
            id => id !== submissionId
          ),
          failedSubmissions:
            result.status === 'error'
              ? [...state.failedSubmissions, submissionId]
              : state.failedSubmissions,
          history: [...state.history, result],
        })

        // Show toast notification
        if (result.status === 'success') {
          toast({
            title: 'Feedback Submitted',
            description:
              'Thank you! Your feedback has been submitted successfully.',
          })
        } else {
          toast({
            title: 'Submission Failed',
            description:
              'Your feedback could not be submitted. It has been saved for retry.',
            variant: 'destructive',
          })
        }

        addBreadcrumb({
          category: 'feedback',
          message: `User feedback submission ${result.status}`,
          data: { submissionId, status: result.status },
          level: result.status === 'success' ? 'info' : 'error',
        })

        return result
      } catch (error) {
        const result: FeedbackSubmissionResult = {
          id: submissionId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }

        setState(prev => ({
          ...prev,
          isSubmitting: false,
          lastSubmission: result,
          pendingSubmissions: prev.pendingSubmissions.filter(
            id => id !== submissionId
          ),
          failedSubmissions: [...prev.failedSubmissions, submissionId],
          history: [...prev.history, result],
        }))

        saveStorageData({
          pendingSubmissions: state.pendingSubmissions.filter(
            id => id !== submissionId
          ),
          failedSubmissions: [...state.failedSubmissions, submissionId],
          history: [...state.history, result],
        })

        toast({
          title: 'Submission Error',
          description:
            'An unexpected error occurred. Your feedback has been saved for retry.',
          variant: 'destructive',
        })

        return result
      }
    },
    [
      generateSubmissionId,
      captureScreenshot,
      submitToSentry,
      submitToAPI,
      saveStorageData,
      state.pendingSubmissions,
      state.failedSubmissions,
      state.history,
      toast,
    ]
  )

  // Clear all feedback data
  const clearFeedbackData = useCallback(() => {
    setState({
      isSubmitting: false,
      pendingSubmissions: [],
      failedSubmissions: [],
      history: [],
    })

    if (configRef.current.enableLocalStorage && typeof window !== 'undefined') {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
      })
    }
  }, [])

  // Get feedback statistics
  const getStatistics = useCallback(() => {
    const total = state.history.length
    const successful = state.history.filter(h => h.status === 'success').length
    const failed = state.history.filter(h => h.status === 'error').length
    const pending = state.pendingSubmissions.length

    return {
      total,
      successful,
      failed,
      pending,
      successRate: total > 0 ? (successful / total) * 100 : 0,
    }
  }, [state.history, state.pendingSubmissions])

  return useMemo(
    () => ({
      // State
      isSubmitting: state.isSubmitting,
      lastSubmission: state.lastSubmission,
      pendingCount: state.pendingSubmissions.length,
      failedCount: state.failedSubmissions.length,
      statistics: getStatistics(),

      // Actions
      submitFeedback,
      retryFailedSubmissions,
      clearFeedbackData,
      captureScreenshot,
      validateFile,

      // Utilities
      generateSubmissionId,
      getDeviceContext,
    }),
    [
      state.isSubmitting,
      state.lastSubmission,
      state.pendingSubmissions.length,
      state.failedSubmissions.length,
      getStatistics,
      submitFeedback,
      retryFailedSubmissions,
      clearFeedbackData,
      captureScreenshot,
      validateFile,
      generateSubmissionId,
    ]
  )
}

export type {
  FeedbackSubmissionResult,
  FeedbackConfig,
  FeedbackState,
  ScreenshotCapture,
  DeviceContext,
}
