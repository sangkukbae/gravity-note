'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  NetworkQuality,
  classifyNetworkError,
} from '@/lib/errors/network-errors'

/**
 * Network status monitoring options
 */
interface NetworkStatusOptions {
  pingUrl?: string
  pingIntervalMs?: number
  qualityTestUrl?: string
  qualityTestIntervalMs?: number
  enableQualityMonitoring?: boolean
}

/**
 * Network statistics for quality estimation
 */
interface NetworkStats {
  latency: number
  downloadSpeed: number
  measurementTime: Date
}

/**
 * Network status information
 */
interface NetworkStatus {
  isOnline: boolean
  effectiveOnline: boolean
  quality: NetworkQuality
  stats?: NetworkStats
  lastError?: Error
  lastChangeAt: number | null
  lastCheckedAt: number | null
}

/**
 * Enhanced network status hook with quality monitoring and detailed error tracking
 */
export function useNetworkStatus(options: NetworkStatusOptions = {}) {
  const {
    pingUrl = '/manifest.json',
    pingIntervalMs = 30000,
    qualityTestUrl = '/api/health',
    qualityTestIntervalMs = 60000,
    enableQualityMonitoring = false,
  } = options

  // State
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    quality: NetworkQuality.UNKNOWN,
    lastChangeAt: null,
    lastCheckedAt: null,
  }))

  // Refs for intervals
  const pingIntervalRef = useRef<number | null>(null)
  const qualityIntervalRef = useRef<number | null>(null)

  /**
   * Update online status
   */
  const updateOnlineStatus = useCallback((isOnline: boolean) => {
    setStatus(prev => {
      if (prev.isOnline !== isOnline) {
        return {
          ...prev,
          isOnline,
          lastChangeAt: Date.now(),
        }
      }
      return prev
    })
  }, [])

  /**
   * Measure network latency
   */
  const measureLatency = useCallback(async (url: string): Promise<number> => {
    const startTime = performance.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const endTime = performance.now()

      if (response.ok) {
        return endTime - startTime
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error) {
      const networkError = classifyNetworkError(error, {
        requestUrl: url,
        requestMethod: 'HEAD',
      })
      throw networkError
    }
  }, [])

  /**
   * Estimate download speed (simplified test)
   */
  const measureDownloadSpeed = useCallback(
    async (url: string): Promise<number> => {
      const startTime = performance.now()

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.blob()
        const endTime = performance.now()
        const duration = (endTime - startTime) / 1000 // Convert to seconds
        const bytes = data.size

        // Return speed in Mbps
        return (bytes * 8) / (duration * 1024 * 1024)
      } catch (error) {
        const networkError = classifyNetworkError(error, {
          requestUrl: url,
          requestMethod: 'GET',
        })
        throw networkError
      }
    },
    []
  )

  /**
   * Determine network quality based on latency and speed
   */
  const calculateNetworkQuality = useCallback(
    (stats: NetworkStats): NetworkQuality => {
      const { latency, downloadSpeed } = stats

      if (latency < 100 && downloadSpeed > 10) {
        return NetworkQuality.EXCELLENT
      }

      if (latency < 300 && downloadSpeed > 1) {
        return NetworkQuality.GOOD
      }

      if (latency < 1000 && downloadSpeed > 0.1) {
        return NetworkQuality.FAIR
      }

      if (latency < 3000 && downloadSpeed > 0) {
        return NetworkQuality.POOR
      }

      return NetworkQuality.OFFLINE
    },
    []
  )

  /**
   * Perform basic connectivity check
   */
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const latency = await measureLatency(pingUrl)
      const measurementTime = new Date()

      setStatus(prev => {
        if (enableQualityMonitoring) {
          const newStats: NetworkStats = {
            latency,
            downloadSpeed: prev.stats?.downloadSpeed || 0,
            measurementTime,
          }

          return {
            ...prev,
            effectiveOnline: true,
            quality: calculateNetworkQuality({
              latency,
              downloadSpeed: 0,
              measurementTime,
            }),
            stats: newStats,
            lastCheckedAt: Date.now(),
          }
        } else {
          return {
            ...prev,
            effectiveOnline: true,
            lastCheckedAt: Date.now(),
          }
        }
      })

      return true
    } catch (error) {
      const networkError =
        error instanceof Error ? error : new Error(String(error))

      setStatus(prev => ({
        ...prev,
        effectiveOnline: false,
        quality: NetworkQuality.OFFLINE,
        lastCheckedAt: Date.now(),
        lastError: networkError,
      }))

      return false
    }
  }, [
    pingUrl,
    enableQualityMonitoring,
    measureLatency,
    calculateNetworkQuality,
  ])

  /**
   * Perform comprehensive quality test
   */
  const testNetworkQuality =
    useCallback(async (): Promise<NetworkStats | null> => {
      if (!enableQualityMonitoring) {
        return null
      }

      try {
        const [latency, downloadSpeed] = await Promise.all([
          measureLatency(pingUrl),
          measureDownloadSpeed(qualityTestUrl),
        ])

        const stats: NetworkStats = {
          latency,
          downloadSpeed,
          measurementTime: new Date(),
        }

        const quality = calculateNetworkQuality(stats)

        setStatus(prev => ({
          ...prev,
          quality,
          stats,
          lastCheckedAt: Date.now(),
        }))

        return stats
      } catch (error) {
        const networkError =
          error instanceof Error ? error : new Error(String(error))

        setStatus(prev => ({
          ...prev,
          quality: NetworkQuality.OFFLINE,
          lastCheckedAt: Date.now(),
          lastError: networkError,
        }))

        return null
      }
    }, [
      enableQualityMonitoring,
      pingUrl,
      qualityTestUrl,
      measureLatency,
      measureDownloadSpeed,
      calculateNetworkQuality,
    ])

  /**
   * Get connection information from navigator
   */
  const getConnectionInfo = useCallback(() => {
    if (typeof navigator === 'undefined') return null

    // @ts-ignore - connection API is not fully supported in TypeScript
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection

    if (!connection) return null

    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    }
  }, [])

  /**
   * Register background sync for offline scenarios
   */
  const registerBackgroundSync = useCallback(
    async (tag: string = 'gravity-sync'): Promise<boolean> => {
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready
          if ('sync' in registration) {
            // @ts-ignore Background Sync not fully typed
            await registration.sync.register(tag)
            return true
          }
        }
        return false
      } catch (error) {
        console.warn('Failed to register background sync:', error)
        return false
      }
    },
    []
  )

  /**
   * Setup event listeners for online/offline events
   */
  useEffect(() => {
    const handleOnline = () => updateOnlineStatus(true)
    const handleOffline = () => updateOnlineStatus(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [updateOnlineStatus])

  /**
   * Setup ping interval for connectivity monitoring
   */
  useEffect(() => {
    if (pingIntervalMs > 0) {
      // Initial connectivity check
      checkConnectivity()

      // Setup interval
      pingIntervalRef.current = window.setInterval(() => {
        checkConnectivity()
      }, pingIntervalMs)

      return () => {
        if (pingIntervalRef.current) {
          window.clearInterval(pingIntervalRef.current)
        }
      }
    }

    return undefined
  }, [checkConnectivity, pingIntervalMs])

  /**
   * Setup quality monitoring interval
   */
  useEffect(() => {
    if (enableQualityMonitoring && qualityTestIntervalMs > 0) {
      // Initial quality test
      testNetworkQuality()

      // Setup interval
      qualityIntervalRef.current = window.setInterval(() => {
        testNetworkQuality()
      }, qualityTestIntervalMs)

      return () => {
        if (qualityIntervalRef.current) {
          window.clearInterval(qualityIntervalRef.current)
        }
      }
    }

    return undefined
  }, [enableQualityMonitoring, qualityTestIntervalMs, testNetworkQuality])

  /**
   * Memoized return value
   */
  return useMemo(
    () => ({
      // Status information
      isOnline: status.isOnline,
      effectiveOnline: status.effectiveOnline,
      quality: status.quality,
      stats: status.stats,
      lastError: status.lastError,
      lastChangeAt: status.lastChangeAt,
      lastCheckedAt: status.lastCheckedAt,

      // Methods
      checkConnectivity,
      testNetworkQuality,
      getConnectionInfo,
      registerBackgroundSync,

      // Quality indicators
      isHighQuality:
        status.quality === NetworkQuality.EXCELLENT ||
        status.quality === NetworkQuality.GOOD,
      isPoorQuality: status.quality === NetworkQuality.POOR,
      isOffline:
        status.quality === NetworkQuality.OFFLINE || !status.effectiveOnline,

      // Stats helpers
      latency: status.stats?.latency,
      downloadSpeed: status.stats?.downloadSpeed,
      lastMeasurement: status.stats?.measurementTime,
    }),
    [
      status,
      checkConnectivity,
      testNetworkQuality,
      getConnectionInfo,
      registerBackgroundSync,
    ]
  )
}
