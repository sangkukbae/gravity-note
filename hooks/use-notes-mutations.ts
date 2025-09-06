'use client'

import { useAuthStore } from '@/lib/stores/auth'
import { createClient } from '@/lib/supabase/client'
import type { Note, NoteInsert, NoteUpdate } from '@/lib/supabase/realtime'
import {
  transformDatabaseNote,
  transformDatabaseNotes,
} from '@/lib/utils/note-transformers'
import type {
  EnhancedSearchResult,
  SearchMetadata,
  SearchOptions,
} from '@/types/search'
import type {
  GroupedNote,
  GroupedNotesResponse,
  NoteTimeSection,
  TemporalBoundaries,
  TemporalGroupingOptions,
  TimeGroup,
} from '@/types/temporal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useUnifiedSearch } from './use-unified-search'
import { useOfflineStatus } from './use-offline-status'
import { useNetworkStatus } from './use-network-status'
import {
  createOutboxItem,
  enqueue as enqueueOutbox,
  flush as flushOutbox,
} from '@/lib/offline/outbox'
import type { FlushHandler } from '@/lib/offline/outbox'
import { syncQueuedNotes } from '@/lib/offline/sync'
import {
  classifyNetworkError,
  isRetryableNetworkError,
  retryWithBackoff,
  NetworkError,
  type NetworkErrorDetails,
} from '@/lib/errors/network-errors'
import {
  classifyError,
  formatErrorForLogging,
} from '@/lib/errors/classification'
import { useAnalytics } from './use-analytics'

function cryptoRandomId(): string {
  const cryptoObj =
    (typeof globalThis !== 'undefined' && (globalThis as any).crypto) ||
    undefined
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }
  return `${Math.random().toString(36).slice(2)}_${Date.now()}`
}

/**
 * Enhanced error reading with network error classification
 */
async function safeReadNetworkError(
  res: Response,
  requestDetails?: Partial<NetworkErrorDetails>
): Promise<NetworkError> {
  const details: NetworkErrorDetails = {
    httpStatus: res.status,
    httpStatusText: res.statusText,
    responseHeaders: Object.fromEntries(res.headers.entries()),
    ...requestDetails,
  }

  let errorMessage: string
  try {
    const text = await res.text()
    try {
      const json = JSON.parse(text)
      errorMessage =
        json?.error ||
        json?.message ||
        text?.slice(0, 200) ||
        `HTTP ${res.status}: ${res.statusText}`
    } catch {
      errorMessage =
        text?.slice(0, 200) || `HTTP ${res.status}: ${res.statusText}`
    }
  } catch {
    errorMessage = `HTTP ${res.status}: ${res.statusText}`
  }

  return classifyNetworkError(errorMessage, details)
}

/**
 * Enhanced retry logic with network-aware classification
 */
function shouldRetryNetworkError(error: unknown): boolean {
  return isRetryableNetworkError(error)
}

/**
 * Create network request with error handling
 */
async function createNetworkRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const startTime = performance.now()

  try {
    const response = await fetch(url, options)
    const endTime = performance.now()

    if (!response.ok) {
      const networkError = await safeReadNetworkError(response, {
        requestUrl: url,
        requestMethod: options.method || 'GET',
        requestDuration: endTime - startTime,
      })
      throw networkError
    }

    return response
  } catch (error) {
    const endTime = performance.now()

    if (error instanceof NetworkError) {
      throw error
    }

    // Classify other errors as network errors
    throw classifyNetworkError(error, {
      requestUrl: url,
      requestMethod: options.method || 'GET',
      requestDuration: endTime - startTime,
    })
  }
}

/**
 * Hook for note mutations (create, update, delete)
 * Will be enhanced with optimistic updates in Phase 2
 */
export function useNotesMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()
  const offline = useOfflineStatus()
  const { trackNoteCreation, trackNoteRescue, trackSearch, trackError } =
    useAnalytics()
  // Keep network checks lightweight in frequently-mounted hooks
  // Avoid per-instance quality tests that call /api/health on mount
  const networkStatus = useNetworkStatus({
    pingUrl: '/manifest.json',
    pingIntervalMs: 30000,
    enableQualityMonitoring: false,
  })

  // Initialize unified search hook for enhanced search capabilities
  const unifiedSearch = useUnifiedSearch()

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
    (updatedAt: string | null, boundaries: TemporalBoundaries): TimeGroup => {
      const noteDate = new Date(updatedAt ?? 0)

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
                new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
                new Date(a.updated_at ?? a.created_at ?? 0).getTime()
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

  // Create note mutation with enhanced error handling
  const createNoteMutation = useMutation({
    mutationFn: async (content: string): Promise<Note> => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // If offline or network is poor, enqueue and return a temp note optimistically
      if (!offline.effectiveOnline || networkStatus.isOffline) {
        const tempId = `temp_${cryptoRandomId()}`
        const now = new Date().toISOString()

        const optimistic: Note = {
          id: tempId,
          user_id: user.id,
          content,
          title: null,
          created_at: now,
          updated_at: now,
          is_rescued: false,
          original_note_id: null,
        } as Note

        // Enqueue create mutation for background flush
        const item = createOutboxItem(
          'create',
          { content },
          {
            tempId,
          }
        )
        enqueueOutbox(user.id, item)

        return optimistic
      }

      // Create note with retry logic and network error handling
      const executeRequest = async (): Promise<Note> => {
        try {
          const res = await createNetworkRequest('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
          })

          const json = await res.json()
          const note = json?.note
          if (!note) {
            throw new Error('Invalid response: missing note data')
          }

          return transformDatabaseNote(note)
        } catch (error) {
          // If it's a retryable network error, let the retry logic handle it
          if (error instanceof NetworkError && error.isRetryable) {
            throw error
          }

          // For non-retryable errors, fall back to offline queue if appropriate
          if (
            error instanceof NetworkError &&
            (error.networkType === 'authentication' ||
              error.networkType === 'http_server')
          ) {
            console.warn(
              'Network error, falling back to offline queue:',
              error.userMessage
            )

            const tempId = `temp_${cryptoRandomId()}`
            const now = new Date().toISOString()

            const optimistic: Note = {
              id: tempId,
              user_id: user.id,
              content,
              title: null,
              created_at: now,
              updated_at: now,
              is_rescued: false,
              original_note_id: null,
            } as Note

            const item = createOutboxItem('create', { content }, { tempId })
            enqueueOutbox(user.id, item)

            return optimistic
          }

          throw error
        }
      }

      // Execute with retry logic for retryable errors
      try {
        return await retryWithBackoff(
          executeRequest,
          {
            maxAttempts: 3,
            baseDelayMs: 1000,
            maxDelayMs: 10000,
            jitterMs: 500,
            backoffMultiplier: 2,
            retryCondition: (error: NetworkError) => error.isRetryable,
          },
          (attempt, error) => {
            console.warn(
              `Create note retry attempt ${attempt}:`,
              error.userMessage
            )
          }
        )
      } catch (error) {
        // Log error for monitoring
        const errorLog = formatErrorForLogging(error, {
          operation: 'create_note',
          userId: user.id,
          contentLength: content.length,
          networkQuality: networkStatus.quality,
          isOnline: networkStatus.effectiveOnline,
        })

        console.error('Create note failed:', errorLog)

        // Re-throw the classified error
        throw classifyError(error)
      }
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

      // Track analytics for note creation
      trackNoteCreation({
        noteId: newNote.id,
        contentLength: newNote.content.length,
        hasMarkdown: /[#*`_~\[\](){}]|```/.test(newNote.content),
        creationMethod: 'input', // Can be enhanced to detect actual method
      })
    },
    onError: error => {
      // Log additional error context
      console.error('Create note mutation error:', {
        error: error.message,
        networkStatus: networkStatus.quality,
        isOnline: networkStatus.effectiveOnline,
        isOffline: offline.effectiveOnline,
      })
    },
  })

  // Update note mutation with enhanced error handling
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

      const executeRequest = async (): Promise<Note> => {
        try {
          const res = await createNetworkRequest('/api/notes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, updates }),
          })

          const json = await res.json()
          const note = json?.note
          if (!note) {
            throw new Error('Invalid response: missing note data')
          }

          return transformDatabaseNote(note)
        } catch (error) {
          throw classifyError(error)
        }
      }

      try {
        return await retryWithBackoff(
          executeRequest,
          {
            maxAttempts: 2,
            baseDelayMs: 1000,
            maxDelayMs: 5000,
            jitterMs: 500,
            backoffMultiplier: 2,
            retryCondition: (error: NetworkError) => error.isRetryable,
          },
          (attempt, error) => {
            console.warn(
              `Update note retry attempt ${attempt}:`,
              error.userMessage
            )
          }
        )
      } catch (error) {
        const errorLog = formatErrorForLogging(error, {
          operation: 'update_note',
          userId: user.id,
          noteId: id,
          networkQuality: networkStatus.quality,
          isOnline: networkStatus.effectiveOnline,
        })

        console.error('Update note failed:', errorLog)
        throw classifyError(error)
      }
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
            new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
            new Date(a.updated_at ?? a.created_at ?? 0).getTime()
        )
      })

      // Track analytics for note rescue (if is_rescued is true)
      if (updatedNote.is_rescued) {
        trackNoteRescue({
          noteId: updatedNote.id,
          contentLength: updatedNote.content.length,
          hasMarkdown: /[#*`_~\[\](){}]|```/.test(updatedNote.content),
        })
      }
    },
    onError: error => {
      console.error('Update note mutation error:', {
        error: error.message,
        networkStatus: networkStatus.quality,
        isOnline: networkStatus.effectiveOnline,
      })
    },
  })

  // Delete note mutation with enhanced error handling
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string): Promise<string> => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const executeRequest = async (): Promise<string> => {
        try {
          const res = await createNetworkRequest(
            `/api/notes?id=${encodeURIComponent(noteId)}`,
            {
              method: 'DELETE',
            }
          )

          // Delete operations might not return JSON, just confirm success
          return noteId
        } catch (error) {
          throw classifyError(error)
        }
      }

      try {
        return await retryWithBackoff(
          executeRequest,
          {
            maxAttempts: 2,
            baseDelayMs: 1000,
            maxDelayMs: 5000,
            jitterMs: 500,
            backoffMultiplier: 2,
            retryCondition: (error: NetworkError) => error.isRetryable,
          },
          (attempt, error) => {
            console.warn(
              `Delete note retry attempt ${attempt}:`,
              error.userMessage
            )
          }
        )
      } catch (error) {
        const errorLog = formatErrorForLogging(error, {
          operation: 'delete_note',
          userId: user.id,
          noteId,
          networkQuality: networkStatus.quality,
          isOnline: networkStatus.effectiveOnline,
        })

        console.error('Delete note failed:', errorLog)
        throw classifyError(error)
      }
    },
    onSuccess: deletedNoteId => {
      // Real-time will handle the update, but ensure local state is consistent
      queryClient.setQueryData<Note[]>(notesQueryKey, (oldNotes = []) => {
        return oldNotes.filter(note => note.id !== deletedNoteId)
      })
    },
    onError: error => {
      console.error('Delete note mutation error:', {
        error: error.message,
        networkStatus: networkStatus.quality,
        isOnline: networkStatus.effectiveOnline,
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
          throw new Error(`Failed to search notes: ${error.message}`)
        }

        return transformDatabaseNotes(data || [])
      } catch (err) {
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
        const searchTime = Math.round(endTime - startTime)

        // Track search analytics
        trackSearch({
          query: trimmedQuery,
          resultCount: results.length,
          searchTime,
          searchType: 'enhanced',
        })

        return {
          results,
          metadata: {
            searchTime,
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
        const searchTime = Math.round(endTime - startTime)

        // Track fallback search analytics
        trackSearch({
          query: trimmedQuery,
          resultCount: basicResults.length,
          searchTime,
          searchType: 'basic',
        })

        return {
          results: basicResults.map(note => ({
            ...note,
            highlighted_content: note.content,
            highlighted_title: note.title || null,
            search_rank: 0.5, // Default rank for basic search
          })),
          metadata: {
            searchTime,
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
        // Use the unified database function for temporal search
        const { data, error } = await stableSupabase.rpc('get_notes_unified', {
          user_uuid: user.id,
          search_query: trimmedQuery,
          max_results: maxResults,
          group_by_time: true,
        })

        if (error) {
          throw new Error(`Failed to search notes: ${error.message}`)
        }

        // Convert database results to GroupedNote format
        const groupedResults: GroupedNote[] = (data || []).map((note: any) => ({
          // Map core note fields from database response
          id: note.id,
          user_id: note.user_id || user.id, // Use user.id as fallback if not provided
          title: note.title,
          content: note.content,
          created_at: note.created_at,
          updated_at: note.updated_at,
          is_rescued: note.is_rescued,
          original_note_id: note.original_note_id,

          // Map temporal grouping fields
          time_group: note.time_group as TimeGroup,
          group_rank: note.group_rank || 1,

          // Map search/highlighting fields (should be present in search mode)
          highlighted_content: note.highlighted_content || note.content,
          highlighted_title: note.highlighted_title || note.title,
          search_rank: note.search_rank || 0,
        }))

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
              usedEnhancedSearch: true,
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
              usedEnhancedSearch: true,
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
          time_group: classifyNoteByTime(
            note.updated_at ?? note.created_at,
            boundaries
          ),
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
        // Use the unified database function for temporal note retrieval
        const { data, error } = await stableSupabase.rpc('get_notes_unified', {
          user_uuid: user.id,
          max_results: maxResults,
          group_by_time: true,
        })

        if (error) {
          throw new Error(`Failed to fetch notes: ${error.message}`)
        }

        // Convert database results to GroupedNote format
        const groupedResults: GroupedNote[] = (data || []).map((note: any) => ({
          // Map core note fields from database response
          id: note.id,
          user_id: note.user_id || user.id, // Use user.id as fallback if not provided
          title: note.title,
          content: note.content,
          created_at: note.created_at,
          updated_at: note.updated_at,
          is_rescued: note.is_rescued,
          original_note_id: note.original_note_id,

          // Map temporal grouping fields
          time_group: note.time_group as TimeGroup,
          group_rank: note.group_rank || 1,

          // Map search/highlighting fields (optional, may not be present in browse mode)
          highlighted_content: note.highlighted_content || note.content,
          highlighted_title: note.highlighted_title || note.title,
          search_rank: note.search_rank || 0,
        }))

        const sections = groupNotesByTime(groupedResults)

        return {
          sections,
          totalNotes: groupedResults.length,
        }
      } catch (error) {
        console.error('Grouped notes fetch error:', error)
        // Fallback: fetch notes directly and group client-side
        const { data: browseData, error: browseError } = await stableSupabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(maxResults)

        if (browseError) {
          throw new Error(`Browse fallback failed: ${browseError.message}`)
        }

        const boundaries = getTemporalBoundaries()
        const fallbackResults: GroupedNote[] = (browseData || []).map(
          (note: any) => ({
            ...note,
            time_group: classifyNoteByTime(
              note.updated_at ?? note.created_at,
              boundaries
            ),
            group_rank: 1,
            highlighted_content: note.content,
            highlighted_title: note.title,
            search_rank: 0,
          })
        )

        return {
          sections: groupNotesByTime(fallbackResults),
          totalNotes: fallbackResults.length,
        }
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

    // Legacy search functions (for backward compatibility)
    searchNotes,
    searchNotesEnhanced,
    searchNotesBasic,

    // Legacy temporal grouping functions (for backward compatibility)
    searchNotesGrouped,
    getNotesGrouped,

    // New unified search functions (preferred)
    unifiedSearch: unifiedSearch.search,
    unifiedBrowse: unifiedSearch.browse,
    unifiedState: unifiedSearch.state,
    setSearchQuery: unifiedSearch.setQuery,
    setSearchMode: unifiedSearch.setMode,
    setSearchOptions: unifiedSearch.setOptions,
    resetUnifiedSearch: unifiedSearch.reset,
    clearSearchResults: unifiedSearch.clearResults,

    // Enhanced offline helpers with network error classification
    flushOfflineOutbox: async () => {
      if (!user?.id)
        return { successIds: [], failedIds: [], retriedIds: [], errors: {} }

      const handler: FlushHandler = async item => {
        try {
          if (item.type === 'create') {
            const { content } = item.payload as { content: string }

            try {
              const res = await createNetworkRequest('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, clientId: item.tempId }),
              })

              const json = await res.json()
              const note = json?.note
              if (!note) {
                return {
                  status: 'fail',
                  errorMessage: 'Invalid response: missing note data',
                }
              }

              const persisted = transformDatabaseNote(note)

              if (item.tempId) {
                queryClient.setQueryData<Note[]>(
                  ['notes', user.id],
                  (old = []) => {
                    const idx = old.findIndex(n => n.id === item.tempId)
                    if (idx >= 0) {
                      const next = [...old]
                      next[idx] = persisted
                      return next.sort(
                        (a, b) =>
                          new Date(
                            b.updated_at ?? b.created_at ?? 0
                          ).getTime() -
                          new Date(a.updated_at ?? a.created_at ?? 0).getTime()
                      )
                    }
                    return [persisted, ...old]
                  }
                )
              }

              return { status: 'success', mappedId: persisted.id }
            } catch (error) {
              // Use network error classification to determine retry behavior
              if (error instanceof NetworkError) {
                const shouldRetry =
                  error.isRetryable && error.retryStrategy.retryCondition(error)

                // Log error for monitoring
                const errorLog = formatErrorForLogging(error, {
                  operation: 'flush_outbox_create',
                  userId: user.id,
                  tempId: item.tempId,
                  networkQuality: networkStatus.quality,
                  isOnline: networkStatus.effectiveOnline,
                })

                console.warn('Outbox flush error:', errorLog)

                return {
                  status: shouldRetry ? 'retry' : 'fail',
                  errorMessage: error.userMessage,
                }
              }

              // Classify other errors
              const classifiedError = classifyError(error)
              return {
                status: classifiedError.isRetryable ? 'retry' : 'fail',
                errorMessage: classifiedError.userMessage,
              }
            }
          }

          return { status: 'fail', errorMessage: 'unsupported mutation type' }
        } catch (error: any) {
          const classifiedError = classifyError(error)
          return {
            status: 'retry',
            errorMessage: classifiedError.userMessage || 'flush error',
          }
        }
      }

      // Use enhanced sync with network-aware retry logic
      const result = await syncQueuedNotes({
        userId: user.id,
        handler,
        maxAttempts: 5,
        baseDelayMs: networkStatus.isPoorQuality ? 2000 : 500,
        jitterMs: networkStatus.isPoorQuality ? 1000 : 250,
      })

      return result
    },

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

    // Network status information
    networkStatus: {
      isOnline: networkStatus.isOnline,
      effectiveOnline: networkStatus.effectiveOnline,
      quality: networkStatus.quality,
      isHighQuality: networkStatus.isHighQuality,
      isPoorQuality: networkStatus.isPoorQuality,
      isOffline: networkStatus.isOffline,
      latency: networkStatus.latency,
      downloadSpeed: networkStatus.downloadSpeed,
      lastError: networkStatus.lastError,
      lastCheckedAt: networkStatus.lastCheckedAt,
    },
  }
}
