'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowUpIcon,
  LoaderIcon,
  CopyIcon,
  ShareIcon,
  CheckIcon,
} from 'lucide-react'
import type { Note } from './note-item'

interface ActionState {
  loading: boolean
  success: boolean
}

interface NoteActionGroupProps {
  note: Note
  onRescue?: (noteId: string) => Promise<void>
  isVisible?: boolean
  isHovered?: boolean
  rescueState?: ActionState
  className?: string
}

export function NoteActionGroup({
  note,
  onRescue,
  isVisible = true,
  isHovered = false,
  rescueState = { loading: false, success: false },
  className,
}: NoteActionGroupProps) {
  const [copyState, setCopyState] = useState<ActionState>({
    loading: false,
    success: false,
  })
  const [shareState, setShareState] = useState<ActionState>({
    loading: false,
    success: false,
  })

  const handleCopy = useCallback(async () => {
    if (copyState.loading || typeof note.content !== 'string') return

    setCopyState({ loading: true, success: false })

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(note.content)
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = note.content
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      setCopyState({ loading: false, success: true })

      // Reset success state after 2 seconds
      setTimeout(() => {
        setCopyState({ loading: false, success: false })
      }, 2000)
    } catch (error) {
      console.error('Failed to copy note content:', error)
      setCopyState({ loading: false, success: false })
    }
  }, [note.content, copyState.loading])

  const handleShare = useCallback(async () => {
    if (shareState.loading || typeof note.content !== 'string') return

    setShareState({ loading: true, success: false })

    try {
      // Check if Web Share API is supported and available
      if (navigator.share && window.isSecureContext) {
        await navigator.share({
          title: 'Gravity Note',
          text: note.content,
          // Optionally include a URL if the note has a shareable link
          // url: `${window.location.origin}/note/${note.id}`
        })
        setShareState({ loading: false, success: true })
      } else {
        // Fallback: Copy content to clipboard as sharing
        await handleCopy()
        setShareState({ loading: false, success: true })
      }

      // Reset success state after 2 seconds
      setTimeout(() => {
        setShareState({ loading: false, success: false })
      }, 2000)
    } catch (error) {
      // Handle user cancellation gracefully (AbortError)
      if (error instanceof Error && error.name === 'AbortError') {
        setShareState({ loading: false, success: false })
        return
      }

      console.error('Failed to share note:', error)
      setShareState({ loading: false, success: false })
    }
  }, [note.content, shareState.loading, handleCopy])

  const handleRescue = useCallback(async () => {
    if (!onRescue || rescueState.loading) return

    try {
      await onRescue(note.id)
    } catch (error) {
      console.error('Failed to rescue note:', error)
    }
  }, [onRescue, note.id, rescueState.loading])

  if (!isVisible) return null

  return (
    <div
      role='group'
      aria-label='Note actions'
      className={cn(
        'flex items-center gap-1',
        'transition-all duration-150 ease-out',
        className
      )}
    >
      {/* Rescue Button - Primary action with highest visual weight */}
      {onRescue && (
        <Button
          onClick={handleRescue}
          disabled={rescueState.loading}
          variant='ghost'
          size='sm'
          className={cn(
            'h-6 w-6 p-0',
            // Always visible with subtle presence, enhanced on hover
            'text-muted-foreground/60',
            'hover:bg-muted/50 hover:text-foreground',
            // Smooth hover enhancement without sudden appearance
            'transition-all duration-150 ease-out',
            // Enhanced visibility on hover
            isHovered && 'text-muted-foreground/80',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 rounded-md',
            // Mobile touch optimization
            'touch:p-1 touch:gap-2 sm:p-0 sm:gap-1'
          )}
          aria-label='Rescue note to top'
          title='Bring this note back to the top'
        >
          {rescueState.loading ? (
            <LoaderIcon className='h-3 w-3 animate-spin' />
          ) : (
            <ArrowUpIcon className='h-3 w-3' />
          )}
        </Button>
      )}

      {/* Copy Button - Secondary action with medium prominence */}
      <Button
        onClick={handleCopy}
        disabled={copyState.loading || typeof note.content !== 'string'}
        variant='ghost'
        size='sm'
        className={cn(
          'h-6 w-6 p-0',
          // Always visible with more subtle presence than rescue
          'text-muted-foreground/45',
          'hover:bg-muted/40 hover:text-muted-foreground/80',
          'transition-all duration-150 ease-out',
          // Enhanced visibility on hover
          isHovered && 'text-muted-foreground/65',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 rounded-md',
          // Success state styling
          copyState.success && 'text-green-600 hover:text-green-600/80',
          // Mobile touch optimization
          'touch:p-1 touch:gap-2 sm:p-0 sm:gap-1'
        )}
        aria-label='Copy note content to clipboard'
        title='Copy note content'
      >
        {copyState.loading ? (
          <LoaderIcon className='h-3 w-3 animate-spin' />
        ) : copyState.success ? (
          <CheckIcon className='h-3 w-3' />
        ) : (
          <CopyIcon className='h-3 w-3' />
        )}
      </Button>

      {/* Share Button - Tertiary action with lowest prominence */}
      <Button
        onClick={handleShare}
        disabled={shareState.loading || typeof note.content !== 'string'}
        variant='ghost'
        size='sm'
        className={cn(
          'h-6 w-6 p-0',
          // Always visible with most subtle presence
          'text-muted-foreground/35',
          'hover:bg-muted/30 hover:text-muted-foreground/70',
          'transition-all duration-150 ease-out',
          // Enhanced visibility on hover
          isHovered && 'text-muted-foreground/50',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 rounded-md',
          // Success state styling
          shareState.success && 'text-blue-600 hover:text-blue-600/80',
          // Mobile touch optimization
          'touch:p-1 touch:gap-2 sm:p-0 sm:gap-1'
        )}
        aria-label='Share note content'
        title='Share note content'
      >
        {shareState.loading ? (
          <LoaderIcon className='h-3 w-3 animate-spin' />
        ) : shareState.success ? (
          <CheckIcon className='h-3 w-3' />
        ) : (
          <ShareIcon className='h-3 w-3' />
        )}
      </Button>
    </div>
  )
}
