'use client'

import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface FloatingActionButtonProps {
  onClick: () => void
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

export const FloatingActionButton = forwardRef<
  HTMLButtonElement,
  FloatingActionButtonProps
>(
  (
    { onClick, className, disabled = false, 'aria-label': ariaLabel, ...props },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        size='icon'
        className={cn(
          // Base positioning - fixed bottom-right
          'fixed bottom-6 right-6 z-50',

          // Material Design FAB specifications
          'h-14 w-14 rounded-full shadow-lg hover:shadow-xl',

          // Enhanced styling
          'bg-primary hover:bg-primary/90 active:bg-primary/80',
          'text-primary-foreground',

          // Smooth transitions
          'transition-all duration-200 ease-out',
          'transform hover:scale-105 active:scale-95',

          // Focus styling for accessibility
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',

          // Disabled state
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg',

          // Mobile responsive positioning
          'md:bottom-8 md:right-8',

          className
        )}
        aria-label={ariaLabel || 'Create new note'}
        {...props}
      >
        <PlusIcon className='h-6 w-6' />
      </Button>
    )
  }
)

FloatingActionButton.displayName = 'FloatingActionButton'
