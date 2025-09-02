'use client'

import { cn } from '@/lib/utils'
import { ClockIcon } from 'lucide-react'

interface PendingNoteBadgeProps {
  className?: string
  isPending: boolean
}

export function PendingNoteBadge({
  className,
  isPending,
}: PendingNoteBadgeProps) {
  if (!isPending) {
    return null
  }

  return (
    <div
      data-testid='pending-badge'
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md',
        'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
        'border border-amber-200/50 dark:border-amber-800/30',
        'text-xs font-medium',
        'transition-all duration-200',
        className
      )}
      title='This note was created offline and is waiting to sync'
    >
      <ClockIcon className='h-3 w-3' />
      <span className='text-[10px] uppercase tracking-wide'>Pending</span>
      <div className='w-1 h-1 bg-amber-600 dark:bg-amber-400 rounded-full animate-pulse' />
    </div>
  )
}
