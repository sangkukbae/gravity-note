'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  useDeleteNote,
  useDuplicateNote,
  usePrefetchNote,
} from '@/lib/hooks/use-notes'
import type { Note } from '@/types'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Calendar,
  FileText,
  ExternalLink,
} from 'lucide-react'

interface NoteCardProps {
  note: Note
  showActions?: boolean
  compact?: boolean
  className?: string
  onClick?: (note: Note) => void
}

export function NoteCard({
  note,
  showActions = true,
  compact = false,
  className = '',
  onClick,
}: NoteCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const deleteNoteMutation = useDeleteNote({
    onSuccess: () => {
      console.log('Note deleted successfully')
    },
  })

  const duplicateNoteMutation = useDuplicateNote({
    onSuccess: newNote => {
      console.log('Note duplicated successfully:', newNote.id)
    },
  })

  const prefetchNote = usePrefetchNote()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNoteMutation.mutateAsync(note.id)
      } catch (error) {
        console.error('Failed to delete note:', error)
      }
    }
    setShowMenu(false)
  }

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      await duplicateNoteMutation.mutateAsync(note.id)
    } catch (error) {
      console.error('Failed to duplicate note:', error)
    }
    setShowMenu(false)
  }

  const handleCardClick = () => {
    if (onClick) {
      onClick(note)
    }
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
    // Prefetch note data for better UX
    prefetchNote(note.id)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInDays < 7) return `${diffInDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const getPreviewText = (content: string, maxLength = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  const cardContent = (
    <Card
      className={`group cursor-pointer transition-all duration-200 hover:shadow-md border-border/50 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className={`p-4 ${compact ? 'p-3' : 'p-4'}`}>
        {/* Header */}
        <div className='flex items-start justify-between mb-2'>
          <div className='flex items-center space-x-2 min-w-0 flex-1'>
            <FileText className='h-4 w-4 text-muted-foreground flex-shrink-0' />
            <h3
              className={`font-medium truncate ${
                compact ? 'text-sm' : 'text-base'
              } ${note.title ? 'text-foreground' : 'text-muted-foreground italic'}`}
            >
              {note.title || 'Untitled'}
            </h3>
          </div>

          {showActions && (
            <div className='relative flex-shrink-0'>
              <Button
                variant='ghost'
                size='sm'
                className={`h-6 w-6 p-0 transition-opacity ${
                  isHovered || showMenu ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
              >
                <MoreHorizontal className='h-3 w-3' />
              </Button>

              {showMenu && (
                <div className='absolute right-0 top-7 z-10 bg-background border border-border rounded-md shadow-lg py-1 min-w-[120px]'>
                  <Link
                    href={`/dashboard/notes/${note.id}`}
                    className='flex items-center px-3 py-1.5 text-sm hover:bg-muted transition-colors'
                    onClick={e => e.stopPropagation()}
                  >
                    <Edit className='h-3 w-3 mr-2' />
                    Edit
                  </Link>
                  <button
                    onClick={handleDuplicate}
                    disabled={duplicateNoteMutation.isPending}
                    className='flex items-center w-full px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-50'
                  >
                    <Copy className='h-3 w-3 mr-2' />
                    Duplicate
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteNoteMutation.isPending}
                    className='flex items-center w-full px-3 py-1.5 text-sm hover:bg-muted text-red-600 transition-colors disabled:opacity-50'
                  >
                    <Trash2 className='h-3 w-3 mr-2' />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Preview */}
        <div
          className={`text-muted-foreground mb-3 ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          <p className='leading-relaxed whitespace-pre-wrap'>
            {getPreviewText(note.content, compact ? 100 : 150)}
          </p>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between text-xs text-muted-foreground'>
          <div className='flex items-center space-x-1'>
            <Calendar className='h-3 w-3' />
            <span>{formatDate(note.updated_at)}</span>
          </div>

          <div className='flex items-center space-x-2'>
            <span>{note.content.length} chars</span>
            <ExternalLink className='h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity' />
          </div>
        </div>
      </div>
    </Card>
  )

  // Wrap with Link if no custom onClick
  if (!onClick) {
    return (
      <Link href={`/dashboard/notes/${note.id}`} className='block'>
        {cardContent}
      </Link>
    )
  }

  return cardContent
}

// Click-outside hook for closing menu
function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: () => void
) {
  useState(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  })
}
