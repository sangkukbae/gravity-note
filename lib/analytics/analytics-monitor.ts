'use client'

export interface AnalyticsHealth {
  posthog: {
    available: boolean
    initialized: boolean
    lastError?: string | null
    lastCheck: number
  }
  realtime: {
    connected: boolean
    lastError?: string | null
    reconnectAttempts: number
    lastCheck: number
  }
}

class AnalyticsMonitor {
  private static instance: AnalyticsMonitor
  private health: AnalyticsHealth
  private listeners: Array<(health: AnalyticsHealth) => void> = []
  private checkInterval: NodeJS.Timeout | null = null

  constructor() {
    this.health = {
      posthog: {
        available: false,
        initialized: false,
        lastCheck: Date.now(),
      },
      realtime: {
        connected: false,
        reconnectAttempts: 0,
        lastCheck: Date.now(),
      },
    }
  }

  static getInstance(): AnalyticsMonitor {
    if (!AnalyticsMonitor.instance) {
      AnalyticsMonitor.instance = new AnalyticsMonitor()
    }
    return AnalyticsMonitor.instance
  }

  /**
   * Start monitoring analytics health
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    this.checkInterval = setInterval(() => {
      this.performHealthCheck()
    }, intervalMs)

    // Initial check
    this.performHealthCheck()
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Update PostHog health status
   */
  updatePostHogHealth(status: Partial<typeof this.health.posthog>): void {
    this.health.posthog = {
      ...this.health.posthog,
      ...status,
      lastCheck: Date.now(),
    }
    this.notifyListeners()
  }

  /**
   * Update realtime health status
   */
  updateRealtimeHealth(status: Partial<typeof this.health.realtime>): void {
    this.health.realtime = {
      ...this.health.realtime,
      ...status,
      lastCheck: Date.now(),
    }
    this.notifyListeners()
  }

  /**
   * Get current health status
   */
  getHealth(): AnalyticsHealth {
    return { ...this.health }
  }

  /**
   * Subscribe to health updates
   */
  subscribe(listener: (health: AnalyticsHealth) => void): () => void {
    this.listeners.push(listener)

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    await Promise.allSettled([
      this.checkPostHogHealth(),
      this.checkRealtimeHealth(),
    ])
  }

  /**
   * Check PostHog health
   */
  private async checkPostHogHealth(): Promise<void> {
    try {
      // Check if PostHog is available globally
      const posthog = (window as any).posthog

      if (!posthog) {
        this.updatePostHogHealth({
          available: false,
          initialized: false,
          lastError: 'PostHog not found on window object',
        })
        return
      }

      // Check if PostHog is initialized
      const isInitialized = posthog.__loaded || posthog._loaded

      this.updatePostHogHealth({
        available: true,
        initialized: isInitialized,
        lastError: null,
      })
    } catch (error) {
      this.updatePostHogHealth({
        available: false,
        initialized: false,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Check realtime connection health
   */
  private async checkRealtimeHealth(): Promise<void> {
    try {
      // This would need to be integrated with your realtime manager
      // For now, we'll just check if the connection appears active
      const realtimeManager = (window as any).__realtimeNotesManager

      if (!realtimeManager) {
        this.updateRealtimeHealth({
          connected: false,
          lastError: 'Realtime manager not available',
        })
        return
      }

      const status = realtimeManager.getConnectionStatus?.()

      this.updateRealtimeHealth({
        connected: status?.isConnected || false,
        lastError: status?.isConnected ? null : 'Not connected',
      })
    } catch (error) {
      this.updateRealtimeHealth({
        connected: false,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Notify all listeners of health changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.health })
      } catch (error) {
        console.warn('[Analytics Monitor] Listener error:', error)
      }
    })
  }

  /**
   * Generate a health report for debugging
   */
  generateReport(): string {
    const report = [
      `[Analytics] Health @ ${new Date().toISOString()}`,
      `PostHog: ${this.health.posthog.available ? 'OK' : 'DOWN'}, Init: ${this.health.posthog.initialized ? 'Y' : 'N'}, Err: ${this.health.posthog.lastError || '-'}`,
      `Realtime: ${this.health.realtime.connected ? 'OK' : 'DOWN'}, Retry: ${this.health.realtime.reconnectAttempts}, Err: ${this.health.realtime.lastError || '-'}`,
    ]

    return report.join('\n')
  }
}

// Export singleton instance
export const analyticsMonitor = AnalyticsMonitor.getInstance()

// Global access for debugging
if (typeof window !== 'undefined') {
  ;(window as any).__analyticsMonitor = analyticsMonitor
}
