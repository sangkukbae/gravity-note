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
import { shouldHandleSearchShortcut } from '@/lib/utils/keyboard'
import { safeDate } from '@/lib/utils/note-transformers'
import type { EnhancedSearchResult, SearchMetadata } from '@/types/search'
import { FileTextIcon, SearchIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { HighlightedText, countHighlights } from './highlighted-text'

interface CommandPaletteProps {
  /** Control the modal open state */
  open: boolean
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void
  /** Search function that returns enhanced results */
  onSearch: (query: string) => Promise<{
    results: EnhancedSearchResult[]
    metadata: SearchMetadata
  }>
  /** Callback when a search result is selected */
  onResultSelect?: (result: EnhancedSearchResult | Note) => void
  /** Whether search is currently in progress */
  isSearching?: boolean
  /** CSS class name for the modal */
  className?: string
}

/**
 * Command Palette Modal for Search
 *
 * Provides a modal-based search interface that preserves context while allowing
 * users to quickly search and navigate to notes. Supports all existing search
 * features including highlighting, performance metrics, and enhanced/basic modes.
 */
export function CommandPalette({
  open,
  onOpenChange,
  onSearch,
  onResultSelect,
  isSearching = false,
  className,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<EnhancedSearchResult[]>([])
  const [metadata, setMetadata] = useState<SearchMetadata | undefined>(
    undefined
  )
  const [isInternalSearching, setIsInternalSearching] = useState(false)

  // Debounced search with 150ms delay for real-time feel
  const debouncedSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        setMetadata(undefined)
        setIsInternalSearching(false)
        return
      }

      setIsInternalSearching(true)

      try {
        const { results: searchResults, metadata: searchMetadata } =
          await onSearch(searchQuery)
        setResults(searchResults)
        setMetadata(searchMetadata)
      } catch (error) {
        console.error('Command palette search failed:', error)
        setResults([])
        setMetadata(undefined)
      } finally {
        setIsInternalSearching(false)
      }
    },
    [onSearch]
  )

  // Debounce search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      debouncedSearch(query)
    }, 150)

    return () => clearTimeout(timer)
  }, [query, debouncedSearch])

  // Handle result selection
  const handleResultSelect = useCallback(
    (result: EnhancedSearchResult) => {
      if (onResultSelect) {
        onResultSelect(result)
      }
      // Close the modal after selection
      onOpenChange(false)
      // Clear the search for next time
      setQuery('')
      setResults([])
      setMetadata(undefined)
    },
    [onResultSelect, onOpenChange]
  )

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setMetadata(undefined)
      setIsInternalSearching(false)
    }
  }, [open])

  const isCurrentlySearching = isSearching || isInternalSearching

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder='Search notes...'
        value={query}
        onValueChange={setQuery}
        className='focus-within:border-ring/50'
      />

      <CommandList className='max-h-[400px] overflow-y-auto'>
        <CommandEmpty>
          {isCurrentlySearching ? (
            <div className='flex items-center justify-center py-6'>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-primary' />
                Searching...
              </div>
            </div>
          ) : query.trim() ? (
            <div className='py-6 text-center'>
              <p className='text-sm text-muted-foreground'>
                No notes found matching &quot;{query}&quot;
              </p>
              <p className='text-xs text-muted-foreground mt-1'>
                Try different keywords or check your spelling
              </p>
            </div>
          ) : (
            <div className='py-6 text-center'>
              <div className='flex flex-col items-center gap-2 text-muted-foreground'>
                <SearchIcon className='h-8 w-8 opacity-50' />
                <p className='text-sm'>Start typing to search your notes</p>
                <p className='text-xs opacity-70'>
                  Use keywords, phrases, or partial matches
                </p>
              </div>
            </div>
          )}
        </CommandEmpty>

        {/* Search Metadata */}
        {metadata && results.length > 0 && (
          <>
            <CommandGroup heading='Search Info'>
              <div className='px-2 py-1.5'>
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                  <span>
                    Found {metadata.totalResults} result
                    {metadata.totalResults !== 1 ? 's' : ''}
                  </span>
                  <Badge variant='secondary' className='text-xs'>
                    {metadata.searchTime}ms
                  </Badge>
                  {metadata.usedEnhancedSearch ? (
                    <Badge variant='outline' className='text-xs'>
                      Enhanced Search
                    </Badge>
                  ) : (
                    <Badge variant='outline' className='text-xs'>
                      Basic Search
                    </Badge>
                  )}
                </div>
              </div>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <CommandGroup heading={`Notes (${results.length})`}>
            {results.map((result, index) => (
              <CommandItem
                key={result.id}
                value={`${result.id}-${index}`}
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
                              maxLength={80}
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
                            maxLength={120}
                            className='line-clamp-2'
                          />
                        ) : (
                          <span className='line-clamp-2'>
                            {result.content.length > 120
                              ? `${result.content.substring(0, 120)}...`
                              : result.content}
                          </span>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                        <span>
                          {safeDate(result.updated_at).toLocaleDateString()}
                        </span>
                        {countHighlights(result.highlighted_content) > 0 && (
                          <Badge variant='secondary' className='text-xs'>
                            {countHighlights(result.highlighted_content)} match
                            {countHighlights(result.highlighted_content) !== 1
                              ? 'es'
                              : ''}
                          </Badge>
                        )}
                        {result.is_rescued && (
                          <Badge variant='outline' className='text-xs'>
                            Rescued
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Search Rank */}
                  {'search_rank' in result && (
                    <Badge variant='outline' className='text-xs shrink-0 ml-2'>
                      {Math.round(result.search_rank * 100)}% match
                    </Badge>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}

/**
 * Hook to manage Command Palette state and keyboard shortcuts
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  // Handle Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldHandleSearchShortcut(e)) {
        e.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    open,
    setOpen,
    openCommandPalette: () => setOpen(true),
    closeCommandPalette: () => setOpen(false),
    toggleCommandPalette: () => setOpen(prev => !prev),
  }
}
