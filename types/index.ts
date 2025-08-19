// Core application types for Gravity Note

export interface Note {
  id: string
  user_id: string
  title: string | null
  content: string
  created_at: string
  updated_at: string
}

export interface CreateNoteInput {
  title?: string | null
  content: string
}

export interface UpdateNoteInput {
  id: string
  title?: string | null
  content?: string
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

export interface NotesQuery {
  search?: string
  limit?: number
  offset?: number
  sortBy?: 'created_at' | 'updated_at' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface NotesResponse {
  notes: Note[]
  totalCount: number
  hasMore: boolean
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

export {}
