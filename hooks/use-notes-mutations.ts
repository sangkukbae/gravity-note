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
import type {
  GroupedNote,
  NoteTimeSection,
  GroupedNotesResponse,
  TimeGroup,
  TemporalBoundaries,
  GroupedSearchMetadata,
  TemporalGroupingOptions,
} from '@/types/temporal'

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

  // Temporal grouping utility functions
  const getTemporalBoundaries = useCallback((): TemporalBoundaries => {
    const now = new Date()

    // Yesterday start (beginning of yesterday)
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    // Last week start (7 days ago)
    const lastWeek = new Date(now)
    lastWeek.setDate(now.getDate() - 7)
    lastWeek.setHours(0, 0, 0, 0)

    // Last month start (30 days ago)
    const lastMonth = new Date(now)
    lastMonth.setDate(now.getDate() - 30)
    lastMonth.setHours(0, 0, 0, 0)

    return { yesterday, lastWeek, lastMonth }
  }, [])

  const classifyNoteByTime = useCallback(
    (updatedAt: string, boundaries: TemporalBoundaries): TimeGroup => {
      const noteDate = new Date(updatedAt)

      if (noteDate >= boundaries.yesterday) return 'yesterday'
      if (noteDate >= boundaries.lastWeek) return 'last_week'
      if (noteDate >= boundaries.lastMonth) return 'last_month'
      return 'earlier'
    },
    []
  )

  const groupNotesByTime = useCallback(
    (notes: GroupedNote[]): NoteTimeSection[] => {
      // Initialize groups
      const groups: Record<TimeGroup, GroupedNote[]> = {
        yesterday: [],
        last_week: [],
        last_month: [],
        earlier: [],
      }

      // Display names for each time group
      const displayNames: Record<TimeGroup, string> = {
        yesterday: 'Yesterday',
        last_week: 'Last Week',
        last_month: 'Last 30 Days',
        earlier: 'Earlier',
      }

      // Sort notes into groups
      notes.forEach(note => {
        groups[note.time_group].push(note)
      })

      // Convert to sections array, filtering empty groups and sorting notes within each group
      return (
        Object.entries(groups)
          .filter(([_, notes]) => notes.length > 0)
          .map(([timeGroup, notes]) => ({
            timeGroup: timeGroup as TimeGroup,
            displayName: displayNames[timeGroup as TimeGroup],
            notes: notes.sort(
              (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime()
            ),
            totalCount: notes.length,
            isExpanded: true, // Default to expanded
          }))
          // Sort sections by time group priority
          .sort((a, b) => {
            const priority: Record<TimeGroup, number> = {
              yesterday: 1,
              last_week: 2,
              last_month: 3,
              earlier: 4,
            }
            return priority[a.timeGroup] - priority[b.timeGroup]
          })
      )
    },
    []
  )

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

  // Basic ILIKE search (fallback/legacy mode) with enhanced Korean text support
  const searchNotesBasic = useCallback(
    async (query: string, maxResults: number = 50): Promise<Note[]> => {
      if (!user?.id || !query.trim()) {
        return []
      }

      const trimmedQuery = query.trim()

      try {
        const { data, error } = await stableSupabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .or(`content.ilike.%${trimmedQuery}%,title.ilike.%${trimmedQuery}%`)
          .order('updated_at', { ascending: false })
          .limit(maxResults)

        if (data && data.length > 0) {
        } else {
          // Additional debugging: check if any notes exist at all
          const { data: allNotes, error: allError } = await stableSupabase
            .from('notes')
            .select('id, content, title')
            .eq('user_id', user.id)
            .limit(5)
        }

        if (error) {
          console.error('🔍 [KOREAN DEBUG] searchNotesBasic - error:', error)
          throw new Error(`Failed to search notes: ${error.message}`)
        }

        return data || []
      } catch (err) {
        console.error('🔍 [KOREAN DEBUG] searchNotesBasic - exception:', err)
        throw err
      }
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

        // If enhanced search returns no results, fall back to basic search
        // This handles cases where enhanced search fails or filters too aggressively
        if (results.length === 0) {
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

  // Enhanced search function with temporal grouping support
  const searchNotesGrouped = useCallback(
    async (
      query: string,
      options: SearchOptions & TemporalGroupingOptions = {}
    ): Promise<GroupedNotesResponse> => {
      const startTime = performance.now()

      if (!user?.id || !query.trim()) {
        // Return empty grouped structure
        return {
          sections: [],
          totalNotes: 0,
          metadata: {
            searchTime: 0,
            totalResults: 0,
            usedEnhancedSearch: false,
            query: query.trim(),
            temporalGrouping: options.groupByTime ?? true,
            groupCounts: {
              yesterday: 0,
              last_week: 0,
              last_month: 0,
              earlier: 0,
            },
          },
        }
      }

      const { maxResults = 200, groupByTime = true } = options
      const trimmedQuery = query.trim()

      try {
        // For now, use existing search and add client-side grouping
        // TODO: Later, this will use the new database function search_notes_enhanced_grouped
        const searchResult = await searchNotesEnhanced(trimmedQuery, {
          maxResults,
        })

        const boundaries = getTemporalBoundaries()

        // Convert regular notes to grouped notes with time classification
        const groupedResults: GroupedNote[] = searchResult.results.map(
          note => ({
            ...note,
            time_group: classifyNoteByTime(note.updated_at, boundaries),
            group_rank: 1, // Will be properly calculated by database function later
          })
        )

        const endTime = performance.now()

        if (groupByTime) {
          const sections = groupNotesByTime(groupedResults)
          const groupCounts = groupedResults.reduce(
            (acc, note) => {
              acc[note.time_group] = (acc[note.time_group] || 0) + 1
              return acc
            },
            {} as Record<TimeGroup, number>
          )

          return {
            sections,
            totalNotes: groupedResults.length,
            metadata: {
              searchTime: Math.round(endTime - startTime),
              totalResults: groupedResults.length,
              usedEnhancedSearch: searchResult.metadata.usedEnhancedSearch,
              query: trimmedQuery,
              temporalGrouping: true,
              groupCounts,
            },
          }
        } else {
          // Fallback to flat structure
          return {
            sections: [
              {
                timeGroup: 'yesterday' as TimeGroup,
                displayName: 'Search Results',
                notes: groupedResults,
                totalCount: groupedResults.length,
                isExpanded: true,
              },
            ],
            totalNotes: groupedResults.length,
            metadata: {
              searchTime: Math.round(endTime - startTime),
              totalResults: groupedResults.length,
              usedEnhancedSearch: searchResult.metadata.usedEnhancedSearch,
              query: trimmedQuery,
              temporalGrouping: false,
              groupCounts: {
                yesterday: groupedResults.length,
                last_week: 0,
                last_month: 0,
                earlier: 0,
              },
            },
          }
        }
      } catch (error) {
        console.error('Grouped search error:', error)

        // Fallback to basic search with client-side grouping
        const basicResults = await searchNotesBasic(trimmedQuery, maxResults)
        const boundaries = getTemporalBoundaries()

        const groupedBasicResults: GroupedNote[] = basicResults.map(note => ({
          ...note,
          time_group: classifyNoteByTime(note.updated_at, boundaries),
          group_rank: 1,
          highlighted_content: note.content,
          highlighted_title: note.title,
          search_rank: 0.5,
        }))

        const sections = groupNotesByTime(groupedBasicResults)
        const endTime = performance.now()

        return {
          sections,
          totalNotes: basicResults.length,
          metadata: {
            searchTime: Math.round(endTime - startTime),
            totalResults: basicResults.length,
            usedEnhancedSearch: false,
            query: trimmedQuery,
            temporalGrouping: groupByTime,
            groupCounts: groupedBasicResults.reduce(
              (acc, note) => {
                acc[note.time_group] = (acc[note.time_group] || 0) + 1
                return acc
              },
              {} as Record<TimeGroup, number>
            ),
          },
        }
      }
    },
    [
      user?.id,
      searchNotesEnhanced,
      searchNotesBasic,
      getTemporalBoundaries,
      classifyNoteByTime,
      groupNotesByTime,
    ]
  )

  // Browse function for temporal grouping (non-search mode)
  const getNotesGrouped = useCallback(
    async (
      options: { maxResults?: number; offset?: number } = {}
    ): Promise<GroupedNotesResponse> => {
      if (!user?.id) {
        return { sections: [], totalNotes: 0 }
      }

      const { maxResults = 200, offset = 0 } = options

      try {
        // For now, get regular notes and group client-side
        // TODO: Later, this will use the new database function get_notes_grouped_by_time
        const { data, error } = await stableSupabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .range(offset, offset + maxResults - 1)

        if (error) {
          throw new Error(`Failed to fetch notes: ${error.message}`)
        }

        const notes = data || []
        const boundaries = getTemporalBoundaries()

        // Convert to grouped notes
        const groupedResults: GroupedNote[] = notes.map(note => ({
          ...note,
          time_group: classifyNoteByTime(note.updated_at, boundaries),
          group_rank: 1,
        }))

        const sections = groupNotesByTime(groupedResults)

        return {
          sections,
          totalNotes: groupedResults.length,
        }
      } catch (error) {
        console.error('Grouped notes fetch error:', error)
        throw error
      }
    },
    [
      user?.id,
      stableSupabase,
      getTemporalBoundaries,
      classifyNoteByTime,
      groupNotesByTime,
    ]
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

    // Temporal grouping functions
    searchNotesGrouped,
    getNotesGrouped,

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
