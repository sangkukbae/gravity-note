'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { Note } from '@/lib/supabase/realtime'
import { cn } from '@/lib/utils'
import { safeDate } from '@/lib/utils/note-transformers'
import type { EnhancedSearchResult, SearchMetadata } from '@/types/search'
import { useMemo } from 'react'
import { countHighlights, HighlightedText } from './highlighted-text'

interface SearchResultsProps {
  /** Search results to display */
  results: EnhancedSearchResult[] | Note[]
  /** Search metadata for enhanced results */
  metadata?: SearchMetadata | undefined
  /** The search query for context */
  query: string
  /** Maximum number of results to show */
  maxResults?: number
  /** Whether to show search metadata */
  showMetadata?: boolean
  /** Callback when a result is clicked */
  onResultClick?: (result: EnhancedSearchResult | Note) => void
  /** CSS class name for the container */
  className?: string
}

/**
 * Component to display search results with highlighting and metadata
 */
export function SearchResults({
  results,
  metadata,
  query,
  maxResults,
  showMetadata = true,
  onResultClick,
  className,
}: SearchResultsProps) {
  // Determine if we have enhanced results with highlighting
  const isEnhancedResults = useMemo(() => {
    return (
      results.length > 0 && results[0] && 'highlighted_content' in results[0]
    )
  }, [results])

  const displayedResults = useMemo(() => {
    return maxResults ? results.slice(0, maxResults) : results
  }, [results, maxResults])

  if (results.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <p>No notes found matching &quot;{query}&quot;</p>
        <p className='text-sm mt-2'>
          Try different keywords or check your spelling
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search metadata */}
      {showMetadata && metadata && (
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
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
      )}

      {/* Search results */}
      <div className='space-y-3'>
        {displayedResults.map(result => (
          <SearchResultItem
            key={result.id}
            result={result}
            query={query}
            isEnhanced={!!isEnhancedResults}
            {...(onResultClick && { onClick: onResultClick })}
          />
        ))}
      </div>

      {/* Show more indicator */}
      {maxResults && results.length > maxResults && (
        <div className='text-center py-4 text-muted-foreground text-sm'>
          Showing {maxResults} of {results.length} results
        </div>
      )}
    </div>
  )
}

interface SearchResultItemProps {
  result: EnhancedSearchResult | Note
  query: string
  isEnhanced: boolean
  onClick?: (result: EnhancedSearchResult | Note) => void
}

function SearchResultItem({
  result,
  query,
  isEnhanced,
  onClick,
}: SearchResultItemProps) {
  const enhancedResult = isEnhanced ? (result as EnhancedSearchResult) : null

  const handleClick = () => {
    if (onClick) {
      onClick(result)
    }
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:bg-accent/50',
        onClick && 'hover:scale-[1.01]'
      )}
      onClick={handleClick}
    >
      {result.title && (
        <CardHeader className='pb-2'>
          <div className='flex items-start justify-between'>
            <h3 className='font-medium text-base leading-tight'>
              {isEnhanced && enhancedResult?.highlighted_title ? (
                <HighlightedText
                  text={enhancedResult.highlighted_title}
                  maxLength={100}
                />
              ) : (
                <span className='line-clamp-2'>{result.title}</span>
              )}
            </h3>
            {isEnhanced && enhancedResult && (
              <div className='flex items-center gap-1 ml-2'>
                <Badge variant='outline' className='text-xs shrink-0'>
                  {Math.round(enhancedResult.search_rank * 100)}% match
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className={result.title ? 'pt-0' : ''}>
        <div className='space-y-2'>
          <div className='text-sm text-muted-foreground leading-relaxed'>
            {isEnhanced && enhancedResult?.highlighted_content ? (
              <HighlightedText
                text={enhancedResult.highlighted_content}
                maxLength={200}
                className='line-clamp-3'
              />
            ) : (
              <p className='line-clamp-3'>
                {result.content.length > 200
                  ? `${result.content.substring(0, 200)}...`
                  : result.content}
              </p>
            )}
          </div>

          <div className='flex items-center justify-between text-xs text-muted-foreground'>
            <div className='flex items-center gap-2'>
              <span>
                {safeDate(result.updated_at).toLocaleDateString()}
                {' at '}
                {safeDate(result.updated_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {isEnhanced && enhancedResult && (
                <>
                  {countHighlights(enhancedResult.highlighted_content) > 0 && (
                    <Badge variant='secondary' className='text-xs'>
                      {countHighlights(enhancedResult.highlighted_content)}{' '}
                      match
                      {countHighlights(enhancedResult.highlighted_content) !== 1
                        ? 'es'
                        : ''}
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* 'Rescued' badge removed from list view as requested */}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
