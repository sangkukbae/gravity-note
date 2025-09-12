'use client'

import React, { useEffect, useState } from 'react'
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Signal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNetworkStatus } from '@/hooks/use-network-status'

/**
 * Network connection quality levels
 */
export enum NetworkQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  POOR = 'poor',
  OFFLINE = 'offline',
}

/**
 * Network status information
 */
interface NetworkStatus {
  isOnline: boolean
  effectiveOnline: boolean
  quality: NetworkQuality
  lastUpdate: Date
  reconnecting: boolean
}

/**
 * Get network quality based on connection info
 */
function getNetworkQuality(): NetworkQuality {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return NetworkQuality.GOOD
  }

  if (!navigator.onLine) {
    return NetworkQuality.OFFLINE
  }

  // Try to use Network Information API if available
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection

  if (connection) {
    const effectiveType = connection.effectiveType
    const downlink = connection.downlink

    // Based on effective connection type
    if (effectiveType === '4g' && downlink > 1.5) {
      return NetworkQuality.EXCELLENT
    } else if (
      effectiveType === '4g' ||
      (effectiveType === '3g' && downlink > 0.5)
    ) {
      return NetworkQuality.GOOD
    } else {
      return NetworkQuality.POOR
    }
  }

  // Fallback: assume good connection if online
  return NetworkQuality.GOOD
}

/**
 * Custom hook for enhanced network status monitoring
 */
function useEnhancedNetworkStatus(): NetworkStatus {
  const { isOnline, effectiveOnline } = useNetworkStatus({
    pingUrl: '/manifest.json',
    pingIntervalMs: 30000,
    enableQualityMonitoring: false,
  })
  const [quality, setQuality] = useState(NetworkQuality.GOOD)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [reconnecting, setReconnecting] = useState(false)

  useEffect(() => {
    function updateNetworkQuality() {
      const newQuality = getNetworkQuality()
      setQuality(newQuality)
      setLastUpdate(new Date())
    }

    // Initial check
    updateNetworkQuality()

    // Listen for connection changes
    const handleOnline = () => {
      setReconnecting(false)
      updateNetworkQuality()
    }

    const handleOffline = () => {
      setQuality(NetworkQuality.OFFLINE)
      setLastUpdate(new Date())
    }

    // Listen for network information changes if available
    const connection = (navigator as any).connection

    if (connection) {
      connection.addEventListener('change', updateNetworkQuality)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set up periodic quality checks
    const qualityInterval = setInterval(updateNetworkQuality, 30000) // Every 30 seconds

    return () => {
      if (connection) {
        connection.removeEventListener('change', updateNetworkQuality)
      }
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(qualityInterval)
    }
  }, [])

  // Handle reconnection detection
  useEffect(() => {
    if (!isOnline && effectiveOnline) {
      setReconnecting(true)
      const timeout = setTimeout(() => setReconnecting(false), 3000)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [isOnline, effectiveOnline])

  return {
    isOnline,
    effectiveOnline,
    quality: isOnline ? quality : NetworkQuality.OFFLINE,
    lastUpdate,
    reconnecting,
  }
}

/**
 * Get styling based on network status
 */
function getNetworkStatusStyles(status: NetworkStatus) {
  if (status.reconnecting) {
    return {
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      borderColor: 'border-blue-200 dark:border-blue-800/50',
      textColor: 'text-blue-800 dark:text-blue-200',
      iconColor: 'text-blue-600 dark:text-blue-400',
    }
  }

  if (!status.effectiveOnline) {
    return {
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      borderColor: 'border-red-200 dark:border-red-800/50',
      textColor: 'text-red-800 dark:text-red-200',
      iconColor: 'text-red-600 dark:text-red-400',
    }
  }

  switch (status.quality) {
    case NetworkQuality.EXCELLENT:
      return {
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        borderColor: 'border-emerald-200 dark:border-emerald-800/50',
        textColor: 'text-emerald-800 dark:text-emerald-200',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
      }
    case NetworkQuality.GOOD:
      return {
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-200 dark:border-green-800/50',
        textColor: 'text-green-800 dark:text-green-200',
        iconColor: 'text-green-600 dark:text-green-400',
      }
    case NetworkQuality.POOR:
      return {
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        borderColor: 'border-yellow-200 dark:border-yellow-800/50',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
      }
    default:
      return {
        bgColor: 'bg-gray-100 dark:bg-gray-900/30',
        borderColor: 'border-gray-200 dark:border-gray-800/50',
        textColor: 'text-gray-800 dark:text-gray-200',
        iconColor: 'text-gray-600 dark:text-gray-400',
      }
  }
}

/**
 * Get appropriate icon for network status
 */
function getNetworkIcon(status: NetworkStatus) {
  if (status.reconnecting) {
    return Clock
  }

  if (!status.effectiveOnline) {
    return WifiOff
  }

  switch (status.quality) {
    case NetworkQuality.EXCELLENT:
      return Signal
    case NetworkQuality.GOOD:
      return Wifi
    case NetworkQuality.POOR:
      return AlertTriangle
    case NetworkQuality.OFFLINE:
      return WifiOff
    default:
      return Wifi
  }
}

/**
 * Get status text for network condition
 */
function getStatusText(status: NetworkStatus): string {
  if (status.reconnecting) {
    return 'Reconnecting...'
  }

  if (!status.effectiveOnline) {
    return status.isOnline ? 'Connection Issues' : 'Offline'
  }

  switch (status.quality) {
    case NetworkQuality.EXCELLENT:
      return 'Excellent Connection'
    case NetworkQuality.GOOD:
      return 'Good Connection'
    case NetworkQuality.POOR:
      return 'Slow Connection'
    case NetworkQuality.OFFLINE:
      return 'Offline'
    default:
      return 'Connected'
  }
}

/**
 * Get detailed tooltip text
 */
function getTooltipText(status: NetworkStatus): string {
  const baseText = getStatusText(status)
  const timeAgo = Math.floor((Date.now() - status.lastUpdate.getTime()) / 1000)

  let timeText = ''
  if (timeAgo < 60) {
    timeText = 'just now'
  } else if (timeAgo < 3600) {
    timeText = `${Math.floor(timeAgo / 60)}m ago`
  } else {
    timeText = `${Math.floor(timeAgo / 3600)}h ago`
  }

  if (!status.effectiveOnline) {
    return `${baseText}. Notes will be saved locally and synced when connection returns. Last checked ${timeText}.`
  }

  return `${baseText}. Last checked ${timeText}.`
}

/**
 * Props for NetworkStatusIndicator component
 */
interface NetworkStatusIndicatorProps {
  className?: string
  compact?: boolean
  showText?: boolean
  showQuality?: boolean
  onClick?: () => void
}

/**
 * Network Status Indicator Component
 * Shows current network status with visual indicators
 */
export function NetworkStatusIndicator({
  className,
  compact = false,
  showText = true,
  showQuality = false,
  onClick,
}: NetworkStatusIndicatorProps) {
  const status = useEnhancedNetworkStatus()
  const styles = getNetworkStatusStyles(status)
  const StatusIcon = getNetworkIcon(status)
  const statusText = getStatusText(status)
  const tooltipText = getTooltipText(status)

  // Don't show indicator if connection is good and not in compact mode
  if (
    !compact &&
    status.effectiveOnline &&
    status.quality === NetworkQuality.EXCELLENT
  ) {
    return null
  }

  return (
    <div
      data-testid='network-status-indicator'
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded-md',
        'border text-xs font-medium transition-all duration-200',
        styles.bgColor,
        styles.borderColor,
        styles.textColor,
        onClick && 'cursor-pointer hover:opacity-80',
        compact ? 'px-1.5 py-0.5' : '',
        className
      )}
      title={tooltipText}
      onClick={onClick}
    >
      {/* Status Icon */}
      <StatusIcon
        className={cn(
          compact ? 'h-3 w-3' : 'h-3.5 w-3.5',
          styles.iconColor,
          status.reconnecting && 'animate-pulse'
        )}
      />

      {/* Status Text */}
      {showText && !compact && (
        <span className='text-[10px] uppercase tracking-wide'>
          {statusText}
        </span>
      )}

      {/* Quality indicator dots */}
      {showQuality && status.effectiveOnline && (
        <div className='flex items-center gap-0.5'>
          {[1, 2, 3].map(bar => {
            const shouldShow =
              (status.quality === NetworkQuality.POOR && bar <= 1) ||
              (status.quality === NetworkQuality.GOOD && bar <= 2) ||
              (status.quality === NetworkQuality.EXCELLENT && bar <= 3)

            return (
              <div
                key={bar}
                className={cn(
                  'w-1 rounded-full transition-all',
                  shouldShow
                    ? styles.iconColor
                    : 'bg-gray-300 dark:bg-gray-600',
                  bar === 1 ? 'h-1' : bar === 2 ? 'h-1.5' : 'h-2'
                )}
              />
            )
          })}
        </div>
      )}

      {/* Pulse indicator for activity */}
      {(status.reconnecting || !status.effectiveOnline) && (
        <div
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            styles.iconColor,
            'animate-pulse'
          )}
        />
      )}
    </div>
  )
}

/**
 * Hook to get current network status
 */
export { useNetworkStatus }

/**
 * Export network quality enum
 */
// Note: NetworkQuality enum is already exported above
