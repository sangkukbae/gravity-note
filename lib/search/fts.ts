'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  UnifiedNoteResult,
  UnifiedNotesOptions,
  TimeGroup,
} from '@/types/unified'

/**
 * FTS-based unified search using the database function `get_notes_unified`.
 * Not used by default (we currently use ILIKE-only), but kept modular for future reuse.
 */
export async function unifiedFtsSearch(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  options: UnifiedNotesOptions = {}
): Promise<UnifiedNoteResult[]> {
  const { maxResults = 200, groupByTime = true } = options
  const trimmed = query.trim()
  const isSearchMode = trimmed.length > 0

  const { data, error } = await supabase.rpc('get_notes_unified', {
    user_uuid: userId,
    max_results: maxResults,
    group_by_time: groupByTime,
    ...(isSearchMode ? { search_query: trimmed } : {}),
  })

  if (error) throw new Error(`FTS unified search failed: ${error.message}`)

  return (data || []).map((note: any) => ({
    id: note.id,
    user_id: userId,
    title: note.title,
    content: note.content,
    created_at: note.created_at,
    updated_at: note.updated_at,
    is_rescued: note.is_rescued,
    original_note_id: note.original_note_id,
    time_group: note.time_group as TimeGroup,
    group_rank: note.group_rank || 1,
    highlighted_content: note.highlighted_content || note.content,
    highlighted_title: note.highlighted_title || note.title,
    search_rank: note.search_rank || 0,
  }))
}
