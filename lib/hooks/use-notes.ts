import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseMutationOptions,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query'
import { notesService } from '@/lib/services/notes'
import type {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  NotesQuery,
  NotesResponse,
} from '@/types'

// Query keys for consistent cache management
export const notesKeys = {
  all: ['notes'] as const,
  lists: () => [...notesKeys.all, 'list'] as const,
  list: (query: NotesQuery) => [...notesKeys.lists(), query] as const,
  details: () => [...notesKeys.all, 'detail'] as const,
  detail: (id: string) => [...notesKeys.details(), id] as const,
  search: (term: string) => [...notesKeys.all, 'search', term] as const,
  recent: () => [...notesKeys.all, 'recent'] as const,
  count: () => [...notesKeys.all, 'count'] as const,
}

/**
 * Hook to fetch notes with pagination and search
 */
export function useNotes(
  query: NotesQuery = {},
  options?: UseQueryOptions<NotesResponse, Error>
) {
  return useQuery({
    queryKey: notesKeys.list(query),
    queryFn: () => notesService.getNotes(query),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Hook to fetch notes with infinite scrolling
 */
export function useInfiniteNotes(
  baseQuery: Omit<NotesQuery, 'offset'> = {},
  options?: Omit<
    UseInfiniteQueryOptions<NotesResponse, Error>,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
) {
  const limit = baseQuery.limit || 20

  return useInfiniteQuery({
    queryKey: notesKeys.list(baseQuery),
    queryFn: ({ pageParam = 0 }) =>
      notesService.getNotes({
        ...baseQuery,
        offset: pageParam as number,
        limit,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined
      return allPages.length * limit
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to fetch a single note by ID
 */
export function useNote(
  id: string,
  options?: UseQueryOptions<Note | null, Error>
) {
  return useQuery({
    queryKey: notesKeys.detail(id),
    queryFn: () => notesService.getNoteById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000, // 10 minutes for individual notes
    ...options,
  })
}

/**
 * Hook to search notes
 */
export function useSearchNotes(
  searchTerm: string,
  options?: Omit<UseQueryOptions<Note[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: notesKeys.search(searchTerm),
    queryFn: () => notesService.searchNotes(searchTerm),
    enabled: searchTerm.trim().length > 0,
    staleTime: 10 * 1000, // 10 seconds for search results
    gcTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  })
}

/**
 * Hook for advanced search with ranking and snippets
 */
export function useAdvancedSearch(
  searchTerm: string,
  searchOptions: {
    limit?: number
    includeSnippets?: boolean
    rankBy?: 'relevance' | 'date'
  } = {},
  options?: UseQueryOptions<
    Array<Note & { rank?: number; snippet?: string }>,
    Error
  >
) {
  return useQuery({
    queryKey: [...notesKeys.search(searchTerm), 'advanced', searchOptions],
    queryFn: () => notesService.advancedSearch(searchTerm, searchOptions),
    enabled: searchTerm.trim().length > 0,
    staleTime: 10 * 1000,
    gcTime: 2 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to fetch recent notes
 */
export function useRecentNotes(
  limit = 10,
  options?: UseQueryOptions<Note[], Error>
) {
  return useQuery({
    queryKey: notesKeys.recent(),
    queryFn: () => notesService.getRecentNotes(limit),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to get notes count
 */
export function useNotesCount(options?: UseQueryOptions<number, Error>) {
  return useQuery({
    queryKey: notesKeys.count(),
    queryFn: () => notesService.getNotesCount(),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to create a new note
 */
export function useCreateNote(
  options?: UseMutationOptions<Note, Error, CreateNoteInput>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateNoteInput) => notesService.createNote(input),
    onSuccess: newNote => {
      // Invalidate and refetch notes lists
      queryClient.invalidateQueries({ queryKey: notesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notesKeys.recent() })
      queryClient.invalidateQueries({ queryKey: notesKeys.count() })

      // Add the new note to the cache
      queryClient.setQueryData(notesKeys.detail(newNote.id), newNote)
    },
    ...options,
  })
}

/**
 * Hook to update a note
 */
export function useUpdateNote(
  options?: UseMutationOptions<
    Note,
    Error,
    UpdateNoteInput,
    { previousNote: Note | undefined }
  >
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateNoteInput) => notesService.updateNote(input),
    onMutate: async (input): Promise<{ previousNote: Note | undefined }> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notesKeys.detail(input.id) })

      // Snapshot the previous value
      const previousNote = queryClient.getQueryData<Note>(
        notesKeys.detail(input.id)
      )

      // Optimistically update to the new value
      if (previousNote) {
        queryClient.setQueryData(notesKeys.detail(input.id), {
          ...previousNote,
          title: input.title !== undefined ? input.title : previousNote.title,
          content:
            input.content !== undefined ? input.content : previousNote.content,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousNote }
    },
    onError: (_error, variables, context) => {
      // Rollback on error
      if (context?.previousNote) {
        queryClient.setQueryData(
          notesKeys.detail(variables.id),
          context.previousNote
        )
      }
    },
    onSuccess: updatedNote => {
      // Update the cache with the server response
      queryClient.setQueryData(notesKeys.detail(updatedNote.id), updatedNote)

      // Invalidate lists to reflect the changes
      queryClient.invalidateQueries({ queryKey: notesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notesKeys.recent() })
    },
    ...options,
  })
}

/**
 * Hook to delete a note
 */
export function useDeleteNote(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notesService.deleteNote(id),
    onSuccess: (_data, deletedId) => {
      // Remove the note from cache
      queryClient.removeQueries({ queryKey: notesKeys.detail(deletedId) })

      // Invalidate and refetch lists
      queryClient.invalidateQueries({ queryKey: notesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notesKeys.recent() })
      queryClient.invalidateQueries({ queryKey: notesKeys.count() })
    },
    ...options,
  })
}

/**
 * Hook to duplicate a note
 */
export function useDuplicateNote(
  options?: UseMutationOptions<Note, Error, string>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notesService.duplicateNote(id),
    onSuccess: newNote => {
      // Invalidate and refetch notes lists
      queryClient.invalidateQueries({ queryKey: notesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notesKeys.recent() })
      queryClient.invalidateQueries({ queryKey: notesKeys.count() })

      // Add the new note to the cache
      queryClient.setQueryData(notesKeys.detail(newNote.id), newNote)
    },
    ...options,
  })
}

/**
 * Hook to prefetch a note
 */
export function usePrefetchNote() {
  const queryClient = useQueryClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: notesKeys.detail(id),
      queryFn: () => notesService.getNoteById(id),
      staleTime: 30 * 1000,
    })
  }
}

/**
 * Hook to invalidate all notes queries
 */
export function useInvalidateNotes() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: notesKeys.all })
  }
}
