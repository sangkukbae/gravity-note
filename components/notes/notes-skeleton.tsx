'use client'

import { cn } from '@/lib/utils'

interface NotesSkeletonProps {
  count?: number
  className?: string
}

export function NotesSkeleton({ count = 5, className }: NotesSkeletonProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className='flex items-start gap-3 p-4 border-b border-border/50'
        >
          <div className='flex-1 space-y-3'>
            {/* Content skeleton - varying widths for realism */}
            <div
              className={cn(
                'h-4 bg-muted/60 rounded animate-pulse',
                index % 3 === 0 ? 'w-3/4' : index % 3 === 1 ? 'w-full' : 'w-5/6'
              )}
            />
            <div
              className={cn(
                'h-4 bg-muted/40 rounded animate-pulse',
                index % 2 === 0 ? 'w-2/3' : 'w-1/2'
              )}
            />

            {/* Timestamp skeleton */}
            <div className='flex items-center gap-1 mt-2'>
              <div className='h-3 w-3 bg-muted/40 rounded animate-pulse' />
              <div className='h-3 w-16 bg-muted/40 rounded animate-pulse' />
            </div>
          </div>

          {/* Rescue button skeleton */}
          <div className='h-8 w-8 bg-muted/40 rounded animate-pulse' />
        </div>
      ))}
    </div>
  )
}
