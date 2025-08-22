'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-height adjustment function
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'
    const scrollHeight = textarea.scrollHeight
    const maxHeight = 300 // ~12 lines
    const minHeight = 48 // Single line height to match original input

    // Set height based on content, with min/max constraints
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight))
    textarea.style.height = newHeight + 'px'

    // Show scrollbar only when content exceeds max height
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [])

  // Auto-focus on mount and after submission
  useEffect(() => {
    if (autoFocus && textareaRef.current && !isLoading) {
      textareaRef.current.focus()
    }
  }, [autoFocus, isLoading])

  // Adjust height when component mounts
  useEffect(() => {
    adjustHeight()
  }, [adjustHeight])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedContent = content.trim()
    if (!trimmedContent || isLoading) return

    try {
      await onSubmit(trimmedContent)
      setContent('')
      // Re-focus textarea after successful submission and reset height
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          adjustHeight() // Reset height to single line
        }
      }, 50)
    } catch (error) {
      console.error('Failed to create note:', error)
      // Keep content in input if submission fails
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (but allow Shift+Enter for line breaks)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
    // Shift+Enter adds line break and will auto-expand via onChange
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    // Adjust height after content change
    setTimeout(() => adjustHeight(), 0)
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Input container with width constraints */}
      <div className='w-full max-w-[600px] mx-auto'>
        <form onSubmit={handleSubmit} className='flex gap-2 items-start'>
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              'flex-1 text-base resize-none transition-all duration-100 ease-out',
              // Initial height matching original input, will auto-expand
              'min-h-[48px] px-4 py-3',
              // Focus ring styling for accessibility
              'focus-visible:ring-2 focus-visible:ring-primary',
              // Minimal border styling
              'border-muted-foreground/20',
              // Hide scrollbar initially
              'overflow-y-hidden',
              isLoading && 'opacity-50'
            )}
            aria-label='Note content input'
            autoComplete='off'
            spellCheck={true}
            rows={1} // Start with single row
          />
          <Button
            type='submit'
            size='default'
            disabled={!content.trim() || isLoading}
            className={cn(
              'h-12 px-4 flex-shrink-0',
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
    </div>
  )
}
