import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { syncService } from '@/lib/services/sync'
import { offlineStorage } from '@/lib/services/offline-storage'
import { useAuthStore } from '@/lib/stores/auth'
import { notesKeys } from './use-notes'
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/types'

/**
 * Hook to manage online/offline status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Hook to manage sync status and operations
 */
export function useSync() {
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'idle' | 'error'>(
    'idle'
  )
  const [pendingCount, setPendingCount] = useState(0)
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await syncService.getPendingSyncCount()
      setPendingCount(count)
    } catch (error) {
      console.error('Failed to get pending sync count:', error)
    }
  }, [])

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    try {
      const result = await syncService.syncPendingChanges()
      await updatePendingCount()

      // Invalidate all notes queries to refresh with synced data
      queryClient.invalidateQueries({ queryKey: notesKeys.all })

      return result
    } catch (error) {
      console.error('Manual sync failed:', error)
      throw error
    }
  }, [queryClient, updatePendingCount])

  useEffect(() => {
    // Listen to sync status changes
    const unsubscribe = syncService.onSyncStatusChange(setSyncStatus)

    // Initialize and update pending count
    updatePendingCount()

    return unsubscribe
  }, [updatePendingCount])

  return {
    syncStatus,
    pendingCount,
    triggerSync,
    isSyncing: syncStatus === 'syncing',
    updatePendingCount,
  }
}

/**
 * Hook for offline-first note operations
 */
export function useOfflineNotes() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isOnline = useNetworkStatus()
  const { updatePendingCount } = useSync()

  const createNoteOffline = useCallback(
    async (input: CreateNoteInput): Promise<Note> => {
      try {
        const note = await syncService.createNoteOffline(input)

        // Update React Query cache optimistically
        queryClient.setQueryData(notesKeys.detail(note.id), note)

        // Invalidate lists to include the new note
        queryClient.invalidateQueries({ queryKey: notesKeys.lists() })
        queryClient.invalidateQueries({ queryKey: notesKeys.recent() })
        queryClient.invalidateQueries({ queryKey: notesKeys.count() })

        await updatePendingCount()
        return note
      } catch (error) {
        console.error('Failed to create note offline:', error)
        throw error
      }
    },
    [queryClient, updatePendingCount]
  )

  const updateNoteOffline = useCallback(
    async (input: UpdateNoteInput): Promise<Note> => {
      try {
        const note = await syncService.updateNoteOffline(input)

        // Update React Query cache optimistically
        queryClient.setQueryData(notesKeys.detail(note.id), note)

        // Update note in lists
        queryClient.setQueriesData(
          { queryKey: notesKeys.lists() },
          (oldData: any) => {
            if (!oldData || !oldData.notes) return oldData
            return {
              ...oldData,
              notes: oldData.notes.map((n: Note) =>
                n.id === note.id ? note : n
              ),
            }
          }
        )

        await updatePendingCount()
        return note
      } catch (error) {
        console.error('Failed to update note offline:', error)
        throw error
      }
    },
    [queryClient, updatePendingCount]
  )

  const deleteNoteOffline = useCallback(
    async (id: string): Promise<void> => {
      try {
        await syncService.deleteNoteOffline(id)

        // Remove from React Query cache
        queryClient.removeQueries({ queryKey: notesKeys.detail(id) })

        // Remove from lists
        queryClient.setQueriesData(
          { queryKey: notesKeys.lists() },
          (oldData: any) => {
            if (!oldData || !oldData.notes) return oldData
            return {
              ...oldData,
              notes: oldData.notes.filter((note: Note) => note.id !== id),
              totalCount: Math.max(0, oldData.totalCount - 1),
            }
          }
        )

        // Invalidate counts
        queryClient.invalidateQueries({ queryKey: notesKeys.count() })

        await updatePendingCount()
      } catch (error) {
        console.error('Failed to delete note offline:', error)
        throw error
      }
    },
    [queryClient, updatePendingCount]
  )

  const getOfflineNotes = useCallback(async (): Promise<Note[]> => {
    if (!user?.id) return []

    try {
      return await offlineStorage.getAllNotes(user.id)
    } catch (error) {
      console.error('Failed to get offline notes:', error)
      return []
    }
  }, [user?.id])

  const searchOfflineNotes = useCallback(
    async (searchTerm: string): Promise<Note[]> => {
      if (!user?.id) return []

      try {
        return await offlineStorage.searchNotes(user.id, searchTerm)
      } catch (error) {
        console.error('Failed to search offline notes:', error)
        return []
      }
    },
    [user?.id]
  )

  return {
    createNoteOffline,
    updateNoteOffline,
    deleteNoteOffline,
    getOfflineNotes,
    searchOfflineNotes,
    isOnline,
  }
}

/**
 * Hook to initialize offline functionality
 */
export function useOfflineInit() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    const initializeOffline = async () => {
      try {
        await syncService.initialize()
        setIsInitialized(true)
        setInitError(null)
      } catch (error) {
        console.error('Failed to initialize offline functionality:', error)
        setInitError(
          error instanceof Error ? error.message : 'Initialization failed'
        )
      }
    }

    initializeOffline()
  }, [])

  return {
    isInitialized,
    initError,
  }
}

/**
 * Hook for offline storage management
 */
export function useOfflineStorage() {
  const [storageSize, setStorageSize] = useState<{
    notes: number
    queue: number
  } | null>(null)

  const getStorageSize = useCallback(async () => {
    try {
      const size = await offlineStorage.getStorageSize()
      setStorageSize(size)
      return size
    } catch (error) {
      console.error('Failed to get storage size:', error)
      return null
    }
  }, [])

  const clearStorage = useCallback(async () => {
    try {
      await syncService.clearOfflineData()
      setStorageSize({ notes: 0, queue: 0 })
    } catch (error) {
      console.error('Failed to clear storage:', error)
      throw error
    }
  }, [])

  useEffect(() => {
    getStorageSize()
  }, [getStorageSize])

  return {
    storageSize,
    getStorageSize,
    clearStorage,
  }
}
