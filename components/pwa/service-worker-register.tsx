'use client'

import { useEffect, useState } from 'react'
import { registerServiceWorker } from '@/lib/pwa/register-sw'
import { toast } from 'sonner'
import { isOfflineFeaturesEnabled } from '@/lib/config'

export function ServiceWorkerRegister() {
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    if (!isOfflineFeaturesEnabled()) return
    let dismissed = false
    ;(async () => {
      const reg = await registerServiceWorker({
        onUpdateFound: () => {
          // Optional: can toast that an update is being checked
        },
        onWaiting: registration => {
          // Prompt user to refresh to get the latest version
          const t = toast.info('A new version is available', {
            description: 'Click to update now',
            action: {
              label: 'Update',
              onClick: () => {
                try {
                  registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
                } catch {}
              },
            },
            duration: 8000,
          })

          // Auto-dismiss after a while
          setTimeout(() => !dismissed && toast.dismiss(t), 10000)
        },
        onActivated: () => {
          // First install success toast (optional)
          // toast.success('Offline support ready')
        },
        onError: () => {
          toast.error('Failed to register offline support')
        },
      })
      if (reg) setRegistered(true)
    })()

    return () => {
      dismissed = true
    }
  }, [])

  // No UI necessary
  return null
}
