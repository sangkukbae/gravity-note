'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { RealtimeNotesManager, type Note } from '@/lib/supabase/realtime'
import { useAuthStore } from '@/lib/stores/auth'

export interface UseNotesRealtimeOptions {
  enabled?: boolean
  onRealtimeError?: (error: Error) => void
  fallbackPollingInterval?: number // Fallback to polling if real-time fails
}

export interface NotesRealtimeState {
  isRealtimeConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastRealtimeActivity: Date | null
  realtimeError: Error | null
}

/**
 * Hook that combines React Query with Supabase real-time for notes
 * Provides seamless real-time updates with fallback to polling
 */
export function useNotesRealtime(options: UseNotesRealtimeOptions = {}) {
  const {
    enabled = true,
    onRealtimeError,
    fallbackPollingInterval = 30000, // 30 seconds
  } = options

  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = useMemo(() => createClient(), [])

  // Real-time manager instance
  const realtimeManagerRef = useRef<RealtimeNotesManager | null>(null)

  // Real-time connection state
  const [realtimeState, setRealtimeState] = useState<NotesRealtimeState>({
    isRealtimeConnected: false,
    connectionStatus: 'disconnected',
    lastRealtimeActivity: null,
    realtimeError: null,
  })

  // Stabilize query key to prevent unnecessary re-renders
  const notesQueryKey = useMemo(() => ['notes', user?.id], [user?.id])

  // Fetch notes function
  const fetchNotes = useCallback(async (): Promise<Note[]> => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch notes: ${error.message}`)
    }

    return data || []
  }, [user?.id, supabase])

  // React Query for notes with conditional polling
  const notesQuery = useQuery({
    queryKey: notesQueryKey,
    queryFn: fetchNotes,
    enabled: enabled && !!user?.id,
    staleTime: realtimeState.isRealtimeConnected ? Infinity : 1000 * 60 * 5, // 5 min when offline
    refetchInterval: realtimeState.isRealtimeConnected
      ? false
      : fallbackPollingInterval,
    refetchOnWindowFocus: !realtimeState.isRealtimeConnected,
  })

  // Create stable references for real-time event handlers to prevent useEffect dependency loops
  const handleRealtimeInsertRef = useRef<(newNote: Note) => void>()
  const handleRealtimeUpdateRef = useRef<(updatedNote: Note) => void>()
  const handleRealtimeDeleteRef = useRef<(deletedNoteId: string) => void>()
  const handleRealtimeErrorRef = useRef<(error: Error) => void>()

  // Update the handler references when dependencies change
  handleRealtimeInsertRef.current = useCallback(
    (newNote: Note) => {
      setRealtimeState(prev => ({
        ...prev,
        lastRealtimeActivity: new Date(),
      }))

      queryClient.setQueryData<Note[]>(notesQueryKey, (oldNotes = []) => {
        // Check if note already exists to prevent duplicates
        const noteExists = oldNotes.some(note => note.id === newNote.id)
        if (noteExists) {
          return oldNotes
        }

        // Add new note to the beginning of the list
        return [newNote, ...oldNotes]
      })
    },
    [queryClient, notesQueryKey]
  )

  handleRealtimeUpdateRef.current = useCallback(
    (updatedNote: Note) => {
      setRealtimeState(prev => ({
        ...prev,
        lastRealtimeActivity: new Date(),
      }))

      queryClient.setQueryData<Note[]>(notesQueryKey, (oldNotes = []) => {
        // Update the note and re-sort the entire list by updated_at
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
    [queryClient, notesQueryKey]
  )

  handleRealtimeDeleteRef.current = useCallback(
    (deletedNoteId: string) => {
      setRealtimeState(prev => ({
        ...prev,
        lastRealtimeActivity: new Date(),
      }))

      queryClient.setQueryData<Note[]>(notesQueryKey, (oldNotes = []) => {
        return oldNotes.filter(note => note.id !== deletedNoteId)
      })
    },
    [queryClient, notesQueryKey]
  )

  handleRealtimeErrorRef.current = useCallback(
    (error: Error) => {
      console.error('Real-time error:', error)
      setRealtimeState(prev => ({
        ...prev,
        realtimeError: error,
        connectionStatus: 'error',
        isRealtimeConnected: false,
      }))
      onRealtimeError?.(error)
    },
    [onRealtimeError]
  )

  // Stable handler functions that won't cause useEffect to re-run
  const stableHandlers = useMemo(
    () => ({
      handleInsert: (newNote: Note) =>
        handleRealtimeInsertRef.current?.(newNote),
      handleUpdate: (updatedNote: Note) =>
        handleRealtimeUpdateRef.current?.(updatedNote),
      handleDelete: (deletedNoteId: string) =>
        handleRealtimeDeleteRef.current?.(deletedNoteId),
      handleError: (error: Error) => handleRealtimeErrorRef.current?.(error),
    }),
    []
  )

  // Set up real-time subscription
  useEffect(() => {
    if (!enabled || !user?.id) {
      console.log(
        'Real-time setup skipped - enabled:',
        enabled,
        'user:',
        !!user?.id
      )
      return
    }

    console.log('Setting up real-time connection for user:', user.id)
    let isCleanedUp = false

    const setupRealtime = async () => {
      if (isCleanedUp) return

      setRealtimeState(prev => ({ ...prev, connectionStatus: 'connecting' }))

      // Create real-time manager
      realtimeManagerRef.current = new RealtimeNotesManager()

      try {
        if (isCleanedUp) return

        const isConnected = await realtimeManagerRef.current.subscribe({
          userId: user.id,
          onInsert: stableHandlers.handleInsert,
          onUpdate: stableHandlers.handleUpdate,
          onDelete: stableHandlers.handleDelete,
          onError: stableHandlers.handleError,
        })

        if (isCleanedUp) {
          // Clean up if the component was unmounted during setup
          realtimeManagerRef.current?.unsubscribe()
          return
        }

        if (isConnected) {
          console.log('Real-time connection established successfully')
          setRealtimeState(prev => ({
            ...prev,
            isRealtimeConnected: true,
            connectionStatus: 'connected',
            realtimeError: null,
          }))
        } else {
          console.warn('Failed to establish real-time connection')
          setRealtimeState(prev => ({
            ...prev,
            isRealtimeConnected: false,
            connectionStatus: 'error',
          }))
        }
      } catch (error) {
        if (!isCleanedUp) {
          console.error('Error setting up real-time connection:', error)
          stableHandlers.handleError(error as Error)
        }
      }
    }

    setupRealtime()

    // Cleanup on unmount or dependency change
    return () => {
      console.log('Cleaning up real-time connection for user:', user.id)
      isCleanedUp = true
      if (realtimeManagerRef.current) {
        realtimeManagerRef.current.unsubscribe()
        realtimeManagerRef.current = null
      }
      setRealtimeState({
        isRealtimeConnected: false,
        connectionStatus: 'disconnected',
        lastRealtimeActivity: null,
        realtimeError: null,
      })
    }
  }, [enabled, user?.id, stableHandlers])

  // Reconnection function
  const reconnectRealtime = useCallback(async () => {
    if (!realtimeManagerRef.current || !user?.id) {
      return false
    }

    console.log('Attempting to reconnect real-time for user:', user.id)
    setRealtimeState(prev => ({ ...prev, connectionStatus: 'connecting' }))

    try {
      const isConnected = await realtimeManagerRef.current.reconnect()

      if (isConnected) {
        console.log('Real-time reconnection successful')
        setRealtimeState(prev => ({
          ...prev,
          isRealtimeConnected: true,
          connectionStatus: 'connected',
          realtimeError: null,
        }))

        // Refetch data to ensure consistency after reconnection
        queryClient.invalidateQueries({ queryKey: notesQueryKey })

        return true
      } else {
        console.warn('Real-time reconnection failed')
        setRealtimeState(prev => ({
          ...prev,
          isRealtimeConnected: false,
          connectionStatus: 'error',
        }))
        return false
      }
    } catch (error) {
      console.error('Error during real-time reconnection:', error)
      stableHandlers.handleError(error as Error)
      return false
    }
  }, [user?.id, queryClient, notesQueryKey, stableHandlers])

  return {
    // React Query state
    notes: notesQuery.data || [],
    isLoading: notesQuery.isLoading,
    error: notesQuery.error,
    refetch: notesQuery.refetch,

    // Real-time state
    realtimeState,
    reconnectRealtime,

    // Utility functions
    isOfflineMode:
      !realtimeState.isRealtimeConnected && !!fallbackPollingInterval,
  }
}
