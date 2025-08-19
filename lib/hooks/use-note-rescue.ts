import { useState, useEffect, useCallback, useRef } from 'react'
import { noteRescueService, type RescuedNote } from '@/lib/services/note-rescue'
import { useCreateNote } from './use-notes'

/**
 * Hook to manage note rescue functionality
 */
export function useNoteRescue() {
  const [rescuedNotes, setRescuedNotes] = useState<RescuedNote[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const refreshRescuedNotes = useCallback(() => {
    const notes = noteRescueService.getRescuedNotes()
    setRescuedNotes(notes)
  }, [])

  const saveRescueDraft = useCallback(
    (data: {
      title?: string | null
      content: string
      noteId?: string
      url?: string
    }) => {
      noteRescueService.saveRescueDraft(data)
      refreshRescuedNotes()
    },
    [refreshRescuedNotes]
  )

  const markAsRecovered = useCallback(
    (noteId: string) => {
      noteRescueService.markAsRecovered(noteId)
      refreshRescuedNotes()
    },
    [refreshRescuedNotes]
  )

  const deleteRescuedNote = useCallback(
    (noteId: string) => {
      noteRescueService.deleteRescuedNote(noteId)
      refreshRescuedNotes()
    },
    [refreshRescuedNotes]
  )

  const clearAllRescuedNotes = useCallback(() => {
    noteRescueService.clearAllRescuedNotes()
    refreshRescuedNotes()
  }, [refreshRescuedNotes])

  useEffect(() => {
    refreshRescuedNotes()
  }, [refreshRescuedNotes])

  const unrecoveredNotes = rescuedNotes.filter(note => !note.recovered)
  const hasRescuedNotes = unrecoveredNotes.length > 0

  return {
    rescuedNotes,
    unrecoveredNotes,
    hasRescuedNotes,
    saveRescueDraft,
    markAsRecovered,
    deleteRescuedNote,
    clearAllRescuedNotes,
    refreshRescuedNotes,
    isLoading,
  }
}

/**
 * Hook for auto-rescue functionality
 */
export function useAutoRescue(
  getData: () => { title?: string | null; content: string; noteId?: string },
  options: {
    enabled?: boolean
    interval?: number
  } = {}
) {
  const { enabled = true, interval = 10000 } = options
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!enabled) {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      return
    }

    cleanupRef.current = noteRescueService.startAutoRescue(getData, interval)

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [enabled, getData, interval])

  // Manual rescue trigger
  const saveRescue = useCallback(() => {
    const data = getData()
    noteRescueService.saveRescueDraft({
      ...data,
      url: window.location.href,
    })
  }, [getData])

  return { saveRescue }
}

/**
 * Hook for rescued note recovery
 */
export function useNoteRecovery() {
  const createNoteMutation = useCreateNote()
  const { markAsRecovered } = useNoteRescue()

  const recoverNote = useCallback(
    async (rescuedNote: RescuedNote) => {
      try {
        const createInput =
          noteRescueService.rescuedNoteToCreateInput(rescuedNote)
        const newNote = await createNoteMutation.mutateAsync(createInput)

        // Mark as recovered
        markAsRecovered(rescuedNote.id)

        return newNote
      } catch (error) {
        console.error('Failed to recover note:', error)
        throw error
      }
    },
    [createNoteMutation, markAsRecovered]
  )

  const recoverMultipleNotes = useCallback(
    async (rescuedNotes: RescuedNote[]) => {
      const results = []
      const errors = []

      for (const rescuedNote of rescuedNotes) {
        try {
          const note = await recoverNote(rescuedNote)
          results.push(note)
        } catch (error) {
          errors.push({ rescuedNote, error })
        }
      }

      return { recovered: results, errors }
    },
    [recoverNote]
  )

  return {
    recoverNote,
    recoverMultipleNotes,
    isRecovering: createNoteMutation.isPending,
  }
}

/**
 * Hook for rescue notifications
 */
export function useRescueNotifications() {
  const { hasRescuedNotes, unrecoveredNotes } = useNoteRescue()
  const [dismissed, setDismissed] = useState<string[]>([])

  const shouldShowNotification =
    hasRescuedNotes &&
    unrecoveredNotes.some(note => !dismissed.includes(note.id))

  const dismissNotification = useCallback(
    (noteId?: string) => {
      if (noteId) {
        setDismissed(prev => [...prev, noteId])
      } else {
        // Dismiss all current notifications
        setDismissed(prev => [
          ...prev,
          ...unrecoveredNotes.map(note => note.id),
        ])
      }
    },
    [unrecoveredNotes]
  )

  const clearDismissed = useCallback(() => {
    setDismissed([])
  }, [])

  return {
    shouldShowNotification,
    dismissNotification,
    clearDismissed,
    visibleNotifications: unrecoveredNotes.filter(
      note => !dismissed.includes(note.id)
    ),
  }
}

/**
 * Hook for rescue statistics
 */
export function useRescueStats() {
  const [stats, setStats] = useState(() => noteRescueService.getRescueStats())

  const refreshStats = useCallback(() => {
    setStats(noteRescueService.getRescueStats())
  }, [])

  useEffect(() => {
    refreshStats()

    // Refresh stats periodically
    const interval = setInterval(refreshStats, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [refreshStats])

  return {
    stats,
    refreshStats,
  }
}

/**
 * Hook to find similar rescued notes
 */
export function useSimilarRescuedNotes(
  content: string,
  threshold: number = 0.8
) {
  const [similarNotes, setSimilarNotes] = useState<RescuedNote[]>([])

  useEffect(() => {
    if (!content.trim()) {
      setSimilarNotes([])
      return
    }

    const similar = noteRescueService.findSimilarRescuedNotes(
      content,
      threshold
    )
    setSimilarNotes(similar)
  }, [content, threshold])

  return similarNotes
}
