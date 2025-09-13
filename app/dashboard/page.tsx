'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/auth/user-menu'
import { NotesContainer, type NotesContainerRef } from '@/components/notes'
import { useCommandPalette } from '@/components/search/command-palette'
import { SearchErrorWrapper } from '@/components/search/error-boundary'
import { TemporalCommandPalette } from '@/components/search/temporal-command-palette'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { OfflineStatusIndicator } from '@/components/ui/offline-status-indicator'
import { useNotesMutations } from '@/hooks/use-notes-mutations'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useNotesRealtime } from '@/hooks/use-notes-realtime'
import { useUnifiedSearch } from '@/hooks/use-unified-search'
import type { Note } from '@/lib/supabase/realtime'
import {
  getSearchShortcutText,
  getSearchShortcutTooltip,
} from '@/lib/utils/keyboard'
import type { UnifiedNoteResult, UnifiedNotesResponse } from '@/types/unified'
import { SearchIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth'
import { getOutboxCount } from '@/lib/offline/outbox'

export default function DashboardPage() {
  // Hydration guard to avoid SSR/CSR markup mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const notesContainerRef = useRef<NotesContainerRef>(null)
  const { user } = useAuthStore()
  const [outboxCount, setOutboxCount] = useState(0)

  // Command Palette state
  const {
    open: isCommandPaletteOpen,
    setOpen: setCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
  } = useCommandPalette()

  // Real-time notes hook
  const {
    notes: realtimeNotes,
    isLoading,
    error,
    realtimeState,
    reconnectRealtime,
    isOfflineMode,
  } = useNotesRealtime({
    onRealtimeError: error => {
      console.error('Real-time error:', error)
      toast.error(
        'Real-time connection lost. Falling back to periodic updates.'
      )
    },
  })

  // Stabilize notes to prevent flicker during initial load
  // Only update notes when we have a complete, stable result
  const [stableNotes, setStableNotes] = useState<Note[]>([])

  useEffect(() => {
    // Only update stable notes when:
    // 1. We're not in initial loading state, AND
    // 2. We have notes data (could be empty array for new users)
    if (!isLoading && realtimeNotes !== undefined) {
      setStableNotes(realtimeNotes)
    }
  }, [isLoading, realtimeNotes])

  // Use stable notes for display to prevent flicker
  const notes = stableNotes

  // Notes mutations hook
  const {
    createNoteAsync,
    rescueNoteAsync,
    isCreating,
    isRescuing,
    createError,
    rescueError,
    flushOfflineOutbox,
  } = useNotesMutations()

  const networkStatus = useNetworkStatus({
    pingUrl: '/manifest.json',
    pingIntervalMs: 30000,
    enableQualityMonitoring: false,
  })

  // Best-effort: register Background Sync
  useEffect(() => {
    networkStatus.registerBackgroundSync?.('gravity-sync')
  }, [networkStatus])

  // Keep header pending count up-to-date
  useEffect(() => {
    if (!user?.id) return
    const updateCount = () => setOutboxCount(getOutboxCount(user.id))
    updateCount()
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.includes(`gn:outbox:${user.id}`)) return
      updateCount()
    }
    window.addEventListener('storage', onStorage)
    const id = window.setInterval(updateCount, 5000)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.clearInterval(id)
    }
  }, [user?.id])

  // Trigger sync on reconnect and focus
  useEffect(() => {
    if (!user?.id) return
    const attemptSync = async () => {
      try {
        const res = await flushOfflineOutbox()
        if (res.successIds.length > 0) {
          toast.success(`Sync success (${res.successIds.length})`)
          setOutboxCount(getOutboxCount(user.id))
        }
        if (res.failedIds.length > 0) {
          toast.error(`Sync failed (${res.failedIds.length})`)
        }
      } catch (e) {
        // swallow
      }
    }
    const onOnline = () => attemptSync()
    const onVisible = () => {
      if (document.visibilityState === 'visible') attemptSync()
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user?.id, flushOfflineOutbox])

  // Unified search hook
  const unifiedSearch = useUnifiedSearch()

  // Command Palette search handler using unified search
  const handleCommandPaletteSearch = useCallback(
    async (query: string) => {
      try {
        // Use unified search with highlighting
        const response = await unifiedSearch.search(query, {
          maxResults: 50,
          groupByTime: false,
        })

        // Extract individual results from sections for backward compatibility
        const results: UnifiedNoteResult[] = response.sections.flatMap(
          section => section.notes
        )

        // Show search feedback
        if (response.metadata.usedEnhancedSearch && results.length > 0) {
          console.log(
            `Unified search found ${results.length} results in ${response.metadata.searchTime}ms`
          )
        }

        return { results, metadata: response.metadata }
      } catch (error) {
        console.error('Command palette search failed:', error)
        toast.error('Search failed. Please try again.')
        throw error
      }
    },
    [unifiedSearch]
  )

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    (result: UnifiedNoteResult | Note) => {
      // Smoothly scroll main list to the selected note
      notesContainerRef.current?.scrollToNote(result.id)
    },
    []
  )

  // Handle grouped search for temporal grouping using unified search
  const handleGroupedSearch = useCallback(
    async (query: string): Promise<UnifiedNotesResponse> => {
      try {
        // Perform unified grouped search
        const response = await unifiedSearch.search(query, {
          maxResults: 200,
          groupByTime: true,
        })
        return response
      } catch (error) {
        console.error('Grouped search failed:', error)
        toast.error('Search failed. Please try again.')
        // Return empty response on error
        return {
          sections: [],
          totalNotes: 0,
          metadata: {
            searchTime: 0,
            totalResults: 0,
            usedEnhancedSearch: false,
            query: query,
            temporalGrouping: true,
            groupCounts: {
              yesterday: 0,
              last_week: 0,
              last_month: 0,
              earlier: 0,
              all: 0,
            },
            mode: 'search',
          },
        }
      }
    },
    [unifiedSearch]
  )

  // Handle loading all notes grouped by time period using unified search
  const handleGetNotesGrouped =
    useCallback(async (): Promise<UnifiedNotesResponse> => {
      try {
        // Load all notes grouped by time period
        const response = await unifiedSearch.browse({
          maxResults: 200,
          groupByTime: true,
        })
        return response
      } catch (error) {
        console.error('Failed to load grouped notes:', error)
        toast.error('Failed to load notes. Please try again.')
        // Return empty response on error
        return {
          sections: [],
          totalNotes: 0,
          metadata: {
            searchTime: 0,
            totalResults: 0,
            usedEnhancedSearch: false,
            query: '',
            temporalGrouping: true,
            groupCounts: {
              yesterday: 0,
              last_week: 0,
              last_month: 0,
              earlier: 0,
              all: 0,
            },
            mode: 'browse',
          },
        }
      }
    }, [unifiedSearch])

  // Handle note creation with error handling
  const handleCreateNote = useCallback(
    async (content: string) => {
      try {
        const newNote = await createNoteAsync(content)
        toast.success('Note captured!')
        return newNote
      } catch (error) {
        console.error('Failed to create note:', error)
        toast.error('Failed to save note. Please try again.')
        throw error
      }
    },
    [createNoteAsync]
  )

  // Flush offline outbox on reconnection or SW sync message
  useEffect(() => {
    const tryFlush = async () => {
      if (!networkStatus.effectiveOnline) return

      // Check if there are items to sync
      if (user?.id) {
        const currentOutboxCount = getOutboxCount(user.id)
        if (currentOutboxCount === 0) return

        // Show sync started toast
        toast.loading('Syncing pending notes...', { id: 'sync-progress' })
      }

      try {
        const result = await flushOfflineOutbox()
        const successCount = result.successIds.length
        const failureCount = Object.keys(result.errors).length
        const retryCount = result.retriedIds.length

        // Dismiss the loading toast
        toast.dismiss('sync-progress')

        // Show success toast if any items synced
        if (successCount > 0) {
          toast.success(
            `Successfully synced ${successCount} note${successCount > 1 ? 's' : ''}!`,
            { duration: 4000 }
          )
        }

        // Show retry info if some items need retrying
        if (retryCount > 0) {
          toast.info(
            `${retryCount} note${retryCount > 1 ? 's' : ''} will retry syncing...`,
            { duration: 3000 }
          )
        }

        // Show error toast if any items permanently failed
        if (failureCount > 0) {
          toast.error(
            `Failed to sync ${failureCount} note${failureCount > 1 ? 's' : ''}. Please check your connection.`,
            { duration: 5000 }
          )
        }

        // Update outbox count
        if (user?.id) setOutboxCount(getOutboxCount(user.id))
      } catch (error) {
        console.error('Sync failed with exception:', error)
        toast.dismiss('sync-progress')
        toast.error(
          'Sync failed due to an unexpected error. Will retry later.',
          {
            duration: 5000,
          }
        )
      }
    }

    // Browser online event
    const onOnline = () => {
      tryFlush()
    }
    window.addEventListener('online', onOnline)

    // SW background sync message
    const onMessage = (e: MessageEvent) => {
      if (e?.data?.type === 'sync-outbox') tryFlush()
    }
    navigator.serviceWorker?.addEventListener?.('message', onMessage as any)

    // On mount if already online, try flushing quickly
    tryFlush()

    return () => {
      window.removeEventListener('online', onOnline)
      navigator.serviceWorker?.removeEventListener?.(
        'message',
        onMessage as any
      )
    }
  }, [flushOfflineOutbox, networkStatus.effectiveOnline, user?.id])

  // Poll outbox count periodically
  useEffect(() => {
    const refresh = () => {
      if (user?.id) setOutboxCount(getOutboxCount(user.id))
      else setOutboxCount(0)
    }
    refresh()
    const id = window.setInterval(refresh, 5000)
    return () => window.clearInterval(id)
  }, [user?.id])

  // Handle note rescue with error handling
  const handleRescueNote = useCallback(
    async (noteId: string) => {
      try {
        await rescueNoteAsync(noteId)
        toast.success('Note rescued to top!')
      } catch (error) {
        console.error('Failed to rescue note:', error)
        toast.error('Failed to rescue note. Please try again.')
      }
    },
    [rescueNoteAsync]
  )

  // Note: Search functionality is now handled exclusively by the Command Palette

  // Global keyboard shortcuts for note creation (Ctrl+Space and Ctrl+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Space (or Cmd+Space on Mac) - intelligent note creation
      if (
        (e.ctrlKey || e.metaKey) &&
        e.code === 'Space' &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault()
        // Use focusInput which intelligently focuses input if visible, or opens modal if scrolled away
        notesContainerRef.current?.focusInput()
      }

      // Check for Ctrl+N (or Cmd+N on Mac) - alternative shortcut for new note modal
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 'n' &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault()
        // Always open the note creation modal for Ctrl+N
        notesContainerRef.current?.openNoteModal()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Show loading state
  // Render a stable shell on server and before first client paint
  if (!mounted) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2'></div>
          <p className='text-muted-foreground'>Loading your notes...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className='min-h-screen bg-background flex items-center justify-center'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2'></div>
            <p className='text-muted-foreground'>Loading your notes...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Show error state
  if (error) {
    return (
      <ProtectedRoute>
        <div className='min-h-screen bg-background flex items-center justify-center'>
          <div className='text-center'>
            <p className='text-destructive mb-2'>Failed to load notes</p>
            <p className='text-muted-foreground text-sm'>{error.message}</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className='min-h-screen bg-background'>
        {/* Header with search and user menu */}
        <header className='sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 z-20'>
          <div className='container mx-auto px-4 py-2'>
            <div className='flex justify-between items-center'>
              <div className='flex items-center gap-3'>
                <h1 className='text-lg font-medium text-muted-foreground/80'>
                  Gravity Note
                </h1>
                {/* Offline Status Indicator */}
                <OfflineStatusIndicator />
                {/* Realtime Connection Status - only show when online but realtime has issues */}
                {networkStatus.effectiveOnline && (
                  <>
                    {realtimeState.connectionStatus === 'connecting' ? (
                      <div
                        className='flex items-center gap-1 text-xs text-blue-600'
                        title='Connecting to real-time sync… Changes will update once connected.'
                        aria-label='Connecting to real-time sync'
                      >
                        <div className='w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse'></div>
                        <span className='text-[10px] font-medium uppercase tracking-wide'>
                          Connecting
                        </span>
                      </div>
                    ) : realtimeState.isRealtimeConnected ? (
                      <div
                        className='flex items-center gap-1 text-xs text-green-600'
                        title='Live: Real-time sync is active. Changes appear instantly across your devices.'
                        aria-label='Real-time sync is active'
                      >
                        <div className='w-1.5 h-1.5 bg-green-500 rounded-full animate-live-pulse'></div>
                        <span className='text-[10px] font-medium uppercase tracking-wide'>
                          Live
                        </span>
                      </div>
                    ) : (
                      <button
                        type='button'
                        onClick={() => reconnectRealtime?.()}
                        className='flex items-center gap-1 text-xs text-red-600 cursor-pointer'
                        title='Real-time disconnected. Click to retry connection. Updates may be delayed.'
                        aria-label='Real-time disconnected. Click to retry.'
                      >
                        <div className='w-1.5 h-1.5 bg-red-500 rounded-full'></div>
                        <span className='text-[10px] font-medium uppercase tracking-wide'>
                          Realtime Disconnected
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className='flex items-center gap-3'>
                <button
                  onClick={openCommandPalette}
                  className='flex items-center gap-2 px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground rounded-md border border-border hover:bg-muted transition-colors'
                  title={`Search notes (${getSearchShortcutTooltip()})`}
                >
                  <SearchIcon className='h-4 w-4' />
                  <span className='hidden sm:inline'>Search notes...</span>
                  <div className='hidden sm:flex items-center gap-1 ml-2 text-xs'>
                    <kbd className='px-1.5 py-0.5 bg-muted rounded text-[10px]'>
                      {getSearchShortcutText()}
                    </kbd>
                  </div>
                </button>
                {outboxCount > 0 && (
                  <div className='flex items-center gap-2'>
                    <div className='flex items-center gap-1 text-xs text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-md border border-amber-300/60'>
                      <div className='w-1.5 h-1.5 bg-amber-500 rounded-full'></div>
                      <span className='text-[10px] font-medium uppercase tracking-wide'>
                        Pending {outboxCount}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        const res = await flushOfflineOutbox()
                        if (res.successIds.length > 0) {
                          toast.success(
                            `Sync success (${res.successIds.length})`
                          )
                          setOutboxCount(getOutboxCount(user!.id))
                        }
                        if (res.failedIds.length > 0) {
                          toast.error(`Sync failed (${res.failedIds.length})`)
                        }
                      }}
                      className='text-xs px-2 py-0.5 rounded-md border border-border/50 hover:bg-accent/50 text-muted-foreground'
                      title='Sync now'
                    >
                      Sync now
                    </button>
                  </div>
                )}
                <ThemeToggle />
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Main notes interface */}
        <main className='container mx-auto px-4 py-6'>
          <NotesContainer
            ref={notesContainerRef}
            searchQuery='' // No search needed - handled by Command Palette
            externalSearchControl={true}
            onCreateNote={handleCreateNote}
            onRescueNote={handleRescueNote}
            initialNotes={notes}
          />
        </main>

        {/* Command Palette Modal */}
        <SearchErrorWrapper>
          <TemporalCommandPalette
            open={isCommandPaletteOpen}
            onOpenChange={setCommandPaletteOpen}
            onUnifiedSearch={handleGroupedSearch}
            onUnifiedBrowse={handleGetNotesGrouped}
            onResultSelect={handleSearchResultSelect}
          />
        </SearchErrorWrapper>
      </div>
    </ProtectedRoute>
  )
}
