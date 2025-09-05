/**
 * Client-side Sentry Instrumentation for Next.js
 *
 * This file replaces the deprecated sentry.client.config.js file.
 * It configures Sentry for the browser environment with performance monitoring,
 * session replay, and error tracking optimized for client-side usage.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */
import * as Sentry from '@sentry/nextjs'
import {
  replayIntegration,
  browserTracingIntegration,
  captureRouterTransitionStart,
} from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined
const ENVIRONMENT = process.env.NODE_ENV || 'development'

// Only initialize if DSN is available
// Ensure this only runs in the browser to avoid SSR errors
if (SENTRY_DSN && typeof window !== 'undefined') {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Session replay (production only)
    replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0.0,
    replaysOnErrorSampleRate: ENVIRONMENT === 'production' ? 1.0 : 0.0,

    // Integrations
    integrations: [
      replayIntegration({
        // Mask all text content, images, and user inputs
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
      browserTracingIntegration({
        // Capture interactions like clicks, form submissions
        enableInp: true,
        // Next.js App Router navigation is automatically instrumented
      }),
    ],

    // Release tracking
    ...(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA && {
      release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    }),

    // Error filtering - don't capture development console errors
    beforeSend(event) {
      // Skip capturing in development if console errors
      if (ENVIRONMENT === 'development' && event.level === 'warning') {
        return null
      }

      // Skip capturing known non-critical errors
      if (
        event.exception?.values?.[0]?.value?.includes(
          'Non-Error exception captured'
        )
      ) {
        return null
      }

      // Skip capturing network errors that are handled
      if (
        event.exception?.values?.[0]?.type === 'NetworkError' &&
        event.tags?.handled === true
      ) {
        return null
      }

      return event
    },

    // Configure allowed URLs for error reporting
    allowUrls: [
      // Only capture errors from your domain in production
      ...(ENVIRONMENT === 'production'
        ? typeof window !== 'undefined'
          ? [window.location.hostname]
          : []
        : [/.*/]),
    ],

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'http://tt.epicplay.com',
      "Can't find variable: ZiteReader",
      'jigsaw is not defined',
      'ComboSearch is not defined',
      'http://loading.retry.widdit.com/',
      'atomicFindClose',
      // Network errors that are handled
      'NetworkError when attempting to fetch resource',
      'Failed to fetch',
      // Random plugins/extensions
      'Script error.',
      // React DevTools
      '__REACT_DEVTOOLS_GLOBAL_HOOK__',
    ],

    // Privacy settings
    sendDefaultPii: false,

    // Debug mode for development
    debug: ENVIRONMENT === 'development',

    // Custom error tags
    initialScope: {
      tags: {
        component: 'client',
        runtime: 'browser',
      },
    },
  })
}

/**
 * Export router transition hook for navigation instrumentation
 * This is still required by Sentry Next.js SDK for App Router navigation tracking
 */
export const onRouterTransitionStart = captureRouterTransitionStart
