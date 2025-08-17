// Core application types for Gravity Note

export interface Note {
  id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  is_rescued: boolean
  original_note_id?: string
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

export {}
