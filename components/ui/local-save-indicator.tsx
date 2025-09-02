'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, HardDrive } from 'lucide-react'

interface LocalSaveIndicatorProps {
  className?: string
}

export function LocalSaveIndicator({ className }: LocalSaveIndicatorProps) {
  return (
    <div
      data-testid='local-save-indicator'
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded-md',
        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
        'border border-emerald-200 dark:border-emerald-800/50',
        'text-xs font-medium',
        'transition-all duration-200',
        className
      )}
      title='Saved locally. Will sync when back online.'
    >
      <HardDrive className='h-3 w-3' />
      <span className='text-[10px] uppercase tracking-wide'>Saved locally</span>
      <CheckCircle2 className='h-3 w-3' />
    </div>
  )
}
