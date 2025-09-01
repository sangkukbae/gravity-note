// Core application types for Gravity Note

export interface Note {
  id: string
  user_id: string
  content: string
  created_at: string | null
  updated_at: string | null
  is_rescued: boolean | null
  original_note_id: string | null
  title: string | null
}

export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface SearchResult {
  note: Note
  snippet: string
  score: number
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'error' | 'offline'
  lastSync?: string
  pendingCount: number
}

export interface AppState {
  notes: Note[]
  loading: boolean
  error: string | null
  syncStatus: SyncStatus
}

// PWA specific types
export interface InstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: InstallPromptEvent
  }
}

// Re-export legacy types with explicit naming to avoid conflicts
export type { SearchMetadata as LegacySearchMetadata } from './search'

export type {
  GroupedNote as LegacyGroupedNote,
  GroupedNotesResponse as LegacyGroupedNotesResponse,
  NoteTimeSection as LegacyNoteTimeSection,
  TemporalBoundaries as LegacyTemporalBoundaries,
  TimeGroup as LegacyTimeGroup,
  TimeSectionStats as LegacyTimeSectionStats,
} from './temporal'

// Re-export unified types (preferred - these are the current API)
export type {
  UnifiedNoteResult,
  UnifiedNotesResponse,
  UnifiedSearchMetadata,
  UnifiedSearchState,
  UnifiedSearchAction,
  UnifiedNotesOptions,
  NoteTimeSection,
  TimeGroup,
  TemporalBoundaries,
  TimeSectionStats,
  // Legacy compatibility types (deprecated)
  EnhancedSearchResult,
  GroupedNote,
  GroupedNotesResponse,
} from './unified'

export {}
