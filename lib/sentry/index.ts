/**
 * Sentry Integration Index
 *
 * Central export point for all Sentry utilities and configurations.
 * This provides a clean API for the rest of the application to use Sentry features.
 */

// Configuration
export {
  SENTRY_CONFIG,
  SENTRY_FEATURES,
  COMMON_TAGS,
  getSampleRate,
  shouldIgnoreError,
  getAllowedUrls,
  isDevelopment,
  isProduction,
  isTest,
} from './config'

// Error Capture
export {
  captureError,
  captureCriticalError,
  captureNetworkError,
  captureAuthError,
  captureDatabaseError,
  captureValidationError,
  captureMessage,
  addBreadcrumb,
  startTransaction,
  setUserContext,
  clearUserContext,
  type SentryErrorContext,
} from './capture'

// Context Management
export {
  setSentryUserContext,
  setApplicationContext,
  setPerformanceContext,
  setDeviceContext,
  setBuildContext,
  addNavigationBreadcrumb,
  addInteractionBreadcrumb,
  addApiCallBreadcrumb,
  addDatabaseBreadcrumb,
  clearSentryContext,
  initializeSentryContext,
  type ApplicationContext,
  type UserContext,
  type PerformanceContext,
} from './context'

// Performance Monitoring
export {
  withPerformanceMonitoring,
  monitorApiCall,
  monitorDatabaseOperation,
  monitorComponentRender,
  monitorNavigation,
  trackPerformanceMetric,
  trackWebVital,
  createSpan,
  finishSpan,
} from './performance'

// Re-export Sentry SDK for direct use when needed
export * as Sentry from '@sentry/nextjs'
