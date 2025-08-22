'use client'

import {
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react'
import { NoteList } from './note-list'
import { SearchBar } from './search-bar'
import { NoteInput, type NoteInputRef } from './note-input'
import { Note } from './note-item'
import { FloatingActionButton } from './floating-action-button'
import {
  NoteCreationModal,
  type NoteCreationModalRef,
} from './note-creation-modal'
import { cn } from '@/lib/utils'
// Toast notifications are handled by the parent component

interface NotesContainerProps {
  initialNotes?: Note[]
  onCreateNote?: (content: string) => Promise<Note>
  onRescueNote?: (noteId: string) => Promise<void>
  onSearchNotes?: (query: string) => Promise<Note[]>
  className?: string
  searchQuery?: string
  externalSearchControl?: boolean
}

export interface NotesContainerRef {
  focusInput: () => void
  openNoteModal: () => void
}

export const NotesContainer = forwardRef<
  NotesContainerRef,
  NotesContainerProps
>(
  (
    {
      initialNotes = [],
      onCreateNote,
      onRescueNote,
      onSearchNotes,
      className,
      searchQuery: externalSearchQuery = '',
      externalSearchControl = false,
    },
    ref
  ) => {
    const [notes, setNotes] = useState<Note[]>(initialNotes)
    const [isCreating, setIsCreating] = useState(false)
    const [isRescuing, setIsRescuing] = useState(false)
    const [rescuingId, setRescuingId] = useState<string>()
    const [internalSearchQuery, setInternalSearchQuery] = useState('')
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showFAB, setShowFAB] = useState(false)
    const noteModalRef = useRef<NoteCreationModalRef>(null)
    const noteInputRef = useRef<NoteInputRef>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputContainerRef = useRef<HTMLDivElement>(null)

    // Expose methods to parent component via ref
    useImperativeHandle(
      ref,
      () => ({
        focusInput: () => {
          // If input is visible (FAB not showing), focus it; otherwise open modal
          if (noteInputRef.current && !showFAB) {
            noteInputRef.current.focus()
            // Scroll to top to ensure input is visible
            window.scrollTo({ top: 0, behavior: 'smooth' })
          } else {
            setIsModalOpen(true)
          }
        },
        openNoteModal: () => {
          setIsModalOpen(true)
        },
      }),
      [showFAB]
    )

    // Use external search query if provided, otherwise use internal
    const searchQuery = externalSearchControl
      ? externalSearchQuery
      : internalSearchQuery

    // Update notes when initialNotes changes (from props/server state)
    useEffect(() => {
      setNotes(initialNotes)
    }, [initialNotes])

    // Scroll-based FAB visibility - show FAB when input is scrolled away
    useEffect(() => {
      const handleScroll = () => {
        if (!inputContainerRef.current) return

        const inputRect = inputContainerRef.current.getBoundingClientRect()

        // Show FAB when input is significantly scrolled out of view
        // Using a small threshold to ensure smooth transition
        const threshold = 20
        const isInputVisible = inputRect.bottom > threshold

        setShowFAB(!isInputVisible)
      }

      // Initial check - delay to ensure DOM is ready
      const timer = setTimeout(handleScroll, 100)

      // Add scroll listener with requestAnimationFrame throttling
      let ticking = false
      const throttledHandleScroll = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            handleScroll()
            ticking = false
          })
          ticking = true
        }
      }

      // Listen to scroll events
      window.addEventListener('scroll', throttledHandleScroll, {
        passive: true,
      })

      return () => {
        clearTimeout(timer)
        window.removeEventListener('scroll', throttledHandleScroll)
      }
    }, [])

    // Handle note creation
    const handleCreateNote = useCallback(
      async (content: string) => {
        if (!onCreateNote) return

        setIsCreating(true)
        try {
          const newNote = await onCreateNote(content)

          // Optimistically add to top of list
          setNotes(prevNotes => [newNote, ...prevNotes])

          // Toast is handled by the parent component (dashboard)
        } catch (error) {
          console.error('Failed to create note:', error)
          // Error toast is handled by the parent component (dashboard)
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

          // Toast is handled by the parent component (dashboard)
        } catch (error) {
          console.error('Failed to rescue note:', error)
          // Error toast is handled by the parent component (dashboard)
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
            // Error toast is handled by the parent component (dashboard)
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
      <>
        <div ref={containerRef} className={cn('flex flex-col', className)}>
          {/* Top Input Section - scrolls naturally with content */}
          <div
            ref={inputContainerRef}
            className='border-b border-border/50 bg-background'
          >
            <div className='p-4 space-y-4'>
              {/* Note Input - always show */}
              <NoteInput
                ref={noteInputRef}
                onSubmit={handleCreateNote}
                isLoading={isCreating}
                placeholder="What's on your mind?"
              />

              {/* Search Bar - only show when not using external search */}
              {!externalSearchControl && (
                <div className='flex justify-end'>
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
          <div className='flex-1'>
            <NoteList
              notes={notes}
              onRescue={handleRescueNote}
              isLoading={isSearching}
              isRescuing={isRescuing}
              {...(typeof rescuingId !== 'undefined' ? { rescuingId } : {})}
              searchQuery={searchQuery}
              onSearchChange={handleSearch}
            />
          </div>
        </div>

        {/* Scroll-based Floating Action Button - only show when input is scrolled out of view */}
        {showFAB && (
          <FloatingActionButton
            onClick={() => setIsModalOpen(true)}
            aria-label='Create new note'
            className={cn(
              'transition-all duration-200 ease-out',
              showFAB ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            )}
          />
        )}

        {/* Note Creation Modal */}
        <NoteCreationModal
          ref={noteModalRef}
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSubmit={handleCreateNote}
          isLoading={isCreating}
          placeholder="What's on your mind? Share your thoughts, ideas, or capture what you're learning..."
        />
      </>
    )
  }
)

NotesContainer.displayName = 'NotesContainer'
