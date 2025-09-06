'use client'

import { Badge } from '@/components/ui/badge'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import type { Note } from '@/lib/supabase/realtime'
import { safeDate } from '@/lib/utils/note-transformers'
import type { EnhancedSearchResult, SearchMetadata } from '@/types/search'
import type { GroupedNote, GroupedNotesResponse } from '@/types/temporal'
import type {
  UnifiedNoteResult,
  UnifiedNotesOptions,
  UnifiedNotesResponse,
} from '@/types/unified'
import { FileTextIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { HighlightedText } from './highlighted-text'

interface TemporalCommandPaletteProps {
  /** Control the modal open state */
  open: boolean
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void

  // New unified approach (preferred)
  /** Unified search function that handles both search and browse */
  onUnifiedSearch?: (
    query: string,
    options?: UnifiedNotesOptions
  ) => Promise<UnifiedNotesResponse>
  /** Unified browse function that gets all notes grouped by time */
  onUnifiedBrowse?: (
    options?: UnifiedNotesOptions
  ) => Promise<UnifiedNotesResponse>

  // Legacy approach (for backward compatibility)
  /** Regular search function that returns enhanced results */
  onSearch?: (query: string) => Promise<{
    results: EnhancedSearchResult[]
    metadata: SearchMetadata
  }>
  /** Grouped search function that returns temporal sections */
  onSearchGrouped?: (query: string) => Promise<GroupedNotesResponse>
  /** Function to get all notes grouped by time (for initial load) */
  onGetNotesGrouped?: () => Promise<GroupedNotesResponse>

  /** Callback when a search result is selected */
  onResultSelect?: (
    result: EnhancedSearchResult | Note | UnifiedNoteResult
  ) => void
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
  onUnifiedSearch,
  onUnifiedBrowse,
  onSearch,
  onSearchGrouped,
  onGetNotesGrouped,
  onResultSelect,
  isSearching = false,
  className,
}: TemporalCommandPaletteProps) {
  // State - support both unified and legacy response formats
  const [query, setQuery] = useState('')
  const [data, setData] = useState<UnifiedNotesResponse | GroupedNotesResponse>(
    {
      sections: [],
      totalNotes: 0,
    }
  )
  const [isLoading, setIsLoading] = useState(false)

  // Determine which approach to use (coerced to boolean to avoid function identity churn)
  const useUnifiedApproach = Boolean(onUnifiedSearch && onUnifiedBrowse)

  // Derived state - no flags needed
  const isSearchMode = query.trim().length > 0

  // Constants
  const DEBOUNCE_DELAY = 200
  const MAX_TITLE_LENGTH = 80
  const MAX_CONTENT_LENGTH = 120
  // Keep the search panel visually stable between loading and results
  // Using a fixed min-height prevents the dialog from "popping" larger later

  // Stabilize handler identities via refs to prevent effect dependency churn
  const onUnifiedSearchRef = useRef(onUnifiedSearch)
  const onUnifiedBrowseRef = useRef(onUnifiedBrowse)
  const onSearchGroupedRef = useRef(onSearchGrouped)
  const onGetNotesGroupedRef = useRef(onGetNotesGrouped)

  useEffect(() => {
    onUnifiedSearchRef.current = onUnifiedSearch
  }, [onUnifiedSearch])

  useEffect(() => {
    onUnifiedBrowseRef.current = onUnifiedBrowse
  }, [onUnifiedBrowse])

  useEffect(() => {
    onSearchGroupedRef.current = onSearchGrouped
  }, [onSearchGrouped])

  useEffect(() => {
    onGetNotesGroupedRef.current = onGetNotesGrouped
  }, [onGetNotesGrouped])

  // Single data fetching effect - handles both browse and search with unified or legacy approach
  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      if (cancelled) return

      setIsLoading(true)
      try {
        if (useUnifiedApproach) {
          // New unified approach
          if (isSearchMode) {
            // Search mode
            const result = await onUnifiedSearchRef.current!(query.trim(), {
              maxResults: 200,
              groupByTime: true,
              useEnhancedSearch: true,
            })
            if (!cancelled) {
              setData(result)
            }
          } else {
            // Browse mode
            const result = await onUnifiedBrowseRef.current!({
              maxResults: 200,
              groupByTime: true,
            })
            if (!cancelled) {
              setData(result)
            }
          }
        } else {
          // Legacy approach
          if (isSearchMode) {
            // Search mode
            if (onSearchGroupedRef.current) {
              const result = await onSearchGroupedRef.current(query.trim())
              if (!cancelled) {
                setData(result)
              }
            }
          } else {
            // Browse mode - load all notes
            if (onGetNotesGroupedRef.current) {
              const result = await onGetNotesGroupedRef.current()
              if (!cancelled) {
                setData(result)
              }
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

    // Only fetch when dialog is open to avoid unnecessary work
    if (!open) {
      return () => {
        cancelled = true
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
  }, [open, query, isSearchMode, useUnifiedApproach])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setQuery('')
      setData({ sections: [], totalNotes: 0 })
      setIsLoading(false)
    }
  }, [open])

  // Handle result selection - support both unified and legacy result types
  const handleResultSelect = useCallback(
    (result: UnifiedNoteResult | GroupedNote) => {
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

      <CommandList className='min-h-[280px] md:min-h-[420px] max-h-[70vh] md:max-h-[500px] overflow-y-auto'>
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
                  {useUnifiedApproach && 'mode' in data.metadata && (
                    <Badge variant='outline' className='text-xs'>
                      {data.metadata.usedEnhancedSearch ? 'Enhanced' : 'Basic'}{' '}
                      Search
                    </Badge>
                  )}
                  {useUnifiedApproach && 'searchTime' in data.metadata && (
                    <span className='text-xs opacity-75'>
                      {data.metadata.searchTime}ms
                    </span>
                  )}
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
                              {safeDate(result.updated_at).toLocaleDateString(
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
