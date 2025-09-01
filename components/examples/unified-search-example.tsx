'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TemporalCommandPalette } from '@/components/search/temporal-command-palette'
import { useNotesMutations } from '@/hooks/use-notes-mutations'
import { useUnifiedSearch } from '@/hooks/use-unified-search'
import type { UnifiedNoteResult } from '@/types/unified'

/**
 * Example component demonstrating how to use the unified search system
 * This shows both the modern unified approach and legacy compatibility
 */
export function UnifiedSearchExample() {
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Method 1: Use the standalone unified search hook (recommended for new components)
  const unifiedSearch = useUnifiedSearch()

  // Method 2: Use unified functions from the mutations hook (for existing components)
  const {
    unifiedSearch: legacyUnifiedSearch,
    unifiedBrowse: legacyUnifiedBrowse,
    unifiedState: legacyUnifiedState,
  } = useNotesMutations()

  // Handle note selection - support both unified and legacy result types
  const handleNoteSelect = (result: any) => {
    console.log('Selected note:', result)

    // Check if it's a unified result with additional properties
    if ('search_rank' in result && 'time_group' in result) {
      console.log('Search rank:', result.search_rank)
      console.log('Time group:', result.time_group)
      console.log('Group rank:', result.group_rank)
    }

    // Handle note selection (e.g., navigate to note, edit, etc.)
  }

  return (
    <div className='p-6 space-y-6'>
      <div className='space-y-4'>
        <h2 className='text-2xl font-bold'>Unified Search System Examples</h2>
        <p className='text-muted-foreground'>
          Demonstrating the new unified search and browse functionality that
          replaces the previous 4 separate search functions with a single,
          powerful system.
        </p>
      </div>

      {/* Example 1: Standalone Unified Search Hook */}
      <div className='space-y-4 border rounded-lg p-4'>
        <h3 className='text-lg font-semibold'>
          Method 1: Standalone Unified Search Hook
        </h3>
        <p className='text-sm text-muted-foreground'>
          Recommended for new components. Provides full state management with
          useReducer.
        </p>

        <div className='flex gap-2'>
          <Button
            onClick={() => unifiedSearch.search('machine learning')}
            disabled={unifiedSearch.state.isLoading}
          >
            Search &quot;machine learning&quot;
          </Button>
          <Button
            onClick={() => unifiedSearch.browse()}
            disabled={unifiedSearch.state.isLoading}
          >
            Browse All Notes
          </Button>
          <Button variant='outline' onClick={() => unifiedSearch.reset()}>
            Reset
          </Button>
        </div>

        <div className='text-sm space-y-2'>
          <div>
            <strong>Query:</strong> &quot;{unifiedSearch.state.query}&quot;
          </div>
          <div>
            <strong>Mode:</strong> {unifiedSearch.state.mode}
          </div>
          <div>
            <strong>Loading:</strong>{' '}
            {unifiedSearch.state.isLoading ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Results:</strong>{' '}
            {unifiedSearch.state.results
              ? `${unifiedSearch.state.results.totalNotes} notes in ${unifiedSearch.state.results.sections.length} sections`
              : 'None'}
          </div>
          {unifiedSearch.state.results?.metadata && (
            <div>
              <strong>Metadata:</strong>{' '}
              {unifiedSearch.state.results.metadata.searchTime}ms,{' '}
              {unifiedSearch.state.results.metadata.usedEnhancedSearch
                ? 'Enhanced'
                : 'Basic'}{' '}
              search
            </div>
          )}
        </div>
      </div>

      {/* Example 2: Command Palette with Unified Approach */}
      <div className='space-y-4 border rounded-lg p-4'>
        <h3 className='text-lg font-semibold'>
          Method 2: Command Palette (Unified)
        </h3>
        <p className='text-sm text-muted-foreground'>
          Using the TemporalCommandPalette with the new unified functions.
        </p>

        <Button onClick={() => setPaletteOpen(true)}>
          Open Command Palette (Unified)
        </Button>

        <TemporalCommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          onUnifiedSearch={unifiedSearch.search}
          onUnifiedBrowse={unifiedSearch.browse}
          onResultSelect={handleNoteSelect}
        />
      </div>

      {/* Example 3: Legacy Integration */}
      <div className='space-y-4 border rounded-lg p-4'>
        <h3 className='text-lg font-semibold'>Method 3: Legacy Integration</h3>
        <p className='text-sm text-muted-foreground'>
          Using unified functions through the existing useNotesMutations hook
          for backward compatibility.
        </p>

        <div className='flex gap-2'>
          <Button onClick={() => legacyUnifiedSearch('typescript')}>
            Search &quot;typescript&quot;
          </Button>
          <Button onClick={() => legacyUnifiedBrowse()}>
            Browse All Notes
          </Button>
        </div>

        <div className='text-sm'>
          <strong>State:</strong> {JSON.stringify(legacyUnifiedState, null, 2)}
        </div>
      </div>

      {/* Migration Information */}
      <div className='space-y-4 border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20'>
        <h3 className='text-lg font-semibold'>Migration Guide</h3>
        <div className='space-y-3 text-sm'>
          <div>
            <strong>Before (4 separate functions):</strong>
            <ul className='list-disc list-inside mt-1 space-y-1 text-muted-foreground'>
              <li>
                <code>searchNotes(query)</code> - Basic search
              </li>
              <li>
                <code>searchNotesEnhanced(query)</code> - Enhanced search with
                highlighting
              </li>
              <li>
                <code>searchNotesGrouped(query)</code> - Search with temporal
                grouping
              </li>
              <li>
                <code>getNotesGrouped()</code> - Browse with temporal grouping
              </li>
            </ul>
          </div>

          <div>
            <strong>After (1 unified system):</strong>
            <ul className='list-disc list-inside mt-1 space-y-1 text-muted-foreground'>
              <li>
                <code>unifiedSearch.search(query)</code> - Handles both basic
                and enhanced search
              </li>
              <li>
                <code>unifiedSearch.browse()</code> - Handles browsing with
                temporal grouping
              </li>
              <li>
                All operations use the same <code>get_notes_unified</code>{' '}
                database function
              </li>
              <li>State management with useReducer for predictable updates</li>
            </ul>
          </div>

          <div>
            <strong>Benefits:</strong>
            <ul className='list-disc list-inside mt-1 space-y-1 text-muted-foreground'>
              <li>Single database function instead of 3</li>
              <li>Consistent result format with UnifiedNoteResult</li>
              <li>Better error handling and fallback logic</li>
              <li>Improved performance with optimized queries</li>
              <li>Predictable state management with useReducer</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UnifiedSearchExample
