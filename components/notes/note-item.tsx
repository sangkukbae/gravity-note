'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowUpIcon, LoaderIcon, ClockIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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
}

export function NoteItem({
  note,
  onRescue,
  isRescuing = false,
  className,
  showRescueButton = true,
}: NoteItemProps) {
  const [isHovered, setIsHovered] = useState(false)

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
    <div
      className={cn(
        'group relative flex items-start gap-3 p-4',
        'border-b border-border/50',
        'hover:bg-muted/30 transition-colors duration-200',
        // Subtle visual hierarchy - rescued notes have slight accent
        isRecentlyRescued && 'bg-primary/5 border-l-2 border-l-primary/30',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Note Content */}
      <div className='flex-1 min-w-0'>
        <p
          className={cn(
            'text-sm leading-relaxed break-words',
            'text-foreground/90',
            // Slightly larger text for better readability
            'sm:text-base sm:leading-relaxed'
          )}
        >
          {note.content}
        </p>

        {/* Timestamp */}
        <div className='flex items-center gap-1 mt-2'>
          <ClockIcon className='h-3 w-3 text-muted-foreground/60' />
          <time
            className='text-xs text-muted-foreground/80'
            dateTime={note.created_at}
            title={new Date(note.created_at).toLocaleString()}
          >
            {formatTimeAgo(note.created_at)}
          </time>
          {isRecentlyRescued && (
            <>
              <span className='text-xs text-muted-foreground/60'>•</span>
              <span className='text-xs text-primary/80 font-medium'>
                rescued
              </span>
            </>
          )}
        </div>
      </div>

      {/* Rescue Button */}
      {showRescueButton && onRescue && (
        <div
          className={cn(
            'flex-shrink-0',
            // Hide by default, show on hover or when rescuing
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            (isHovered || isRescuing) && 'opacity-100'
          )}
        >
          <Button
            onClick={handleRescue}
            disabled={isRescuing}
            variant='ghost'
            size='sm'
            className={cn(
              'h-8 w-8 p-0',
              'hover:bg-primary/10 hover:text-primary',
              'transition-all duration-200'
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
  )
}
