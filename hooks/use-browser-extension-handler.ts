'use client'

import { useEffect } from 'react'

/**
 * Handle browser extension interference with hydration
 * This hook cleans up attributes added by browser extensions
 * that can cause hydration mismatches
 */
export function useBrowserExtensionHandler() {
  useEffect(() => {
    // Only run on client side after hydration
    if (typeof window === 'undefined') return

    // List of known problematic attributes from browser extensions
    const extensionAttributes = [
      'data-new-gr-c-s-check-loaded',
      'data-gr-ext-installed',
      'data-gr-ext-disabled',
      'data-1password-extension',
      'data-lastpass-icon-root',
    ]

    const cleanupTimer = setTimeout(() => {
      // Remove extension attributes from body and html
      const elements = [document.documentElement, document.body]

      elements.forEach(element => {
        if (!element) return

        extensionAttributes.forEach(attr => {
          if (element.hasAttribute(attr)) {
            element.removeAttribute(attr)
          }
        })
      })
    }, 100) // Small delay to ensure extensions have added their attributes

    return () => clearTimeout(cleanupTimer)
  }, [])
}
