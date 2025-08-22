'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PlusIcon, LoaderIcon, X } from 'lucide-react'

interface NoteCreationModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (content: string) => Promise<void>
  placeholder?: string
  isLoading?: boolean
}

export interface NoteCreationModalRef {
  focus: () => void
  openModal: () => void
  closeModal: () => void
}

export const NoteCreationModal = forwardRef<
  NoteCreationModalRef,
  NoteCreationModalProps
>(
  (
    {
      isOpen,
      onOpenChange,
      onSubmit,
      placeholder = "What's on your mind?",
      isLoading = false,
    },
    ref
  ) => {
    const [content, setContent] = useState('')
    const [hasUnsavedContent, setHasUnsavedContent] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Expose methods to parent component via ref
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          textareaRef.current?.focus()
        },
        openModal: () => {
          onOpenChange(true)
        },
        closeModal: () => {
          onOpenChange(false)
        },
      }),
      [onOpenChange]
    )

    // Auto-height adjustment function
    const adjustHeight = useCallback(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 400 // Maximum height for the modal textarea
      const minHeight = 120 // Minimum height to encourage writing

      // Set height based on content, with min/max constraints
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight))
      textarea.style.height = newHeight + 'px'

      // Show scrollbar only when content exceeds max height
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
    }, [])

    // Auto-focus when modal opens and adjust height
    useEffect(() => {
      if (isOpen && textareaRef.current && !isLoading) {
        // Delay focus slightly to ensure modal is fully rendered
        const timer = setTimeout(() => {
          textareaRef.current?.focus()
          adjustHeight()
        }, 100)

        return () => clearTimeout(timer)
      }
      return undefined
    }, [isOpen, isLoading, adjustHeight])

    // Track unsaved content
    useEffect(() => {
      setHasUnsavedContent(content.trim().length > 0)
    }, [content])

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      const trimmedContent = content.trim()
      if (!trimmedContent || isLoading) return

      try {
        await onSubmit(trimmedContent)
        setContent('')
        setHasUnsavedContent(false)
        onOpenChange(false) // Close modal on successful submission
      } catch (error) {
        console.error('Failed to create note:', error)
        // Keep content in modal if submission fails
      }
    }

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Ctrl/Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit(e)
      }

      // Close modal on Escape (with confirmation if there's unsaved content)
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCloseModal()
      }
    }

    // Handle modal close with unsaved content confirmation
    const handleCloseModal = useCallback(() => {
      if (hasUnsavedContent && !isLoading) {
        // In a real app, you might want to show a confirmation dialog
        // For now, we'll preserve the content and close
        onOpenChange(false)
      } else {
        setContent('')
        setHasUnsavedContent(false)
        onOpenChange(false)
      }
    }, [hasUnsavedContent, isLoading, onOpenChange])

    // Handle content change with auto-resize
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value)
      // Adjust height after content change
      setTimeout(() => adjustHeight(), 0)
    }

    // Handle global keyboard shortcuts when modal is open
    useEffect(() => {
      if (!isOpen) return

      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        // Close on Escape key
        if (e.key === 'Escape') {
          e.preventDefault()
          handleCloseModal()
        }
      }

      document.addEventListener('keydown', handleGlobalKeyDown)
      return () => document.removeEventListener('keydown', handleGlobalKeyDown)
    }, [isOpen, handleCloseModal])

    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            // Override default dialog positioning and animation
            '!fixed !inset-0 !z-50 !mx-auto !flex !max-w-none !flex-col !bg-background !p-0 !translate-x-0 !translate-y-0 !left-auto !top-auto !gap-0 !shadow-none !border-0 !duration-200',
            // Desktop: centered modal with proper sizing
            'md:!inset-auto md:!max-w-2xl md:!rounded-lg md:!border md:!shadow-lg md:!max-h-[85vh]',
            'md:!top-[50%] md:!left-[50%] md:!translate-x-[-50%] md:!translate-y-[-50%]',
            // Center-based animations (override defaults)
            '!data-[state=open]:animate-in !data-[state=closed]:animate-out',
            '!data-[state=closed]:fade-out-0 !data-[state=open]:fade-in-0',
            '!data-[state=closed]:zoom-out-95 !data-[state=open]:zoom-in-95',
            // Remove slide animations that come from bottom-right
            '!data-[state=closed]:!slide-out-to-left-0 !data-[state=open]:!slide-in-from-left-0',
            '!data-[state=closed]:!slide-out-to-top-0 !data-[state=open]:!slide-in-from-top-0'
          )}
          // Prevent automatic close on outside click when there's unsaved content
          onPointerDownOutside={e => {
            if (hasUnsavedContent) {
              e.preventDefault()
            }
          }}
          onInteractOutside={e => {
            if (hasUnsavedContent) {
              e.preventDefault()
            }
          }}
        >
          {/* Screen reader only title */}
          <DialogTitle className='sr-only'>Create New Note</DialogTitle>

          {/* Header */}
          <div className='flex items-center justify-between border-b border-border p-4 md:p-6'>
            <h2 className='text-lg font-semibold text-foreground'>
              Create Note
            </h2>
            <Button
              variant='ghost'
              size='icon'
              onClick={handleCloseModal}
              className='h-8 w-8'
              aria-label='Close modal'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>

          {/* Content */}
          <div className='flex-1 p-4 md:p-6'>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isLoading}
                className={cn(
                  'min-h-[120px] resize-none border-0 p-0 text-base shadow-none focus-visible:ring-0',
                  'placeholder:text-muted-foreground/60',
                  'overflow-y-hidden',
                  isLoading && 'opacity-50'
                )}
                aria-label='Note content'
                autoComplete='off'
                spellCheck={true}
              />
            </form>
          </div>

          {/* Footer */}
          <div className='flex items-center justify-between border-t border-border p-4 md:p-6'>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <span>Press</span>
              <kbd className='rounded bg-muted px-1.5 py-0.5 text-xs font-mono'>
                {navigator.userAgent.includes('Mac') ? '⌘' : 'Ctrl'} + Enter
              </kbd>
              <span>to save</span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || isLoading}
              className='min-w-[80px]'
            >
              {isLoading ? (
                <LoaderIcon className='h-4 w-4 animate-spin' />
              ) : (
                <>
                  <PlusIcon className='h-4 w-4 mr-2' />
                  Save
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
)

NoteCreationModal.displayName = 'NoteCreationModal'
