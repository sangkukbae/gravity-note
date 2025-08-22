'use client'

import { useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'
import { NoteItem, Note } from './note-item'
import { cn } from '@/lib/utils'
import { SearchIcon, InboxIcon, LoaderIcon } from 'lucide-react'

interface NoteListProps {
  notes: Note[]
  onRescue?: (noteId: string) => Promise<void>
  isLoading?: boolean
  isRescuing?: boolean
  rescuingId?: string
  searchQuery?: string
  onSearchChange?: (query: string) => void
  className?: string
  height?: number
  itemHeight?: number
}

// Row component for virtual scrolling
interface RowProps {
  index: number
  style: React.CSSProperties
  data: {
    notes: Note[]
    onRescue?: (noteId: string) => Promise<void>
    isRescuing?: boolean
    rescuingId?: string
    searchQuery?: string
  }
}

function Row({ index, style, data }: RowProps) {
  const { notes, onRescue, isRescuing, rescuingId, searchQuery } = data
  const note = notes[index]

  if (!note) return null

  // Highlight search matches in content
  const getHighlightedContent = (content: string, query: string) => {
    if (!query) return content

    const regex = new RegExp(`(${query})`, 'gi')
    const parts = content.split(regex)

    return parts.map((part, index) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        return (
          <mark
            key={index}
            className='bg-yellow-200 text-yellow-900 px-1 rounded'
          >
            {part}
          </mark>
        )
      }
      return part
    })
  }

  const isCurrentlyRescuing = !!isRescuing && rescuingId === note.id

  const enhancedNote: Note = {
    ...note,
    content:
      searchQuery && typeof note.content === 'string'
        ? getHighlightedContent(note.content, searchQuery)
        : note.content,
  }

  return (
    <div style={style}>
      <NoteItem
        note={enhancedNote}
        isRescuing={isCurrentlyRescuing}
        showRescueButton={index > 0} // Don't show rescue for the top note
        {...(onRescue ? { onRescue } : {})}
      />
    </div>
  )
}

export function NoteList({
  notes,
  onRescue,
  isLoading = false,
  isRescuing = false,
  rescuingId,
  searchQuery,
  onSearchChange,
  className,
  height = 600,
  itemHeight = 120,
}: NoteListProps) {
  // Filter notes based on search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return notes

    const query = searchQuery.toLowerCase().trim()
    return notes.filter(note => {
      return (
        typeof note.content === 'string' &&
        note.content.toLowerCase().includes(query)
      )
    })
  }, [notes, searchQuery])

  const itemData = useMemo(() => {
    const base: RowProps['data'] = { notes: filteredNotes }
    base.isRescuing = isRescuing
    if (typeof rescuingId !== 'undefined') base.rescuingId = rescuingId
    if (typeof searchQuery !== 'undefined') base.searchQuery = searchQuery
    if (onRescue) base.onRescue = onRescue
    return base
  }, [filteredNotes, onRescue, isRescuing, rescuingId, searchQuery])

  // Empty states
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className='flex items-center gap-2 text-muted-foreground'>
          <LoaderIcon className='h-4 w-4 animate-spin' />
          <span>Loading your notes...</span>
        </div>
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center',
          className
        )}
      >
        <InboxIcon className='h-12 w-12 text-muted-foreground/40 mb-4' />
        <h3 className='text-lg font-medium text-muted-foreground mb-2'>
          Your thoughts start here
        </h3>
        <p className='text-sm text-muted-foreground/80 max-w-sm'>
          Capture any idea, thought, or reminder. No folders, no categories -
          just pure, frictionless note-taking.
        </p>
      </div>
    )
  }

  if (searchQuery && filteredNotes.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center',
          className
        )}
      >
        <SearchIcon className='h-12 w-12 text-muted-foreground/40 mb-4' />
        <h3 className='text-lg font-medium text-muted-foreground mb-2'>
          No notes found
        </h3>
        <p className='text-sm text-muted-foreground/80'>
          Try searching with different keywords
        </p>
        {onSearchChange && (
          <button
            onClick={() => onSearchChange('')}
            className='text-sm text-primary hover:underline mt-2'
          >
            Clear search
          </button>
        )}
      </div>
    )
  }

  // Use virtual scrolling for performance with large lists
  return (
    <div className={cn('w-full', className)}>
      <List
        height={height}
        width={'100%'}
        itemCount={filteredNotes.length}
        itemSize={itemHeight}
        itemData={itemData}
        overscanCount={5} // Render 5 extra items outside viewport for smooth scrolling
        className='scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent'
      >
        {Row}
      </List>
    </div>
  )
}
