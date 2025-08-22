'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { cn } from '@/lib/utils'
import { PlusIcon, LoaderIcon } from 'lucide-react'

interface NoteInputProps {
  onSubmit: (content: string) => Promise<void>
  placeholder?: string
  isLoading?: boolean
  className?: string
  autoFocus?: boolean
}

export interface NoteInputRef {
  focus: () => void
}

export const NoteInput = forwardRef<NoteInputRef, NoteInputProps>(
  (
    {
      onSubmit,
      placeholder = "What's on your mind?",
      isLoading = false,
      className,
      autoFocus = true,
    },
    ref
  ) => {
    const [content, setContent] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Expose focus method to parent component via ref
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          textareaRef.current?.focus()
        },
      }),
      []
    )

    // Track if textarea is multi-line for button positioning
    const [isMultiLine, setIsMultiLine] = useState(false)

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

      // Update multi-line state for button positioning
      setIsMultiLine(newHeight > minHeight)
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
          <form onSubmit={handleSubmit} className='relative'>
            {/* Integrated Input Container */}
            <div className='relative'>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isLoading}
                className={cn(
                  'w-full text-base resize-none transition-all duration-150 ease-out',
                  // Initial height matching original input, will auto-expand
                  'min-h-[48px] pl-4 pr-16 py-3', // Extra right padding for button
                  // Focus ring styling for accessibility
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  // Border and background styling to match shadcn/ui textarea
                  'rounded-md border border-input bg-background',
                  'placeholder:text-muted-foreground',
                  // Hide scrollbar initially
                  'overflow-y-hidden',
                  // Disabled state
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  isLoading && 'opacity-50'
                )}
                aria-label='Note content input'
                autoComplete='off'
                spellCheck={true}
                rows={1} // Start with single row
              />

              {/* Integrated Submit Button */}
              <button
                type='submit'
                disabled={!content.trim() || isLoading}
                className={cn(
                  'absolute flex items-center justify-center',
                  'w-8 h-8 rounded-md',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90 active:bg-primary/95',
                  'transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  // Disabled state
                  'disabled:opacity-50 disabled:pointer-events-none',
                  // Position based on single/multi-line state with equal spacing
                  isMultiLine
                    ? 'bottom-3 right-3' // Equal 12px spacing from both bottom and right edges
                    : 'top-2 right-3' // Single line positioning
                )}
                aria-label='Add note'
              >
                {isLoading ? (
                  <LoaderIcon className='h-4 w-4 animate-spin' />
                ) : (
                  <PlusIcon className='h-4 w-4' />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }
)

NoteInput.displayName = 'NoteInput'
