/**
 * Utility functions for transforming notes between database and application types
 */

import type { Tables } from '@/types/database'
import type { Note } from '@/lib/supabase/realtime'

/**
 * Transform a database note to an application note
 * Now simply passes through since database and application types match
 */
export function transformDatabaseNote(dbNote: Tables<'notes'>): Note {
  return dbNote
}

/**
 * Transform multiple database notes to application notes
 */
export function transformDatabaseNotes(dbNotes: Tables<'notes'>[]): Note[] {
  return dbNotes.map(transformDatabaseNote)
}

/**
 * Safe date creation that handles nullable timestamps
 */
export function safeDate(dateString: string | null): Date {
  if (!dateString) {
    return new Date()
  }

  const date = new Date(dateString)
  return isNaN(date.getTime()) ? new Date() : date
}

/**
 * Extract timestamp from note safely
 */
export function getTimestamp(note: {
  updated_at?: string | null
  created_at?: string | null
}): string {
  return note.updated_at || note.created_at || new Date().toISOString()
}
