import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import { notesKeys } from './use-notes'
import type { Note } from '@/types'
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js'

type NotesChangePayload = RealtimePostgresChangesPayload<{
  [key: string]: any
}>

/**
 * Hook to manage real-time subscriptions for notes
 */
export function useRealTimeNotes() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  const handleInsert = useCallback(
    (payload: NotesChangePayload) => {
      const newNote = payload.new as Note

      // Only process if the note belongs to the current user
      if (newNote.user_id !== user?.id) return

      console.log('Real-time: Note inserted', newNote.id)

      // Add to individual note cache
      queryClient.setQueryData(notesKeys.detail(newNote.id), newNote)

      // Invalidate lists to trigger refetch with proper pagination
      queryClient.invalidateQueries({ queryKey: notesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notesKeys.recent() })
      queryClient.invalidateQueries({ queryKey: notesKeys.count() })
    },
    [queryClient, user?.id]
  )

  const handleUpdate = useCallback(
    (payload: NotesChangePayload) => {
      const updatedNote = payload.new as Note

      // Only process if the note belongs to the current user
      if (updatedNote.user_id !== user?.id) return

      console.log('Real-time: Note updated', updatedNote.id)

      // Update individual note cache
      queryClient.setQueryData(notesKeys.detail(updatedNote.id), updatedNote)

      // Update notes in list queries
      queryClient.setQueriesData(
        { queryKey: notesKeys.lists() },
        (oldData: any) => {
          if (!oldData || !oldData.notes) return oldData

          return {
            ...oldData,
            notes: oldData.notes.map((note: Note) =>
              note.id === updatedNote.id ? updatedNote : note
            ),
          }
        }
      )

      // Update recent notes if applicable
      queryClient.setQueriesData(
        { queryKey: notesKeys.recent() },
        (oldData: Note[] | undefined) => {
          if (!oldData) return oldData

          const noteIndex = oldData.findIndex(
            note => note.id === updatedNote.id
          )
          if (noteIndex === -1) return oldData

          const newData = [...oldData]
          newData[noteIndex] = updatedNote
          return newData
        }
      )
    },
    [queryClient, user?.id]
  )

  const handleDelete = useCallback(
    (payload: NotesChangePayload) => {
      const deletedNote = payload.old as Note

      // Only process if the note belongs to the current user
      if (deletedNote.user_id !== user?.id) return

      console.log('Real-time: Note deleted', deletedNote.id)

      // Remove from individual note cache
      queryClient.removeQueries({ queryKey: notesKeys.detail(deletedNote.id) })

      // Remove from list queries
      queryClient.setQueriesData(
        { queryKey: notesKeys.lists() },
        (oldData: any) => {
          if (!oldData || !oldData.notes) return oldData

          return {
            ...oldData,
            notes: oldData.notes.filter(
              (note: Note) => note.id !== deletedNote.id
            ),
            totalCount: Math.max(0, oldData.totalCount - 1),
          }
        }
      )

      // Remove from recent notes
      queryClient.setQueriesData(
        { queryKey: notesKeys.recent() },
        (oldData: Note[] | undefined) => {
          if (!oldData) return oldData
          return oldData.filter(note => note.id !== deletedNote.id)
        }
      )

      // Invalidate count
      queryClient.invalidateQueries({ queryKey: notesKeys.count() })
    },
    [queryClient, user?.id]
  )

  const subscribe = useCallback(() => {
    if (!user?.id || channelRef.current) return

    console.log('Setting up real-time subscription for notes')

    const channel = supabase
      .channel(`notes:user_id=eq.${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${user.id}`,
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${user.id}`,
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${user.id}`,
        },
        handleDelete
      )
      .subscribe(status => {
        console.log('Real-time subscription status:', status)
      })

    channelRef.current = channel
  }, [user?.id, supabase, handleInsert, handleUpdate, handleDelete])

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      console.log('Unsubscribing from real-time notes')
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [supabase])

  useEffect(() => {
    subscribe()

    return () => {
      unsubscribe()
    }
  }, [subscribe, unsubscribe])

  // Return subscription control functions
  return {
    subscribe,
    unsubscribe,
    isConnected: !!channelRef.current,
  }
}

/**
 * Hook to sync notes when coming back online
 */
export function useOfflineSync() {
  const queryClient = useQueryClient()

  const syncNotes = useCallback(() => {
    console.log('Syncing notes after coming back online')

    // Invalidate all notes queries to trigger fresh fetches
    queryClient.invalidateQueries({ queryKey: notesKeys.all })
  }, [queryClient])

  useEffect(() => {
    const handleOnline = () => {
      syncNotes()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [syncNotes])

  return { syncNotes }
}

/**
 * Hook to manage connection status and handle reconnection
 */
export function useConnectionStatus() {
  const { subscribe, unsubscribe, isConnected } = useRealTimeNotes()

  useEffect(() => {
    const handleOnline = () => {
      if (!isConnected) {
        console.log('Reconnecting to real-time after coming back online')
        subscribe()
      }
    }

    const handleOffline = () => {
      console.log('Going offline, maintaining subscription')
      // Don't unsubscribe immediately, let it handle reconnection automatically
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [subscribe, isConnected])

  return {
    isOnline: navigator.onLine,
    isConnected,
  }
}
