'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import type { Note, NoteInsert, NoteUpdate } from '@/lib/supabase/realtime'
import type {
  EnhancedSearchResult,
  SearchOptions,
  SearchMetadata,
} from '@/types/search'

/**
 * Hook for note mutations (create, update, delete)
 * Will be enhanced with optimistic updates in Phase 2
 */
export function useNotesMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()

  // Search notes function (not a mutation, but related)
  // Memoize to prevent infinite loops in useEffect dependencies
  // Create stable supabase client to prevent dependency issues
  const stableSupabase = useMemo(() => supabase, [])

  const notesQueryKey = ['notes', user?.id]

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (content: string): Promise<Note> => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const noteData: NoteInsert = {
        user_id: user.id,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('notes')
        .insert(noteData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create note: ${error.message}`)
      }

      return data
    },
    onSuccess: newNote => {
      // Real-time will handle the update, but we can optionally invalidate
      // to ensure consistency if real-time is not working
      queryClient.setQueryData<Note[]>(notesQueryKey, (oldNotes = []) => {
        // Check if already exists (from real-time)
        const noteExists = oldNotes.some(note => note.id === newNote.id)
        if (noteExists) {
          return oldNotes
        }
        return [newNote, ...oldNotes]
      })
    },
  })

  // Update note mutation (for rescue functionality)
  const updateNoteMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: NoteUpdate
    }): Promise<Note> => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const updateData: NoteUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id) // Additional security check
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update note: ${error.message}`)
      }

      return data
    },
    onSuccess: updatedNote => {
      // Real-time will handle the update, but ensure local state is consistent
      queryClient.setQueryData<Note[]>(notesQueryKey, (oldNotes = []) => {
        const updatedNotes = oldNotes.map(note =>
          note.id === updatedNote.id ? updatedNote : note
        )

        // Re-sort by updated_at (most recent first) to maintain correct order
        return updatedNotes.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
      })
    },
  })

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string): Promise<string> => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id) // Additional security check

      if (error) {
        throw new Error(`Failed to delete note: ${error.message}`)
      }

      return noteId
    },
    onSuccess: deletedNoteId => {
      // Real-time will handle the update, but ensure local state is consistent
      queryClient.setQueryData<Note[]>(notesQueryKey, (oldNotes = []) => {
        return oldNotes.filter(note => note.id !== deletedNoteId)
      })
    },
  })

  // Rescue note (bring to top) - special case of update
  const rescueNoteMutation = useMutation({
    mutationFn: async (noteId: string): Promise<Note> => {
      return updateNoteMutation.mutateAsync({
        id: noteId,
        updates: {
          updated_at: new Date().toISOString(),
          is_rescued: true,
        },
      })
    },
  })

  // Basic ILIKE search (fallback/legacy mode)
  const searchNotesBasic = useCallback(
    async (query: string, maxResults: number = 50): Promise<Note[]> => {
      if (!user?.id || !query.trim()) {
        return []
      }

      const { data, error } = await stableSupabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .or(`content.ilike.%${query}%,title.ilike.%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(maxResults)

      if (error) {
        throw new Error(`Failed to search notes: ${error.message}`)
      }

      return data || []
    },
    [user?.id, stableSupabase]
  )

  // Enhanced search function with full-text search and highlighting support
  const searchNotes = useCallback(
    async (query: string, options: SearchOptions = {}): Promise<Note[]> => {
      if (!user?.id || !query.trim()) {
        return []
      }

      const { maxResults = 50, useEnhancedSearch = true } = options
      const trimmedQuery = query.trim()

      // For very short queries, use basic search directly to ensure compatibility
      if (trimmedQuery.length <= 2) {
        return searchNotesBasic(trimmedQuery, maxResults)
      }

      if (useEnhancedSearch) {
        // Use the enhanced PostgreSQL function for full-text search with highlighting
        const { data, error } = await (stableSupabase as any).rpc(
          'search_notes_enhanced',
          {
            user_uuid: user.id,
            search_query: trimmedQuery,
            max_results: maxResults,
          }
        )

        if (error) {
          console.warn(
            'Enhanced search failed, falling back to basic search:',
            error.message
          )
          // Fallback to basic search if enhanced search fails
          return searchNotesBasic(trimmedQuery, maxResults)
        }

        const results = data || []

        // If enhanced search returns no results for short queries, try basic search
        if (results.length === 0 && trimmedQuery.length <= 4) {
          const basicResults = await searchNotesBasic(trimmedQuery, maxResults)
          if (basicResults.length > 0) {
            return basicResults
          }
        }

        return results
      } else {
        // Use basic ILIKE search (legacy mode)
        return searchNotesBasic(trimmedQuery, maxResults)
      }
    },
    [user?.id, stableSupabase, searchNotesBasic]
  )

  // Enhanced search function that returns results with highlighting
  const searchNotesEnhanced = useCallback(
    async (
      query: string,
      options: SearchOptions = {}
    ): Promise<{
      results: EnhancedSearchResult[]
      metadata: SearchMetadata
    }> => {
      const startTime = performance.now()

      if (!user?.id || !query.trim()) {
        return {
          results: [],
          metadata: {
            searchTime: 0,
            totalResults: 0,
            usedEnhancedSearch: false,
            query: query.trim(),
          },
        }
      }

      const { maxResults = 50 } = options
      const trimmedQuery = query.trim()

      // For very short queries (1-2 characters), use basic search directly
      // PostgreSQL full-text search filters out short terms as stop words
      if (trimmedQuery.length <= 2) {
        console.log(
          `Query "${trimmedQuery}" is too short for full-text search, using basic search`
        )
        const basicResults = await searchNotesBasic(trimmedQuery, maxResults)
        const endTime = performance.now()

        return {
          results: basicResults.map(note => ({
            ...note,
            highlighted_content: note.content,
            highlighted_title: note.title || null,
            search_rank: 0.5, // Default rank for basic search
          })),
          metadata: {
            searchTime: Math.round(endTime - startTime),
            totalResults: basicResults.length,
            usedEnhancedSearch: false,
            query: trimmedQuery,
          },
        }
      }

      try {
        const { data, error } = await (stableSupabase as any).rpc(
          'search_notes_enhanced',
          {
            user_uuid: user.id,
            search_query: trimmedQuery,
            max_results: maxResults,
          }
        )

        if (error) {
          throw new Error(`Enhanced search failed: ${error.message}`)
        }

        const results = data || []

        // If enhanced search returns no results, but basic search might find matches,
        // fall back to basic search (especially for short queries that might have been filtered)
        if (results.length === 0 && trimmedQuery.length <= 4) {
          console.log(
            `Enhanced search returned no results for "${trimmedQuery}", trying basic search fallback`
          )
          const basicResults = await searchNotesBasic(trimmedQuery, maxResults)

          if (basicResults.length > 0) {
            const endTime = performance.now()
            return {
              results: basicResults.map(note => ({
                ...note,
                highlighted_content: note.content,
                highlighted_title: note.title || null,
                search_rank: 0.5, // Default rank for basic search
              })),
              metadata: {
                searchTime: Math.round(endTime - startTime),
                totalResults: basicResults.length,
                usedEnhancedSearch: false,
                query: trimmedQuery,
              },
            }
          }
        }

        const endTime = performance.now()

        return {
          results,
          metadata: {
            searchTime: Math.round(endTime - startTime),
            totalResults: results.length,
            usedEnhancedSearch: true,
            query: trimmedQuery,
          },
        }
      } catch (error) {
        console.error('Enhanced search error:', error)

        // Fallback to basic search
        const basicResults = await searchNotesBasic(trimmedQuery, maxResults)
        const endTime = performance.now()

        return {
          results: basicResults.map(note => ({
            ...note,
            highlighted_content: note.content,
            highlighted_title: note.title || null,
            search_rank: 0.5, // Default rank for basic search
          })),
          metadata: {
            searchTime: Math.round(endTime - startTime),
            totalResults: basicResults.length,
            usedEnhancedSearch: false,
            query: trimmedQuery,
          },
        }
      }
    },
    [user?.id, stableSupabase, searchNotesBasic]
  )

  return {
    // Mutations
    createNote: createNoteMutation.mutate,
    createNoteAsync: createNoteMutation.mutateAsync,
    updateNote: updateNoteMutation.mutate,
    updateNoteAsync: updateNoteMutation.mutateAsync,
    deleteNote: deleteNoteMutation.mutate,
    deleteNoteAsync: deleteNoteMutation.mutateAsync,
    rescueNote: rescueNoteMutation.mutate,
    rescueNoteAsync: rescueNoteMutation.mutateAsync,

    // Search functions
    searchNotes,
    searchNotesEnhanced,
    searchNotesBasic,

    // Loading states
    isCreating: createNoteMutation.isPending,
    isUpdating: updateNoteMutation.isPending,
    isDeleting: deleteNoteMutation.isPending,
    isRescuing: rescueNoteMutation.isPending,

    // Error states
    createError: createNoteMutation.error,
    updateError: updateNoteMutation.error,
    deleteError: deleteNoteMutation.error,
    rescueError: rescueNoteMutation.error,

    // Reset functions
    resetCreateError: createNoteMutation.reset,
    resetUpdateError: updateNoteMutation.reset,
    resetDeleteError: deleteNoteMutation.reset,
    resetRescueError: rescueNoteMutation.reset,
  }
}
