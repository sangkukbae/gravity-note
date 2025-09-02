'use client'

import { useAuthStore } from '@/lib/stores/auth'
import { loadOutbox } from '@/lib/offline/outbox'
import { useCallback, useMemo } from 'react'

/**
 * Hook to check if a note is pending sync (created offline)
 */
export function useNotePendingStatus() {
  const { user } = useAuthStore()

  // Check if a note ID indicates it's a temporary offline note
  const isNotePending = useCallback((noteId: string): boolean => {
    // Temporary notes have IDs that start with 'temp_'
    return noteId.startsWith('temp_')
  }, [])

  // Get all pending note IDs from the outbox
  const pendingNoteIds = useMemo(() => {
    if (!user?.id) return new Set<string>()

    const outboxItems = loadOutbox(user.id)
    const tempIds = outboxItems
      .filter(item => item.type === 'create' && item.tempId)
      .map(item => item.tempId!)

    return new Set(tempIds)
  }, [user?.id])

  // Check if a note is in the pending queue
  const isNoteInPendingQueue = useCallback(
    (noteId: string): boolean => {
      return pendingNoteIds.has(noteId)
    },
    [pendingNoteIds]
  )

  return {
    isNotePending,
    isNoteInPendingQueue,
    pendingNoteIds,
  }
}
