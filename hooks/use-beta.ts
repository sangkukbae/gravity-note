'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BetaManager } from '@/lib/beta/beta-manager'
import { useAuthStore } from '@/lib/stores/auth'
import { useAnalytics } from './use-analytics'
import { toast } from 'sonner'
import { useCallback } from 'react'

const betaManager = new BetaManager()

export function useBeta() {
  const { user } = useAuthStore()
  const { identifyUser, trackBetaAction } = useAnalytics()
  const queryClient = useQueryClient()

  // Check if user is beta user
  const { data: isBetaUser, isLoading: isBetaLoading } = useQuery({
    queryKey: ['beta-user-status', user?.id],
    queryFn: () => betaManager.isBetaUser(user?.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Get beta user details
  const { data: betaUserDetails } = useQuery({
    queryKey: ['beta-user-details', user?.id],
    queryFn: () => betaManager.getBetaUser(user?.id),
    enabled: !!user?.id && isBetaUser === true,
  })

  // Get feedback history
  const { data: feedbackHistory } = useQuery({
    queryKey: ['beta-feedback-history', user?.id],
    queryFn: () => betaManager.getFeedbackHistory(),
    enabled: !!user?.id && isBetaUser === true,
  })

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: (invitationCode: string) =>
      betaManager.acceptInvitation(invitationCode),
    onSuccess: result => {
      if (result.success) {
        toast.success('Welcome to Gravity Note Beta! 🎉')

        // Update user properties in PostHog
        identifyUser({ is_beta_user: true })

        // Track beta enrollment
        trackBetaAction('invitation_accepted')

        // Refresh queries
        queryClient.invalidateQueries({ queryKey: ['beta-user-status'] })
        queryClient.invalidateQueries({ queryKey: ['beta-user-details'] })
      } else {
        toast.error(result.error || 'Failed to accept invitation')
      }
    },
    onError: error => {
      toast.error('Failed to accept invitation')
      console.error('Accept invitation error:', error)
    },
  })

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: (feedback: {
      type: 'general' | 'bug' | 'feature_request' | 'improvement'
      content: string
      rating?: number
      metadata?: Record<string, any>
    }) => betaManager.submitFeedback(feedback),
    onSuccess: result => {
      if (result.success) {
        toast.success('Thank you for your feedback! 🙏')
        trackBetaAction('feedback_submitted', { type: 'feedback' })

        // Refresh feedback history
        queryClient.invalidateQueries({ queryKey: ['beta-feedback-history'] })
      } else {
        toast.error(result.error || 'Failed to submit feedback')
      }
    },
    onError: error => {
      toast.error('Failed to submit feedback')
      console.error('Submit feedback error:', error)
    },
  })

  // Track feature flag usage
  const trackFeatureUsage = useCallback(
    async (flagName: string, enabled: boolean, variant?: string) => {
      try {
        await betaManager.trackFeatureFlagUsage(flagName, enabled, variant)
        trackBetaAction('feature_flag_used', {
          flag: flagName,
          enabled,
          variant,
        })
      } catch (error) {
        console.error('Error tracking feature usage:', error)
      }
    },
    [trackBetaAction]
  )

  return {
    // State
    isBetaUser: isBetaUser === true,
    isBetaLoading,
    betaUserDetails,
    feedbackHistory,

    // Actions
    acceptInvitation: acceptInvitationMutation.mutate,
    isAcceptingInvitation: acceptInvitationMutation.isPending,

    submitFeedback: submitFeedbackMutation.mutate,
    isSubmittingFeedback: submitFeedbackMutation.isPending,

    trackFeatureUsage,
  }
}
