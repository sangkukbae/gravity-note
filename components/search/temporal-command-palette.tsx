'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { HighlightedText, countHighlights } from './highlighted-text'
import { SearchIcon, FileTextIcon } from 'lucide-react'
import type { EnhancedSearchResult, SearchMetadata } from '@/types/search'
import type { Note } from '@/lib/supabase/realtime'
import type { GroupedNotesResponse, GroupedNote } from '@/types/temporal'

interface TemporalCommandPaletteProps {
  /** Control the modal open state */
  open: boolean
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void
  /** Regular search function that returns enhanced results */
  onSearch: (query: string) => Promise<{
    results: EnhancedSearchResult[]
    metadata: SearchMetadata
  }>
  /** Grouped search function that returns temporal sections */
  onSearchGrouped: (query: string) => Promise<GroupedNotesResponse>
  /** Function to get all notes grouped by time (for initial load) */
  onGetNotesGrouped?: () => Promise<GroupedNotesResponse>
  /** Callback when a search result is selected */
  onResultSelect?: (result: EnhancedSearchResult | Note) => void
  /** Whether search is currently in progress */
  isSearching?: boolean
  /** CSS class name for the modal */
  className?: string
}

/**
 * Temporal Command Palette Modal for Search
 *
 * Provides a modal-based search interface with temporal grouping like Notion's search.
 * Groups results by time periods (Today, Yesterday, Last Week, etc.)
 */
export function TemporalCommandPalette({
  open,
  onOpenChange,
  onSearch,
  onSearchGrouped,
  onGetNotesGrouped,
  onResultSelect,
  isSearching = false,
  className,
}: TemporalCommandPaletteProps) {
  // Simplified state - only 3 variables
  const [query, setQuery] = useState('')
  const [data, setData] = useState<GroupedNotesResponse>({
    sections: [],
    totalNotes: 0,
  })
  const [isLoading, setIsLoading] = useState(false)

  // Derived state - no flags needed
  const isSearchMode = query.trim().length > 0

  // Constants
  const DEBOUNCE_DELAY = 200
  const MAX_TITLE_LENGTH = 80
  const MAX_CONTENT_LENGTH = 120

  // Single data fetching effect - handles both browse and search
  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      if (cancelled) return

      setIsLoading(true)
      try {
        if (isSearchMode) {
          // Search mode
          const result = await onSearchGrouped(query.trim())
          if (!cancelled) {
            setData(result)
          }
        } else {
          // Browse mode - load all notes
          if (onGetNotesGrouped) {
            const result = await onGetNotesGrouped()
            if (!cancelled) {
              setData(result)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        if (!cancelled) {
          setData({ sections: [], totalNotes: 0 })
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    // Debounce search queries, but load browse data immediately
    if (isSearchMode) {
      const timer = setTimeout(fetchData, DEBOUNCE_DELAY)
      return () => {
        clearTimeout(timer)
        cancelled = true
      }
    } else {
      fetchData()
    }

    return () => {
      cancelled = true
    }
  }, [query, isSearchMode, onSearchGrouped, onGetNotesGrouped])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setQuery('')
      setData({ sections: [], totalNotes: 0 })
      setIsLoading(false)
    }
  }, [open])

  // Handle result selection - simplified without type conversions
  const handleResultSelect = useCallback(
    (result: GroupedNote) => {
      if (onResultSelect) {
        // Pass the note directly - let the consumer handle any needed conversions
        onResultSelect(result)
      }
      // Close the modal after selection
      onOpenChange(false)
    },
    [onResultSelect, onOpenChange]
  )

  // Simplified derived values
  const hasResults = data.sections.some(
    section => Array.isArray(section.notes) && section.notes.length > 0
  )

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder='Search notes...'
        value={query}
        onValueChange={setQuery}
        className='focus-within:border-ring/50'
      />

      <CommandList className='max-h-[500px] overflow-y-auto'>
        <CommandEmpty>
          {isLoading ? (
            <div className='flex items-center justify-center py-6'>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-primary' />
                {isSearchMode ? 'Searching...' : 'Loading your notes...'}
              </div>
            </div>
          ) : isSearchMode && query.trim() ? (
            <div className='py-6 text-center'>
              <p className='text-sm text-muted-foreground'>
                No notes found matching &quot;{query}&quot;
              </p>
              <p className='text-xs text-muted-foreground mt-1'>
                Try different keywords or check your spelling
              </p>
            </div>
          ) : !hasResults && !isSearchMode ? (
            <div className='py-6 text-center'>
              <div className='flex flex-col items-center gap-2 text-muted-foreground'>
                <FileTextIcon className='h-8 w-8 opacity-50' />
                <p className='text-sm'>No notes yet</p>
                <p className='text-xs opacity-70'>
                  Create your first note to get started
                </p>
              </div>
            </div>
          ) : null}
        </CommandEmpty>

        {/* Search Metadata - only show in search mode */}
        {isSearchMode && data.metadata && (
          <>
            <CommandGroup heading='Search Results'>
              <div className='px-2 py-1.5'>
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                  <span>
                    Found {data.metadata.totalResults} result
                    {data.metadata.totalResults !== 1 ? 's' : ''}
                  </span>
                  <Badge variant='secondary' className='text-xs'>
                    {data.sections.length} time period
                    {data.sections.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Temporal Grouped Results */}
        {data.sections.map((section, sectionIndex) => {
          if (
            !section.notes ||
            !Array.isArray(section.notes) ||
            section.notes.length === 0
          ) {
            return null
          }

          return (
            <div key={sectionIndex}>
              <CommandGroup
                heading={`${section.displayName} (${section.notes.length})`}
              >
                {section.notes.map((result, index) => (
                  <CommandItem
                    key={result.id}
                    value={`${result.id}-${sectionIndex}-${index}`}
                    onSelect={() => handleResultSelect(result)}
                    className='flex flex-col items-start gap-2 p-3 cursor-pointer'
                  >
                    <div className='flex items-start justify-between w-full'>
                      <div className='flex items-start gap-2 flex-1 min-w-0'>
                        <FileTextIcon className='h-4 w-4 mt-0.5 text-muted-foreground shrink-0' />
                        <div className='flex flex-col gap-1 flex-1 min-w-0'>
                          {/* Note Title */}
                          {result.title && (
                            <div className='font-medium text-sm leading-tight'>
                              {result.highlighted_title ? (
                                <HighlightedText
                                  text={result.highlighted_title}
                                  maxLength={MAX_TITLE_LENGTH}
                                />
                              ) : (
                                <span className='truncate'>{result.title}</span>
                              )}
                            </div>
                          )}

                          {/* Note Content Preview */}
                          <div className='text-xs text-muted-foreground leading-relaxed'>
                            {result.highlighted_content ? (
                              <HighlightedText
                                text={result.highlighted_content}
                                maxLength={MAX_CONTENT_LENGTH}
                                className='line-clamp-2'
                              />
                            ) : (
                              <span className='line-clamp-2'>
                                {result.content &&
                                result.content.length > MAX_CONTENT_LENGTH
                                  ? `${result.content.substring(
                                      0,
                                      MAX_CONTENT_LENGTH
                                    )}...`
                                  : result.content || ''}
                              </span>
                            )}
                          </div>

                          {/* Metadata */}
                          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                            <span>
                              {new Date(result.updated_at).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </span>
                            {result.is_rescued && (
                              <Badge variant='outline' className='text-xs'>
                                Rescued
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {sectionIndex < data.sections.length - 1 && <CommandSeparator />}
            </div>
          )
        })}
      </CommandList>

      {/* Keyboard Shortcuts Footer */}
      <div className='border-t border-border/50 px-4 py-3 bg-muted/30'>
        <div className='flex items-center justify-between text-xs text-muted-foreground'>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-1'>
              <kbd className='pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100'>
                ↑↓
              </kbd>
              <span>navigate</span>
            </div>
            <div className='flex items-center gap-1'>
              <kbd className='pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100'>
                ⏎
              </kbd>
              <span>select</span>
            </div>
          </div>
          <div className='flex items-center gap-1'>
            <kbd className='pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100'>
              esc
            </kbd>
            <span>close</span>
          </div>
        </div>
      </div>
    </CommandDialog>
  )
}
