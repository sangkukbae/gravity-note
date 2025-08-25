'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { CustomUserMenu } from '@/components/auth/custom-user-menu'
import { NotesContainer, type NotesContainerRef } from '@/components/notes'
import { HeaderSearch } from '@/components/notes/header-search'
import {
  CommandPalette,
  useCommandPalette,
} from '@/components/search/command-palette'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useCallback, useState, useEffect, useRef, useMemo } from 'react'
import { useNotesRealtime } from '@/hooks/use-notes-realtime'
import { useNotesMutations } from '@/hooks/use-notes-mutations'
import { toast } from 'sonner'
import { SearchIcon } from 'lucide-react'
import type { Note } from '@/lib/supabase/realtime'
import type { EnhancedSearchResult, SearchMetadata } from '@/types/search'

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
    searchNotesEnhanced,
    isCreating,
    isRescuing,
    createError,
    rescueError,
  } = useNotesMutations()

  // Command Palette search handler
  const handleCommandPaletteSearch = useCallback(
    async (query: string) => {
      try {
        // Use enhanced search with highlighting
        const { results, metadata } = await searchNotesEnhanced(query, {
          maxResults: 50,
        })

        // Show search feedback for enhanced search
        if (metadata.usedEnhancedSearch && results.length > 0) {
          console.log(
            `Enhanced search found ${results.length} results in ${metadata.searchTime}ms`
          )
        }

        return { results, metadata }
      } catch (error) {
        console.error('Command palette search failed:', error)
        toast.error('Search failed. Please try again.')
        throw error
      }
    },
    [searchNotesEnhanced]
  )

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    (result: EnhancedSearchResult | Note) => {
      // For now, just log the selection - you can navigate to the note here
      console.log('Search result selected:', result.id)
      toast.success('Note selected!')
      // TODO: Implement navigation to note (could open in modal, navigate, etc.)
    },
    []
  )

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
                  title='Search notes (Cmd+F)'
                >
                  <SearchIcon className='h-4 w-4' />
                  <span className='hidden sm:inline'>Search notes...</span>
                  <div className='hidden sm:flex items-center gap-1 ml-2 text-xs'>
                    <kbd className='px-1.5 py-0.5 bg-muted rounded text-[10px]'>
                      ⌘
                    </kbd>
                    <kbd className='px-1.5 py-0.5 bg-muted rounded text-[10px]'>
                      F
                    </kbd>
                  </div>
                </button>
                <ThemeToggle />
                <CustomUserMenu />
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
        <CommandPalette
          open={isCommandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          onSearch={handleCommandPaletteSearch}
          onResultSelect={handleSearchResultSelect}
        />
      </div>
    </ProtectedRoute>
  )
}
