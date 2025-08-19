'use client'

import { useEffect, useRef } from 'react'
import { useFocusManagement } from '@/lib/hooks/use-keyboard-shortcuts'

interface SkipLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

/**
 * Skip navigation link for accessibility
 */
export function SkipLink({ href, children, className = '' }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium ${className}`}
      data-skip-to={href.replace('#', '')}
    >
      {children}
    </a>
  )
}

interface LiveRegionProps {
  children: React.ReactNode
  priority?: 'polite' | 'assertive'
  atomic?: boolean
  className?: string
}

/**
 * Live region for screen reader announcements
 */
export function LiveRegion({
  children,
  priority = 'polite',
  atomic = true,
  className = 'sr-only',
}: LiveRegionProps) {
  return (
    <div aria-live={priority} aria-atomic={atomic} className={className}>
      {children}
    </div>
  )
}

interface FocusTrapProps {
  children: React.ReactNode
  active?: boolean
  restoreFocus?: boolean
  className?: string
}

/**
 * Focus trap component for modals and dialogs
 */
export function FocusTrap({
  children,
  active = true,
  restoreFocus = true,
  className = '',
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const { trapFocus, restoreFocus: restorePreviousFocus } = useFocusManagement()

  useEffect(() => {
    if (!active || !containerRef.current) return

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    // Set up focus trap
    const cleanup = trapFocus(containerRef.current)

    return () => {
      cleanup()

      // Restore focus when trap is deactivated
      if (restoreFocus) {
        restorePreviousFocus(previousActiveElement.current)
      }
    }
  }, [active, trapFocus, restorePreviousFocus, restoreFocus])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

interface VisuallyHiddenProps {
  children: React.ReactNode
  className?: string
}

/**
 * Visually hidden content that's still available to screen readers
 */
export function VisuallyHidden({
  children,
  className = '',
}: VisuallyHiddenProps) {
  return <span className={`sr-only ${className}`}>{children}</span>
}

interface KeyboardShortcutHintProps {
  shortcut: string
  description: string
  className?: string
}

/**
 * Keyboard shortcut hint component
 */
export function KeyboardShortcutHint({
  shortcut,
  description,
  className = '',
}: KeyboardShortcutHintProps) {
  const formatShortcut = (shortcut: string) => {
    return shortcut
      .replace(/cmd/gi, '⌘')
      .replace(/ctrl/gi, 'Ctrl')
      .replace(/alt/gi, 'Alt')
      .replace(/shift/gi, '⇧')
      .replace(/\+/g, ' + ')
  }

  return (
    <div
      className={`flex items-center justify-between text-xs text-muted-foreground ${className}`}
    >
      <span>{description}</span>
      <kbd className='ml-2 px-1.5 py-0.5 bg-muted rounded text-xs font-mono'>
        {formatShortcut(shortcut)}
      </kbd>
    </div>
  )
}

interface AccessibleIconProps {
  children: React.ReactNode
  label: string
  className?: string
}

/**
 * Icon with accessible label
 */
export function AccessibleIcon({
  children,
  label,
  className = '',
}: AccessibleIconProps) {
  return (
    <span className={className} aria-label={label} role='img'>
      {children}
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  )
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

/**
 * Accessible loading spinner
 */
export function LoadingSpinner({
  size = 'md',
  label = 'Loading...',
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <div
      role='status'
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${sizeClasses[size]} ${className}`}
    >
      <VisuallyHidden>{label}</VisuallyHidden>
    </div>
  )
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error) => void
}

/**
 * Accessible error boundary component
 */
export function ErrorMessage({
  error,
  retry,
  className = '',
}: {
  error: string
  retry?: () => void
  className?: string
}) {
  return (
    <div
      role='alert'
      aria-live='assertive'
      className={`rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}
    >
      <div className='flex'>
        <div className='flex-shrink-0'>
          <AccessibleIcon label='Error'>
            <svg
              className='h-5 w-5 text-red-400'
              viewBox='0 0 20 20'
              fill='currentColor'
            >
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                clipRule='evenodd'
              />
            </svg>
          </AccessibleIcon>
        </div>
        <div className='ml-3'>
          <h3 className='text-sm font-medium text-red-800'>Error</h3>
          <p className='mt-1 text-sm text-red-700'>{error}</p>
          {retry && (
            <button
              onClick={retry}
              className='mt-2 text-sm font-medium text-red-800 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to manage reduced motion preferences
 */
export function useReducedMotion() {
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  return prefersReducedMotion
}

/**
 * Hook to manage high contrast preferences
 */
export function useHighContrast() {
  const prefersHighContrast =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-contrast: high)').matches
      : false

  return prefersHighContrast
}
