'use client'

import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  HardDrive,
  WifiOff,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NetworkStatusIndicator } from '@/components/error/network-status-indicator'

interface LocalSaveIndicatorProps {
  className?: string
  showNetworkStatus?: boolean
  onRetrySync?: () => void | Promise<void>
  syncError?: boolean
  syncing?: boolean
}

export function LocalSaveIndicator({
  className,
  showNetworkStatus = false,
  onRetrySync,
  syncError = false,
  syncing = false,
}: LocalSaveIndicatorProps) {
  // Determine the appropriate styling based on state
  const getIndicatorStyles = () => {
    if (syncError) {
      return {
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        borderColor: 'border-red-200 dark:border-red-800/50',
        textColor: 'text-red-800 dark:text-red-200',
        iconColor: 'text-red-600 dark:text-red-400',
      }
    }

    if (syncing) {
      return {
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        borderColor: 'border-blue-200 dark:border-blue-800/50',
        textColor: 'text-blue-800 dark:text-blue-200',
        iconColor: 'text-blue-600 dark:text-blue-400',
      }
    }

    return {
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      borderColor: 'border-emerald-200 dark:border-emerald-800/50',
      textColor: 'text-emerald-800 dark:text-emerald-200',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    }
  }

  const styles = getIndicatorStyles()

  const getStatusText = () => {
    if (syncError) return 'Sync failed'
    if (syncing) return 'Syncing...'
    return 'Saved locally'
  }

  const getStatusIcon = () => {
    if (syncError) return AlertTriangle
    if (syncing) return RefreshCw
    return CheckCircle2
  }

  const getTooltipText = () => {
    if (syncError)
      return 'Failed to sync. Click to retry or check your connection.'
    if (syncing) return 'Syncing your changes...'
    return 'Saved locally. Will sync when back online.'
  }

  const StatusIcon = getStatusIcon()

  return (
    <div className='flex items-center gap-2'>
      <div
        data-testid='local-save-indicator'
        className={cn(
          'flex items-center gap-2 px-2 py-1 rounded-md',
          'border text-xs font-medium transition-all duration-200',
          styles.bgColor,
          styles.borderColor,
          styles.textColor,
          // Make clickable if there's a retry action
          onRetrySync && syncError && 'cursor-pointer hover:opacity-80',
          className
        )}
        title={getTooltipText()}
        onClick={onRetrySync && syncError ? onRetrySync : undefined}
      >
        <HardDrive className='h-3 w-3' />
        <span className='text-[10px] uppercase tracking-wide'>
          {getStatusText()}
        </span>
        <StatusIcon
          className={cn('h-3 w-3', styles.iconColor, syncing && 'animate-spin')}
        />
      </div>

      {/* Network status indicator */}
      {showNetworkStatus && <NetworkStatusIndicator compact className='ml-1' />}

      {/* Retry button for sync errors */}
      {syncError && onRetrySync && (
        <Button
          size='sm'
          variant='outline'
          onClick={onRetrySync}
          className='h-6 px-2 text-xs'
          title='Retry sync'
        >
          <RefreshCw className='h-3 w-3 mr-1' />
          Retry
        </Button>
      )}
    </div>
  )
}
