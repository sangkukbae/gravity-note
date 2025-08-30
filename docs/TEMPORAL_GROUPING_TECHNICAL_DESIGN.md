# Temporal Grouping Technical Design Document

## Executive Summary

This document outlines the technical implementation strategy for adding temporal grouping functionality to Gravity Note's search and browse interface. The design introduces time-based organization (Yesterday, Last Week, Last 30 Days, Earlier) while maintaining the app's minimalist philosophy and high-performance architecture.

## 1. Architecture Overview

### 1.1 Current Architecture Analysis

**Existing Components:**

- **Data Layer**: Supabase PostgreSQL with enhanced full-text search via `search_notes_enhanced` function
- **API Layer**: React Query for caching and state management, custom hooks in `use-notes-mutations.ts`
- **UI Layer**: `NotesContainer`, `NoteList`, and `NoteItem` components with real-time updates
- **Search System**: Two-tier approach (enhanced PostgreSQL FTS + ILIKE fallback)

**Integration Points:**

- Temporal grouping will integrate at the data transformation layer between Supabase responses and UI rendering
- Search functionality will be enhanced to return grouped results while maintaining existing caching strategies
- Real-time updates will need to properly categorize incoming notes into time groups

### 1.2 Temporal Grouping Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Database      │    │   API Layer      │    │   UI Layer          │
│                 │    │                  │    │                     │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────────┐ │
│ │ PostgreSQL  │ │───▶│ │ Temporal     │ │───▶│ │ GroupedNoteList │ │
│ │ Full-text   │ │    │ │ Aggregation  │ │    │ │                 │ │
│ │ Search      │ │    │ │ Service      │ │    │ │ ┌─────────────┐ │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ │ │TimeSection  │ │ │
│                 │    │                  │    │ │ │- Yesterday  │ │ │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ │ │- Last Week  │ │ │
│ │ Real-time   │ │───▶│ │ React Query  │ │───▶│ │ │- Last Month │ │ │
│ │ Updates     │ │    │ │ Cache        │ │    │ │ │- Earlier    │ │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │ │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## 2. Database Layer Design

### 2.1 Enhanced Search Function Modifications

The current `search_notes_enhanced` function will be extended to support temporal grouping:

```sql
-- New enhanced search function with temporal grouping
CREATE OR REPLACE FUNCTION search_notes_enhanced_grouped(
  user_uuid UUID,
  search_query TEXT,
  max_results INTEGER DEFAULT 200,
  include_temporal_data BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  highlighted_content TEXT,
  highlighted_title TEXT,
  search_rank REAL,
  time_group TEXT,
  group_rank INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  today_start TIMESTAMPTZ;
  yesterday_start TIMESTAMPTZ;
  week_start TIMESTAMPTZ;
  month_start TIMESTAMPTZ;
BEGIN
  -- Calculate temporal boundaries
  today_start := date_trunc('day', NOW());
  yesterday_start := today_start - INTERVAL '1 day';
  week_start := today_start - INTERVAL '7 days';
  month_start := today_start - INTERVAL '30 days';

  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.content,
    n.created_at,
    n.updated_at,
    -- Enhanced highlighting for content
    ts_headline(
      'english',
      COALESCE(n.content, ''),
      plainto_tsquery('english', search_query),
      'StartSel=<mark class="search-highlight">, StopSel=</mark>, MaxWords=50, MinWords=10, MaxFragments=3'
    ) as highlighted_content,
    -- Enhanced highlighting for title
    CASE
      WHEN n.title IS NOT NULL AND n.title != '' THEN
        ts_headline(
          'english',
          n.title,
          plainto_tsquery('english', search_query),
          'StartSel=<mark class="search-highlight">, StopSel=</mark>'
        )
      ELSE NULL
    END as highlighted_title,
    -- Search ranking
    (
      ts_rank_cd(
        to_tsvector('english', COALESCE(n.title, '')),
        plainto_tsquery('english', search_query)
      ) * 2.0 +
      ts_rank_cd(
        to_tsvector('english', COALESCE(n.content, '')),
        plainto_tsquery('english', search_query)
      )
    ) as search_rank,
    -- Temporal group assignment
    CASE
      WHEN n.updated_at >= today_start THEN 'today'
      WHEN n.updated_at >= yesterday_start THEN 'yesterday'
      WHEN n.updated_at >= week_start THEN 'last_week'
      WHEN n.updated_at >= month_start THEN 'last_month'
      ELSE 'earlier'
    END as time_group,
    -- Group ranking for consistent ordering within groups
    ROW_NUMBER() OVER (
      PARTITION BY (
        CASE
          WHEN n.updated_at >= today_start THEN 1
          WHEN n.updated_at >= yesterday_start THEN 2
          WHEN n.updated_at >= week_start THEN 3
          WHEN n.updated_at >= month_start THEN 4
          ELSE 5
        END
      )
      ORDER BY search_rank DESC, n.updated_at DESC
    )::INTEGER as group_rank
  FROM notes n
  WHERE
    n.user_id = user_uuid
    AND (
      to_tsvector('english', COALESCE(n.title, '')) @@ plainto_tsquery('english', search_query)
      OR
      to_tsvector('english', COALESCE(n.content, '')) @@ plainto_tsquery('english', search_query)
    )
  ORDER BY
    -- Group priority (today first, earlier last)
    CASE
      WHEN n.updated_at >= today_start THEN 1
      WHEN n.updated_at >= yesterday_start THEN 2
      WHEN n.updated_at >= week_start THEN 3
      WHEN n.updated_at >= month_start THEN 4
      ELSE 5
    END,
    -- Within group: relevance first, then recency
    search_rank DESC,
    n.updated_at DESC
  LIMIT max_results;
END;
$$;
```

### 2.2 Browse Function for Temporal Grouping

For non-search (browse) mode, a dedicated function will provide efficient temporal grouping:

```sql
CREATE OR REPLACE FUNCTION get_notes_grouped_by_time(
  user_uuid UUID,
  max_results INTEGER DEFAULT 200,
  offset_val INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_rescued BOOLEAN,
  original_note_id UUID,
  time_group TEXT,
  group_rank INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  today_start TIMESTAMPTZ;
  yesterday_start TIMESTAMPTZ;
  week_start TIMESTAMPTZ;
  month_start TIMESTAMPTZ;
BEGIN
  -- Calculate temporal boundaries using current timezone
  today_start := date_trunc('day', NOW() AT TIME ZONE 'UTC');
  yesterday_start := today_start - INTERVAL '1 day';
  week_start := today_start - INTERVAL '7 days';
  month_start := today_start - INTERVAL '30 days';

  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.content,
    n.created_at,
    n.updated_at,
    n.is_rescued,
    n.original_note_id,
    -- Temporal group assignment
    CASE
      WHEN n.updated_at >= yesterday_start THEN 'yesterday'
      WHEN n.updated_at >= week_start THEN 'last_week'
      WHEN n.updated_at >= month_start THEN 'last_month'
      ELSE 'earlier'
    END as time_group,
    -- Ranking within each group
    ROW_NUMBER() OVER (
      PARTITION BY (
        CASE
          WHEN n.updated_at >= yesterday_start THEN 1
          WHEN n.updated_at >= week_start THEN 2
          WHEN n.updated_at >= month_start THEN 3
          ELSE 4
        END
      )
      ORDER BY n.updated_at DESC
    )::INTEGER as group_rank
  FROM notes n
  WHERE n.user_id = user_uuid
  ORDER BY
    -- Group priority
    CASE
      WHEN n.updated_at >= yesterday_start THEN 1
      WHEN n.updated_at >= week_start THEN 2
      WHEN n.updated_at >= month_start THEN 3
      ELSE 4
    END,
    n.updated_at DESC
  LIMIT max_results OFFSET offset_val;
END;
$$;
```

### 2.3 Performance Optimizations

**Indexing Strategy:**

```sql
-- Enhanced composite index for temporal queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_user_temporal
ON notes (user_id, updated_at DESC)
WHERE user_id IS NOT NULL;

-- Partial indexes for common time ranges
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_recent
ON notes (user_id, updated_at DESC)
WHERE updated_at >= NOW() - INTERVAL '30 days';

-- GIN index for full-text search remains unchanged
-- (already optimal for the search functionality)
```

**Query Performance Considerations:**

- Time boundaries calculated once per query execution
- Partition-wise ordering reduces sorting overhead
- Limited result sets prevent excessive memory usage
- Composite indexes support both temporal and user filtering

## 3. API Layer Design

### 3.1 Enhanced Type Definitions

**New TypeScript Types:**

```typescript
// types/temporal.ts
export type TimeGroup = 'yesterday' | 'last_week' | 'last_month' | 'earlier'

export interface TemporalBoundaries {
  yesterday: Date
  lastWeek: Date
  lastMonth: Date
}

export interface GroupedNote extends Note {
  time_group: TimeGroup
  group_rank: number
  highlighted_content?: string
  highlighted_title?: string | null
  search_rank?: number
}

export interface NoteTimeSection {
  timeGroup: TimeGroup
  displayName: string
  notes: GroupedNote[]
  totalCount: number
  isExpanded: boolean
}

export interface GroupedNotesResponse {
  sections: NoteTimeSection[]
  totalNotes: number
  metadata?: SearchMetadata
}

// Enhanced search result with temporal grouping
export interface EnhancedSearchResultGrouped {
  results: GroupedNote[]
  sections: NoteTimeSection[]
  metadata: SearchMetadata & {
    temporalGrouping: boolean
    groupCounts: Record<TimeGroup, number>
  }
}
```

### 3.2 Enhanced Hooks Implementation

**Updated `use-notes-mutations.ts`:**

```typescript
// Additional imports
import type {
  GroupedNote,
  NoteTimeSection,
  GroupedNotesResponse,
  TimeGroup,
  TemporalBoundaries,
} from '@/types/temporal'

// New temporal grouping utilities
const getTemporalBoundaries = (): TemporalBoundaries => {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const lastWeek = new Date(now)
  lastWeek.setDate(now.getDate() - 7)
  lastWeek.setHours(0, 0, 0, 0)

  const lastMonth = new Date(now)
  lastMonth.setDate(now.getDate() - 30)
  lastMonth.setHours(0, 0, 0, 0)

  return { yesterday, lastWeek, lastMonth }
}

const classifyNoteByTime = (
  updatedAt: string,
  boundaries: TemporalBoundaries
): TimeGroup => {
  const noteDate = new Date(updatedAt)

  if (noteDate >= boundaries.yesterday) return 'yesterday'
  if (noteDate >= boundaries.lastWeek) return 'last_week'
  if (noteDate >= boundaries.lastMonth) return 'last_month'
  return 'earlier'
}

const groupNotesByTime = (notes: GroupedNote[]): NoteTimeSection[] => {
  const groups: Record<TimeGroup, GroupedNote[]> = {
    yesterday: [],
    last_week: [],
    last_month: [],
    earlier: [],
  }

  const displayNames: Record<TimeGroup, string> = {
    yesterday: 'Yesterday',
    last_week: 'Last Week',
    last_month: 'Last 30 Days',
    earlier: 'Earlier',
  }

  // Group notes by time
  notes.forEach(note => {
    groups[note.time_group].push(note)
  })

  // Convert to sections array, filtering empty groups
  return Object.entries(groups)
    .filter(([_, notes]) => notes.length > 0)
    .map(([timeGroup, notes]) => ({
      timeGroup: timeGroup as TimeGroup,
      displayName: displayNames[timeGroup as TimeGroup],
      notes: notes.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
      totalCount: notes.length,
      isExpanded: true, // Default to expanded
    }))
}

// Enhanced search function with temporal grouping
const searchNotesGrouped = useCallback(
  async (
    query: string,
    options: SearchOptions & { groupByTime?: boolean } = {}
  ): Promise<GroupedNotesResponse> => {
    const startTime = performance.now()

    if (!user?.id || !query.trim()) {
      // Return empty grouped structure
      return {
        sections: [],
        totalNotes: 0,
        metadata: {
          searchTime: 0,
          totalResults: 0,
          usedEnhancedSearch: false,
          query: query.trim(),
          temporalGrouping: options.groupByTime ?? true,
          groupCounts: {
            yesterday: 0,
            last_week: 0,
            last_month: 0,
            earlier: 0,
          },
        },
      }
    }

    const { maxResults = 200, groupByTime = true } = options
    const trimmedQuery = query.trim()

    try {
      // Use new grouped search function
      const { data, error } = await (stableSupabase as any).rpc(
        'search_notes_enhanced_grouped',
        {
          user_uuid: user.id,
          search_query: trimmedQuery,
          max_results: maxResults,
          include_temporal_data: groupByTime,
        }
      )

      if (error) {
        throw new Error(`Grouped search failed: ${error.message}`)
      }

      const results: GroupedNote[] = data || []
      const endTime = performance.now()

      if (groupByTime) {
        const sections = groupNotesByTime(results)
        const groupCounts = results.reduce(
          (acc, note) => {
            acc[note.time_group] = (acc[note.time_group] || 0) + 1
            return acc
          },
          {} as Record<TimeGroup, number>
        )

        return {
          sections,
          totalNotes: results.length,
          metadata: {
            searchTime: Math.round(endTime - startTime),
            totalResults: results.length,
            usedEnhancedSearch: true,
            query: trimmedQuery,
            temporalGrouping: true,
            groupCounts,
          },
        }
      } else {
        // Fallback to flat structure
        return {
          sections: [
            {
              timeGroup: 'yesterday',
              displayName: 'Search Results',
              notes: results,
              totalCount: results.length,
              isExpanded: true,
            },
          ],
          totalNotes: results.length,
        }
      }
    } catch (error) {
      console.error('Grouped search error:', error)

      // Fallback to basic search with client-side grouping
      const basicResults = await searchNotesBasic(trimmedQuery, maxResults)
      const boundaries = getTemporalBoundaries()

      const groupedBasicResults: GroupedNote[] = basicResults.map(note => ({
        ...note,
        time_group: classifyNoteByTime(note.updated_at, boundaries),
        group_rank: 1,
        highlighted_content: note.content,
        highlighted_title: note.title,
        search_rank: 0.5,
      }))

      const sections = groupNotesByTime(groupedBasicResults)
      const endTime = performance.now()

      return {
        sections,
        totalNotes: basicResults.length,
        metadata: {
          searchTime: Math.round(endTime - startTime),
          totalResults: basicResults.length,
          usedEnhancedSearch: false,
          query: trimmedQuery,
          temporalGrouping: groupByTime,
          groupCounts: groupedBasicResults.reduce(
            (acc, note) => {
              acc[note.time_group] = (acc[note.time_group] || 0) + 1
              return acc
            },
            {} as Record<TimeGroup, number>
          ),
        },
      }
    }
  },
  [user?.id, stableSupabase, searchNotesBasic]
)

// Enhanced browse function for temporal grouping
const getNotesGrouped = useCallback(
  async (
    options: { maxResults?: number; offset?: number } = {}
  ): Promise<GroupedNotesResponse> => {
    if (!user?.id) {
      return { sections: [], totalNotes: 0 }
    }

    const { maxResults = 200, offset = 0 } = options

    try {
      const { data, error } = await (stableSupabase as any).rpc(
        'get_notes_grouped_by_time',
        {
          user_uuid: user.id,
          max_results: maxResults,
          offset_val: offset,
        }
      )

      if (error) {
        throw new Error(`Failed to fetch grouped notes: ${error.message}`)
      }

      const results: GroupedNote[] = data || []
      const sections = groupNotesByTime(results)

      return {
        sections,
        totalNotes: results.length,
      }
    } catch (error) {
      console.error('Grouped notes fetch error:', error)
      throw error
    }
  },
  [user?.id, stableSupabase]
)

// Return updated hook interface
return {
  // ... existing methods
  searchNotesGrouped,
  getNotesGrouped,
  // ... existing methods
}
```

### 3.3 React Query Integration

**Enhanced Caching Strategy:**

```typescript
// hooks/use-notes-query.ts (new hook for grouped queries)
export function useNotesGroupedQuery(searchQuery?: string) {
  const { user } = useAuthStore()
  const { searchNotesGrouped, getNotesGrouped } = useNotesMutations()

  return useQuery({
    queryKey: ['notes-grouped', user?.id, searchQuery || 'browse'],
    queryFn: () =>
      searchQuery
        ? searchNotesGrouped(searchQuery, { groupByTime: true })
        : getNotesGrouped(),
    enabled: !!user?.id,
    staleTime: searchQuery ? 1000 * 30 : 1000 * 60, // 30s for search, 60s for browse
    cacheTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

// Real-time integration helper
export function useNotesGroupedRealtime(initialData?: GroupedNotesResponse) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()
    const channel = supabase
      .channel(`notes-grouped-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          // Invalidate grouped queries to trigger refetch
          queryClient.invalidateQueries({
            queryKey: ['notes-grouped', user.id],
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient])

  return initialData
}
```

## 4. Frontend Component Architecture

### 4.1 New Component Structure

```
components/notes/
├── temporal/
│   ├── grouped-note-list.tsx          # Main grouped list component
│   ├── time-section.tsx               # Individual time group section
│   ├── time-section-header.tsx        # Collapsible section headers
│   ├── section-skeleton.tsx           # Loading states for sections
│   └── index.ts                       # Barrel exports
├── note-list.tsx                      # Enhanced for backward compatibility
├── notes-container.tsx                # Updated to support grouping
└── ...existing components
```

### 4.2 Core Component Implementation

**`components/notes/temporal/grouped-note-list.tsx`:**

```tsx
'use client'

import { useMemo, useCallback, useState, memo } from 'react'
import { TimeSection } from './time-section'
import { SectionSkeleton } from './section-skeleton'
import { cn } from '@/lib/utils'
import { SearchIcon, InboxIcon, LoaderIcon } from 'lucide-react'
import type {
  GroupedNotesResponse,
  NoteTimeSection,
  TimeGroup,
} from '@/types/temporal'
import type { Note } from '@/types'

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
      <div className={cn('w-full', className)}>
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
          rescuingId={rescuingId}
          searchQuery={searchQuery}
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
          {data.metadata.groupCounts && (
            <p>
              Groups:{' '}
              {Object.entries(data.metadata.groupCounts)
                .map(([group, count]) => `${group}: ${count}`)
                .join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
})
```

**`components/notes/temporal/time-section.tsx`:**

```tsx
'use client'

import { memo, useMemo, useState } from 'react'
import { NoteItem } from '../note-item'
import { TimeSectionHeader } from './time-section-header'
import { VirtualizedNoteList } from './virtualized-note-list'
import { cn } from '@/lib/utils'
import type { NoteTimeSection, GroupedNote } from '@/types/temporal'

interface TimeSectionProps {
  section: NoteTimeSection
  onRescue?: (noteId: string) => Promise<void>
  isRescuing?: boolean
  rescuingId?: string
  searchQuery?: string
  onToggleSection?: (timeGroup: TimeGroup) => void
  showSectionDivider?: boolean
  enableVirtualization?: boolean
}

export const TimeSection = memo(function TimeSection({
  section,
  onRescue,
  isRescuing = false,
  rescuingId,
  searchQuery,
  onToggleSection,
  showSectionDivider = false,
  enableVirtualization = false,
}: TimeSectionProps) {
  // Memoized section statistics
  const sectionStats = useMemo(() => {
    const rescuedCount = section.notes.filter(note => note.is_rescued).length
    const searchMatches = searchQuery
      ? section.notes.filter(
          note =>
            note.highlighted_content !== note.content ||
            (note.highlighted_title && note.highlighted_title !== note.title)
        ).length
      : 0

    return {
      total: section.totalCount,
      rescued: rescuedCount,
      searchMatches: searchMatches,
    }
  }, [section.notes, section.totalCount, searchQuery])

  // Handle section toggle
  const handleToggle = () => {
    onToggleSection?.(section.timeGroup)
  }

  // Render individual note
  const renderNote = (note: GroupedNote, index: number) => {
    const isCurrentlyRescuing = isRescuing && rescuingId === note.id
    const isFirstInSection = index === 0

    return (
      <div
        key={note.id}
        className={cn('px-4', !isFirstInSection && 'border-t border-border/30')}
      >
        <NoteItem
          note={note}
          isRescuing={isCurrentlyRescuing}
          showRescueButton={!isFirstInSection} // Don't show rescue for first note in section
          showDivider={false} // Handled by container
          onRescue={onRescue}
          searchQuery={searchQuery}
          enhancedContent={note.highlighted_content}
          enhancedTitle={note.highlighted_title}
        />
      </div>
    )
  }

  return (
    <section className='w-full'>
      {/* Section Header */}
      <TimeSectionHeader
        section={section}
        stats={sectionStats}
        onToggle={handleToggle}
        searchQuery={searchQuery}
      />

      {/* Notes List */}
      {section.isExpanded && (
        <div className='mt-2'>
          {enableVirtualization ? (
            <VirtualizedNoteList
              notes={section.notes}
              renderNote={renderNote}
              itemHeight={120} // Estimated note height
              containerHeight={600} // Max section height
            />
          ) : (
            <div className='space-y-0 bg-background border border-border/50 rounded-lg overflow-hidden'>
              {section.notes.map((note, index) => renderNote(note, index))}
            </div>
          )}
        </div>
      )}

      {/* Section Divider */}
      {showSectionDivider && <div className='mt-8 border-b border-border/30' />}
    </section>
  )
})
```

**`components/notes/temporal/time-section-header.tsx`:**

```tsx
'use client'

import { memo } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  SearchIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { NoteTimeSection, TimeGroup } from '@/types/temporal'

interface TimeSectionHeaderProps {
  section: NoteTimeSection
  stats: {
    total: number
    rescued: number
    searchMatches: number
  }
  onToggle?: () => void
  searchQuery?: string
}

const TIME_GROUP_ICONS: Record<TimeGroup, React.ComponentType<any>> = {
  yesterday: ClockIcon,
  last_week: ClockIcon,
  last_month: ClockIcon,
  earlier: ClockIcon,
}

export const TimeSectionHeader = memo(function TimeSectionHeader({
  section,
  stats,
  onToggle,
  searchQuery,
}: TimeSectionHeaderProps) {
  const IconComponent = TIME_GROUP_ICONS[section.timeGroup]

  return (
    <div className='flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg border border-border/50'>
      {/* Left side - Title and stats */}
      <div className='flex items-center gap-3'>
        <Button
          variant='ghost'
          size='sm'
          onClick={onToggle}
          className='p-1 h-auto hover:bg-transparent'
          aria-label={`${section.isExpanded ? 'Collapse' : 'Expand'} ${section.displayName} section`}
        >
          {section.isExpanded ? (
            <ChevronDownIcon className='h-4 w-4' />
          ) : (
            <ChevronRightIcon className='h-4 w-4' />
          )}
        </Button>

        <div className='flex items-center gap-2'>
          <IconComponent className='h-4 w-4 text-muted-foreground' />
          <h3 className='font-medium text-sm'>{section.displayName}</h3>
        </div>
      </div>

      {/* Right side - Badges and counts */}
      <div className='flex items-center gap-2'>
        {searchQuery && stats.searchMatches > 0 && (
          <Badge variant='secondary' className='text-xs'>
            <SearchIcon className='h-3 w-3 mr-1' />
            {stats.searchMatches}
          </Badge>
        )}

        {stats.rescued > 0 && (
          <Badge variant='outline' className='text-xs'>
            ↑ {stats.rescued}
          </Badge>
        )}

        <Badge variant='default' className='text-xs'>
          {stats.total}
        </Badge>
      </div>
    </div>
  )
})
```

### 4.3 Updated Container Integration

**Enhanced `components/notes/notes-container.tsx`:**

```tsx
// Add temporal grouping support
const [useTemporalGrouping, setUseTemporalGrouping] = useState(true)
const [collapsedSections, setCollapsedSections] = useState<Set<TimeGroup>>(
  new Set()
)

// Enhanced search handling
const handleSearch = useCallback(
  async (query: string) => {
    if (!externalSearchControl) {
      setInternalSearchQuery(query)
    }

    if (!query.trim()) {
      // Reset to original notes when search is cleared
      if (useTemporalGrouping) {
        // Invalidate grouped query to trigger fresh fetch
        queryClient.invalidateQueries(['notes-grouped', user?.id, 'browse'])
      } else {
        setNotes(initialNotes)
      }
      return
    }

    if (onSearchNotes) {
      setIsSearching(true)
      try {
        if (useTemporalGrouping) {
          // Use grouped search
          const searchResults = await searchNotesGrouped(query)
          setGroupedNotesData(searchResults)
        } else {
          // Use flat search (backward compatibility)
          const searchResults = await onSearchNotes(query)
          setNotes(searchResults)
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }
  },
  [
    onSearchNotes,
    initialNotes,
    externalSearchControl,
    useTemporalGrouping,
    searchNotesGrouped,
    user?.id,
    queryClient,
  ]
)

// Section management
const handleToggleSection = useCallback((timeGroup: TimeGroup) => {
  setCollapsedSections(prev => {
    const next = new Set(prev)
    if (next.has(timeGroup)) {
      next.delete(timeGroup)
    } else {
      next.add(timeGroup)
    }
    return next
  })
}, [])

// Render logic update
return (
  <>
    <div ref={containerRef} className={cn('flex flex-col', className)}>
      {/* Input section remains the same */}
      <div
        ref={inputContainerRef}
        className='border-b border-border/50 bg-background'
      >
        {/* ... existing input code ... */}
      </div>

      {/* Enhanced Notes Stream */}
      <div className='flex-1'>
        {useTemporalGrouping ? (
          <GroupedNoteList
            data={groupedNotesData}
            onRescue={handleRescueNote}
            isLoading={isSearching}
            isRescuing={isRescuing}
            rescuingId={rescuingId}
            searchQuery={searchQuery}
            onSearchChange={handleSearch}
            collapsedSections={collapsedSections}
            onToggleSection={handleToggleSection}
          />
        ) : (
          <NoteList
            notes={notes}
            onRescue={handleRescueNote}
            isLoading={isSearching}
            isRescuing={isRescuing}
            rescuingId={rescuingId}
            searchQuery={searchQuery}
            onSearchChange={handleSearch}
          />
        )}
      </div>
    </div>

    {/* ... existing FAB and modal code ... */}
  </>
)
```

## 5. Implementation Strategy

### 5.1 Migration Path

**Phase 1: Database Layer (Week 1)**

1. Create new PostgreSQL functions (`search_notes_enhanced_grouped`, `get_notes_grouped_by_time`)
2. Add temporal indexes for performance
3. Test functions with existing data
4. Deploy database changes with zero-downtime migration

**Phase 2: API Layer (Week 2)**

1. Create new TypeScript types for temporal grouping
2. Enhance `use-notes-mutations.ts` with grouped search functions
3. Create new React Query hooks for grouped data
4. Add real-time integration for grouped updates
5. Maintain backward compatibility with existing hooks

**Phase 3: Component Layer (Week 3)**

1. Create temporal grouping components (`GroupedNoteList`, `TimeSection`, etc.)
2. Update `NotesContainer` to support both modes
3. Implement section collapsing and state management
4. Add virtualization for performance
5. Create comprehensive unit tests

**Phase 4: Integration and Polish (Week 4)**

1. Integrate with existing search and real-time systems
2. Performance testing and optimization
3. Cross-browser compatibility testing
4. Accessibility improvements
5. User acceptance testing

### 5.2 Backward Compatibility

**Compatibility Strategy:**

- Maintain existing `NoteList` component alongside new `GroupedNoteList`
- Feature flag (`useTemporalGrouping`) to switch between modes
- All existing APIs continue to work unchanged
- Gradual rollout with ability to rollback

**Migration Testing:**

```typescript
// Test both modes in development
const FEATURE_FLAGS = {
  temporalGrouping: process.env.NEXT_PUBLIC_ENABLE_TEMPORAL_GROUPING === 'true',
  // Allow runtime switching in development
  runtimeToggle: process.env.NODE_ENV === 'development',
}
```

### 5.3 Performance Considerations

**Database Performance:**

- Query execution time target: <100ms for grouped queries
- Index optimization for temporal boundaries
- Result pagination to limit memory usage
- Query plan monitoring and optimization

**Frontend Performance:**

- Virtual scrolling for sections with >100 notes
- Memoization for expensive operations (highlighting, grouping)
- Lazy loading of collapsed sections
- Efficient React Query caching strategies

**Memory Management:**

- Limited result sets (200 notes maximum per query)
- Garbage collection-friendly component structure
- Debounced search to prevent excessive API calls
- Cache invalidation strategies for real-time updates

## 6. Technical Specifications

### 6.1 Performance Benchmarks

**Target Metrics:**

- Database query time: <100ms for grouped search
- Time-to-interactive for grouped results: <200ms
- Memory usage increase: <20% compared to flat list
- Search-to-render time: <300ms for 200 notes across 4 groups

**Monitoring:**

```typescript
// Performance monitoring hooks
const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState<{
    queryTime: number
    renderTime: number
    memoryUsage: number
  }>()

  const measureQueryTime = useCallback((startTime: number) => {
    const endTime = performance.now()
    setMetrics(prev => ({
      ...prev,
      queryTime: endTime - startTime,
    }))
  }, [])

  return { metrics, measureQueryTime }
}
```

### 6.2 Error Handling

**Fallback Strategies:**

1. **Database Function Failure**: Automatic fallback to basic search with client-side grouping
2. **Network Issues**: Cached results with stale-while-revalidate strategy
3. **Parse Errors**: Graceful degradation to flat list view
4. **Real-time Connection Loss**: Polling fallback for updates

**Error Boundaries:**

```typescript
// Specialized error boundary for temporal grouping
export class TemporalGroupingErrorBoundary extends Component {
  state = { hasError: false, fallbackMode: false }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      fallbackMode: error.message.includes('temporal')
    }
  }

  render() {
    if (this.state.hasError) {
      return this.state.fallbackMode
        ? <NoteList {...this.props.fallbackProps} />
        : <ErrorFallback />
    }

    return this.props.children
  }
}
```

### 6.3 Accessibility Considerations

**ARIA Implementation:**

```typescript
// Accessible section headers
<section
  aria-labelledby={`section-${section.timeGroup}`}
  aria-expanded={section.isExpanded}
>
  <button
    id={`section-${section.timeGroup}`}
    aria-expanded={section.isExpanded}
    aria-controls={`notes-${section.timeGroup}`}
    onClick={handleToggle}
  >
    {section.displayName} ({section.totalCount})
  </button>

  <div
    id={`notes-${section.timeGroup}`}
    role="group"
    aria-labelledby={`section-${section.timeGroup}`}
  >
    {/* Notes content */}
  </div>
</section>
```

**Keyboard Navigation:**

- Tab navigation through sections
- Arrow key navigation within sections
- Space/Enter to toggle sections
- Escape to clear search
- Focus management for screen readers

### 6.4 Testing Strategy

**Unit Tests:**

```typescript
// Component testing
describe('GroupedNoteList', () => {
  it('groups notes by time periods correctly', () => {
    // Test temporal boundary calculations
  })

  it('handles empty sections gracefully', () => {
    // Test edge cases
  })

  it('maintains search highlighting in grouped results', () => {
    // Test search integration
  })
})

// Hook testing
describe('useNotesGrouped', () => {
  it('returns properly grouped data structure', () => {
    // Test hook functionality
  })

  it('handles real-time updates correctly', () => {
    // Test real-time integration
  })
})
```

**Integration Tests:**

```typescript
// E2E testing with Playwright
test('temporal grouping search flow', async ({ page }) => {
  // Navigate to dashboard
  await page.goto('/dashboard')

  // Enter search query
  await page.fill('[data-testid="search-input"]', 'test query')

  // Verify grouped results
  await expect(page.locator('[data-testid="time-section"]')).toHaveCount(4)

  // Test section collapse/expand
  await page.click('[data-testid="section-toggle-yesterday"]')
  await expect(page.locator('[data-testid="notes-yesterday"]')).toBeHidden()
})
```

**Performance Tests:**

```typescript
// Load testing for large datasets
test('performance with 1000 notes', async () => {
  const startTime = performance.now()

  // Create large dataset
  const notes = Array.from({ length: 1000 }, createMockNote)

  // Render grouped list
  render(<GroupedNoteList data={{ sections: groupNotes(notes) }} />)

  const renderTime = performance.now() - startTime
  expect(renderTime).toBeLessThan(1000) // 1 second max
})
```

## 7. Deployment and Monitoring

### 7.1 Deployment Strategy

**Feature Flag Rollout:**

1. **Internal Testing (Week 1)**: Enable for development and staging
2. **Beta Testing (Week 2)**: Enable for 10% of users
3. **Gradual Rollout (Week 3)**: 25%, 50%, 75% of users
4. **Full Deployment (Week 4)**: 100% of users with rollback capability

**Database Migration:**

```sql
-- Zero-downtime migration strategy
BEGIN;
  -- Create new functions
  -- (functions defined in section 2.1 and 2.2)

  -- Create new indexes concurrently
  -- (indexes defined in section 2.3)

  -- Update function permissions
  GRANT EXECUTE ON FUNCTION search_notes_enhanced_grouped TO authenticated;
  GRANT EXECUTE ON FUNCTION get_notes_grouped_by_time TO authenticated;
COMMIT;
```

### 7.2 Monitoring and Observability

**Key Metrics:**

- Query performance (p50, p95, p99 response times)
- Error rates for grouped vs flat searches
- User engagement with section collapse/expand
- Cache hit rates for grouped queries
- Real-time update latency

**Monitoring Implementation:**

```typescript
// Application metrics
export const trackTemporalGroupingMetrics = {
  queryPerformance: (duration: number, resultCount: number) => {
    analytics.track('temporal_grouping_query', {
      duration,
      resultCount,
      timestamp: Date.now(),
    })
  },

  sectionInteraction: (action: 'expand' | 'collapse', section: TimeGroup) => {
    analytics.track('section_interaction', { action, section })
  },

  searchUsage: (query: string, resultGroups: number, totalResults: number) => {
    analytics.track('grouped_search', {
      queryLength: query.length,
      resultGroups,
      totalResults,
    })
  },
}
```

## 8. Success Criteria and KPIs

### 8.1 Technical KPIs

- **Performance**: <100ms average query time for grouped searches
- **Reliability**: <0.1% error rate for temporal grouping features
- **Scalability**: Support for 10,000+ notes per user without degradation
- **Compatibility**: 100% backward compatibility with existing functionality

### 8.2 User Experience KPIs

- **Search Effectiveness**: Improved findability of notes by temporal context
- **Interface Usability**: <2 seconds to locate notes using temporal groups
- **Feature Adoption**: >70% of users utilizing section collapse/expand
- **Performance Perception**: No user-reported slowdowns compared to flat list

### 8.3 Business KPIs

- **User Engagement**: Increased daily active usage of search functionality
- **Retention**: Improved user retention through better note organization
- **Support**: Reduced support requests related to finding old notes
- **Satisfaction**: Positive user feedback on temporal organization feature

## Conclusion

This technical design provides a comprehensive roadmap for implementing temporal grouping in Gravity Note while maintaining the application's core philosophy of minimalist, frictionless note-taking. The design prioritizes performance, scalability, and user experience while ensuring seamless integration with the existing architecture.

The phased implementation approach allows for iterative development and testing, with robust fallback mechanisms ensuring system reliability throughout the rollout process. The enhanced search capabilities will provide users with improved spatial memory and context while browsing and searching their notes, ultimately supporting the app's gravity-based philosophy where important notes naturally surface through temporal patterns and user interaction.
