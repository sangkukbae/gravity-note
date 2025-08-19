import React, { useEffect, useRef, useCallback, useState } from 'react'

/**
 * Debounce utility function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

/**
 * Throttle utility function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()

    if (now - lastCall >= delay) {
      lastCall = now
      func(...args)
    }
  }
}

/**
 * Hook for debouncing values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for throttling functions
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const throttledFunc = useRef<T>()

  if (!throttledFunc.current) {
    throttledFunc.current = throttle(func, delay) as T
  }

  return throttledFunc.current
}

/**
 * Hook for measuring performance
 */
export function usePerformanceMonitor(name: string) {
  const startTime = useRef<number>()

  const start = useCallback(() => {
    startTime.current = performance.now()
    performance.mark(`${name}-start`)
  }, [name])

  const end = useCallback(() => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current
      performance.mark(`${name}-end`)
      performance.measure(name, `${name}-start`, `${name}-end`)

      console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`)
      return duration
    }
    return 0
  }, [name])

  return { start, end }
}

/**
 * Virtual scrolling utilities
 */
export interface VirtualScrollOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export function calculateVirtualScrollRange(
  scrollTop: number,
  totalItems: number,
  options: VirtualScrollOptions
) {
  const { itemHeight, containerHeight, overscan = 5 } = options

  const visibleItemCount = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    totalItems - 1,
    startIndex + visibleItemCount + overscan * 2
  )

  return {
    startIndex,
    endIndex,
    visibleItemCount,
    totalHeight: totalItems * itemHeight,
    offsetY: startIndex * itemHeight,
  }
}

/**
 * Hook for virtual scrolling
 */
export function useVirtualScroll<T>(items: T[], options: VirtualScrollOptions) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const { startIndex, endIndex, totalHeight, offsetY } =
    calculateVirtualScrollRange(scrollTop, items.length, options)

  const visibleItems = items.slice(startIndex, endIndex + 1)

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll,
    scrollElementRef,
    startIndex,
    endIndex,
  }
}

/**
 * Hook for lazy loading images
 */
export function useLazyImage(
  src: string,
  options: IntersectionObserverInit = {}
) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0]
      if (entry?.isIntersecting) {
        const img = new Image()
        img.onload = () => setIsLoaded(true)
        img.onerror = () => setError('Failed to load image')
        img.src = src
        observer.disconnect()
      }
    }, options)

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [src, options])

  return { isLoaded, error, ref: imgRef }
}

/**
 * Intersection Observer hook for visibility detection
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0]
      if (entry) {
        setIsIntersecting(entry.isIntersecting)
      }
    }, options)

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [options])

  return { isIntersecting, ref: elementRef }
}

/**
 * Hook for prefetching data
 */
export function usePrefetch<T>(
  prefetchFn: () => Promise<T>,
  shouldPrefetch: boolean = true
) {
  const hasPrefetched = useRef(false)

  useEffect(() => {
    if (shouldPrefetch && !hasPrefetched.current) {
      hasPrefetched.current = true
      prefetchFn().catch(console.error)
    }
  }, [shouldPrefetch, prefetchFn])
}

/**
 * Memory management utilities
 */
export class LRUCache<K, V> {
  private capacity: number
  private cache = new Map<K, V>()

  constructor(capacity: number) {
    this.capacity = capacity
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key)!
      this.cache.delete(key)
      this.cache.set(key, value)
      return value
    }
    return undefined
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key)
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

/**
 * Component for measuring render performance
 */
export function PerformanceWrapper({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  const renderStart = useRef<number>()

  // Start timing before render
  renderStart.current = performance.now()

  useEffect(() => {
    // End timing after render
    if (renderStart.current) {
      const duration = performance.now() - renderStart.current
      console.log(`Render Performance: ${name} took ${duration.toFixed(2)}ms`)
    }
  })

  return <>{children}</>
}

/**
 * Hook for web vitals monitoring
 */
export function useWebVitals() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'web-vitals' in window) {
      // This would require the web-vitals library
      // For now, we'll use basic performance API

      // Largest Contentful Paint
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            console.log('LCP:', entry.startTime)
          }
        }
      })

      observer.observe({ entryTypes: ['largest-contentful-paint'] })

      return () => observer.disconnect()
    }

    // Return cleanup function for all code paths
    return () => {}
  }, [])
}
