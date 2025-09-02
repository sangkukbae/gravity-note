'use client'

import { useOfflineStatus } from '@/hooks/use-offline-status'
import { cn } from '@/lib/utils'
import { WifiOffIcon } from 'lucide-react'
import { isOfflineFeaturesEnabled } from '@/lib/config'

interface OfflineStatusIndicatorProps {
  className?: string
}

export function OfflineStatusIndicator({
  className,
}: OfflineStatusIndicatorProps) {
  const { isOnline, effectiveOnline, lastChangeAt } = useOfflineStatus()
  if (!isOfflineFeaturesEnabled()) return null

  // Show indicator when effectively offline (either browser offline or connectivity issues)
  const shouldShow = !effectiveOnline

  if (!shouldShow) {
    return null
  }

  return (
    <div
      data-testid='offline-indicator'
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded-md',
        'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
        'border border-amber-200 dark:border-amber-800/50',
        'text-xs font-medium',
        'transition-all duration-200',
        className
      )}
      title={
        !isOnline
          ? 'You are offline. Notes will be saved locally and synced when connection returns.'
          : 'Connection issues detected. Using offline mode.'
      }
    >
      <WifiOffIcon className='h-3 w-3' />
      <span className='text-[10px] uppercase tracking-wide'>
        {!isOnline ? 'Offline' : 'No Connection'}
      </span>
      {lastChangeAt && (
        <div className='w-1 h-1 bg-amber-600 dark:bg-amber-400 rounded-full animate-pulse' />
      )}
    </div>
  )
}
