'use client'

import { memo, useMemo, useState, useEffect } from 'react'
import { NoteCard } from './note-card'
import {
  useVirtualScroll,
  useIntersectionObserver,
} from '@/lib/utils/performance'
import type { Note } from '@/types'

interface VirtualNoteListProps {
  notes: Note[]
  onNoteSelect?: (note: Note) => void
  itemHeight?: number
  containerHeight?: number
  compact?: boolean
  className?: string
}

// Memoized note card to prevent unnecessary re-renders
const MemoizedNoteCard = memo(function MemoizedNoteCard({
  note,
  onClick,
  compact,
  style,
}: {
  note: Note
  onClick?: (note: Note) => void
  compact?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div style={style}>
      <NoteCard
        note={note}
        {...(onClick && { onClick })}
        {...(compact !== undefined && { compact })}
        className='mb-3'
      />
    </div>
  )
})

export function VirtualNoteList({
  notes,
  onNoteSelect,
  itemHeight = 180, // Approximate height of a note card
  containerHeight = 600,
  compact = false,
  className = '',
}: VirtualNoteListProps) {
  const adjustedItemHeight = compact ? 120 : itemHeight

  const {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll,
    scrollElementRef,
    startIndex,
  } = useVirtualScroll(notes, {
    itemHeight: adjustedItemHeight,
    containerHeight,
    overscan: 3, // Render 3 extra items above and below
  })

  // Memoize visible items to prevent unnecessary recalculation
  const memoizedVisibleItems = useMemo(() => {
    return visibleItems.map((note, index) => ({
      note,
      virtualIndex: startIndex + index,
    }))
  }, [visibleItems, startIndex])

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={onScroll}
    >
      {/* Total height container to maintain scroll bar */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {memoizedVisibleItems.map(({ note, virtualIndex }) => (
            <MemoizedNoteCard
              key={note.id}
              note={note}
              {...(onNoteSelect && { onClick: onNoteSelect })}
              compact={compact}
              style={{
                height: adjustedItemHeight,
                paddingBottom: 12, // Space between cards
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Intersection observer based loading for better performance
export function LazyNoteList({
  notes,
  onNoteSelect,
  chunkSize = 20,
  className = '',
}: {
  notes: Note[]
  onNoteSelect?: (note: Note) => void
  chunkSize?: number
  className?: string
}) {
  const [loadedCount, setLoadedCount] = useState(chunkSize)
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
  })

  // Load more items when sentinel comes into view
  useEffect(() => {
    if (isIntersecting && loadedCount < notes.length) {
      setLoadedCount(prev => Math.min(prev + chunkSize, notes.length))
    }
  }, [isIntersecting, loadedCount, notes.length, chunkSize])

  const visibleNotes = useMemo(() => {
    return notes.slice(0, loadedCount)
  }, [notes, loadedCount])

  return (
    <div className={className}>
      <div className='space-y-3'>
        {visibleNotes.map(note => (
          <MemoizedNoteCard
            key={note.id}
            note={note}
            {...(onNoteSelect && { onClick: onNoteSelect })}
          />
        ))}
      </div>

      {/* Loading sentinel */}
      {loadedCount < notes.length && (
        <div ref={ref} className='flex justify-center py-4'>
          <div className='h-6 w-6 animate-spin rounded-full border-2 border-primary border-r-transparent' />
        </div>
      )}

      {loadedCount >= notes.length && notes.length > chunkSize && (
        <div className='text-center py-4 text-sm text-muted-foreground'>
          All {notes.length} notes loaded
        </div>
      )}
    </div>
  )
}
