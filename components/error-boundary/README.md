# Global Error Handling System

This directory contains the comprehensive error handling system for Gravity Note, providing robust error boundaries, classification, and Sentry integration.

## Overview

The error handling system consists of:

1. **Error Classification System** (`lib/errors/classification.ts`)
2. **Global Error Boundary Component** (`components/error-boundary/global-error-boundary.tsx`)
3. **Sentry Integration** for error tracking and reporting

## Error Classification

### Error Categories

- `NetworkError` - Connection and API errors
- `ValidationError` - Input validation errors
- `AuthError` - Authentication and authorization errors
- `DatabaseError` - Database operation errors
- `RuntimeError` - JavaScript runtime errors
- `PermissionError` - Access permission errors
- `RateLimitError` - API rate limiting errors

### Severity Levels

- `LOW` - Minor issues that don't affect core functionality
- `MEDIUM` - Issues that affect some functionality
- `HIGH` - Issues that significantly impact user experience
- `CRITICAL` - Issues that break core application functionality

## Usage Examples

### Basic Error Classification

```typescript
import { classifyError, getUserErrorMessage } from '@/lib/errors'

try {
  // Some operation that might fail
  await someAsyncOperation()
} catch (error) {
  const classified = classifyError(error)
  console.log('Error category:', classified.category)
  console.log('User message:', getUserErrorMessage(error))
}
```

### Using with React Components

```typescript
import { NetworkError, ValidationError } from '@/lib/errors'

// Throwing classified errors
if (!response.ok) {
  throw new NetworkError('Failed to fetch data', originalError)
}

if (!isValid) {
  throw new ValidationError('Invalid input', 'Please check your email format')
}
```

### Wrapping Components with Error Boundary

```typescript
import { withGlobalErrorBoundary } from '@/lib/errors'

const MyComponent = () => {
  // Component that might throw errors
  return <div>Content</div>
}

// Wrap with error boundary
export default withGlobalErrorBoundary(MyComponent, {
  onError: (error, errorInfo, errorId) => {
    console.log('Component error:', error)
  }
})
```

### Manual Error Boundary Usage

```typescript
import { GlobalErrorWrapper } from '@/lib/errors'

function MyPage() {
  return (
    <GlobalErrorWrapper
      onError={(error, errorInfo, errorId) => {
        // Custom error handling
        analytics.track('error_occurred', { errorId, category: error.category })
      }}
    >
      <MyRiskyComponent />
    </GlobalErrorWrapper>
  )
}
```

## Global Error Boundary Features

### User-Friendly Error UI

- Displays appropriate error messages based on error severity
- Shows different icons and colors for different error types
- Provides retry functionality for retryable errors
- Includes "Go to Home" and "Reload Page" options
- Shows error reporting functionality

### Developer Features

- Development-only detailed error information
- Error ID generation for tracking
- Component stack traces
- Retry attempt counting
- Automatic page reload for critical errors

### Sentry Integration

The Global Error Boundary automatically sends errors to Sentry when:

- `enableSentryLogging` is true (default)
- Sentry SDK is properly configured
- Window.Sentry is available

Error data sent includes:

- Classified error information
- Error severity and category tags
- Component stack trace
- User agent and URL context
- Retry attempt information
- Unique error ID for tracking

## Configuration

### Environment Setup

1. **Sentry Configuration**:

   ```env
   NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
   ```

2. **Sentry SDK Setup** (when implemented):

   ```typescript
   import * as Sentry from '@sentry/nextjs'

   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     environment: process.env.NODE_ENV,
     // Additional configuration
   })
   ```

### Global Error Boundary Props

- `enableSentryLogging` (boolean, default: true) - Enable/disable Sentry error reporting
- `maxRetries` (number, default: 3) - Maximum retry attempts for retryable errors
- `onError` (function) - Custom error callback
- `fallback` (ReactNode) - Custom error UI component

## Implementation Details

### Root Layout Integration

The Global Error Boundary is integrated at the root level in `app/layout.tsx`:

```typescript
<GlobalErrorBoundary
  enableSentryLogging={true}
  maxRetries={3}
  onError={(error, errorInfo, errorId) => {
    console.log('Global error captured:', { error, errorInfo, errorId })
  }}
>
  <div id='root'>{children}</div>
</GlobalErrorBoundary>
```

### Error ID Generation

Each error gets a unique ID in the format: `err_{timestamp}_{random}`

This ID is used for:

- Tracking errors across systems
- User support and debugging
- Error reporting and analytics

### Retry Logic

- Only retryable errors show retry button
- Maximum retry attempts are configurable
- Retry count is tracked and displayed
- Critical errors auto-reload page after 10 seconds

## Best Practices

1. **Throw Classified Errors**: Use specific error classes instead of generic Error
2. **Provide Context**: Include relevant context when throwing errors
3. **User-Friendly Messages**: Always provide clear user-facing error messages
4. **Error Boundaries**: Wrap risky components with error boundaries
5. **Monitor Severity**: Use appropriate severity levels for different error types
6. **Test Error Scenarios**: Regularly test error handling in development

## Testing

Error boundaries can be tested using:

```typescript
// Throw test errors in development
if (process.env.NODE_ENV === 'development') {
  window.testError = () => {
    throw new NetworkError('Test network error')
  }
}
```

Then call `window.testError()` in the browser console to test error handling.

## Future Enhancements

- [ ] Error recovery strategies
- [ ] Offline error queueing
- [ ] Error analytics dashboard
- [ ] Custom error boundary for specific components
- [ ] Error rate limiting and throttling
- [ ] Integration with performance monitoring
