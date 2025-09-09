'use client'

import { useMemo, useCallback, memo } from 'react'
import { NoteItem, Note } from './note-item'
import { cn } from '@/lib/utils'
import { SearchIcon, InboxIcon, LoaderIcon } from 'lucide-react'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { SearchState } from '@/hooks/use-search-state'
import {
  SearchLoadingState,
  SearchClearingState,
  SearchResultsState,
  BrowsingState,
} from './search-states'

interface NoteListProps {
  notes: Note[]
  onRescue?: (noteId: string) => Promise<void>
  isLoading?: boolean
  isRescuing?: boolean
  rescuingId?: string
  searchQuery?: string
  onSearchChange?: (query: string) => void
  className?: string
  onLoadMore?: () => Promise<void>
  hasMore?: boolean
  searchState?: SearchState // New optional prop for enhanced search UX
}

export const NoteList = memo(function NoteList({
  notes,
  onRescue,
  isLoading = false,
  isRescuing = false,
  rescuingId,
  searchQuery,
  onSearchChange,
  className,
  onLoadMore,
  hasMore = false,
  searchState, // New prop
}: NoteListProps) {
  // Highlight search matches in content - memoized for performance
  const getHighlightedContent = useMemo(() => {
    const highlightCache = new Map<string, React.ReactNode>()

    return (content: string, query: string) => {
      if (!query) return content

      const cacheKey = `${content}_${query.toLowerCase()}`
      if (highlightCache.has(cacheKey)) {
        return highlightCache.get(cacheKey)
      }

      const regex = new RegExp(`(${query})`, 'gi')
      const parts = content.split(regex)

      const result = parts.map((part, index) => {
        if (part.toLowerCase() === query.toLowerCase()) {
          return (
            <mark
              key={index}
              className='bg-yellow-200 text-yellow-900 px-1 rounded'
            >
              {part}
            </mark>
          )
        }
        return part
      })

      highlightCache.set(cacheKey, result)
      return result
    }
  }, [])

  // Filter notes based on search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return notes

    const query = searchQuery.toLowerCase().trim()
    return notes.filter(note => {
      return (
        typeof note.content === 'string' &&
        note.content.toLowerCase().includes(query)
      )
    })
  }, [notes, searchQuery])

  // Infinite scroll hook
  const { lastElementRef, isLoading: isLoadingMore } = useInfiniteScroll({
    loadMore: onLoadMore,
    hasMore,
    threshold: 0.1,
    rootMargin: '200px',
    disabled: isLoading || !!searchQuery, // Disable infinite scroll during loading or search
  })

  // State-aware rendering - prioritized over legacy loading states
  if (searchState) {
    switch (searchState.mode) {
      case 'search-loading':
        return (
          <SearchLoadingState
            query={searchState.query}
            {...(className ? { className } : {})}
          />
        )

      case 'search-clearing':
        return (
          <SearchClearingState
            notes={notes}
            className={cn(className, 'animate-search-clearing')}
          />
        )

      case 'search-results':
        return (
          <SearchResultsState
            notes={notes}
            query={searchState.query}
            className={cn(className, 'animate-search-fade-in')}
            {...(onRescue ? { onRescue } : {})}
            isRescuing={isRescuing}
            {...(rescuingId ? { rescuingId } : {})}
          />
        )

      case 'browsing':
        return (
          <BrowsingState
            notes={notes}
            className={cn(className, 'animate-search-fade-in')}
            {...(onRescue ? { onRescue } : {})}
            isRescuing={isRescuing}
            {...(rescuingId ? { rescuingId } : {})}
            {...(onLoadMore ? { onLoadMore } : {})}
            hasMore={hasMore}
          />
        )

      // Fall through for other states like 'search-empty', 'search-typing', etc.
      default:
        break
    }
  }

  // Fallback to legacy loading state if no search state provided
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className='flex items-center gap-2 text-muted-foreground'>
          <LoaderIcon className='h-4 w-4 animate-spin' />
          <span>Loading your notes...</span>
        </div>
      </div>
    )
  }

  if (notes.length === 0) {
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

  if (searchQuery && filteredNotes.length === 0) {
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

  // Native scroll with infinite loading
  return (
    <div className={cn('w-full', className)}>
      {/* Notes list with native scroll */}
      <div className='space-y-0'>
        {filteredNotes.map((note, index) => {
          const isCurrentlyRescuing = !!isRescuing && rescuingId === note.id
          const isLastItem = index === filteredNotes.length - 1
          const topId = filteredNotes[0]?.id

          // Enhance note with search highlighting
          const enhancedNote: Note = {
            ...note,
            content:
              searchQuery && typeof note.content === 'string'
                ? getHighlightedContent(note.content, searchQuery)
                : note.content,
          }

          return (
            <div
              key={note.id}
              id={`note-${note.id}`}
              data-note-id={note.id}
              ref={
                isLastItem && hasMore && !searchQuery
                  ? lastElementRef
                  : undefined
              }
              className='px-4 w-full max-w-[720px] mx-auto' // Centered, readable width
            >
              <NoteItem
                note={enhancedNote}
                isRescuing={isCurrentlyRescuing}
                showRescueButton={true} // Always show action buttons
                showDivider={index < filteredNotes.length - 1} // Pass divider flag to note item
                showRescuedBadge={index === 0 && Boolean(note.is_rescued)}
                {...(onRescue && index > 0 ? { onRescue } : {})} // Only pass onRescue for non-top notes
              />
            </div>
          )
        })}

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className='flex items-center justify-center p-8'>
            <div className='flex items-center gap-2 text-muted-foreground'>
              <LoaderIcon className='h-4 w-4 animate-spin' />
              <span>Loading more notes...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
