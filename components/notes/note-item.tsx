'use client'

import { useState, useRef, useEffect, memo, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ClockIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { SmartTextRenderer } from './smart-text-renderer'
import { NoteActionGroup } from './note-action-group'

export interface Note {
  id: string
  content: string | React.ReactNode
  created_at: string | null
  updated_at: string | null
  user_id: string
  title?: string | null
  is_rescued: boolean | null
  original_note_id?: string | null
}

interface NoteItemProps {
  note: Note
  onRescue?: (noteId: string) => Promise<void>
  isRescuing?: boolean
  className?: string
  showRescueButton?: boolean
  onHeightChange?: (noteId: string, height: number) => void
  showDivider?: boolean
}

export const NoteItem = memo(function NoteItem({
  note,
  onRescue,
  isRescuing = false,
  className,
  showRescueButton = true,
  onHeightChange,
  showDivider = false,
}: NoteItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const previousHeightRef = useRef<number>(0)

  // Character limit for truncation (approximately 300 characters)
  const CHAR_LIMIT = 300

  // Smart truncation: break at word boundaries
  const truncateText = (
    text: string,
    limit: number
  ): { truncated: string; isTruncated: boolean } => {
    if (text.length <= limit) {
      return { truncated: text, isTruncated: false }
    }

    // Find the last space before the limit to avoid cutting words
    let truncateAt = limit
    while (truncateAt > 0 && text[truncateAt] !== ' ') {
      truncateAt--
    }

    // If no space found, use the original limit
    if (truncateAt === 0) {
      truncateAt = limit
    }

    return {
      truncated: text.substring(0, truncateAt) + '...',
      isTruncated: true,
    }
  }

  // Check if content should show expand button
  const shouldShowExpandButton =
    typeof note.content === 'string' && note.content.length > CHAR_LIMIT

  // Notify parent of height changes for virtual scrolling
  useEffect(() => {
    if (contentRef.current && onHeightChange) {
      const height = contentRef.current.offsetHeight
      if (height !== previousHeightRef.current) {
        previousHeightRef.current = height
        onHeightChange(note.id, height)
      }
    }
  }, [isExpanded, note.id, onHeightChange])

  // Memoize handlers to prevent unnecessary re-renders of child components
  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleToggleExpand()
      }
    },
    [handleToggleExpand]
  )

  // Memoize expensive calculations
  const formattedTimeAgo = useMemo(() => {
    try {
      const createdAt = note.created_at || new Date().toISOString()
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true })
    } catch (error) {
      return 'some time ago'
    }
  }, [note.created_at])

  const isRecentlyRescued = useMemo(
    () =>
      note.is_rescued &&
      note.updated_at &&
      note.created_at &&
      new Date(note.updated_at).getTime() > new Date(note.created_at).getTime(),
    [note.is_rescued, note.updated_at, note.created_at]
  )

  return (
    <div ref={contentRef} className='relative'>
      {/* Main note content container */}
      <div
        className={cn(
          'group relative flex flex-col gap-3',
          // Modern minimal approach - clean container with subtle boundaries
          'bg-transparent hover:bg-muted/30',
          // Reddit-style spacing - generous padding with proper breathing room
          'py-4 px-4', // Vertical padding for content, horizontal padding for breathing room
          // Modern hover interaction - subtle background change
          'transition-colors duration-150 ease-out',
          // Clean rescued note accent - minimal but clear
          isRecentlyRescued &&
            'bg-primary/3 border-l-2 border-l-primary/50 pl-6',
          // Modern focus styles
          'focus-within:bg-muted/40 focus-within:outline-none',
          // Smooth interactive states
          'cursor-default select-none',
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header Zone - Left aligned time info */}
        <div className='flex items-center gap-2 text-xs text-muted-foreground/70'>
          <ClockIcon className='h-3 w-3' />
          <time
            dateTime={note.created_at || new Date().toISOString()}
            title={new Date(
              note.created_at || new Date().toISOString()
            ).toLocaleString()}
            className='hover:text-muted-foreground transition-colors duration-150'
          >
            {formattedTimeAgo}
          </time>
          {isRecentlyRescued && (
            <>
              <span className='text-muted-foreground/50'>•</span>
              <span className='text-primary/70 font-medium'>rescued</span>
            </>
          )}
        </div>

        {/* Content Zone - Note content and inline expand controls */}
        <div className='flex-1 min-w-0'>
          <div
            className={cn(
              // Base container for enhanced readability
              'break-words',
              // Smooth transition for height changes
              'transition-all duration-150 ease-out'
            )}
          >
            {typeof note.content === 'string' ? (
              <div
                className={
                  shouldShowExpandButton && !isExpanded ? 'inline' : 'block'
                }
              >
                <SmartTextRenderer
                  content={note.content}
                  isExpanded={isExpanded}
                  maxLength={CHAR_LIMIT}
                  className={cn(
                    // Additional styling for enhanced readability
                    'prose-neutral',
                    // Improved text rendering
                    'antialiased',
                    // Remove bottom margin to make content inline with show more button
                    '[&>*:last-child]:mb-0'
                  )}
                />
                {/* Show truncation indicator and button immediately after content when truncated */}
                {shouldShowExpandButton && !isExpanded && (
                  <button
                    onClick={handleToggleExpand}
                    onKeyDown={handleKeyDown}
                    className={cn(
                      'inline-flex items-center gap-1 text-xs ml-1',
                      'text-primary hover:text-primary/80',
                      'transition-colors duration-150',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 rounded',
                      'cursor-pointer select-none'
                    )}
                    aria-expanded={isExpanded}
                    aria-label='Show more content'
                  >
                    <span className='font-medium'>Show more</span>
                    <ChevronDownIcon className='h-3 w-3 transition-transform duration-150' />
                  </button>
                )}
                {/* Show less button when expanded - placed below content */}
                {shouldShowExpandButton && isExpanded && (
                  <div className='mt-2'>
                    <button
                      onClick={handleToggleExpand}
                      onKeyDown={handleKeyDown}
                      className={cn(
                        'inline-flex items-center gap-1 text-xs',
                        'text-primary hover:text-primary/80',
                        'transition-colors duration-150',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 rounded',
                        'cursor-pointer select-none'
                      )}
                      aria-expanded={isExpanded}
                      aria-label='Show less content'
                    >
                      <span className='font-medium'>Show less</span>
                      <ChevronUpIcon className='h-3 w-3 transition-transform duration-150' />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Fallback for non-string content
              <div className='text-sm leading-relaxed text-foreground/90'>
                {note.content}
              </div>
            )}
          </div>
        </div>

        {/* Action Zone - Enhanced button group with rescue, copy, and share */}
        {showRescueButton && (
          <NoteActionGroup
            note={note}
            {...(onRescue && { onRescue })}
            isVisible={true}
            isHovered={isHovered}
            rescueState={{ loading: isRescuing, success: false }}
          />
        )}
      </div>

      {/* Reddit-style divider with proper spacing and alignment */}
      {showDivider && (
        <div className='relative'>
          {/* Breathing room above divider */}
          <div className='h-3' />
          {/* Divider line aligned with content, not extending beyond */}
          <div className='border-t border-border/60' />
          {/* Breathing room below divider */}
          <div className='h-3' />
        </div>
      )}
    </div>
  )
})
