'use client'

import { useState, useCallback, useEffect } from 'react'
import { NoteInput } from './note-input'
import { NoteList } from './note-list'
import { SearchBar } from './search-bar'
import { Note } from './note-item'
import { cn } from '@/lib/utils'
import { toast } from 'sonner' // Assuming sonner is installed for notifications

interface NotesContainerProps {
  initialNotes?: Note[]
  onCreateNote?: (content: string) => Promise<Note>
  onRescueNote?: (noteId: string) => Promise<void>
  onSearchNotes?: (query: string) => Promise<Note[]>
  className?: string
  searchQuery?: string
  externalSearchControl?: boolean
}

export function NotesContainer({
  initialNotes = [],
  onCreateNote,
  onRescueNote,
  onSearchNotes,
  className,
  searchQuery: externalSearchQuery = '',
  externalSearchControl = false,
}: NotesContainerProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [isCreating, setIsCreating] = useState(false)
  const [isRescuing, setIsRescuing] = useState(false)
  const [rescuingId, setRescuingId] = useState<string>()
  const [internalSearchQuery, setInternalSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Use external search query if provided, otherwise use internal
  const searchQuery = externalSearchControl
    ? externalSearchQuery
    : internalSearchQuery

  // Update notes when initialNotes changes (from props/server state)
  useEffect(() => {
    setNotes(initialNotes)
  }, [initialNotes])

  // Handle note creation
  const handleCreateNote = useCallback(
    async (content: string) => {
      if (!onCreateNote) return

      setIsCreating(true)
      try {
        const newNote = await onCreateNote(content)

        // Optimistically add to top of list
        setNotes(prevNotes => [newNote, ...prevNotes])

        toast.success('Note captured!')
      } catch (error) {
        console.error('Failed to create note:', error)
        toast.error('Failed to save note. Please try again.')
        throw error // Re-throw to keep content in input
      } finally {
        setIsCreating(false)
      }
    },
    [onCreateNote]
  )

  // Handle note rescue (bring to top)
  const handleRescueNote = useCallback(
    async (noteId: string) => {
      if (!onRescueNote) return

      setIsRescuing(true)
      setRescuingId(noteId)

      try {
        await onRescueNote(noteId)

        // Optimistically move note to top
        setNotes(prevNotes => {
          const noteToRescue = prevNotes.find(n => n.id === noteId)
          if (!noteToRescue) return prevNotes

          const otherNotes = prevNotes.filter(n => n.id !== noteId)
          const rescuedNote = {
            ...noteToRescue,
            updated_at: new Date().toISOString(),
            is_rescued: true,
          }

          return [rescuedNote, ...otherNotes]
        })

        toast.success('Note rescued to top!')
      } catch (error) {
        console.error('Failed to rescue note:', error)
        toast.error('Failed to rescue note. Please try again.')
      } finally {
        setIsRescuing(false)
        setRescuingId(undefined)
      }
    },
    [onRescueNote]
  )

  // Handle search
  const handleSearch = useCallback(
    async (query: string) => {
      if (!externalSearchControl) {
        setInternalSearchQuery(query)
      }

      if (!query.trim()) {
        // Reset to original notes when search is cleared
        setNotes(initialNotes)
        return
      }

      if (onSearchNotes) {
        setIsSearching(true)
        try {
          const searchResults = await onSearchNotes(query)
          setNotes(searchResults)
        } catch (error) {
          console.error('Search failed:', error)
          toast.error('Search failed. Please try again.')
        } finally {
          setIsSearching(false)
        }
      }
    },
    [onSearchNotes, initialNotes, externalSearchControl]
  )

  // Handle external search query changes
  useEffect(() => {
    if (externalSearchControl && externalSearchQuery !== undefined) {
      handleSearch(externalSearchQuery)
    }
  }, [externalSearchQuery, externalSearchControl, handleSearch])

  // Clear search and reset notes
  const handleClearSearch = useCallback(() => {
    if (!externalSearchControl) {
      setInternalSearchQuery('')
      setIsSearchOpen(false)
    }
    setNotes(initialNotes)
  }, [initialNotes, externalSearchControl])

  // Global keyboard shortcuts (only when not using external search control)
  useEffect(() => {
    if (externalSearchControl) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setIsSearchOpen(true)
      }

      // Escape to close search or clear
      if (e.key === 'Escape') {
        if (isSearchOpen && !searchQuery) {
          setIsSearchOpen(false)
        } else if (searchQuery) {
          handleClearSearch()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSearchOpen, searchQuery, handleClearSearch, externalSearchControl])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with Input and optional Search */}
      <div className='sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 z-10'>
        <div
          className={cn(
            'p-4',
            externalSearchControl ? 'space-y-0' : 'space-y-4'
          )}
        >
          {/* Main Note Input - Always Visible */}
          <NoteInput
            onSubmit={handleCreateNote}
            isLoading={isCreating}
            placeholder='Capture your thought...'
            autoFocus={!isSearchOpen || externalSearchControl}
          />

          {/* Search Bar - Only show when not using external control */}
          {!externalSearchControl && (
            <div className='flex justify-end mt-4'>
              <SearchBar
                value={searchQuery}
                onChange={handleSearch}
                onClear={handleClearSearch}
                isOpen={isSearchOpen}
                onToggle={() => setIsSearchOpen(!isSearchOpen)}
                placeholder='Search all your thoughts...'
              />
            </div>
          )}
        </div>
      </div>

      {/* Notes Stream */}
      <div className='flex-1 overflow-hidden'>
        <NoteList
          notes={notes}
          onRescue={handleRescueNote}
          isLoading={isSearching}
          isRescuing={isRescuing}
          {...(typeof rescuingId !== 'undefined' ? { rescuingId } : {})}
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
          height={600} // Fixed height for now - will be made dynamic with useEffect
        />
      </div>

      {/* Subtle gravity indication at bottom */}
      {notes.length > 5 && (
        <div className='text-center p-2 text-xs text-muted-foreground/60 border-t border-border/30'>
          Older thoughts naturally settle below • Use ↑ to rescue important ones
        </div>
      )}
    </div>
  )
}
