'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/auth/user-menu'
import { NotesContainer, type NotesContainerRef } from '@/components/notes'
import { useCommandPalette } from '@/components/search/command-palette'
import { SearchErrorWrapper } from '@/components/search/error-boundary'
import { TemporalCommandPalette } from '@/components/search/temporal-command-palette'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useNotesMutations } from '@/hooks/use-notes-mutations'
import { useNotesRealtime } from '@/hooks/use-notes-realtime'
import { useUnifiedSearch } from '@/hooks/use-unified-search'
import type { Note } from '@/lib/supabase/realtime'
import {
  getSearchShortcutText,
  getSearchShortcutTooltip,
} from '@/lib/utils/keyboard'
import type { UnifiedNoteResult, UnifiedNotesResponse } from '@/types/unified'
import { SearchIcon } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'

export default function DashboardPage() {
  const notesContainerRef = useRef<NotesContainerRef>(null)

  // Command Palette state
  const {
    open: isCommandPaletteOpen,
    setOpen: setCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
  } = useCommandPalette()

  // Real-time notes hook
  const {
    notes,
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

  // Notes mutations hook
  const {
    createNoteAsync,
    rescueNoteAsync,
    isCreating,
    isRescuing,
    createError,
    rescueError,
  } = useNotesMutations()

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
      // For now, just log the selection - you can navigate to the note here
      console.log('Search result selected:', result.id)
      toast.success('Note selected!')
      // TODO: Implement navigation to note (could open in modal, navigate, etc.)
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
                {/* Single unified status indicator */}
                {realtimeState.connectionStatus === 'connecting' ? (
                  <div className='flex items-center gap-1 text-xs text-blue-600'>
                    <div className='w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse'></div>
                    <span className='text-[10px] font-medium uppercase tracking-wide'>
                      Connecting
                    </span>
                  </div>
                ) : realtimeState.isRealtimeConnected ? (
                  <div className='flex items-center gap-1 text-xs text-green-600'>
                    <div className='w-1.5 h-1.5 bg-green-500 rounded-full'></div>
                    <span className='text-[10px] font-medium uppercase tracking-wide'>
                      Live
                    </span>
                  </div>
                ) : isOfflineMode ? (
                  <div className='flex items-center gap-1 text-xs text-amber-600'>
                    <div className='w-1.5 h-1.5 bg-amber-500 rounded-full'></div>
                    <span className='text-[10px] font-medium uppercase tracking-wide'>
                      Offline Mode
                    </span>
                  </div>
                ) : (
                  <div className='flex items-center gap-1 text-xs text-red-600'>
                    <div className='w-1.5 h-1.5 bg-red-500 rounded-full'></div>
                    <span className='text-[10px] font-medium uppercase tracking-wide'>
                      Disconnected
                    </span>
                  </div>
                )}
              </div>
              <div className='flex items-center gap-3'>
                <button
                  onClick={openCommandPalette}
                  className='flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground rounded-md border border-border/50 hover:bg-accent/50 hover:text-foreground transition-colors'
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
