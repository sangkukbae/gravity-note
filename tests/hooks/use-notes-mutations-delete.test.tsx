import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useNotesMutations } from '@/hooks/use-notes-mutations'
import type { Note } from '@/components/notes/note-item'

// Mock fetch for API calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock the offline outbox
const mockOutbox = {
  addToOutbox: vi.fn(),
  processOutbox: vi.fn(),
}
vi.mock('@/lib/offline/outbox', () => ({
  createOutboxItem: vi.fn((type, payload, metadata) => ({
    type,
    payload,
    ...metadata,
    retryCount: 0,
    timestamp: Date.now(),
  })),
  enqueue: vi.fn(),
  flush: vi.fn(),
}))

// Mock the auth store
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
}
vi.mock('@/lib/stores/auth', () => ({
  useAuthStore: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}))

// Mock offline and network status
vi.mock('@/hooks/use-offline-status', () => ({
  useOfflineStatus: () => ({
    effectiveOnline: true,
  }),
}))

vi.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    effectiveOnline: true,
    isOffline: false,
    quality: 'good',
    isPoorQuality: false,
    latency: 50,
  }),
}))

// Mock unified search hook
vi.mock('@/hooks/use-unified-search', () => ({
  useUnifiedSearch: () => ({
    search: vi.fn(),
    browse: vi.fn(),
    state: {},
    setQuery: vi.fn(),
    setMode: vi.fn(),
    setOptions: vi.fn(),
    reset: vi.fn(),
    clearResults: vi.fn(),
  }),
}))

// Mock analytics hook
vi.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackNoteCreation: vi.fn(),
    trackNoteRescue: vi.fn(),
    trackSearch: vi.fn(),
    trackError: vi.fn(),
  }),
}))

// Mock notes for testing
const mockNotes: Note[] = [
  {
    id: 'note-1',
    content: 'First note content',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_id: 'test-user-id',
    is_rescued: false,
  },
  {
    id: 'note-2',
    content: 'Second note content',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    user_id: 'test-user-id',
    is_rescued: false,
  },
  {
    id: 'temp_12345',
    content: 'Temporary note',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    user_id: 'test-user-id',
    is_rescued: false,
  },
]

describe('useNotesMutations - Delete Functionality', () => {
  let queryClient: QueryClient
  let wrapper: React.ComponentType<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    // Setup initial query data with the correct key format
    queryClient.setQueryData(['notes', 'test-user-id'], mockNotes)

    // Reset all mocks
    vi.clearAllMocks()

    // Configure successful fetch response for DELETE requests
    mockFetch.mockImplementation(async (url: string, options: any) => {
      if (options?.method === 'DELETE' && url.includes('/api/notes')) {
        return new Response(null, { status: 200 })
      }
      return new Response('Not Found', { status: 404 })
    })
  })

  describe('deleteNoteAsync', () => {
    it('successfully deletes a regular note', async () => {
      const { result } = renderHook(() => useNotesMutations(), { wrapper })

      await waitFor(() => {
        expect(result.current.deleteNoteAsync).toBeDefined()
      })

      // Execute delete
      await result.current.deleteNoteAsync('note-1')

      // Verify API was called with correct URL and method
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/notes?id=note-1',
        expect.objectContaining({ method: 'DELETE' })
      )

      // Verify note was removed from query cache
      const notesAfterDelete = queryClient.getQueryData<Note[]>([
        'notes',
        'test-user-id',
      ])
      expect(notesAfterDelete).not.toContainEqual(
        expect.objectContaining({ id: 'note-1' })
      )
      expect(notesAfterDelete).toHaveLength(2) // Original 3 minus 1 deleted
    })

    it('handles temporary note deletion locally only', async () => {
      const { result } = renderHook(() => useNotesMutations(), { wrapper })

      await waitFor(() => {
        expect(result.current.deleteNoteAsync).toBeDefined()
      })

      // Execute delete on temporary note
      await result.current.deleteNoteAsync('temp_12345')

      // Verify API was NOT called for temporary note
      expect(mockFetch).not.toHaveBeenCalled()

      // Verify temporary note was removed from query cache
      const notesAfterDelete = queryClient.getQueryData<Note[]>([
        'notes',
        'test-user-id',
      ])
      expect(notesAfterDelete).not.toContainEqual(
        expect.objectContaining({ id: 'temp_12345' })
      )
      expect(notesAfterDelete).toHaveLength(2) // Original 3 minus 1 deleted
    })

    it('implements optimistic updates correctly', async () => {
      const { result } = renderHook(() => useNotesMutations(), { wrapper })

      await waitFor(() => {
        expect(result.current.deleteNoteAsync).toBeDefined()
      })

      // Verify note exists before deletion
      let currentNotes = queryClient.getQueryData<Note[]>([
        'notes',
        'test-user-id',
      ])
      expect(currentNotes).toContainEqual(
        expect.objectContaining({ id: 'note-1' })
      )

      // Start delete operation (but don't await it)
      const deletePromise = result.current.deleteNoteAsync('note-1')

      // Wait for optimistic update to be applied
      await waitFor(() => {
        const updatedNotes = queryClient.getQueryData<Note[]>([
          'notes',
          'test-user-id',
        ])
        expect(updatedNotes).not.toContainEqual(
          expect.objectContaining({ id: 'note-1' })
        )
      })

      await deletePromise
    })

    it('handles network errors gracefully with offline fallback', async () => {
      // Configure error response
      mockFetch.mockImplementation(async () => {
        throw new Error('Network error')
      })

      const { result } = renderHook(() => useNotesMutations(), { wrapper })

      await waitFor(() => {
        expect(result.current.deleteNoteAsync).toBeDefined()
      })

      // Verify note exists before deletion
      let currentNotes = queryClient.getQueryData<Note[]>([
        'notes',
        'test-user-id',
      ])
      expect(currentNotes).toContainEqual(
        expect.objectContaining({ id: 'note-1' })
      )

      // Attempt to delete (should succeed with offline fallback)
      const result1 = await result.current.deleteNoteAsync('note-1')
      expect(result1).toBe('note-1')

      // Verify optimistic update still removed the note (offline fallback behavior)
      currentNotes = queryClient.getQueryData<Note[]>(['notes', 'test-user-id'])
      expect(currentNotes).not.toContainEqual(
        expect.objectContaining({ id: 'note-1' })
      )
    })

    it('handles non-existent note deletion gracefully', async () => {
      const { result } = renderHook(() => useNotesMutations(), { wrapper })

      await waitFor(() => {
        expect(result.current.deleteNoteAsync).toBeDefined()
      })

      // Try to delete a note that doesn't exist in cache
      await result.current.deleteNoteAsync('non-existent-note')

      // Should not throw error, should call API anyway
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/notes?id=non-existent-note',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('maintains referential stability of deleteNoteAsync', () => {
      const { result, rerender } = renderHook(() => useNotesMutations(), {
        wrapper,
      })

      const firstRender = result.current.deleteNoteAsync
      rerender()
      const secondRender = result.current.deleteNoteAsync

      expect(firstRender).toBe(secondRender)
    })

    it('handles concurrent delete operations correctly', async () => {
      const { result } = renderHook(() => useNotesMutations(), { wrapper })

      await waitFor(() => {
        expect(result.current.deleteNoteAsync).toBeDefined()
      })

      // Start multiple delete operations simultaneously
      const deletePromises = [
        result.current.deleteNoteAsync('note-1'),
        result.current.deleteNoteAsync('note-2'),
      ]

      await Promise.all(deletePromises)

      // Verify both notes were deleted
      const notesAfterDelete = queryClient.getQueryData<Note[]>([
        'notes',
        'test-user-id',
      ])
      expect(notesAfterDelete).toHaveLength(1) // Only temporary note should remain
      expect(notesAfterDelete?.[0]?.id).toBe('temp_12345')
    })

    it('logs temporary note deletion', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { result } = renderHook(() => useNotesMutations(), { wrapper })

      await waitFor(() => {
        expect(result.current.deleteNoteAsync).toBeDefined()
      })

      await result.current.deleteNoteAsync('temp_12345')

      expect(consoleSpy).toHaveBeenCalledWith(
        'Deleting temporary note from local state:',
        'temp_12345'
      )

      consoleSpy.mockRestore()
    })

    it('returns the deleted note ID', async () => {
      const { result } = renderHook(() => useNotesMutations(), { wrapper })

      await waitFor(() => {
        expect(result.current.deleteNoteAsync).toBeDefined()
      })

      const deletedId = await result.current.deleteNoteAsync('note-1')
      expect(deletedId).toBe('note-1')
    })
  })
})
