'use client'

import React, { memo } from 'react'
import { LoaderIcon, SearchIcon, InboxIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Note } from './note-item'
import { NoteItem } from './note-item'

interface SearchLoadingStateProps {
  query: string
  className?: string | undefined
}

export const SearchLoadingState = memo(
  ({ query, className }: SearchLoadingStateProps) => (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className='flex items-center gap-2 text-muted-foreground'>
        <LoaderIcon className='h-4 w-4 animate-spin' />
        <span>Searching for &quot;{query}&quot;...</span>
      </div>
    </div>
  )
)

SearchLoadingState.displayName = 'SearchLoadingState'

interface SearchClearingStateProps {
  notes: Note[]
  className?: string | undefined
}

export const SearchClearingState = memo(
  ({ notes, className }: SearchClearingStateProps) => {
    // Show a preview of the notes that will appear with a subtle fade
    const previewNotes = notes.slice(0, 3)

    if (previewNotes.length === 0) {
      return (
        <div className={cn('flex items-center justify-center p-8', className)}>
          <div className='flex items-center gap-2 text-muted-foreground/60'>
            <span>Returning to your notes...</span>
          </div>
        </div>
      )
    }

    return (
      <div
        className={cn('w-full transition-all duration-200 ease-out', className)}
      >
        {/* Show existing notes with slight fade during transition */}
        <div className='opacity-60 transition-opacity duration-200'>
          <div className='space-y-0'>
            {previewNotes.map((note, index) => (
              <div key={note.id} className='px-4'>
                <div className='py-3 border-b border-border/20'>
                  <div className='text-sm text-muted-foreground/70 line-clamp-2'>
                    {typeof note.content === 'string'
                      ? note.content
                      : 'Note content'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {notes.length > 3 && (
            <div className='px-4 py-2 text-xs text-muted-foreground/50 text-center'>
              ...and {notes.length - 3} more notes
            </div>
          )}
        </div>
      </div>
    )
  }
)

SearchClearingState.displayName = 'SearchClearingState'

interface SearchResultsStateProps {
  notes: Note[]
  query: string
  className?: string | undefined
  onRescue?: (noteId: string) => Promise<void>
  isRescuing?: boolean
  rescuingId?: string | undefined
}

export const SearchResultsState = memo(
  ({
    notes,
    query,
    className,
    onRescue,
    isRescuing,
    rescuingId,
  }: SearchResultsStateProps) => {
    if (notes.length === 0) {
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
            Try searching with different keywords for &quot;{query}&quot;
          </p>
        </div>
      )
    }

    return (
      <div className={cn('w-full', className)}>
        <div className='space-y-0'>
          {notes.map((note, index) => {
            const isCurrentlyRescuing = !!isRescuing && rescuingId === note.id

            return (
              <div
                key={note.id}
                id={`note-${note.id}`}
                data-note-id={note.id}
                className='px-4'
              >
                <NoteItem
                  note={note}
                  isRescuing={isCurrentlyRescuing}
                  showRescueButton={index > 0} // Don't show rescue for the top note
                  showDivider={index < notes.length - 1}
                  {...(onRescue ? { onRescue } : {})}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)

SearchResultsState.displayName = 'SearchResultsState'

interface BrowsingStateProps {
  notes: Note[]
  className?: string | undefined
  onRescue?: (noteId: string) => Promise<void>
  isRescuing?: boolean
  rescuingId?: string | undefined
  onLoadMore?: () => Promise<void>
  hasMore?: boolean
}

export const BrowsingState = memo(
  ({
    notes,
    className,
    onRescue,
    isRescuing,
    rescuingId,
    onLoadMore,
    hasMore,
  }: BrowsingStateProps) => {
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

    return (
      <div className={cn('w-full', className)}>
        <div className='space-y-0'>
          {notes.map((note, index) => {
            const isCurrentlyRescuing = !!isRescuing && rescuingId === note.id

            return (
              <div
                key={note.id}
                id={`note-${note.id}`}
                data-note-id={note.id}
                className='px-4'
              >
                <NoteItem
                  note={note}
                  isRescuing={isCurrentlyRescuing}
                  showRescueButton={index > 0} // Don't show rescue for the top note
                  showDivider={index < notes.length - 1}
                  {...(onRescue ? { onRescue } : {})}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)

BrowsingState.displayName = 'BrowsingState'
