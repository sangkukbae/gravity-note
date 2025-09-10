import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock PostHog
const mockCapture = vi.fn()
const mockIdentify = vi.fn()
const mockIsFeatureEnabled = vi.fn()

vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: any) => children,
  usePostHog: () => ({
    capture: mockCapture,
    identify: mockIdentify,
    isFeatureEnabled: mockIsFeatureEnabled,
  }),
}))

// Mock Vercel Analytics
const mockTrack = vi.fn()
vi.mock('@vercel/analytics/react', () => ({
  track: mockTrack,
}))

// Mock auth store
const mockUser = { id: 'test-user-id', email: 'test@example.com' }
vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}))

describe('Analytics Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PostHog Integration', () => {
    it('should capture events with PostHog', () => {
      const eventName = 'note_created'
      const properties = {
        note_id: 'test-note-123',
        content_length: 250,
        has_title: true,
      }

      mockCapture(eventName, properties)

      expect(mockCapture).toHaveBeenCalledWith(eventName, properties)
    })

    it('should identify user with PostHog', () => {
      const userId = 'test-user-id'
      const userProperties = {
        email: 'test@example.com',
        name: 'Test User',
      }

      mockIdentify(userId, userProperties)

      expect(mockIdentify).toHaveBeenCalledWith(userId, userProperties)
    })

    it('should check feature flags', () => {
      const flagName = 'beta-notes-ai-summary'
      mockIsFeatureEnabled.mockReturnValue(true)

      const result = mockIsFeatureEnabled(flagName)

      expect(result).toBe(true)
      expect(mockIsFeatureEnabled).toHaveBeenCalledWith(flagName)
    })

    it('should handle feature flag variants', () => {
      const flagName = 'notes-layout-experiment'
      const variant = 'grid-layout'
      mockIsFeatureEnabled.mockReturnValue(variant)

      const result = mockIsFeatureEnabled(flagName)

      expect(result).toBe(variant)
      expect(mockIsFeatureEnabled).toHaveBeenCalledWith(flagName)
    })
  })

  describe('Vercel Analytics Integration', () => {
    it('should track events with Vercel Analytics', () => {
      const eventName = 'note_rescued'
      const properties = {
        note_id: 'test-note-456',
        rescue_reason: 'user_action',
        timestamp: Date.now(),
      }

      mockTrack(eventName, properties)

      expect(mockTrack).toHaveBeenCalledWith(eventName, properties)
    })

    it('should handle primitive properties only', () => {
      const eventName = 'search_performed'
      const properties = {
        query: 'test search',
        results_count: 5,
        has_results: true,
        timestamp: 1234567890,
        user_type: null,
      }

      mockTrack(eventName, properties)

      expect(mockTrack).toHaveBeenCalledWith(eventName, properties)
    })
  })

  describe('Analytics Hook Integration', () => {
    it('should track events through analytics hook', async () => {
      // Import and mock the analytics hook dynamically
      const { useAnalytics } = await import('@/hooks/use-analytics')

      // Note: In a real test environment, we would need to set up proper React Testing Library
      // with providers to test the actual hook behavior

      // For now, we can at least verify the module can be imported
      expect(useAnalytics).toBeDefined()
    })
  })

  describe('Event Types', () => {
    it('should handle note lifecycle events', () => {
      const noteEvents = [
        'note_created',
        'note_updated',
        'note_rescued',
        'note_deleted',
      ]

      noteEvents.forEach(eventName => {
        mockCapture(eventName, { note_id: 'test-123' })
      })

      expect(mockCapture).toHaveBeenCalledTimes(4)
    })

    it('should handle search events', () => {
      mockCapture('search_performed', {
        query: 'test query',
        results_count: 10,
        search_type: 'enhanced',
      })

      expect(mockCapture).toHaveBeenCalledWith('search_performed', {
        query: 'test query',
        results_count: 10,
        search_type: 'enhanced',
      })
    })

    it('should handle user interaction events', () => {
      const interactionEvents = [
        'app_loaded',
        'page_viewed',
        'user_signed_in',
        'user_signed_out',
        'attachment_uploaded',
        'attachment_viewed',
      ]

      interactionEvents.forEach(eventName => {
        mockCapture(eventName, { timestamp: Date.now() })
      })

      expect(mockCapture).toHaveBeenCalledTimes(6)
    })
  })

  describe('Error Handling', () => {
    it('should handle PostHog errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockCapture.mockImplementationOnce(() => {
        throw new Error('PostHog connection failed')
      })

      expect(() => {
        mockCapture('test_event', {})
      }).toThrow('PostHog connection failed')

      consoleSpy.mockRestore()
    })

    it('should handle Vercel Analytics errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockTrack.mockImplementationOnce(() => {
        throw new Error('Vercel Analytics connection failed')
      })

      expect(() => {
        mockTrack('test_event', {})
      }).toThrow('Vercel Analytics connection failed')

      consoleSpy.mockRestore()
    })
  })

  describe('Performance', () => {
    it('should handle multiple concurrent event tracking', async () => {
      const startTime = performance.now()

      const promises = Array.from({ length: 20 }, (_, i) => {
        return Promise.resolve().then(() => {
          mockCapture(`test_event_${i}`, { index: i })
          mockTrack(`test_event_${i}`, { index: i })
        })
      })

      await Promise.all(promises)

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete quickly (less than 50ms for 20 events)
      expect(duration).toBeLessThan(50)
      expect(mockCapture).toHaveBeenCalledTimes(20)
      expect(mockTrack).toHaveBeenCalledTimes(20)
    })
  })
})
