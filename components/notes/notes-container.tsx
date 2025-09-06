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
import { GroupedNoteList } from './temporal'
import { cn } from '@/lib/utils'
import type { GroupedNotesResponse, TimeGroup } from '@/types/temporal'
import { shouldHandleSearchShortcut } from '@/lib/utils/keyboard'
import { useOfflineStatus } from '@/hooks/use-offline-status'
import { LocalSaveIndicator } from '@/components/ui/local-save-indicator'
import { toast } from 'sonner'
import { useSearchState } from '@/hooks/use-search-state'
import { SEARCH_TRANSITIONS } from '@/lib/constants/search'
// Toast notifications are handled by the parent component

interface NotesContainerProps {
  initialNotes?: Note[]
  onCreateNote?: (content: string) => Promise<Note>
  onRescueNote?: (noteId: string) => Promise<void>
  onSearchNotes?: (query: string) => Promise<Note[]>
  className?: string
  searchQuery?: string
  externalSearchControl?: boolean
  // Temporal grouping props (optional, for backward compatibility)
  useTemporalGrouping?: boolean
  groupedNotesData?: GroupedNotesResponse
  onSearchNotesGrouped?: (query: string) => Promise<GroupedNotesResponse>
}

export interface NotesContainerRef {
  focusInput: () => void
  openNoteModal: () => void
  /** Smoothly scrolls to a note in the list by id */
  scrollToNote: (noteId: string) => void
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
      // Temporal grouping props with defaults
      useTemporalGrouping = false,
      groupedNotesData,
      onSearchNotesGrouped,
    },
    ref
  ) => {
    const offline = useOfflineStatus()
    const [notes, setNotes] = useState<Note[]>(initialNotes)
    const [isCreating, setIsCreating] = useState(false)
    const [isRescuing, setIsRescuing] = useState(false)
    const [rescuingId, setRescuingId] = useState<string>()
    const [recentlyRescuedId, setRecentlyRescuedId] = useState<string>()
    const [internalSearchQuery, setInternalSearchQuery] = useState('')
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showFAB, setShowFAB] = useState(false)

    // Enhanced search state management
    const {
      state: searchStateValue,
      setQuery,
      clearSearch,
      completeClear,
      startSearch,
      setResults,
      setError,
    } = useSearchState()
    // Temporal grouping state
    const [collapsedSections, setCollapsedSections] = useState<Set<TimeGroup>>(
      new Set()
    )
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
        scrollToNote: (noteId: string) => {
          // Find note element rendered by NoteList
          const el = (document.querySelector(`[data-note-id="${noteId}"]`) ||
            document.getElementById(`note-${noteId}`)) as HTMLElement | null

          if (!el) {
            toast.error('Could not find the selected note in the list.')
            return
          }

          // Try to account for the sticky header
          const header = document.querySelector(
            'header.sticky'
          ) as HTMLElement | null
          const headerHeight = header?.offsetHeight ?? 64

          const y = el.getBoundingClientRect().top + window.scrollY
          window.scrollTo({
            top: Math.max(y - headerHeight - 12, 0),
            behavior: 'smooth',
          })

          // Briefly highlight the target to help orientation
          el.classList.add('ring-2', 'ring-primary/50', 'rounded-md')
          window.setTimeout(() => {
            el.classList.remove('ring-2', 'ring-primary/50', 'rounded-md')
          }, 1600)
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

          // New note supersedes any previous rescued highlight
          setRecentlyRescuedId(undefined)

          // Toast is handled by the parent component (dashboard)
          return newNote
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

          // Mark this note as recently rescued so the UI can display
          // a transient badge/highlight even if ordering jitters.
          setRecentlyRescuedId(noteId)

          // Auto-clear after a short duration (e.g., 15s)
          window.setTimeout(() => setRecentlyRescuedId(undefined), 15000)

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

    // Enhanced search handler with state machine
    const handleSearch = useCallback(
      async (query: string) => {
        if (!externalSearchControl) {
          setInternalSearchQuery(query)
        }

        const trimmedQuery = query.trim()

        // Update search state immediately for responsive feedback
        setQuery(query)

        if (!trimmedQuery) {
          // Trigger smooth clearing transition instead of immediate reset
          clearSearch()

          // Delay the actual reset to allow for smooth transition
          setTimeout(() => {
            setNotes(initialNotes)
            completeClear()
          }, SEARCH_TRANSITIONS.CLEAR_DELAY)

          return
        }

        if (onSearchNotes) {
          // Start search loading state
          startSearch()
          setIsSearching(true)

          try {
            const searchResults = await onSearchNotes(trimmedQuery)
            setNotes(searchResults)
            setResults(searchResults)
          } catch (error) {
            console.error('Search failed:', error)
            setError(error instanceof Error ? error.message : 'Search failed')
            // Error toast is handled by the parent component (dashboard)
          } finally {
            setIsSearching(false)
          }
        }
      },
      [
        onSearchNotes,
        initialNotes,
        externalSearchControl,
        setQuery,
        clearSearch,
        completeClear,
        startSearch,
        setResults,
        setError,
      ]
    )

    // Enhanced search handler for temporal grouping
    const handleSearchGrouped = useCallback(
      async (query: string) => {
        if (!externalSearchControl) {
          setInternalSearchQuery(query)
        }

        if (!query.trim()) {
          // For grouped mode, we don't need to reset notes since parent handles data
          return
        }

        if (onSearchNotesGrouped) {
          setIsSearching(true)
          try {
            await onSearchNotesGrouped(query)
            // Parent component handles updating groupedNotesData
          } catch (error) {
            console.error('Grouped search failed:', error)
            // Error toast is handled by the parent component (dashboard)
          } finally {
            setIsSearching(false)
          }
        }
      },
      [onSearchNotesGrouped, externalSearchControl]
    )

    // Section management for temporal grouping
    const handleToggleSection = useCallback((timeGroup: TimeGroup) => {
      setCollapsedSections(prev => {
        const next = new Set(prev)
        if (next.has(timeGroup)) {
          next.delete(timeGroup)
        } else {
          next.add(timeGroup)
        }
        return next
      })
    }, [])

    // Handle external search query changes
    useEffect(() => {
      if (externalSearchControl && externalSearchQuery !== undefined) {
        handleSearch(externalSearchQuery)
      }
    }, [externalSearchQuery, externalSearchControl, handleSearch])

    // Enhanced clear search handler with smooth transitions
    const handleClearSearch = useCallback(() => {
      if (!externalSearchControl) {
        setInternalSearchQuery('')
        // Keep search open when clearing so user can continue typing
        setIsSearchOpen(true)
      }

      // Use smooth clearing transition
      clearSearch()

      // Delay the actual reset to allow for smooth transition
      setTimeout(() => {
        setNotes(initialNotes)
        completeClear()
      }, SEARCH_TRANSITIONS.CLEAR_DELAY)
    }, [initialNotes, externalSearchControl, clearSearch, completeClear])

    // Global keyboard shortcuts (only when not using external search control)
    useEffect(() => {
      if (externalSearchControl) return

      const handleKeyDown = (e: KeyboardEvent) => {
        // Cmd+K / Ctrl+K to open search
        if (shouldHandleSearchShortcut(e)) {
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
                onSubmit={async (content: string) => {
                  const note = await handleCreateNote(content)
                  return note ? { id: note.id } : undefined
                }}
                isLoading={isCreating}
                placeholder="What's on your mind?"
              />

              {/* Offline: Saved locally indicator */}
              {!offline.effectiveOnline && (
                <div className='flex justify-between items-center'>
                  <LocalSaveIndicator />
                </div>
              )}

              {/* Search Bar - only show when not using external search */}
              {!externalSearchControl && (
                <div className='flex justify-end'>
                  <SearchBar
                    value={searchQuery}
                    onChange={
                      useTemporalGrouping ? handleSearchGrouped : handleSearch
                    }
                    onClear={handleClearSearch}
                    isOpen={isSearchOpen}
                    onToggle={() => setIsSearchOpen(!isSearchOpen)}
                    placeholder='Search all your thoughts...'
                    disabled={!offline.effectiveOnline}
                    searchState={searchStateValue}
                  />
                </div>
              )}

              {/* Gravity indication when many notes present */}
              {!externalSearchControl && notes.length >= 10 && (
                <div className='text-xs text-muted-foreground'>
                  Older thoughts naturally settle below.
                </div>
              )}
            </div>
          </div>

          {/* Notes Stream */}
          <div className='flex-1'>
            {useTemporalGrouping ? (
              <GroupedNoteList
                data={groupedNotesData || { sections: [], totalNotes: 0 }}
                onRescue={handleRescueNote}
                isLoading={isSearching}
                isRescuing={isRescuing}
                {...(rescuingId ? { rescuingId } : {})}
                searchQuery={searchQuery}
                onSearchChange={handleSearchGrouped}
                collapsedSections={collapsedSections}
                onToggleSection={handleToggleSection}
              />
            ) : (
              <NoteList
                notes={notes}
                onRescue={handleRescueNote}
                isLoading={isSearching}
                isRescuing={isRescuing}
                {...(typeof rescuingId !== 'undefined' ? { rescuingId } : {})}
                {...(recentlyRescuedId
                  ? { highlightNoteId: recentlyRescuedId }
                  : {})}
                searchQuery={searchQuery}
                onSearchChange={handleSearch}
                searchState={searchStateValue}
              />
            )}
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
          onSubmit={async (content: string) => {
            await handleCreateNote(content)
          }}
          isLoading={isCreating}
          placeholder="What's on your mind? Share your thoughts, ideas, or capture what you're learning..."
        />
      </>
    )
  }
)

NotesContainer.displayName = 'NotesContainer'
