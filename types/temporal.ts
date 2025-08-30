import type { Database } from './database'

// Use the database-defined Note type
type Note = Database['public']['Tables']['notes']['Row']

// Time period definitions for temporal grouping
export type TimeGroup = 'yesterday' | 'last_week' | 'last_month' | 'earlier'

/**
 * Temporal boundary calculations for client-side operations
 */
export interface TemporalBoundaries {
  yesterday: Date
  lastWeek: Date
  lastMonth: Date
}

/**
 * Extended Note interface with temporal grouping metadata
 */
export interface GroupedNote extends Note {
  /** Time group classification */
  time_group: TimeGroup
  /** Ranking within the time group */
  group_rank: number
  /** Enhanced content with search highlighting (optional) */
  highlighted_content?: string
  /** Enhanced title with search highlighting (optional) */
  highlighted_title?: string | null | undefined
  /** Search relevance ranking (optional) */
  search_rank?: number
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
  notes: GroupedNote[]
  /** Total count of notes in this section */
  totalCount: number
  /** Whether this section is expanded in the UI */
  isExpanded: boolean
}

/**
 * Complete response structure for grouped notes
 */
export interface GroupedNotesResponse {
  /** Organized sections by time period */
  sections: NoteTimeSection[]
  /** Total notes across all sections */
  totalNotes: number
  /** Optional search metadata */
  metadata?: GroupedSearchMetadata
}

/**
 * Enhanced search metadata with temporal grouping information
 */
export interface GroupedSearchMetadata {
  /** Total time taken for the search in milliseconds */
  searchTime: number
  /** Total number of results found */
  totalResults: number
  /** Whether the search used enhanced full-text search */
  usedEnhancedSearch: boolean
  /** The actual search query used */
  query: string
  /** Whether temporal grouping was applied */
  temporalGrouping: boolean
  /** Count of results in each time group */
  groupCounts: Record<TimeGroup, number>
}

/**
 * Enhanced search result with temporal grouping
 */
export interface EnhancedSearchResultGrouped {
  /** Raw grouped results */
  results: GroupedNote[]
  /** Organized sections for UI consumption */
  sections: NoteTimeSection[]
  /** Extended metadata */
  metadata: GroupedSearchMetadata
}

/**
 * Configuration options for temporal grouping
 */
export interface TemporalGroupingOptions {
  /** Whether to group results by time */
  groupByTime?: boolean
  /** Maximum results per time group */
  maxPerGroup?: number
  /** Whether to show empty sections */
  showEmptyGroups?: boolean
}

/**
 * Statistics for a time section (used in headers)
 */
export interface TimeSectionStats {
  /** Total notes in section */
  total: number
  /** Number of rescued notes */
  rescued: number
  /** Number of search matches (when searching) */
  searchMatches: number
}
