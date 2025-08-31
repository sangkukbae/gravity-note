'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'

interface SectionSkeletonProps {
  className?: string
}

export const SectionSkeleton = memo(function SectionSkeleton({
  className,
}: SectionSkeletonProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Section Header Skeleton */}
      <div className='flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg border border-border/50 mb-2'>
        <div className='flex items-center gap-3'>
          <div className='w-4 h-4 bg-muted-foreground/20 rounded animate-pulse' />
          <div className='w-4 h-4 bg-muted-foreground/20 rounded animate-pulse' />
          <div className='w-20 h-4 bg-muted-foreground/20 rounded animate-pulse' />
        </div>
        <div className='flex items-center gap-2'>
          <div className='w-8 h-5 bg-muted-foreground/20 rounded animate-pulse' />
        </div>
      </div>

      {/* Notes Skeleton */}
      <div className='space-y-0 bg-background border border-border/50 rounded-lg overflow-hidden'>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className='px-4 py-4 border-b border-border/30 last:border-b-0'
          >
            <div className='space-y-2'>
              {/* Note content skeleton */}
              <div className='space-y-1'>
                <div className='w-full h-4 bg-muted-foreground/20 rounded animate-pulse' />
                <div className='w-4/5 h-4 bg-muted-foreground/20 rounded animate-pulse' />
                <div className='w-3/5 h-4 bg-muted-foreground/20 rounded animate-pulse' />
              </div>

              {/* Note metadata skeleton */}
              <div className='flex items-center justify-between pt-2'>
                <div className='w-24 h-3 bg-muted-foreground/20 rounded animate-pulse' />
                <div className='w-16 h-6 bg-muted-foreground/20 rounded animate-pulse' />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
