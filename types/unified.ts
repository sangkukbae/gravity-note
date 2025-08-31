import type { Database } from './database'

// Use the database-defined Note type as base
type BaseNote = Database['public']['Tables']['notes']['Row']

// Time period definitions for temporal grouping
export type TimeGroup =
  | 'yesterday'
  | 'last_week'
  | 'last_month'
  | 'earlier'
  | 'all'

/**
 * Unified Note Result interface that consolidates all search, temporal, and highlighting functionality
 * This replaces EnhancedSearchResult, GroupedNote, and related types
 */
export interface UnifiedNoteResult extends BaseNote {
  // Temporal grouping fields
  /** Time group classification */
  time_group: TimeGroup
  /** Ranking within the time group (1-based) */
  group_rank: number

  // Search and highlighting fields
  /** Content with search terms highlighted using <mark> tags */
  highlighted_content: string
  /** Title with search terms highlighted using <mark> tags (null if no title) */
  highlighted_title: string | null
  /** Search relevance ranking (higher = more relevant, 0.0 for browse mode) */
  search_rank: number
}

/**
 * Temporal boundary calculations for client-side operations
 */
export interface TemporalBoundaries {
  yesterday: Date
  lastWeek: Date
  lastMonth: Date
}

/**
 * Represents a single time-based section of notes
 */
export interface NoteTimeSection {
  /** Time group identifier */
  timeGroup: TimeGroup
  /** Human-readable display name */
  displayName: string
  /** Notes in this time section */
  notes: UnifiedNoteResult[]
  /** Total count of notes in this section */
  totalCount: number
  /** Whether this section is expanded in the UI */
  isExpanded: boolean
}

/**
 * Unified search/browse metadata
 */
export interface UnifiedSearchMetadata {
  /** Total time taken for the operation in milliseconds */
  searchTime: number
  /** Total number of results found */
  totalResults: number
  /** Whether the search used enhanced full-text search */
  usedEnhancedSearch: boolean
  /** The actual search query used (empty string for browse mode) */
  query: string
  /** Whether temporal grouping was applied */
  temporalGrouping: boolean
  /** Count of results in each time group */
  groupCounts: Record<TimeGroup, number>
  /** Operation mode */
  mode: 'search' | 'browse'
}

/**
 * Complete response structure for unified notes operations
 */
export interface UnifiedNotesResponse {
  /** Organized sections by time period */
  sections: NoteTimeSection[]
  /** Total notes across all sections */
  totalNotes: number
  /** Operation metadata */
  metadata: UnifiedSearchMetadata
}

/**
 * Configuration options for unified notes operations
 */
export interface UnifiedNotesOptions {
  /** Maximum number of results to return */
  maxResults?: number
  /** Whether to group results by time periods */
  groupByTime?: boolean
  /** Maximum results per time group (when grouping is enabled) */
  maxPerGroup?: number
  /** Whether to show empty time group sections */
  showEmptyGroups?: boolean
  /** Whether to use enhanced full-text search (only for search mode) */
  useEnhancedSearch?: boolean
}

/**
 * Statistics for a time section (used in headers and UI)
 */
export interface TimeSectionStats {
  /** Total notes in section */
  total: number
  /** Number of rescued notes */
  rescued: number
  /** Number of search matches (when in search mode) */
  searchMatches: number
  /** Average search rank for this section (when in search mode) */
  averageRank?: number
}

/**
 * Search state for command palette and search UI
 */
export interface UnifiedSearchState {
  /** Current search query */
  query: string
  /** Current operation mode */
  mode: 'search' | 'browse'
  /** Whether search is in progress */
  isLoading: boolean
  /** Current results */
  results: UnifiedNotesResponse | null
  /** Any error that occurred */
  error: string | null
  /** Configuration options */
  options: UnifiedNotesOptions
}

/**
 * Actions for unified search state management
 */
export type UnifiedSearchAction =
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_MODE'; payload: 'search' | 'browse' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_RESULTS'; payload: UnifiedNotesResponse }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_OPTIONS'; payload: Partial<UnifiedNotesOptions> }
  | { type: 'RESET' }
  | { type: 'CLEAR_RESULTS' }

// Export legacy types for backward compatibility during transition
// These will be removed in future phases

/** @deprecated Use UnifiedNoteResult instead */
export interface EnhancedSearchResult extends BaseNote {
  highlighted_content: string
  highlighted_title: string | null
  search_rank: number
}

/** @deprecated Use UnifiedNoteResult instead */
export interface GroupedNote extends BaseNote {
  time_group: TimeGroup
  group_rank: number
  highlighted_content?: string
  highlighted_title?: string | null | undefined
  search_rank?: number
}

/** @deprecated Use UnifiedNotesResponse instead */
export interface GroupedNotesResponse {
  sections: NoteTimeSection[]
  totalNotes: number
  metadata?: UnifiedSearchMetadata
}
