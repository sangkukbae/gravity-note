'use client'

import { useEffect, useState } from 'react'

export interface CosmicScrollValues {
  scrollY: number
  scrollProgress: number
  gradientCenterY: number
  opacity: number
}

export function useCosmicScroll(): CosmicScrollValues {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    let ticking = false

    const updateScrollY = () => {
      setScrollY(window.scrollY)
      ticking = false
    }

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollY)
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const maxScroll = 800
  const scrollProgress = Math.min(scrollY / maxScroll, 1)

  const startY = 120
  const endY = 50
  const gradientCenterY = startY - (startY - endY) * scrollProgress

  const opacity = 0.8 + 0.2 * scrollProgress

  return {
    scrollY,
    scrollProgress,
    gradientCenterY,
    opacity,
  }
}
