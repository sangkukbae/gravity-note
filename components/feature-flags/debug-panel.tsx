'use client'

import { useFeatureFlags } from '@/hooks/use-feature-flags'
import { usePostHog } from 'posthog-js/react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function FeatureFlagDebugPanel() {
  const { getActiveFlags, overrideFlag, clearOverrides } = useFeatureFlags()
  const posthog = usePostHog()
  const [flags, setFlags] = useState<Record<string, any>>({})
  const [overrides, setOverrides] = useState<Record<string, any>>({})
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return

    // Load flags
    const activeFlags = getActiveFlags()
    setFlags(activeFlags)

    // Set up window debugging utilities
    if (typeof window !== 'undefined') {
      ;(window as any).featureFlags = {
        get: () => activeFlags,
        override: (key: string, value: boolean | string) => {
          overrideFlag(key, value)
          setOverrides(prev => ({ ...prev, [key]: value }))
        },
        clear: () => {
          clearOverrides()
          setOverrides({})
        },
        show: () => setIsVisible(true),
        hide: () => setIsVisible(false),
      }

      console.log('🚩 Feature Flag Debug Tools Available:')
      console.log('  window.featureFlags.get() - Get all flags')
      console.log(
        '  window.featureFlags.override(key, value) - Override a flag'
      )
      console.log('  window.featureFlags.clear() - Clear overrides')
      console.log('  window.featureFlags.show() - Show debug panel')
    }

    // Keyboard shortcut to toggle panel
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [getActiveFlags, overrideFlag, clearOverrides])

  if (process.env.NODE_ENV !== 'development' || !isVisible) {
    return null
  }

  const handleOverrideToggle = (flagKey: string, enabled: boolean) => {
    overrideFlag(flagKey, enabled)
    setOverrides(prev => ({ ...prev, [flagKey]: enabled }))
  }

  return (
    <div className='fixed bottom-4 right-4 z-50 max-w-sm'>
      <Card className='border-2 border-blue-500'>
        <CardHeader className='pb-2'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-sm'>Feature Flags Debug</CardTitle>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => setIsVisible(false)}
              className='h-6 w-6 p-0'
            >
              ×
            </Button>
          </div>
        </CardHeader>

        <CardContent className='space-y-2'>
          {Object.keys(flags).length === 0 ? (
            <p className='text-xs text-gray-500'>No feature flags active</p>
          ) : (
            <>
              <div className='space-y-1'>
                {Object.entries(flags).map(([key, value]) => (
                  <div
                    key={key}
                    className='flex items-center justify-between text-xs'
                  >
                    <div className='flex items-center gap-1'>
                      <code className='text-[10px] bg-gray-100 px-1 rounded'>
                        {key}
                      </code>
                      {overrides[key] !== undefined && (
                        <Badge variant='secondary' className='text-[8px] h-4'>
                          Override
                        </Badge>
                      )}
                    </div>

                    <div className='flex items-center gap-1'>
                      <span className='text-[10px] text-gray-600'>
                        {typeof value === 'boolean'
                          ? value
                            ? 'ON'
                            : 'OFF'
                          : value}
                      </span>
                      {typeof value === 'boolean' && (
                        <Button
                          size='sm'
                          variant={
                            overrides[key] !== undefined
                              ? overrides[key]
                                ? 'default'
                                : 'secondary'
                              : value
                                ? 'default'
                                : 'outline'
                          }
                          onClick={() =>
                            handleOverrideToggle(
                              key,
                              !(overrides[key] !== undefined
                                ? overrides[key]
                                : value)
                            )
                          }
                          className='h-4 px-2 text-[8px]'
                        >
                          {(
                            overrides[key] !== undefined
                              ? overrides[key]
                              : value
                          )
                            ? 'ON'
                            : 'OFF'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className='flex gap-1 pt-2 border-t'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => {
                    clearOverrides()
                    setOverrides({})
                  }}
                  className='text-xs h-6'
                >
                  Clear Overrides
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => {
                    const newFlags = getActiveFlags()
                    setFlags(newFlags)
                  }}
                  className='text-xs h-6'
                >
                  Refresh
                </Button>
              </div>
            </>
          )}

          <p className='text-[10px] text-gray-400 pt-1 border-t'>
            Press Ctrl+Shift+F to toggle
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
