'use client'

import React, { useState, useEffect } from 'react'
import {
  WifiOff,
  Wifi,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  HardDrive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useOfflineStatus } from '@/hooks/use-offline-status'
import { isOfflineFeaturesEnabled } from '@/lib/config'

/**
 * Offline status levels
 */
export enum OfflineStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  SYNCING = 'syncing',
  SYNC_ERROR = 'sync_error',
  PARTIAL_SYNC = 'partial_sync',
}

/**
 * Sync status information
 */
interface SyncStatus {
  status: OfflineStatus
  pendingChanges: number
  lastSync?: Date
  syncProgress?: number
  errorMessage?: string
}

/**
 * Enhanced offline indicator with sync status
 */
interface OfflineIndicatorProps {
  className?: string
  showSyncStatus?: boolean
  showPendingCount?: boolean
  onRetrySync?: () => void | Promise<void>
  onViewOfflineData?: () => void
  compact?: boolean
}

/**
 * Mock sync status for demonstration (replace with real implementation)
 */
function useSyncStatus(): SyncStatus {
  const { isOnline, effectiveOnline } = useOfflineStatus()
  const [status, setStatus] = useState<OfflineStatus>(OfflineStatus.ONLINE)
  const [pendingChanges, setPendingChanges] = useState(0)
  const [lastSync, setLastSync] = useState<Date | undefined>(new Date())
  const [syncProgress, setSyncProgress] = useState<number | undefined>()

  useEffect(() => {
    if (!effectiveOnline) {
      setStatus(OfflineStatus.OFFLINE)
      // Simulate pending changes when offline
      const interval = setInterval(() => {
        setPendingChanges(prev => {
          const random = Math.random()
          if (random < 0.1) return prev + 1 // 10% chance to add pending change
          return prev
        })
      }, 5000)
      return () => clearInterval(interval)
    } else if (pendingChanges > 0) {
      // Simulate sync when coming back online
      setStatus(OfflineStatus.SYNCING)
      setSyncProgress(0)

      const syncInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev === undefined) return 10
          if (prev >= 100) {
            clearInterval(syncInterval)
            setStatus(OfflineStatus.ONLINE)
            setPendingChanges(0)
            setLastSync(new Date())
            setSyncProgress(undefined)
            return undefined
          }
          return prev + 10
        })
      }, 200)

      return () => clearInterval(syncInterval)
    } else {
      setStatus(OfflineStatus.ONLINE)
    }
    return undefined
  }, [effectiveOnline, pendingChanges])

  const result: SyncStatus = {
    status,
    pendingChanges,
  }
  if (lastSync) {
    result.lastSync = lastSync
  }
  if (syncProgress !== undefined) {
    result.syncProgress = syncProgress
  }
  if (status === OfflineStatus.SYNC_ERROR) {
    result.errorMessage = 'Sync failed. Please try again.'
  }
  return result
}

/**
 * Get styling based on offline status
 */
function getOfflineStatusStyles(status: OfflineStatus) {
  switch (status) {
    case OfflineStatus.ONLINE:
      return {
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        borderColor: 'border-emerald-200 dark:border-emerald-800/50',
        textColor: 'text-emerald-800 dark:text-emerald-200',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
      }
    case OfflineStatus.SYNCING:
      return {
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        borderColor: 'border-blue-200 dark:border-blue-800/50',
        textColor: 'text-blue-800 dark:text-blue-200',
        iconColor: 'text-blue-600 dark:text-blue-400',
      }
    case OfflineStatus.SYNC_ERROR:
      return {
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        borderColor: 'border-red-200 dark:border-red-800/50',
        textColor: 'text-red-800 dark:text-red-200',
        iconColor: 'text-red-600 dark:text-red-400',
      }
    case OfflineStatus.PARTIAL_SYNC:
      return {
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        borderColor: 'border-yellow-200 dark:border-yellow-800/50',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
      }
    default: // OFFLINE
      return {
        bgColor: 'bg-gray-100 dark:bg-gray-900/30',
        borderColor: 'border-gray-200 dark:border-gray-800/50',
        textColor: 'text-gray-800 dark:text-gray-200',
        iconColor: 'text-gray-600 dark:text-gray-400',
      }
  }
}

/**
 * Get appropriate icon for status
 */
function getStatusIcon(status: OfflineStatus, isAnimated = false) {
  switch (status) {
    case OfflineStatus.ONLINE:
      return isAnimated ? Cloud : CheckCircle2
    case OfflineStatus.SYNCING:
      return RefreshCw
    case OfflineStatus.SYNC_ERROR:
      return AlertCircle
    case OfflineStatus.PARTIAL_SYNC:
      return Cloud
    default:
      return WifiOff
  }
}

/**
 * Get status text
 */
function getStatusText(syncStatus: SyncStatus): string {
  switch (syncStatus.status) {
    case OfflineStatus.ONLINE:
      return syncStatus.lastSync
        ? `Synced ${formatTimeAgo(syncStatus.lastSync)}`
        : 'Online'
    case OfflineStatus.SYNCING:
      return `Syncing${syncStatus.syncProgress !== undefined ? ` ${syncStatus.syncProgress}%` : '...'}`
    case OfflineStatus.SYNC_ERROR:
      return 'Sync Failed'
    case OfflineStatus.PARTIAL_SYNC:
      return 'Partial Sync'
    default:
      return 'Working Offline'
  }
}

/**
 * Format time ago
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/**
 * Enhanced Offline Indicator Component
 */
export function EnhancedOfflineIndicator({
  className,
  showSyncStatus = true,
  showPendingCount = true,
  onRetrySync,
  onViewOfflineData,
  compact = false,
}: OfflineIndicatorProps) {
  const { isOnline, effectiveOnline } = useOfflineStatus()
  const syncStatus = useSyncStatus()
  const [expanded, setExpanded] = useState(false)

  // Don't show if offline features are disabled
  if (!isOfflineFeaturesEnabled()) return null

  // Don't show if online and no pending changes (unless in development)
  if (
    effectiveOnline &&
    syncStatus.pendingChanges === 0 &&
    process.env.NODE_ENV !== 'development'
  ) {
    return null
  }

  const styles = getOfflineStatusStyles(syncStatus.status)
  const StatusIcon = getStatusIcon(syncStatus.status, true)
  const statusText = getStatusText(syncStatus)

  if (compact) {
    return (
      <div
        data-testid='offline-indicator-compact'
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all',
          'border',
          styles.bgColor,
          styles.borderColor,
          styles.textColor,
          'cursor-pointer hover:opacity-80',
          className
        )}
        onClick={() => setExpanded(!expanded)}
        title={`${statusText}${syncStatus.pendingChanges > 0 ? ` (${syncStatus.pendingChanges} pending)` : ''}`}
      >
        <StatusIcon
          className={cn(
            'h-3 w-3',
            styles.iconColor,
            syncStatus.status === OfflineStatus.SYNCING && 'animate-spin'
          )}
        />
        {showPendingCount && syncStatus.pendingChanges > 0 && (
          <span className='text-[10px] font-bold'>
            {syncStatus.pendingChanges}
          </span>
        )}
      </div>
    )
  }

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        expanded ? 'w-80' : 'w-fit',
        className
      )}
    >
      <CardContent className='p-3'>
        <div className='flex items-center gap-3'>
          {/* Status Icon */}
          <div
            className={cn('flex-shrink-0 p-1.5 rounded-full', styles.bgColor)}
          >
            <StatusIcon
              className={cn(
                'h-4 w-4',
                styles.iconColor,
                syncStatus.status === OfflineStatus.SYNCING && 'animate-spin'
              )}
            />
          </div>

          {/* Status Info */}
          <div className='flex-1 min-w-0'>
            <div className={cn('font-medium text-sm', styles.textColor)}>
              {statusText}
            </div>

            {/* Pending changes count */}
            {showPendingCount && syncStatus.pendingChanges > 0 && (
              <div className='flex items-center gap-1 mt-0.5'>
                <HardDrive className='h-3 w-3 text-gray-500' />
                <span className='text-xs text-gray-600 dark:text-gray-400'>
                  {syncStatus.pendingChanges} changes pending
                </span>
              </div>
            )}

            {/* Sync progress */}
            {syncStatus.syncProgress !== undefined && (
              <div className='mt-1'>
                <div className='flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1'>
                  <span>Syncing...</span>
                  <span>{syncStatus.syncProgress}%</span>
                </div>
                <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1'>
                  <div
                    className={cn(
                      'h-1 rounded-full transition-all duration-300',
                      'bg-blue-600 dark:bg-blue-400'
                    )}
                    style={{ width: `${syncStatus.syncProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error message */}
            {syncStatus.errorMessage && (
              <div className='text-xs text-red-600 dark:text-red-400 mt-1'>
                {syncStatus.errorMessage}
              </div>
            )}
          </div>

          {/* Expand/Collapse Toggle */}
          <Button
            variant='ghost'
            size='sm'
            className='flex-shrink-0 h-6 w-6 p-0'
            onClick={() => setExpanded(!expanded)}
          >
            <RefreshCw
              className={cn(
                'h-3 w-3 transition-transform',
                expanded ? 'rotate-180' : ''
              )}
            />
          </Button>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className='mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2'>
            {/* Action buttons */}
            <div className='flex gap-2'>
              {syncStatus.status === OfflineStatus.SYNC_ERROR &&
                onRetrySync && (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={onRetrySync}
                    className='flex items-center gap-1 text-xs h-7'
                  >
                    <RefreshCw className='h-3 w-3' />
                    Retry Sync
                  </Button>
                )}

              {onViewOfflineData && syncStatus.pendingChanges > 0 && (
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={onViewOfflineData}
                  className='flex items-center gap-1 text-xs h-7'
                >
                  <HardDrive className='h-3 w-3' />
                  View Offline Data
                </Button>
              )}
            </div>

            {/* Status details */}
            <div className='text-xs text-gray-600 dark:text-gray-400 space-y-1'>
              <div className='flex justify-between'>
                <span>Network:</span>
                <span>{isOnline ? 'Connected' : 'Disconnected'}</span>
              </div>
              <div className='flex justify-between'>
                <span>Effective:</span>
                <span>{effectiveOnline ? 'Online' : 'Offline'}</span>
              </div>
              {syncStatus.lastSync && (
                <div className='flex justify-between'>
                  <span>Last Sync:</span>
                  <span>{formatTimeAgo(syncStatus.lastSync)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Export offline status types
 */
// OfflineStatus enum is already exported above; export SyncStatus type only
export type { SyncStatus }
