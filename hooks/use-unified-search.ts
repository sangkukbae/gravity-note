'use client'

import { useCallback, useReducer, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import type {
  UnifiedNoteResult,
  UnifiedNotesResponse,
  UnifiedSearchState,
  UnifiedSearchAction,
  UnifiedNotesOptions,
  NoteTimeSection,
  TimeGroup,
  TemporalBoundaries,
  UnifiedSearchMetadata,
} from '@/types/unified'
import type { Note } from '@/lib/supabase/realtime'

// Initial state for the search reducer
const initialState: UnifiedSearchState = {
  query: '',
  mode: 'browse',
  isLoading: false,
  results: null,
  error: null,
  options: {
    maxResults: 200,
    groupByTime: true,
    maxPerGroup: 50,
    showEmptyGroups: false,
    useEnhancedSearch: true,
  },
}

// Reducer function for managing search state
function searchReducer(
  state: UnifiedSearchState,
  action: UnifiedSearchAction
): UnifiedSearchState {
  switch (action.type) {
    case 'SET_QUERY':
      return {
        ...state,
        query: action.payload,
        mode: action.payload.trim() ? 'search' : 'browse',
      }

    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
      }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      }

    case 'SET_RESULTS':
      return {
        ...state,
        results: action.payload,
        isLoading: false,
        error: null,
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      }

    case 'SET_OPTIONS':
      return {
        ...state,
        options: { ...state.options, ...action.payload },
      }

    case 'RESET':
      return initialState

    case 'CLEAR_RESULTS':
      return {
        ...state,
        results: null,
        error: null,
      }

    default:
      return state
  }
}

/**
 * Unified search hook that handles both search and browse operations
 * Uses useReducer for predictable state management
 * Replaces the multiple search functions in use-notes-mutations.ts
 */
export function useUnifiedSearch() {
  const [state, dispatch] = useReducer(searchReducer, initialState)
  const { user } = useAuthStore()
  const supabase = useMemo(() => createClient(), [])

  // Safely convert possibly null/invalid date strings to milliseconds
  const safeDateMs = useCallback((value: string | null | undefined): number => {
    if (!value) return 0
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? 0 : ms
  }, [])

  // Utility functions for temporal grouping
  const getTemporalBoundaries = useCallback((): TemporalBoundaries => {
    const now = new Date()

    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const lastWeek = new Date(now)
    lastWeek.setDate(now.getDate() - 7)
    lastWeek.setHours(0, 0, 0, 0)

    const lastMonth = new Date(now)
    lastMonth.setDate(now.getDate() - 30)
    lastMonth.setHours(0, 0, 0, 0)

    return { yesterday, lastWeek, lastMonth }
  }, [])

  const classifyNoteByTime = useCallback(
    (updatedAt: string | null, boundaries: TemporalBoundaries): TimeGroup => {
      const noteDate = new Date(safeDateMs(updatedAt))

      if (noteDate >= boundaries.yesterday) return 'yesterday'
      if (noteDate >= boundaries.lastWeek) return 'last_week'
      if (noteDate >= boundaries.lastMonth) return 'last_month'
      return 'earlier'
    },
    [safeDateMs]
  )

  const groupNotesByTime = useCallback(
    (notes: UnifiedNoteResult[]): NoteTimeSection[] => {
      // Initialize groups
      const groups: Record<TimeGroup, UnifiedNoteResult[]> = {
        yesterday: [],
        last_week: [],
        last_month: [],
        earlier: [],
        all: [],
      }

      // Display names for each time group
      const displayNames: Record<TimeGroup, string> = {
        yesterday: 'Yesterday',
        last_week: 'Last Week',
        last_month: 'Last 30 Days',
        earlier: 'Earlier',
        all: 'All Notes',
      }

      // Sort notes into groups
      notes.forEach(note => {
        groups[note.time_group].push(note)
      })

      // Convert to sections array, filtering empty groups and sorting notes within each group
      return (
        Object.entries(groups)
          .filter(([_, groupNotes]) => groupNotes.length > 0)
          .map(([timeGroup, groupNotes]) => ({
            timeGroup: timeGroup as TimeGroup,
            displayName: displayNames[timeGroup as TimeGroup],
            notes: groupNotes.sort(
              (a, b) => safeDateMs(b.updated_at) - safeDateMs(a.updated_at)
            ),
            totalCount: groupNotes.length,
            isExpanded: true, // Default to expanded
          }))
          // Sort sections by time group priority
          .sort((a, b) => {
            const priority: Record<TimeGroup, number> = {
              yesterday: 1,
              last_week: 2,
              last_month: 3,
              earlier: 4,
              all: 5,
            }
            return priority[a.timeGroup] - priority[b.timeGroup]
          })
      )
    },
    [safeDateMs]
  )

  // Fallback to basic ILIKE search for compatibility
  const searchNotesBasic = useCallback(
    async (
      query: string,
      options: UnifiedNotesOptions
    ): Promise<UnifiedNoteResult[]> => {
      if (!user?.id || !query.trim()) {
        return []
      }

      const { maxResults = 50 } = options
      const trimmedQuery = query.trim()

      try {
        // 1) Try normalized columns
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          // Use normalized generated columns if present; falls back gracefully if missing
          .or(
            `content_norm.ilike.%${trimmedQuery}%,title_norm.ilike.%${trimmedQuery}%`
          )
          .order('updated_at', { ascending: false })
          .limit(maxResults)

        if (error) {
          throw new Error(`Failed to search notes: ${error.message}`)
        }

        let rows = data || []

        // 1.5) If normalized path returned empty, fallback to raw ILIKE (compat for environments
        // where generated columns may not be available yet)
        if (rows.length === 0) {
          const { data: rawData } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .or(`content.ilike.%${trimmedQuery}%,title.ilike.%${trimmedQuery}%`)
            .order('updated_at', { ascending: false })
            .limit(maxResults)
          if (rawData && rawData.length > 0) rows = rawData
        }

        // No direct substring match? Try a tolerant fallback that allows
        // arbitrary characters between query characters (e.g. "12312 3" for "123123").
        if (rows.length === 0 && trimmedQuery.length >= 3) {
          const expanded = `%${trimmedQuery.split('').join('%')}%`
          const { data: looseData, error: looseError } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .or(`content_norm.ilike.${expanded},title_norm.ilike.${expanded}`)
            .order('updated_at', { ascending: false })
            .limit(maxResults)

          if (!looseError && looseData) {
            rows = looseData
          }

          // Fallback loose on raw as final attempt
          if (rows.length === 0) {
            const { data: looseRaw } = await supabase
              .from('notes')
              .select('*')
              .eq('user_id', user.id)
              .or(`content.ilike.${expanded},title.ilike.${expanded}`)
              .order('updated_at', { ascending: false })
              .limit(maxResults)
            if (looseRaw && looseRaw.length > 0) rows = looseRaw
          }
        }

        const boundaries = getTemporalBoundaries()

        // Prepare client-side highlighter (<mark>) for substring queries
        const escapeRegExp = (s: string) =>
          s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'gi')
        const highlight = (text: string | null) => {
          if (!text) return text as any
          return text.replace(pattern, '<mark>$1</mark>')
        }

        // Convert to unified format with client-side classification + highlighting
        return rows.map((note: Note) => ({
          ...note,
          time_group: classifyNoteByTime(note.updated_at, boundaries),
          group_rank: 1,
          highlighted_content: highlight(note.content),
          highlighted_title: highlight(note.title ?? ''),
          search_rank: 0.5, // Default rank for basic search
        }))
      } catch (err) {
        throw err
      }
    },
    [user?.id, supabase, getTemporalBoundaries, classifyNoteByTime]
  )

  // Main unified operation function
  const executeUnifiedOperation = useCallback(
    async (
      query: string = '',
      options: UnifiedNotesOptions = {}
    ): Promise<UnifiedNotesResponse> => {
      const startTime = performance.now()
      const finalOptions = { ...state.options, ...options }
      const {
        maxResults = 200,
        groupByTime = true,
        useEnhancedSearch = true,
      } = finalOptions

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const trimmedQuery = query.trim()
      const isSearchMode = trimmedQuery.length > 0

      try {
        if (isSearchMode) {
          // ILIKE-only search path (browser-like substring search)
          const basicResults = await searchNotesBasic(
            trimmedQuery,
            finalOptions
          )
          const sections = groupByTime
            ? groupNotesByTime(basicResults)
            : [
                {
                  timeGroup: 'all' as TimeGroup,
                  displayName: 'Search Results',
                  notes: basicResults,
                  totalCount: basicResults.length,
                  isExpanded: true,
                },
              ]

          const endTime = performance.now()
          const groupCounts = basicResults.reduce(
            (acc, note) => {
              acc[note.time_group] = (acc[note.time_group] || 0) + 1
              return acc
            },
            {} as Record<TimeGroup, number>
          )

          return {
            sections,
            totalNotes: basicResults.length,
            metadata: {
              searchTime: Math.round(endTime - startTime),
              totalResults: basicResults.length,
              usedEnhancedSearch: false,
              query: trimmedQuery,
              temporalGrouping: groupByTime,
              groupCounts,
              mode: 'search',
            },
          }
        }

        // Browse mode with latest notes
        const { data: browseData, error: browseError } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(maxResults)

        if (browseError) {
          throw new Error(`Failed to browse notes: ${browseError.message}`)
        }

        const boundaries = getTemporalBoundaries()
        const browseResults: UnifiedNoteResult[] = (browseData || []).map(
          (note: Note) => ({
            ...note,
            time_group: classifyNoteByTime(note.updated_at, boundaries),
            group_rank: 1,
            highlighted_content: note.content,
            highlighted_title: note.title,
            search_rank: 0.0,
          })
        )

        const sections = groupByTime
          ? groupNotesByTime(browseResults)
          : [
              {
                timeGroup: 'all' as TimeGroup,
                displayName: 'All Notes',
                notes: browseResults,
                totalCount: browseResults.length,
                isExpanded: true,
              },
            ]

        const endTime = performance.now()
        const groupCounts = browseResults.reduce(
          (acc, note) => {
            acc[note.time_group] = (acc[note.time_group] || 0) + 1
            return acc
          },
          {} as Record<TimeGroup, number>
        )

        return {
          sections,
          totalNotes: browseResults.length,
          metadata: {
            searchTime: Math.round(endTime - startTime),
            totalResults: browseResults.length,
            usedEnhancedSearch: false,
            query: '',
            temporalGrouping: groupByTime,
            groupCounts,
            mode: 'browse',
          },
        }
      } catch (error) {
        console.error('Unified operation error:', error)
        throw error
      }
    },
    [
      user?.id,
      supabase,
      state.options,
      searchNotesBasic,
      groupNotesByTime,
      classifyNoteByTime,
      getTemporalBoundaries,
    ]
  )

  // Public API functions
  const setQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_QUERY', payload: query })
  }, [])

  const setMode = useCallback((mode: 'search' | 'browse') => {
    dispatch({ type: 'SET_MODE', payload: mode })
  }, [])

  const setOptions = useCallback((options: Partial<UnifiedNotesOptions>) => {
    dispatch({ type: 'SET_OPTIONS', payload: options })
  }, [])

  const search = useCallback(
    async (query?: string, options?: UnifiedNotesOptions) => {
      const searchQuery = query !== undefined ? query : state.query
      const searchOptions = options || state.options

      dispatch({ type: 'SET_LOADING', payload: true })

      try {
        const results = await executeUnifiedOperation(
          searchQuery,
          searchOptions
        )
        dispatch({ type: 'SET_RESULTS', payload: results })
        return results
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Search failed'
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
        throw error
      }
    },
    [state.query, state.options, executeUnifiedOperation]
  )

  const browse = useCallback(
    async (options?: UnifiedNotesOptions) => {
      const browseOptions = options || state.options

      dispatch({ type: 'SET_LOADING', payload: true })

      try {
        const results = await executeUnifiedOperation('', browseOptions)
        dispatch({ type: 'SET_RESULTS', payload: results })
        return results
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Browse failed'
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
        throw error
      }
    },
    [state.options, executeUnifiedOperation]
  )

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const clearResults = useCallback(() => {
    dispatch({ type: 'CLEAR_RESULTS' })
  }, [])

  return {
    // State
    state,

    // Actions
    setQuery,
    setMode,
    setOptions,
    search,
    browse,
    reset,
    clearResults,

    // Computed values
    hasQuery: state.query.trim().length > 0,
    hasResults: state.results !== null,
    hasError: state.error !== null,
  }
}
