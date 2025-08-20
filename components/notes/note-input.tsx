'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PlusIcon, LoaderIcon } from 'lucide-react'

interface NoteInputProps {
  onSubmit: (content: string) => Promise<void>
  placeholder?: string
  isLoading?: boolean
  className?: string
  autoFocus?: boolean
}

export function NoteInput({
  onSubmit,
  placeholder = "What's on your mind?",
  isLoading = false,
  className,
  autoFocus = true,
}: NoteInputProps) {
  const [content, setContent] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount and after submission
  useEffect(() => {
    if (autoFocus && inputRef.current && !isLoading) {
      inputRef.current.focus()
    }
  }, [autoFocus, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedContent = content.trim()
    if (!trimmedContent || isLoading) return

    try {
      await onSubmit(trimmedContent)
      setContent('')
      // Re-focus input after successful submission
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 50)
    } catch (error) {
      console.error('Failed to create note:', error)
      // Keep content in input if submission fails
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (but not Shift+Enter for potential multi-line in future)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <form onSubmit={handleSubmit} className='flex gap-2'>
        <Input
          ref={inputRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className={cn(
            'flex-1 text-base',
            // Slightly larger input for main note creation
            'h-12 px-4',
            // Focus ring styling for accessibility
            'focus-visible:ring-2 focus-visible:ring-primary',
            // Minimal border styling
            'border-muted-foreground/20',
            isLoading && 'opacity-50'
          )}
          aria-label='Note content input'
          autoComplete='off'
          spellCheck={true}
        />
        <Button
          type='submit'
          size='default'
          disabled={!content.trim() || isLoading}
          className={cn(
            'h-12 px-4',
            'bg-primary hover:bg-primary/90',
            'transition-all duration-200'
          )}
          aria-label='Add note'
        >
          {isLoading ? (
            <LoaderIcon className='h-4 w-4 animate-spin' />
          ) : (
            <PlusIcon className='h-4 w-4' />
          )}
        </Button>
      </form>
    </div>
  )
}
