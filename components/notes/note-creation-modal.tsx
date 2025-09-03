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
import { PlusIcon, LoaderIcon, X, AlertTriangleIcon } from 'lucide-react'
import {
  useNoteContentValidation,
  useContentStats,
} from '@/hooks/use-validation'

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

    // Validation hooks
    const validation = useNoteContentValidation({
      realTimeValidation: true,
      debounceMs: 300,
      enableStats: true,
    })
    const contentStats = useContentStats(content)

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

      // Validate content before submission
      const validationResult = validation.validateForSubmit(trimmedContent)

      if (!validationResult.success) {
        // Set validation error
        validation.setError(
          validationResult.error?.message || 'Invalid content',
          validationResult.error?.type
        )
        return
      }

      try {
        await onSubmit(validationResult.data?.content || trimmedContent)
        setContent('')
        setHasUnsavedContent(false)
        validation.reset() // Reset validation state
        onOpenChange(false) // Close modal on successful submission
      } catch (error) {
        console.error('Failed to create note:', error)
        // Keep content in modal if submission fails
      }
    }

    // Handle keyboard shortcuts (scoped to textarea only)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Ctrl/Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit(e)
      }

      // Close modal on Escape (with confirmation if there's unsaved content)
      if (e.key === 'Escape') {
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
      const next = e.target.value
      setContent(next)

      // Real-time validation
      if (validation.state.hasBeenValidated || next.trim().length > 0) {
        validation.validateAsync(next)
      }

      // Adjust height after content change
      setTimeout(() => adjustHeight(), 0)
    }

    // Calculate validation state for UI
    const hasValidationError = validation.state.error !== null
    const isValidationLoading = validation.state.isValidating
    const showCharacterCount =
      contentStats.percentage > 50 || hasValidationError
    const canSubmit =
      content.trim() &&
      !isLoading &&
      !hasValidationError &&
      contentStats.isValid

    // Note: avoid global Escape prevention to not interfere with other Radix layers

    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            // Use default centering and animations from dialog UI.
            // Only tweak layout: remove outer padding/gaps and widen on desktop.
            'p-0 gap-0 md:max-w-2xl md:max-h-[85vh]'
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
                  // Validation styling - subtle since we don't have borders in modal
                  hasValidationError && 'bg-destructive/5',
                  isLoading && 'opacity-50'
                )}
                aria-label='Note content'
                autoComplete='off'
                spellCheck={true}
              />

              {/* Validation Feedback */}
              {hasValidationError && (
                <div className='flex items-center gap-2 text-sm text-destructive'>
                  <AlertTriangleIcon className='h-4 w-4' />
                  <span>{validation.state.error}</span>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className='flex items-center justify-between border-t border-border p-4 md:p-6'>
            <div className='flex items-center gap-4'>
              {/* Keyboard hint */}
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <span>Press</span>
                <kbd className='rounded bg-muted px-1.5 py-0.5 text-xs font-mono'>
                  {typeof navigator !== 'undefined' &&
                  navigator.userAgent.includes('Mac')
                    ? '⌘'
                    : 'Ctrl'}{' '}
                  + Enter
                </kbd>
                <span>to save</span>
              </div>

              {/* Character count */}
              {showCharacterCount && (
                <div
                  className={cn(
                    'text-xs',
                    contentStats.showWarning
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-muted-foreground'
                  )}
                >
                  {contentStats.length}/{contentStats.maxLength}
                  {contentStats.showWarning && ' ⚠️'}
                </div>
              )}

              {/* Validation loading */}
              {isValidationLoading && (
                <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                  <LoaderIcon className='h-3 w-3 animate-spin' />
                  <span>Validating...</span>
                </div>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
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
