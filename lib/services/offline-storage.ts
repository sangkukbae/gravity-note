import type { Note, CreateNoteInput, UpdateNoteInput } from '@/types'

// IndexedDB database configuration
const DB_NAME = 'gravity-note-offline'
const DB_VERSION = 1
const NOTES_STORE = 'notes'
const QUEUE_STORE = 'sync-queue'

interface SyncQueueItem {
  id: string
  type: 'create' | 'update' | 'delete'
  noteId?: string
  data?: CreateNoteInput | UpdateNoteInput
  timestamp: number
  retryCount: number
}

class OfflineStorageService {
  private db: IDBDatabase | null = null
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        this.isInitialized = true
        resolve()
      }

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create notes store
        if (!db.objectStoreNames.contains(NOTES_STORE)) {
          const notesStore = db.createObjectStore(NOTES_STORE, {
            keyPath: 'id',
          })
          notesStore.createIndex('user_id', 'user_id', { unique: false })
          notesStore.createIndex('updated_at', 'updated_at', { unique: false })
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const queueStore = db.createObjectStore(QUEUE_STORE, {
            keyPath: 'id',
          })
          queueStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized || !this.db) {
      await this.initialize()
    }
  }

  // Notes operations
  async saveNote(note: Note): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([NOTES_STORE], 'readwrite')
      const store = transaction.objectStore(NOTES_STORE)
      const request = store.put({ ...note, offline: true })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to save note offline'))
    })
  }

  async getNote(id: string): Promise<Note | null> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([NOTES_STORE], 'readonly')
      const store = transaction.objectStore(NOTES_STORE)
      const request = store.get(id)

      request.onsuccess = () => {
        const result = request.result
        resolve(result ? { ...result, offline: undefined } : null)
      }
      request.onerror = () =>
        reject(new Error('Failed to get note from offline storage'))
    })
  }

  async getAllNotes(userId: string): Promise<Note[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([NOTES_STORE], 'readonly')
      const store = transaction.objectStore(NOTES_STORE)
      const index = store.index('user_id')
      const request = index.getAll(userId)

      request.onsuccess = () => {
        const notes = request.result.map((note: any) => ({
          ...note,
          offline: undefined,
        }))
        // Sort by updated_at desc
        notes.sort(
          (a: Note, b: Note) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
        resolve(notes)
      }
      request.onerror = () =>
        reject(new Error('Failed to get notes from offline storage'))
    })
  }

  async deleteNote(id: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([NOTES_STORE], 'readwrite')
      const store = transaction.objectStore(NOTES_STORE)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () =>
        reject(new Error('Failed to delete note from offline storage'))
    })
  }

  async searchNotes(userId: string, searchTerm: string): Promise<Note[]> {
    const allNotes = await this.getAllNotes(userId)
    const lowerSearchTerm = searchTerm.toLowerCase()

    return allNotes.filter(
      note =>
        note.title?.toLowerCase().includes(lowerSearchTerm) ||
        note.content.toLowerCase().includes(lowerSearchTerm)
    )
  }

  // Sync queue operations
  async addToSyncQueue(
    item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<void> {
    await this.ensureInitialized()

    const queueItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite')
      const store = transaction.objectStore(QUEUE_STORE)
      const request = store.add(queueItem)

      request.onsuccess = () => resolve()
      request.onerror = () =>
        reject(new Error('Failed to add item to sync queue'))
    })
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readonly')
      const store = transaction.objectStore(QUEUE_STORE)
      const index = store.index('timestamp')
      const request = index.getAll()

      request.onsuccess = () => {
        resolve(request.result)
      }
      request.onerror = () => reject(new Error('Failed to get sync queue'))
    })
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite')
      const store = transaction.objectStore(QUEUE_STORE)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () =>
        reject(new Error('Failed to remove item from sync queue'))
    })
  }

  async updateSyncQueueItem(
    id: string,
    updates: Partial<SyncQueueItem>
  ): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite')
      const store = transaction.objectStore(QUEUE_STORE)

      const getRequest = store.get(id)
      getRequest.onsuccess = () => {
        const item = getRequest.result
        if (item) {
          const updatedItem = { ...item, ...updates }
          const putRequest = store.put(updatedItem)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () =>
            reject(new Error('Failed to update sync queue item'))
        } else {
          reject(new Error('Sync queue item not found'))
        }
      }
      getRequest.onerror = () =>
        reject(new Error('Failed to get sync queue item'))
    })
  }

  async clearSyncQueue(): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite')
      const store = transaction.objectStore(QUEUE_STORE)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to clear sync queue'))
    })
  }

  // Utility methods
  async clear(): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [NOTES_STORE, QUEUE_STORE],
        'readwrite'
      )

      let completed = 0
      const onComplete = () => {
        completed++
        if (completed === 2) resolve()
      }

      const notesRequest = transaction.objectStore(NOTES_STORE).clear()
      const queueRequest = transaction.objectStore(QUEUE_STORE).clear()

      notesRequest.onsuccess = onComplete
      queueRequest.onsuccess = onComplete

      notesRequest.onerror = queueRequest.onerror = () =>
        reject(new Error('Failed to clear offline storage'))
    })
  }

  async getStorageSize(): Promise<{ notes: number; queue: number }> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [NOTES_STORE, QUEUE_STORE],
        'readonly'
      )

      let notesCount = 0
      let queueCount = 0
      let completed = 0

      const onComplete = () => {
        completed++
        if (completed === 2) {
          resolve({ notes: notesCount, queue: queueCount })
        }
      }

      const notesRequest = transaction.objectStore(NOTES_STORE).count()
      const queueRequest = transaction.objectStore(QUEUE_STORE).count()

      notesRequest.onsuccess = () => {
        notesCount = notesRequest.result
        onComplete()
      }

      queueRequest.onsuccess = () => {
        queueCount = queueRequest.result
        onComplete()
      }

      notesRequest.onerror = queueRequest.onerror = () =>
        reject(new Error('Failed to get storage size'))
    })
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService()
