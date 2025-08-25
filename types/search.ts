import type { Note } from '@/lib/supabase/realtime'

/**
 * Enhanced search result type with highlighting and ranking
 * Extends the base Note type with search-specific fields
 */
export interface EnhancedSearchResult extends Note {
  /** Content with search terms highlighted using <mark> tags */
  highlighted_content: string
  /** Title with search terms highlighted using <mark> tags (null if no title) */
  highlighted_title: string | null
  /** Search relevance ranking (higher = more relevant) */
  search_rank: number
}

/**
 * Search configuration options
 */
export interface SearchOptions {
  /** Maximum number of results to return */
  maxResults?: number
  /** Whether to use enhanced full-text search with highlighting */
  useEnhancedSearch?: boolean
}

/**
 * Search result metadata
 */
export interface SearchMetadata {
  /** Total time taken for the search in milliseconds */
  searchTime: number
  /** Total number of results found */
  totalResults: number
  /** Whether the search used enhanced full-text search */
  usedEnhancedSearch: boolean
  /** The actual search query used */
  query: string
}
