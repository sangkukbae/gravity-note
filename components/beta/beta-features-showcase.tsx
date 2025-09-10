'use client'

import {
  FeatureGate,
  BetaBadge,
  ExperimentalFeature,
} from '@/components/feature-flags/feature-gate'
import { useFeatureFlag } from '@/hooks/use-feature-flags'
import { useBeta } from '@/hooks/use-beta'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lightbulb, Search, Zap, Users } from 'lucide-react'

export function BetaFeaturesShowcase() {
  const { isBetaUser } = useBeta()
  const betaAccessEnabled = useFeatureFlag('beta-access-enabled')
  const advancedSearchV2 = useFeatureFlag('advanced-search-v2')
  const aiNoteAssistant = useFeatureFlag('ai-note-assistant')

  if (!isBetaUser || !betaAccessEnabled) {
    return null
  }

  return (
    <div className='space-y-4 p-4 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50/30'>
      <div className='flex items-center gap-2'>
        <Users className='h-5 w-5 text-blue-600' />
        <h3 className='text-lg font-semibold text-blue-900'>Beta Features</h3>
        <BetaBadge />
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <FeatureGate flag='advanced-search-v2' betaOnly>
          <ExperimentalFeature
            flag='advanced-search-v2'
            name='Advanced Search V2'
            description='Enhanced search with AI-powered suggestions and semantic matching'
          >
            <Card className='border-green-200'>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-sm'>
                  <Search className='h-4 w-4' />
                  Advanced Search V2
                  <BetaBadge className='ml-auto' />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-600 mb-3'>
                  Enhanced search with AI suggestions, semantic matching, and
                  smart filters
                </p>
                <Button size='sm' variant='outline' disabled>
                  Try Advanced Search
                </Button>
                {advancedSearchV2 && (
                  <div className='mt-2 text-xs text-green-600'>
                    ✅ Feature enabled for your account
                  </div>
                )}
              </CardContent>
            </Card>
          </ExperimentalFeature>
        </FeatureGate>

        <FeatureGate flag='ai-note-assistant' betaOnly>
          <ExperimentalFeature
            flag='ai-note-assistant'
            name='AI Note Assistant'
            description='Smart note completion and categorization powered by AI'
          >
            <Card className='border-purple-200'>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-sm'>
                  <Zap className='h-4 w-4' />
                  AI Note Assistant
                  <BetaBadge className='ml-auto' />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-600 mb-3'>
                  AI-powered suggestions, auto-completion, and smart note
                  organization
                </p>
                <Button size='sm' variant='outline' disabled>
                  Enable AI Assistant
                </Button>
                {aiNoteAssistant && (
                  <div className='mt-2 text-xs text-green-600'>
                    ✅ Feature enabled for your account
                  </div>
                )}
              </CardContent>
            </Card>
          </ExperimentalFeature>
        </FeatureGate>

        {/* Always show this for beta users */}
        <Card className='border-blue-200'>
          <CardHeader className='pb-2'>
            <CardTitle className='flex items-center gap-2 text-sm'>
              <Lightbulb className='h-4 w-4' />
              Beta Feedback Hub
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600 mb-3'>
              Share your thoughts and help us improve Gravity Note
            </p>
            <Button size='sm' variant='outline'>
              Give Feedback
            </Button>
          </CardContent>
        </Card>

        <Card className='border-gray-200'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm'>Feature Flags Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-1 text-xs'>
              <div className='flex justify-between'>
                <span>Beta Access:</span>
                <span
                  className={
                    betaAccessEnabled ? 'text-green-600' : 'text-red-600'
                  }
                >
                  {betaAccessEnabled ? '✅ ON' : '❌ OFF'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>Advanced Search:</span>
                <span
                  className={
                    advancedSearchV2 ? 'text-green-600' : 'text-yellow-600'
                  }
                >
                  {advancedSearchV2 ? '✅ ON' : '⏳ OFF'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>AI Assistant:</span>
                <span
                  className={
                    aiNoteAssistant ? 'text-green-600' : 'text-yellow-600'
                  }
                >
                  {aiNoteAssistant ? '✅ ON' : '⏳ OFF'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className='text-xs text-gray-500 bg-gray-100 p-2 rounded'>
          <strong>Dev Info:</strong> Beta user status:{' '}
          {isBetaUser ? 'Active' : 'Inactive'} | Feature flags refreshed from
          PostHog
        </div>
      )}
    </div>
  )
}
