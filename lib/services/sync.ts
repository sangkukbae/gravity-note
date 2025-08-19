import { offlineStorage } from './offline-storage'
import { notesService } from './notes'
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/types'

interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors: string[]
}

class SyncService {
  private isSyncing = false
  private syncListeners: Array<(status: 'syncing' | 'idle' | 'error') => void> =
    []

  /**
   * Add a listener for sync status changes
   */
  onSyncStatusChange(
    listener: (status: 'syncing' | 'idle' | 'error') => void
  ): () => void {
    this.syncListeners.push(listener)
    return () => {
      const index = this.syncListeners.indexOf(listener)
      if (index > -1) {
        this.syncListeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(status: 'syncing' | 'idle' | 'error'): void {
    this.syncListeners.forEach(listener => listener(status))
  }

  /**
   * Check if currently syncing
   */
  get isCurrentlySyncing(): boolean {
    return this.isSyncing
  }

  /**
   * Sync all pending changes with the server
   */
  async syncPendingChanges(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress')
    }

    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline')
    }

    this.isSyncing = true
    this.notifyListeners('syncing')

    try {
      const syncQueue = await offlineStorage.getSyncQueue()
      let syncedCount = 0
      let failedCount = 0
      const errors: string[] = []

      console.log(`Starting sync of ${syncQueue.length} items`)

      for (const item of syncQueue) {
        try {
          let success = false

          switch (item.type) {
            case 'create':
              if (item.data) {
                const newNote = await notesService.createNote(
                  item.data as CreateNoteInput
                )
                await offlineStorage.saveNote(newNote)
                success = true
              }
              break

            case 'update':
              if (item.noteId && item.data) {
                const updatedNote = await notesService.updateNote({
                  id: item.noteId,
                  ...item.data,
                } as UpdateNoteInput)
                await offlineStorage.saveNote(updatedNote)
                success = true
              }
              break

            case 'delete':
              if (item.noteId) {
                await notesService.deleteNote(item.noteId)
                await offlineStorage.deleteNote(item.noteId)
                success = true
              }
              break
          }

          if (success) {
            await offlineStorage.removeFromSyncQueue(item.id)
            syncedCount++
          } else {
            throw new Error('Invalid sync item data')
          }
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error)

          // Increment retry count
          await offlineStorage.updateSyncQueueItem(item.id, {
            retryCount: item.retryCount + 1,
          })

          // Remove from queue if too many retries
          if (item.retryCount >= 3) {
            await offlineStorage.removeFromSyncQueue(item.id)
            errors.push(`Failed to sync after 3 retries: ${error}`)
          }

          failedCount++
        }
      }

      const result: SyncResult = {
        success: failedCount === 0,
        syncedCount,
        failedCount,
        errors,
      }

      this.notifyListeners(result.success ? 'idle' : 'error')
      return result
    } catch (error) {
      this.notifyListeners('error')
      throw error
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Sync notes from server to local storage
   */
  async syncNotesFromServer(userId: string): Promise<void> {
    try {
      // Get all notes from server
      const serverNotes = await notesService.getNotes({
        limit: 1000, // Get all notes
      })

      // Save each note to offline storage
      for (const note of serverNotes.notes) {
        await offlineStorage.saveNote(note)
      }

      console.log(`Synced ${serverNotes.notes.length} notes from server`)
    } catch (error) {
      console.error('Failed to sync notes from server:', error)
      throw error
    }
  }

  /**
   * Create a note with offline support
   */
  async createNoteOffline(input: CreateNoteInput): Promise<Note> {
    // Generate a temporary ID for offline note
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    // Create a temporary note for immediate use
    const tempNote: Note = {
      id: tempId,
      user_id: 'current-user', // Will be replaced when synced
      title: input.title || null,
      content: input.content,
      created_at: now,
      updated_at: now,
    }

    // Save to offline storage immediately
    await offlineStorage.saveNote(tempNote)

    // Add to sync queue
    await offlineStorage.addToSyncQueue({
      type: 'create',
      data: input,
    })

    // Try to sync immediately if online
    if (navigator.onLine && !this.isSyncing) {
      try {
        const realNote = await notesService.createNote(input)
        // Replace temp note with real note
        await offlineStorage.deleteNote(tempId)
        await offlineStorage.saveNote(realNote)
        // Remove from sync queue since it's already synced
        const queue = await offlineStorage.getSyncQueue()
        const queueItem = queue.find(
          item => item.type === 'create' && item.data === input
        )
        if (queueItem) {
          await offlineStorage.removeFromSyncQueue(queueItem.id)
        }
        return realNote
      } catch (error) {
        console.warn('Failed to sync immediately, will retry later:', error)
      }
    }

    return tempNote
  }

  /**
   * Update a note with offline support
   */
  async updateNoteOffline(input: UpdateNoteInput): Promise<Note> {
    // Get current note from offline storage
    const currentNote = await offlineStorage.getNote(input.id)
    if (!currentNote) {
      throw new Error('Note not found in offline storage')
    }

    // Create updated note
    const updatedNote: Note = {
      ...currentNote,
      title: input.title !== undefined ? input.title : currentNote.title,
      content:
        input.content !== undefined ? input.content : currentNote.content,
      updated_at: new Date().toISOString(),
    }

    // Save to offline storage immediately
    await offlineStorage.saveNote(updatedNote)

    // Add to sync queue
    await offlineStorage.addToSyncQueue({
      type: 'update',
      noteId: input.id,
      data: input,
    })

    // Try to sync immediately if online
    if (navigator.onLine && !this.isSyncing) {
      try {
        const serverNote = await notesService.updateNote(input)
        await offlineStorage.saveNote(serverNote)
        // Remove from sync queue since it's already synced
        const queue = await offlineStorage.getSyncQueue()
        const queueItem = queue.find(
          item => item.type === 'update' && item.noteId === input.id
        )
        if (queueItem) {
          await offlineStorage.removeFromSyncQueue(queueItem.id)
        }
        return serverNote
      } catch (error) {
        console.warn('Failed to sync immediately, will retry later:', error)
      }
    }

    return updatedNote
  }

  /**
   * Delete a note with offline support
   */
  async deleteNoteOffline(id: string): Promise<void> {
    // Remove from offline storage immediately
    await offlineStorage.deleteNote(id)

    // Add to sync queue
    await offlineStorage.addToSyncQueue({
      type: 'delete',
      noteId: id,
    })

    // Try to sync immediately if online
    if (navigator.onLine && !this.isSyncing) {
      try {
        await notesService.deleteNote(id)
        // Remove from sync queue since it's already synced
        const queue = await offlineStorage.getSyncQueue()
        const queueItem = queue.find(
          item => item.type === 'delete' && item.noteId === id
        )
        if (queueItem) {
          await offlineStorage.removeFromSyncQueue(queueItem.id)
        }
      } catch (error) {
        console.warn('Failed to sync immediately, will retry later:', error)
      }
    }
  }

  /**
   * Get the number of pending sync items
   */
  async getPendingSyncCount(): Promise<number> {
    const queue = await offlineStorage.getSyncQueue()
    return queue.length
  }

  /**
   * Clear all offline data and sync queue
   */
  async clearOfflineData(): Promise<void> {
    await offlineStorage.clear()
  }

  /**
   * Initialize sync on app start
   */
  async initialize(): Promise<void> {
    // Initialize offline storage
    await offlineStorage.initialize()

    // Set up online/offline event listeners
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    // Try initial sync if online
    if (navigator.onLine) {
      try {
        await this.syncPendingChanges()
      } catch (error) {
        console.warn('Initial sync failed:', error)
      }
    }
  }

  private async handleOnline(): Promise<void> {
    console.log('App came online, starting sync...')
    try {
      await this.syncPendingChanges()
    } catch (error) {
      console.error('Sync failed after coming online:', error)
    }
  }

  private handleOffline(): void {
    console.log('App went offline')
    this.notifyListeners('idle')
  }
}

// Export singleton instance
export const syncService = new SyncService()
