import type { Note, CreateNoteInput } from '@/types'

interface RescuedNote {
  id: string
  title: string | null
  content: string
  timestamp: number
  url?: string
  recovered: boolean
}

class NoteRescueService {
  private readonly STORAGE_KEY = 'gravity-note-rescue'
  private readonly MAX_RESCUED_NOTES = 50
  private readonly RESCUE_INTERVAL = 10000 // 10 seconds

  /**
   * Save a note draft for potential rescue
   */
  saveRescueDraft(data: {
    title?: string | null
    content: string
    noteId?: string
    url?: string
  }): void {
    try {
      // Don't save empty drafts
      if (!data.content.trim() && !data.title?.trim()) {
        return
      }

      const rescuedNote: RescuedNote = {
        id:
          data.noteId ||
          `rescue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: data.title || null,
        content: data.content,
        timestamp: Date.now(),
        url: data.url || window.location.href,
        recovered: false,
      }

      const rescued = this.getRescuedNotes()

      // Remove existing draft for the same note/url
      const existingIndex = rescued.findIndex(
        note =>
          (data.noteId && note.id === data.noteId) ||
          (!data.noteId && note.url === rescuedNote.url)
      )

      if (existingIndex > -1) {
        rescued.splice(existingIndex, 1)
      }

      // Add new draft at the beginning
      rescued.unshift(rescuedNote)

      // Keep only the most recent drafts
      const trimmed = rescued.slice(0, this.MAX_RESCUED_NOTES)

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed))
    } catch (error) {
      console.warn('Failed to save rescue draft:', error)
    }
  }

  /**
   * Get all rescued notes
   */
  getRescuedNotes(): RescuedNote[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []

      const notes = JSON.parse(stored) as RescuedNote[]

      // Clean up old drafts (older than 7 days)
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const filtered = notes.filter(note => note.timestamp > sevenDaysAgo)

      if (filtered.length !== notes.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
      }

      return filtered
    } catch (error) {
      console.warn('Failed to get rescued notes:', error)
      return []
    }
  }

  /**
   * Get unrecovered notes that might need attention
   */
  getUnrecoveredNotes(): RescuedNote[] {
    return this.getRescuedNotes().filter(note => !note.recovered)
  }

  /**
   * Mark a rescued note as recovered
   */
  markAsRecovered(noteId: string): void {
    try {
      const rescued = this.getRescuedNotes()
      const note = rescued.find(n => n.id === noteId)

      if (note) {
        note.recovered = true
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rescued))
      }
    } catch (error) {
      console.warn('Failed to mark note as recovered:', error)
    }
  }

  /**
   * Delete a rescued note
   */
  deleteRescuedNote(noteId: string): void {
    try {
      const rescued = this.getRescuedNotes()
      const filtered = rescued.filter(note => note.id !== noteId)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.warn('Failed to delete rescued note:', error)
    }
  }

  /**
   * Clear all rescued notes
   */
  clearAllRescuedNotes(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear rescued notes:', error)
    }
  }

  /**
   * Convert a rescued note to a note creation input
   */
  rescuedNoteToCreateInput(rescuedNote: RescuedNote): CreateNoteInput {
    return {
      title: rescuedNote.title,
      content: rescuedNote.content,
    }
  }

  /**
   * Get rescued notes count
   */
  getRescuedNotesCount(): number {
    return this.getUnrecoveredNotes().length
  }

  /**
   * Check if there are any rescued notes that need attention
   */
  hasRescuedNotes(): boolean {
    return this.getRescuedNotesCount() > 0
  }

  /**
   * Auto-save functionality for continuous rescue
   */
  startAutoRescue(
    getData: () => { title?: string | null; content: string; noteId?: string },
    interval: number = this.RESCUE_INTERVAL
  ): () => void {
    const intervalId = setInterval(() => {
      try {
        const data = getData()
        if (data.content.trim() || data.title?.trim()) {
          this.saveRescueDraft({
            ...data,
            url: window.location.href,
          })
        }
      } catch (error) {
        console.warn('Auto-rescue failed:', error)
      }
    }, interval)

    return () => clearInterval(intervalId)
  }

  /**
   * Get rescue statistics
   */
  getRescueStats(): {
    total: number
    recovered: number
    unrecovered: number
    oldestTimestamp: number | null
    newestTimestamp: number | null
  } {
    const notes = this.getRescuedNotes()
    const recovered = notes.filter(n => n.recovered).length

    return {
      total: notes.length,
      recovered,
      unrecovered: notes.length - recovered,
      oldestTimestamp:
        notes.length > 0 ? Math.min(...notes.map(n => n.timestamp)) : null,
      newestTimestamp:
        notes.length > 0 ? Math.max(...notes.map(n => n.timestamp)) : null,
    }
  }

  /**
   * Find similar rescued notes based on content
   */
  findSimilarRescuedNotes(
    content: string,
    threshold: number = 0.8
  ): RescuedNote[] {
    const notes = this.getRescuedNotes()
    const contentLower = content.toLowerCase()

    return notes.filter(note => {
      const noteContentLower = note.content.toLowerCase()

      // Simple similarity check - count common words
      const contentWords = contentLower.split(/\s+/).filter(w => w.length > 2)
      const noteWords = noteContentLower.split(/\s+/).filter(w => w.length > 2)

      if (contentWords.length === 0 || noteWords.length === 0) return false

      const commonWords = contentWords.filter(word => noteWords.includes(word))
      const similarity =
        commonWords.length / Math.max(contentWords.length, noteWords.length)

      return similarity >= threshold
    })
  }
}

// Export singleton instance
export const noteRescueService = new NoteRescueService()
export type { RescuedNote }
