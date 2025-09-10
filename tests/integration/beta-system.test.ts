import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BetaManager } from '@/lib/beta/beta-manager'

// Mock Supabase client
const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

const mockSupabase = {
  rpc: mockRpc,
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

describe('Beta System Integration', () => {
  let betaManager: BetaManager

  beforeEach(() => {
    vi.clearAllMocks()
    betaManager = new BetaManager()

    // Default mock implementations
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    })
  })

  describe('Beta User Status', () => {
    it('should check if user is beta user with user ID', async () => {
      mockRpc.mockResolvedValue({
        data: true,
        error: null,
      })

      const result = await betaManager.isBetaUser('test-user-id')

      expect(result).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('is_beta_user', {
        user_uuid: 'test-user-id',
      })
    })

    it('should check if user is beta user without user ID (using default)', async () => {
      mockRpc.mockResolvedValue({
        data: false,
        error: null,
      })

      const result = await betaManager.isBetaUser()

      expect(result).toBe(false)
      expect(mockRpc).toHaveBeenCalledWith('is_beta_user', undefined)
    })

    it('should handle RPC errors gracefully', async () => {
      mockRpc.mockRejectedValue(new Error('Database connection failed'))

      const result = await betaManager.isBetaUser('test-user-id')

      expect(result).toBe(false) // Should default to false on error
    })

    it('should get beta user information', async () => {
      const mockBetaUser = {
        id: 'beta-user-id',
        user_id: 'test-user-id',
        invitation_code: 'beta_abc123',
        status: 'active',
        invited_at: '2024-01-01T00:00:00Z',
        accepted_at: '2024-01-02T00:00:00Z',
        expires_at: null,
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBetaUser,
            error: null,
          }),
        }),
      })

      mockFrom.mockReturnValue({
        select: mockSelect,
      })

      const result = await betaManager.getBetaUser('test-user-id')

      expect(result).toEqual(mockBetaUser)
      expect(mockFrom).toHaveBeenCalledWith('beta_users')
    })
  })

  describe('Beta Invitation', () => {
    it('should accept beta invitation successfully', async () => {
      const invitationCode = 'beta_test123'

      mockRpc.mockResolvedValue({
        data: { success: true, user_id: 'test-user-id' },
        error: null,
      })

      const result = await betaManager.acceptInvitation(invitationCode)

      expect(result.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('accept_beta_invitation', {
        invitation_code: invitationCode,
      })
    })

    it('should handle invalid invitation code', async () => {
      const invitationCode = 'invalid_code'

      mockRpc.mockResolvedValue({
        data: { success: false, error: 'Invalid or expired invitation code' },
        error: null,
      })

      const result = await betaManager.acceptInvitation(invitationCode)

      expect(result).toEqual({
        success: false,
        error: 'Invalid or expired invitation code',
      })
    })

    it('should handle RPC errors during invitation acceptance', async () => {
      const invitationCode = 'error_code'

      mockRpc.mockRejectedValue(new Error('Network error'))

      const result = await betaManager.acceptInvitation(invitationCode)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('Beta Feedback', () => {
    it('should submit feedback successfully', async () => {
      const feedback = {
        type: 'improvement' as const,
        content: 'The search feature could be faster',
        rating: 4,
        metadata: { source: 'main_app' },
      }

      const mockInsert = vi.fn().mockResolvedValue({
        error: null,
      })

      mockFrom.mockReturnValue({
        insert: mockInsert,
      })

      const result = await betaManager.submitFeedback(feedback)

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('beta_feedback')
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        type: feedback.type,
        content: feedback.content,
        rating: feedback.rating,
        metadata: feedback.metadata,
      })
    })

    it('should handle unauthenticated user', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      })

      const feedback = {
        type: 'bug' as const,
        content: 'Found a bug',
      }

      const result = await betaManager.submitFeedback(feedback)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('should get feedback history', async () => {
      const mockFeedback = [
        {
          id: '1',
          user_id: 'test-user-id',
          type: 'improvement',
          content: 'Great app!',
          rating: 5,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockFeedback,
        error: null,
      })

      const mockEq = vi.fn().mockReturnValue({
        order: mockOrder,
      })

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      })

      mockFrom.mockReturnValue({
        select: mockSelect,
      })

      const result = await betaManager.getFeedbackHistory()

      expect(result).toEqual(mockFeedback)
      expect(mockFrom).toHaveBeenCalledWith('beta_feedback')
    })
  })

  describe('Feature Flag Usage Tracking', () => {
    it('should track feature flag usage', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({
        error: null,
      })

      mockFrom.mockReturnValue({
        upsert: mockUpsert,
      })

      await betaManager.trackFeatureFlagUsage('ai-summary', true, 'enabled')

      expect(mockFrom).toHaveBeenCalledWith('feature_flags_usage')
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: 'test-user-id',
          flag_name: 'ai-summary',
          enabled: true,
          variant: 'enabled',
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            user_agent: expect.any(String),
          }),
        },
        {
          onConflict: 'user_id,flag_name,created_at',
          ignoreDuplicates: true,
        }
      )
    })

    it('should handle unauthenticated user for flag tracking', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      })

      // Should not throw error, just return silently
      await expect(
        betaManager.trackFeatureFlagUsage('test-flag', true)
      ).resolves.not.toThrow()
    })

    it('should handle tracking errors gracefully', async () => {
      const mockUpsert = vi.fn().mockRejectedValue(new Error('DB error'))

      mockFrom.mockReturnValue({
        upsert: mockUpsert,
      })

      // Should not throw error, just log and continue
      await expect(
        betaManager.trackFeatureFlagUsage('test-flag', true)
      ).resolves.not.toThrow()
    })
  })
})
