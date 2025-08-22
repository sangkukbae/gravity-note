'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowUpIcon,
  LoaderIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { EnhancedTextRenderer } from './enhanced-text-renderer'

export interface Note {
  id: string
  content: string | React.ReactNode
  created_at: string
  updated_at: string
  user_id: string
  title?: string | null
  is_rescued: boolean
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

export function NoteItem({
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

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggleExpand()
    }
  }

  const handleRescue = async () => {
    if (!onRescue || isRescuing) return

    try {
      await onRescue(note.id)
    } catch (error) {
      console.error('Failed to rescue note:', error)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (error) {
      return 'some time ago'
    }
  }

  const isRecentlyRescued =
    note.is_rescued &&
    new Date(note.updated_at).getTime() > new Date(note.created_at).getTime()

  return (
    <div ref={contentRef} className='relative'>
      {/* Main note content container */}
      <div
        className={cn(
          'group relative flex flex-col gap-3',
          // Modern minimal approach - clean container with subtle boundaries
          'bg-transparent hover:bg-muted/30',
          // Reddit-style spacing - generous padding with proper breathing room
          'py-4 px-0', // Vertical padding for content, no horizontal padding to align with container
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
        {/* Main content row */}
        <div className='flex items-start gap-3'>
          {/* Note Content */}
          <div className='flex-1 min-w-0'>
            <div
              className={cn(
                // Base container for enhanced readability
                'break-words',
                // Smooth transition for height changes
                'transition-all duration-150 ease-out',
                // Enhanced content spacing
                'space-y-1'
              )}
            >
              {typeof note.content === 'string' ? (
                <EnhancedTextRenderer
                  content={note.content}
                  isExpanded={isExpanded}
                  maxLength={CHAR_LIMIT}
                  className={cn(
                    // Additional styling for enhanced readability
                    'prose-neutral',
                    // Improved text rendering
                    'antialiased'
                  )}
                />
              ) : (
                // Fallback for non-string content
                <div className='text-sm leading-relaxed text-foreground/90'>
                  {note.content}
                </div>
              )}
            </div>

            {/* Show more/less button */}
            {shouldShowExpandButton && (
              <button
                onClick={handleToggleExpand}
                onKeyDown={handleKeyDown}
                className={cn(
                  'inline-flex items-center gap-1 mt-2 text-xs',
                  'text-primary hover:text-primary/80',
                  'transition-colors duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 rounded',
                  'cursor-pointer select-none'
                )}
                aria-expanded={isExpanded}
                aria-label={
                  isExpanded ? 'Show less content' : 'Show more content'
                }
              >
                <span className='font-medium'>
                  {isExpanded ? 'Show less' : 'Show more'}
                </span>
                {isExpanded ? (
                  <ChevronUpIcon className='h-3 w-3 transition-transform duration-150' />
                ) : (
                  <ChevronDownIcon className='h-3 w-3 transition-transform duration-150' />
                )}
              </button>
            )}
          </div>

          {/* Rescue Button */}
          {showRescueButton && onRescue && (
            <div
              className={cn(
                'flex-shrink-0',
                // Modern reveal pattern - subtle and clean
                'opacity-0 group-hover:opacity-70 transition-opacity duration-150',
                (isHovered || isRescuing) && 'opacity-70'
              )}
            >
              <Button
                onClick={handleRescue}
                disabled={isRescuing}
                variant='ghost'
                size='sm'
                className={cn(
                  'h-7 w-7 p-0',
                  'hover:bg-muted hover:text-foreground',
                  'transition-colors duration-150 rounded-md',
                  'text-muted-foreground/60'
                )}
                aria-label='Rescue note to top'
                title='Bring this note back to the top'
              >
                {isRescuing ? (
                  <LoaderIcon className='h-3 w-3 animate-spin' />
                ) : (
                  <ArrowUpIcon className='h-3 w-3' />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Timestamp row */}
        <div className='flex items-center gap-2 text-xs text-muted-foreground/70'>
          <ClockIcon className='h-3 w-3' />
          <time
            dateTime={note.created_at}
            title={new Date(note.created_at).toLocaleString()}
            className='hover:text-muted-foreground transition-colors duration-150'
          >
            {formatTimeAgo(note.created_at)}
          </time>
          {isRecentlyRescued && (
            <>
              <span className='text-muted-foreground/50'>•</span>
              <span className='text-primary/70 font-medium'>rescued</span>
            </>
          )}
        </div>
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
}
