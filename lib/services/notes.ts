import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import type {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  NotesQuery,
  NotesResponse,
} from '@/types'

type SupabaseClient = ReturnType<typeof createClient>

export class NotesService {
  private supabase: SupabaseClient

  constructor() {
    this.supabase = createClient()
  }

  /**
   * Create a new note
   */
  async createNote(input: CreateNoteInput): Promise<Note> {
    const { data: user } = await this.supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('notes')
      .insert({
        user_id: user.user.id,
        title: input.title ?? null,
        content: input.content,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create note: ${error.message}`)
    }

    return data
  }

  /**
   * Get notes with pagination and search
   */
  async getNotes(query: NotesQuery = {}): Promise<NotesResponse> {
    const { data: user } = await this.supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const {
      search,
      limit = 50,
      offset = 0,
      sortBy = 'updated_at',
      sortOrder = 'desc',
    } = query

    let supabaseQuery = this.supabase
      .from('notes')
      .select('*', { count: 'exact' })
      .eq('user_id', user.user.id)

    // Add search filter if provided
    if (search && search.trim()) {
      // Search in both title and content
      supabaseQuery = supabaseQuery.or(
        `title.ilike.%${search}%,content.ilike.%${search}%`
      )
    }

    // Add sorting
    supabaseQuery = supabaseQuery.order(sortBy, {
      ascending: sortOrder === 'asc',
    })

    // Add pagination
    supabaseQuery = supabaseQuery.range(offset, offset + limit - 1)

    const { data, error, count } = await supabaseQuery

    if (error) {
      throw new Error(`Failed to fetch notes: ${error.message}`)
    }

    const totalCount = count || 0
    const hasMore = offset + limit < totalCount

    return {
      notes: data || [],
      totalCount,
      hasMore,
    }
  }

  /**
   * Get a single note by ID
   */
  async getNoteById(id: string): Promise<Note | null> {
    const { data: user } = await this.supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      throw new Error(`Failed to fetch note: ${error.message}`)
    }

    return data
  }

  /**
   * Update an existing note
   */
  async updateNote(input: UpdateNoteInput): Promise<Note> {
    const { data: user } = await this.supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const updateData: Partial<Database['public']['Tables']['notes']['Update']> =
      {}

    if (input.title !== undefined) {
      updateData.title = input.title
    }
    if (input.content !== undefined) {
      updateData.content = input.content
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await this.supabase
      .from('notes')
      .update(updateData)
      .eq('id', input.id)
      .eq('user_id', user.user.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update note: ${error.message}`)
    }

    return data
  }

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<void> {
    const { data: user } = await this.supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { error } = await this.supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.user.id)

    if (error) {
      throw new Error(`Failed to delete note: ${error.message}`)
    }
  }

  /**
   * Search notes with full-text search capabilities
   */
  async searchNotes(searchTerm: string, limit = 20): Promise<Note[]> {
    const { data: user } = await this.supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    if (!searchTerm.trim()) {
      return []
    }

    // Try PostgreSQL full-text search first (if available)
    try {
      const { data, error } = await this.supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.user.id)
        .textSearch('title,content', searchTerm, {
          type: 'websearch',
          config: 'english',
        })
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (!error && data) {
        return data
      }
    } catch (fullTextError) {
      console.warn(
        'Full-text search not available, falling back to ILIKE:',
        fullTextError
      )
    }

    // Fallback to ILIKE search
    const { data, error } = await this.supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.user.id)
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to search notes: ${error.message}`)
    }

    return data || []
  }

  /**
   * Advanced search with ranking and snippets
   */
  async advancedSearch(
    searchTerm: string,
    options: {
      limit?: number
      includeSnippets?: boolean
      rankBy?: 'relevance' | 'date'
    } = {}
  ): Promise<Array<Note & { rank?: number; snippet?: string }>> {
    const { data: user } = await this.supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    if (!searchTerm.trim()) {
      return []
    }

    const {
      limit = 20,
      includeSnippets = false,
      rankBy = 'relevance',
    } = options

    try {
      // Use PostgreSQL full-text search with ranking
      const { data, error } = await (this.supabase as any).rpc(
        'search_notes_ranked',
        {
          search_query: searchTerm,
          user_id_param: user.user.id,
          limit_param: limit,
          include_snippets: includeSnippets,
          rank_by: rankBy,
        }
      )

      if (!error && data) {
        return data
      }
    } catch (rpcError) {
      console.warn('RPC search not available, using fallback:', rpcError)
    }

    // Fallback to basic search
    return this.searchNotes(searchTerm, limit)
  }

  /**
   * Get recent notes (last 10)
   */
  async getRecentNotes(limit = 10): Promise<Note[]> {
    const { data: user } = await this.supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.user.id)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch recent notes: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get notes count for the current user
   */
  async getNotesCount(): Promise<number> {
    const { data: user } = await this.supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { count, error } = await this.supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.user.id)

    if (error) {
      throw new Error(`Failed to get notes count: ${error.message}`)
    }

    return count || 0
  }

  /**
   * Duplicate a note
   */
  async duplicateNote(id: string): Promise<Note> {
    const originalNote = await this.getNoteById(id)
    if (!originalNote) {
      throw new Error('Note not found')
    }

    const duplicatedNote = await this.createNote({
      title: originalNote.title ? `${originalNote.title} (Copy)` : null,
      content: originalNote.content,
    })

    return duplicatedNote
  }
}

// Export a singleton instance
export const notesService = new NotesService()
