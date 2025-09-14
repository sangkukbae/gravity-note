'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { AtSign, FileText, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import { formatDistanceToNow } from 'date-fns'

interface MentionLinkProps {
  /** The note ID being mentioned */
  noteId: string
  /** Display label (could be title or ID) */
  label: string
  /** Additional CSS classes */
  className?: string
}

function formatTitle(
  title: string | null,
  content: string,
  maxLength = 50
): string {
  if (title && title.trim()) {
    return title.length > maxLength ? `${title.slice(0, maxLength)}...` : title
  }

  // Use content as fallback title
  const contentPreview = content.replace(/\n/g, ' ').trim()
  return contentPreview.length > maxLength
    ? `${contentPreview.slice(0, maxLength)}...`
    : contentPreview || 'Untitled Note'
}

function HoverCard({
  noteId,
  children,
}: {
  noteId: string
  children: React.ReactNode
}) {
  const [isHovered, setIsHovered] = useState(false)
  const { user } = useAuthStore()
  const supabase = createClient()

  const { data: note } = useQuery({
    queryKey: ['note-preview', noteId],
    queryFn: async () => {
      if (!user?.id) return null

      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, updated_at, created_at')
        .eq('id', noteId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.warn('Failed to fetch note for hover preview:', error)
        return null
      }

      return data
    },
    enabled: !!user?.id && isHovered,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  return (
    <span
      className='relative inline-flex align-baseline m-0 p-0'
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        margin: 0,
        padding: 0,
        verticalAlign: 'baseline',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      {isHovered && note && (
        <div
          className={cn(
            'absolute z-50 w-80 p-4 bg-popover border border-border rounded-lg shadow-lg',
            'top-full left-0 mt-1 transform',
            'animate-in fade-in-0 zoom-in-95 duration-200'
          )}
        >
          {/* Note Title */}
          <div className='flex items-start gap-2 mb-2'>
            <FileText className='w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0' />
            <h4 className='font-medium text-sm text-foreground leading-tight'>
              {formatTitle(note.title, note.content, 60)}
            </h4>
          </div>

          {/* Note Content Preview */}
          <div className='text-xs text-muted-foreground mb-3 leading-relaxed'>
            {note.content.length > 150
              ? `${note.content.slice(0, 150).replace(/\n/g, ' ')}...`
              : note.content.replace(/\n/g, ' ')}
          </div>

          {/* Last Updated */}
          <div className='flex items-center gap-1 text-xs text-muted-foreground'>
            <Calendar className='w-3 h-3' />
            <span>
              Updated{' '}
              {formatDistanceToNow(
                new Date(note.updated_at || note.created_at || ''),
                { addSuffix: true }
              )}
            </span>
          </div>
        </div>
      )}
    </span>
  )
}

export function MentionLink({ noteId, label, className }: MentionLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    // Allow default Link behavior
    // The note will be opened in the same interface
    e.stopPropagation()
  }

  // Format the display label to be more user-friendly
  const displayLabel = formatTitle(
    // If label looks like an ID (UUID format), treat it as content
    label.match(/^[a-f0-9-]{36}$/i) ? null : label,
    label,
    30
  )

  // Use inline span instead of Badge div to ensure true inline rendering
  const mentionContent = (
    <span
      className={cn(
        // Core inline styling - critical for proper inline display
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium',
        'rounded-full border-0 transition-colors cursor-pointer',
        'max-w-[200px] truncate align-baseline whitespace-nowrap',
        // Visual styling to match Badge appearance
        'bg-blue-50 hover:bg-blue-100 text-blue-700',
        'dark:bg-blue-950/50 dark:hover:bg-blue-950/70 dark:text-blue-300',
        // Ensure proper vertical alignment and line height
        'leading-[1.2] align-middle',
        // Remove any margins that could cause spacing
        'm-0',
        className
      )}
    >
      <AtSign className='w-3 h-3 opacity-70 flex-shrink-0' />
      <span className='truncate'>{displayLabel}</span>
    </span>
  )

  return (
    <HoverCard noteId={noteId}>
      <Link
        href={`#note-${noteId}`}
        onClick={handleClick}
        className='inline no-underline m-0 p-0'
        style={{
          display: 'inline',
          lineHeight: 'inherit',
          verticalAlign: 'baseline',
          margin: 0,
          padding: 0,
        }}
      >
        {mentionContent}
      </Link>
    </HoverCard>
  )
}
