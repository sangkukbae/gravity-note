'use client'

import { isOfflineFeaturesEnabled } from '@/lib/config'

export interface SWRegisterOptions {
  scriptUrl?: string
  scope?: string
  onUpdateFound?: (registration: ServiceWorkerRegistration) => void
  onWaiting?: (registration: ServiceWorkerRegistration) => void
  onActivated?: (registration: ServiceWorkerRegistration) => void
  onError?: (error: unknown) => void
}

export async function registerServiceWorker(options: SWRegisterOptions = {}) {
  if (!isOfflineFeaturesEnabled()) return null
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator)) return null

  try {
    const {
      scriptUrl = '/sw.js',
      scope = '/',
      onUpdateFound,
      onWaiting,
      onActivated,
      onError,
    } = options

    const registration = await navigator.serviceWorker.register(scriptUrl, {
      scope,
      updateViaCache: 'none',
      type: 'classic',
    })

    // Listen for updatefound -> install -> waiting lifecycle
    registration.addEventListener('updatefound', () => {
      onUpdateFound?.(registration)
      const installing = registration.installing
      if (!installing) return
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // A new version is installed and waiting to activate
            onWaiting?.(registration)
          } else {
            // First install
            onActivated?.(registration)
          }
        }
      })
    })

    // Also handle controllerchange to refresh the page when the new SW takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Avoid infinite reload loops by using a one-shot flag
      if ((window as any).__SW_RELOADED__) return
      ;(window as any).__SW_RELOADED__ = true
      window.location.reload()
    })

    return registration
  } catch (err) {
    options.onError?.(err)
    return null
  }
}
