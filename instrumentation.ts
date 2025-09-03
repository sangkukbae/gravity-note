/**
 * Next.js Instrumentation Hook for Sentry SDK
 *
 * This file replaces the deprecated sentry.server.config.js and sentry.edge.config.js files.
 * The register() function is called automatically by Next.js to initialize Sentry for different runtimes.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Sentry for Node.js server runtime
    const SENTRY_DSN =
      process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
    const ENVIRONMENT = process.env.NODE_ENV || 'development'
    const RELEASE =
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

    if (!SENTRY_DSN) {
      return
    }

    const sentryConfig: any = {
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,

      // Performance monitoring - lower sample rate for server
      tracesSampleRate: ENVIRONMENT === 'production' ? 0.05 : 1.0,

      // Profiling (production only)
      profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0.0,

      // Integrations - remove profiling integration for compatibility
      integrations: [],

      // Error filtering
      beforeSend(event: any) {
        // Filter out development noise
        if (ENVIRONMENT === 'development') {
          // Skip Next.js development warnings
          if (event.logger === 'next-dev') {
            return null
          }

          // Skip webpack warnings
          if (event.exception?.values?.[0]?.value?.includes('webpack')) {
            return null
          }
        }

        // Skip API route 404s (they're often intentional)
        if (
          event.exception?.values?.[0]?.value?.includes('404') &&
          event.request?.url?.includes('/api/')
        ) {
          return null
        }

        return event
      },

      // Configure context for server-side errors
      beforeSendTransaction(transaction: any) {
        // Don't send transactions for static assets
        if (transaction.transaction?.includes('/_next/static/')) {
          return null
        }

        return transaction
      },

      // Privacy settings - be extra careful on server
      sendDefaultPii: false,

      // Debug mode for development
      debug: ENVIRONMENT === 'development',

      // Server-specific configuration
      maxBreadcrumbs: 50,

      // Initial scope for server errors
      initialScope: {
        tags: {
          component: 'server',
          runtime: 'nodejs',
        },
      },

      // Configure allowed URLs (server doesn't have same restrictions)
      allowUrls: [/.*/],

      // Ignore specific server errors
      ignoreErrors: [
        // Expected Next.js errors
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        // Supabase connection issues that are handled
        'fetch failed',
        'connection timeout',
      ],
    }

    // Add release only if available
    if (RELEASE) {
      sentryConfig.release = RELEASE
    }

    Sentry.init(sentryConfig)
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Initialize Sentry for Edge runtime (middleware, edge API routes, etc.)
    const SENTRY_DSN =
      process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
    const ENVIRONMENT = process.env.NODE_ENV || 'development'
    const EDGE_RELEASE =
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

    if (!SENTRY_DSN) {
      return
    }

    Sentry.init({
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,

      // Conservative performance monitoring for edge runtime
      tracesSampleRate: ENVIRONMENT === 'production' ? 0.01 : 1.0,

      // Release tracking
      ...(EDGE_RELEASE ? { release: EDGE_RELEASE } : {}),

      // Minimal integrations for edge runtime
      integrations: [
        // Only essential integrations due to edge runtime constraints
      ],

      // Error filtering for edge runtime
      beforeSend(event: any) {
        // Skip development noise
        if (ENVIRONMENT === 'development' && event.level === 'warning') {
          return null
        }

        // Edge runtime specific filtering
        if (event.exception?.values?.[0]?.value?.includes('Edge Runtime')) {
          // Only capture critical edge runtime errors
          if (event.level !== 'error' && event.level !== 'fatal') {
            return null
          }
        }

        return event
      },

      // Privacy settings
      sendDefaultPii: false,

      // Minimal debug for edge
      debug: false,

      // Edge-specific tags
      initialScope: {
        tags: {
          component: 'edge',
          runtime: 'edge',
        },
      },

      // Reduced breadcrumbs for edge runtime
      maxBreadcrumbs: 10,

      // Ignore edge-specific errors that are expected
      ignoreErrors: [
        'The edge runtime does not support Node.js',
        'Dynamic Code Evaluation is not allowed in Edge Runtime',
        // Add other edge runtime specific errors as needed
      ],
    })
  }
}
