'use client'

import { createClient } from '@/lib/supabase/client'
import { useAnalytics } from '@/hooks/use-analytics'

export interface BetaUser {
  id: string
  user_id: string
  invitation_code: string | null
  status: 'invited' | 'active' | 'inactive' | 'expired'
  invited_at: string
  accepted_at: string | null
  expires_at: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface BetaFeedback {
  id: string
  user_id: string
  type: 'general' | 'bug' | 'feature_request' | 'improvement'
  content: string
  rating: number | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export class BetaManager {
  private supabase = createClient()

  /**
   * Check if user is a beta user
   */
  async isBetaUser(userId?: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc(
        'is_beta_user',
        userId ? { user_uuid: userId } : undefined
      )

      if (error) throw error
      return data === true
    } catch (error) {
      console.error('Error checking beta status:', error)
      return false
    }
  }

  /**
   * Get beta user information
   */
  async getBetaUser(userId?: string): Promise<BetaUser | null> {
    try {
      const targetUserId =
        userId || (await this.supabase.auth.getUser()).data.user?.id

      if (!targetUserId) {
        throw new Error('No user ID available')
      }

      const { data, error } = await this.supabase
        .from('beta_users')
        .select('*')
        .eq('user_id', targetUserId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data as BetaUser | null
    } catch (error) {
      console.error('Error fetching beta user:', error)
      return null
    }
  }

  /**
   * Accept beta invitation
   */
  async acceptInvitation(
    invitationCode: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc(
        'accept_beta_invitation',
        { invitation_code: invitationCode }
      )

      if (error) throw error

      const result = data as { success: boolean; error?: string }
      return result
    } catch (error) {
      console.error('Error accepting invitation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Submit beta feedback
   */
  async submitFeedback(feedback: {
    type: BetaFeedback['type']
    content: string
    rating?: number
    metadata?: Record<string, any>
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: user } = await this.supabase.auth.getUser()
      if (!user.user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { error } = await this.supabase.from('beta_feedback').insert({
        user_id: user.user.id,
        type: feedback.type,
        content: feedback.content,
        rating: feedback.rating || null,
        metadata: feedback.metadata || {},
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get user's feedback history
   */
  async getFeedbackHistory(): Promise<BetaFeedback[]> {
    try {
      const { data: user } = await this.supabase.auth.getUser()
      if (!user.user) return []

      const { data, error } = await this.supabase
        .from('beta_feedback')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as BetaFeedback[]
    } catch (error) {
      console.error('Error fetching feedback history:', error)
      return []
    }
  }

  /**
   * Track feature flag usage
   */
  async trackFeatureFlagUsage(
    flagName: string,
    enabled: boolean,
    variant?: string
  ): Promise<void> {
    try {
      const { data: user } = await this.supabase.auth.getUser()
      if (!user.user) return

      await this.supabase.from('feature_flags_usage').upsert(
        {
          user_id: user.user.id,
          flag_name: flagName,
          enabled,
          variant: variant || null,
          metadata: {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
          },
        },
        {
          onConflict: 'user_id,flag_name,created_at',
          ignoreDuplicates: true,
        }
      )
    } catch (error) {
      console.error('Error tracking feature flag usage:', error)
    }
  }
}
