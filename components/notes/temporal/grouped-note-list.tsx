'use client'

import { useMemo, useCallback, memo } from 'react'
import { TimeSection } from './time-section'
import { SectionSkeleton } from './section-skeleton'
import { cn } from '@/lib/utils'
import { SearchIcon, InboxIcon } from 'lucide-react'
import type { GroupedNotesResponse, TimeGroup } from '@/types/temporal'

interface GroupedNoteListProps {
  data?: GroupedNotesResponse
  onRescue?: (noteId: string) => Promise<void>
  isLoading?: boolean
  isRescuing?: boolean
  rescuingId?: string
  searchQuery?: string
  onSearchChange?: (query: string) => void
  className?: string
  // Section management
  collapsedSections?: Set<TimeGroup>
  onToggleSection?: (timeGroup: TimeGroup) => void
  // Performance options
  virtualizeThreshold?: number
}

export const GroupedNoteList = memo(function GroupedNoteList({
  data,
  onRescue,
  isLoading = false,
  isRescuing = false,
  rescuingId,
  searchQuery,
  onSearchChange,
  className,
  collapsedSections = new Set(),
  onToggleSection,
  virtualizeThreshold = 100,
}: GroupedNoteListProps) {
  // Calculate total notes across all sections
  const totalNotes = useMemo(() => {
    return (
      data?.sections.reduce((sum, section) => sum + section.totalCount, 0) || 0
    )
  }, [data?.sections])

  // Memoized section visibility state
  const visibleSections = useMemo(() => {
    return (
      data?.sections.map(section => ({
        ...section,
        isExpanded: !collapsedSections.has(section.timeGroup),
      })) || []
    )
  }, [data?.sections, collapsedSections])

  // Handle section toggle
  const handleToggleSection = useCallback(
    (timeGroup: TimeGroup) => {
      onToggleSection?.(timeGroup)
    },
    [onToggleSection]
  )

  // Handle note rescue with optimistic updates
  const handleRescue = useCallback(
    async (noteId: string) => {
      if (!onRescue) return

      try {
        await onRescue(noteId)
      } catch (error) {
        console.error('Failed to rescue note:', error)
      }
    },
    [onRescue]
  )

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('w-full space-y-6', className)}>
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    )
  }

  // Empty state - no notes at all
  if (totalNotes === 0 && !searchQuery) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center',
          className
        )}
      >
        <InboxIcon className='h-12 w-12 text-muted-foreground/40 mb-4' />
        <h3 className='text-lg font-medium text-muted-foreground mb-2'>
          Your thoughts start here
        </h3>
        <p className='text-sm text-muted-foreground/80 max-w-sm'>
          Capture any idea, thought, or reminder. No folders, no categories -
          just pure, frictionless note-taking.
        </p>
      </div>
    )
  }

  // Empty search results
  if (totalNotes === 0 && searchQuery) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center',
          className
        )}
      >
        <SearchIcon className='h-12 w-12 text-muted-foreground/40 mb-4' />
        <h3 className='text-lg font-medium text-muted-foreground mb-2'>
          No notes found
        </h3>
        <p className='text-sm text-muted-foreground/80'>
          Try searching with different keywords
        </p>
        {onSearchChange && (
          <button
            onClick={() => onSearchChange('')}
            className='text-sm text-primary hover:underline mt-2'
          >
            Clear search
          </button>
        )}
      </div>
    )
  }

  // Render grouped sections
  return (
    <div className={cn('w-full space-y-6', className)}>
      {visibleSections.map((section, sectionIndex) => (
        <TimeSection
          key={section.timeGroup}
          section={section}
          onRescue={handleRescue}
          isRescuing={isRescuing}
          {...(rescuingId !== undefined ? { rescuingId } : {})}
          {...(searchQuery !== undefined ? { searchQuery } : {})}
          onToggleSection={handleToggleSection}
          showSectionDivider={sectionIndex < visibleSections.length - 1}
          enableVirtualization={section.totalCount > virtualizeThreshold}
        />
      ))}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && data?.metadata && (
        <div className='p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs text-muted-foreground'>
          <p>Search time: {data.metadata.searchTime}ms</p>
          <p>Total results: {data.metadata.totalResults}</p>
          <p>
            Enhanced search: {data.metadata.usedEnhancedSearch ? 'Yes' : 'No'}
          </p>
          <p>
            Temporal grouping: {data.metadata.temporalGrouping ? 'Yes' : 'No'}
          </p>
          {data.metadata.groupCounts && (
            <p>
              Groups:{' '}
              {Object.entries(data.metadata.groupCounts)
                .filter(([_, count]) => count > 0)
                .map(([group, count]) => `${group}: ${count}`)
                .join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
})
