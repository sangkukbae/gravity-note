'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { useWebVitals } from '@/lib/utils/performance'

interface PerformanceMetrics {
  renderCount: number
  lastRenderTime: number
  averageRenderTime: number
  memoryUsage?: number
}

interface PerformanceContextType {
  metrics: PerformanceMetrics
  trackRender: (componentName: string, duration: number) => void
  isSlowDevice: boolean
  prefersReducedMotion: boolean
  connectionType: string
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(
  undefined
)

export function usePerformance() {
  const context = useContext(PerformanceContext)
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider')
  }
  return context
}

interface PerformanceProviderProps {
  children: React.ReactNode
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
  })

  const [isSlowDevice, setIsSlowDevice] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [connectionType, setConnectionType] = useState('unknown')

  // Track web vitals
  useWebVitals()

  // Detect device capabilities
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check for slow device indicators
    const checkDeviceSpeed = () => {
      const canvas = document.createElement('canvas')
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl')

      let isSlowDevice = false

      // Check hardware concurrency (CPU cores)
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
        isSlowDevice = true
      }

      // Check WebGL renderer (GPU info)
      if (gl && 'getExtension' in gl && 'getParameter' in gl) {
        const webglContext = gl as WebGLRenderingContext
        const debugInfo = webglContext.getExtension('WEBGL_debug_renderer_info')
        if (debugInfo) {
          const renderer = webglContext.getParameter(
            debugInfo.UNMASKED_RENDERER_WEBGL
          )
          // Basic check for integrated graphics
          if (renderer && renderer.toLowerCase().includes('intel')) {
            isSlowDevice = true
          }
        }
      }

      // Check device memory if available
      if ('deviceMemory' in navigator && (navigator as any).deviceMemory < 4) {
        isSlowDevice = true
      }

      setIsSlowDevice(isSlowDevice)
    }

    // Check reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)

    // Check connection type
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      setConnectionType(connection.effectiveType || 'unknown')

      const updateConnection = () => {
        setConnectionType(connection.effectiveType || 'unknown')
      }

      connection.addEventListener('change', updateConnection)
    }

    checkDeviceSpeed()

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // Track memory usage periodically
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024, // MB
        }))
      }
    }

    const interval = setInterval(updateMemoryUsage, 30000) // Every 30 seconds
    updateMemoryUsage() // Initial update

    return () => clearInterval(interval)
  }, [])

  const trackRender = useCallback((componentName: string, duration: number) => {
    setMetrics(prev => {
      const newRenderCount = prev.renderCount + 1
      const newAverageRenderTime =
        (prev.averageRenderTime * prev.renderCount + duration) / newRenderCount

      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && duration > 16) {
        console.warn(
          `Slow render detected: ${componentName} took ${duration.toFixed(2)}ms`
        )
      }

      return {
        ...prev,
        renderCount: newRenderCount,
        lastRenderTime: duration,
        averageRenderTime: newAverageRenderTime,
      }
    })
  }, [])

  const contextValue: PerformanceContextType = {
    metrics,
    trackRender,
    isSlowDevice,
    prefersReducedMotion,
    connectionType,
  }

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  )
}

/**
 * HOC for tracking component render performance
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const TrackedComponent = React.forwardRef<any, P>((props, ref) => {
    const { trackRender } = usePerformance()
    const renderStart = React.useRef<number>()

    // Start timing before render
    renderStart.current = performance.now()

    React.useEffect(() => {
      // End timing after render
      if (renderStart.current) {
        const duration = performance.now() - renderStart.current
        trackRender(
          componentName || Component.displayName || Component.name || 'Unknown',
          duration
        )
      }
    })

    return <Component {...props} ref={ref} />
  })

  TrackedComponent.displayName = `withPerformanceTracking(${componentName || Component.displayName || Component.name})`

  return TrackedComponent
}

/**
 * Hook for conditional rendering based on performance
 */
export function usePerformanceOptimization() {
  const { isSlowDevice, prefersReducedMotion, connectionType } =
    usePerformance()

  const shouldReduceAnimations = prefersReducedMotion || isSlowDevice
  const shouldReduceImages =
    connectionType === 'slow-2g' || connectionType === '2g'
  const shouldVirtualizeList = isSlowDevice
  const shouldLazyLoad = isSlowDevice || shouldReduceImages

  return {
    shouldReduceAnimations,
    shouldReduceImages,
    shouldVirtualizeList,
    shouldLazyLoad,
    isSlowDevice,
    prefersReducedMotion,
    connectionType,
  }
}

/**
 * Performance monitoring component
 */
export function PerformanceMonitor() {
  const { metrics } = usePerformance()

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className='fixed bottom-4 left-4 bg-black/80 text-white text-xs p-2 rounded font-mono z-50'>
      <div>Renders: {metrics.renderCount}</div>
      <div>Last: {metrics.lastRenderTime.toFixed(1)}ms</div>
      <div>Avg: {metrics.averageRenderTime.toFixed(1)}ms</div>
      {metrics.memoryUsage && (
        <div>Memory: {metrics.memoryUsage.toFixed(1)}MB</div>
      )}
    </div>
  )
}
