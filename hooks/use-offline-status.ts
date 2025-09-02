'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface Options {
  pingUrl?: string
  pingIntervalMs?: number
}

export function useOfflineStatus(options: Options = {}) {
  const { pingUrl = '/manifest.json', pingIntervalMs = 30000 } = options

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [effectiveOnline, setEffectiveOnline] = useState<boolean>(isOnline)
  const [lastChangeAt, setLastChangeAt] = useState<number | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null)
  const intervalRef = useRef<number | null>(null)

  const updateOnline = useCallback((val: boolean) => {
    setIsOnline(prev => {
      if (prev !== val) setLastChangeAt(Date.now())
      return val
    })
  }, [])

  const checkConnectivity = useCallback(async () => {
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(id)
      setLastCheckedAt(Date.now())
      const ok = res.ok
      setEffectiveOnline(ok)
      return ok
    } catch {
      setLastCheckedAt(Date.now())
      setEffectiveOnline(false)
      return false
    }
  }, [pingUrl])

  useEffect(() => {
    const onOnline = () => updateOnline(true)
    const onOffline = () => updateOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [updateOnline])

  useEffect(() => {
    // start/stop ping loop
    if (pingIntervalMs && pingIntervalMs > 0) {
      // immediate check on mount
      checkConnectivity()
      intervalRef.current = window.setInterval(() => {
        checkConnectivity()
      }, pingIntervalMs) as unknown as number
      return () => {
        if (intervalRef.current) window.clearInterval(intervalRef.current)
      }
    }
    return
  }, [checkConnectivity, pingIntervalMs])

  const registerBackgroundSync = useCallback(
    async (tag: string = 'gravity-sync') => {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready
          if ('sync' in reg) {
            // @ts-ignore Background Sync not fully typed in TS DOM lib
            await reg.sync.register(tag)
            return true
          }
        }
        return false
      } catch {
        return false
      }
    },
    []
  )

  return useMemo(
    () => ({
      isOnline,
      effectiveOnline,
      lastChangeAt,
      lastCheckedAt,
      checkConnectivity,
      registerBackgroundSync,
    }),
    [
      isOnline,
      effectiveOnline,
      lastChangeAt,
      lastCheckedAt,
      checkConnectivity,
      registerBackgroundSync,
    ]
  )
}
