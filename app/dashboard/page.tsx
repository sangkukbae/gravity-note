'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { CustomUserMenu } from '@/components/auth/custom-user-menu'
import { NotesContainer } from '@/components/notes'
import { HeaderSearch } from '@/components/notes/header-search'
import { useCallback, useState } from 'react'
import { useNotesRealtime } from '@/hooks/use-notes-realtime'
import { useNotesMutations } from '@/hooks/use-notes-mutations'
import { toast } from 'sonner'
import type { Note } from '@/lib/supabase/realtime'

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Note[]>([])

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
    searchNotes,
    isCreating,
    isRescuing,
    createError,
    rescueError,
  } = useNotesMutations()

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query)

      if (!query.trim()) {
        setSearchResults([])
        return
      }

      try {
        const results = await searchNotes(query)
        setSearchResults(results)
      } catch (error) {
        console.error('Search failed:', error)
        toast.error('Search failed. Please try again.')
        setSearchResults([])
      }
    },
    [searchNotes]
  )

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
  }, [])

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

  // Handle search notes for the container
  const handleSearchNotes = useCallback(
    async (query: string) => {
      if (!query.trim()) return []

      try {
        return await searchNotes(query)
      } catch (error) {
        console.error('Search failed:', error)
        throw error
      }
    },
    [searchNotes]
  )

  // Display appropriate notes based on search state
  const displayNotes = searchQuery.trim() ? searchResults : notes

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
                {/* Sync status indicator */}
                {isOfflineMode && (
                  <span className='text-xs text-amber-500 bg-amber-50 px-2 py-1 rounded-full border border-amber-200'>
                    Offline Mode
                  </span>
                )}
                {realtimeState.connectionStatus === 'connecting' && (
                  <span className='text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full border border-blue-200'>
                    Connecting...
                  </span>
                )}
                {realtimeState.isRealtimeConnected && (
                  <span className='text-xs text-green-500 bg-green-50 px-2 py-1 rounded-full border border-green-200'>
                    Live
                  </span>
                )}
              </div>
              <div className='flex items-center gap-3'>
                <HeaderSearch
                  value={searchQuery}
                  onChange={handleSearch}
                  onClear={handleClearSearch}
                />
                <CustomUserMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Main notes interface */}
        <main className='container mx-auto h-[calc(100vh-73px)]'>
          <NotesContainer
            className='h-full'
            searchQuery={searchQuery}
            externalSearchControl={true}
            onCreateNote={handleCreateNote}
            onRescueNote={handleRescueNote}
            onSearchNotes={handleSearchNotes}
            initialNotes={displayNotes}
          />
        </main>
      </div>
    </ProtectedRoute>
  )
}
