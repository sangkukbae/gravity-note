'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { NoteCard } from './note-card'
import { NoteSearch } from './note-search'
import { useInfiniteNotes, useNotesCount } from '@/lib/hooks/use-notes'
import { useRealTimeNotes } from '@/lib/hooks/use-real-time-notes'
import type { Note, NotesQuery } from '@/types'
import {
  Plus,
  Loader2,
  SortAsc,
  SortDesc,
  Calendar,
  Edit,
  FileText,
  Search as SearchIcon,
  Filter,
  Grid,
  List as ListIcon,
} from 'lucide-react'

interface NoteListProps {
  baseQuery?: Omit<NotesQuery, 'offset'>
  onNoteSelect?: (note: Note) => void
  showCreateButton?: boolean
  showSearch?: boolean
  showFilters?: boolean
  layout?: 'grid' | 'list'
  className?: string
}

export function NoteList({
  baseQuery = {},
  onNoteSelect,
  showCreateButton = true,
  showSearch = true,
  showFilters = true,
  layout: initialLayout = 'grid',
  className = '',
}: NoteListProps) {
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'title'>(
    baseQuery.sortBy || 'updated_at'
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    baseQuery.sortOrder || 'desc'
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [layout, setLayout] = useState(initialLayout)
  const [showSearchBar, setShowSearchBar] = useState(false)

  // Real-time updates
  useRealTimeNotes()

  // Build query
  const query = useMemo(() => {
    const trimmedSearch = searchTerm.trim()
    return {
      ...baseQuery,
      sortBy,
      sortOrder,
      ...(trimmedSearch && { search: trimmedSearch }),
      limit: 20,
    }
  }, [baseQuery, sortBy, sortOrder, searchTerm])

  // Fetch notes with infinite scrolling
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteNotes(query)

  // Get total count
  const { data: totalCount = 0 } = useNotesCount()

  // Flatten notes from all pages
  const notes = useMemo(() => {
    const infiniteData = data as { pages: any[] } | undefined
    return infiniteData?.pages?.flatMap((page: any) => page.notes) || []
  }, [data])

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
  }

  const handleSearchSelect = (note: Note) => {
    if (onNoteSelect) {
      onNoteSelect(note)
    }
    setShowSearchBar(false)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearchBar(true)
      }

      // Escape to close search
      if (e.key === 'Escape' && showSearchBar) {
        setShowSearchBar(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSearchBar])

  if (isLoading && notes.length === 0) {
    return (
      <div className='flex items-center justify-center p-8'>
        <Loader2 className='h-6 w-6 animate-spin' />
        <span className='ml-2'>Loading notes...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className='text-center p-8'>
        <p className='text-red-600 mb-4'>Failed to load notes</p>
        <p className='text-sm text-muted-foreground'>{error?.message}</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-4'>
          <h2 className='text-lg font-semibold'>
            Notes {totalCount > 0 && `(${totalCount})`}
          </h2>

          {showFilters && (
            <div className='flex items-center space-x-2 text-sm'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleSortChange('updated_at')}
                className='flex items-center space-x-1'
              >
                <Calendar className='h-3 w-3' />
                <span>Updated</span>
                {sortBy === 'updated_at' &&
                  (sortOrder === 'desc' ? (
                    <SortDesc className='h-3 w-3' />
                  ) : (
                    <SortAsc className='h-3 w-3' />
                  ))}
              </Button>

              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleSortChange('created_at')}
                className='flex items-center space-x-1'
              >
                <FileText className='h-3 w-3' />
                <span>Created</span>
                {sortBy === 'created_at' &&
                  (sortOrder === 'desc' ? (
                    <SortDesc className='h-3 w-3' />
                  ) : (
                    <SortAsc className='h-3 w-3' />
                  ))}
              </Button>

              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleSortChange('title')}
                className='flex items-center space-x-1'
              >
                <Edit className='h-3 w-3' />
                <span>Title</span>
                {sortBy === 'title' &&
                  (sortOrder === 'desc' ? (
                    <SortDesc className='h-3 w-3' />
                  ) : (
                    <SortAsc className='h-3 w-3' />
                  ))}
              </Button>
            </div>
          )}
        </div>

        <div className='flex items-center space-x-2'>
          {showSearch && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowSearchBar(!showSearchBar)}
              className='flex items-center space-x-1'
            >
              <SearchIcon className='h-3 w-3' />
              <span className='hidden sm:inline'>Search</span>
            </Button>
          )}

          <div className='flex items-center border border-border rounded-md'>
            <Button
              variant={layout === 'grid' ? 'default' : 'ghost'}
              size='sm'
              onClick={() => setLayout('grid')}
              className='rounded-r-none border-0'
            >
              <Grid className='h-3 w-3' />
            </Button>
            <Button
              variant={layout === 'list' ? 'default' : 'ghost'}
              size='sm'
              onClick={() => setLayout('list')}
              className='rounded-l-none border-0'
            >
              <ListIcon className='h-3 w-3' />
            </Button>
          </div>

          {showCreateButton && (
            <Button size='sm' className='flex items-center space-x-1'>
              <Plus className='h-3 w-3' />
              <span>New Note</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {showSearchBar && (
        <NoteSearch
          onNoteSelect={handleSearchSelect}
          placeholder='Search notes... (Cmd+K)'
          className='max-w-md'
        />
      )}

      {/* Filter indicator */}
      {searchTerm && (
        <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
          <Filter className='h-3 w-3' />
          <span>Filtered by: &quot;{searchTerm}&quot;</span>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setSearchTerm('')}
            className='h-auto p-0 text-xs underline'
          >
            Clear
          </Button>
        </div>
      )}

      {/* Notes Grid/List */}
      {notes.length === 0 ? (
        <div className='text-center py-12'>
          <FileText className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
          <h3 className='text-lg font-medium mb-2'>No notes found</h3>
          <p className='text-muted-foreground mb-4'>
            {searchTerm
              ? `No notes match "${searchTerm}"`
              : 'Start writing your first note'}
          </p>
          {showCreateButton && !searchTerm && (
            <Button className='flex items-center space-x-1'>
              <Plus className='h-4 w-4' />
              <span>Create Note</span>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div
            className={
              layout === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            }
          >
            {notes.map((note: any) => (
              <NoteCard
                key={note.id}
                note={note}
                {...(onNoteSelect && { onClick: onNoteSelect })}
                compact={layout === 'list'}
                className={layout === 'list' ? 'max-w-none' : ''}
              />
            ))}
          </div>

          {/* Load More */}
          {hasNextPage && (
            <div className='text-center pt-4'>
              <Button
                variant='outline'
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className='flex items-center space-x-2'
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>Load More</span>
                )}
              </Button>
            </div>
          )}

          {/* Performance info */}
          <div className='text-xs text-muted-foreground text-center pt-2'>
            Showing {notes.length} of{' '}
            {((data as any)?.pages?.[0] as any)?.totalCount || 0} notes
          </div>
        </>
      )}
    </div>
  )
}
