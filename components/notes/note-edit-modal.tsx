'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PencilIcon, LoaderIcon, X, AlertTriangleIcon } from 'lucide-react'
import { NoteAttachments } from './note-attachments'
import {
  useNoteContentValidation,
  useContentStats,
} from '@/hooks/use-validation'
import { useSlashCommand } from '@/hooks/use-slash-command'
import { SlashCommandDropdown } from '@/components/slash-command/slash-command-dropdown'

interface NoteEditModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  initialContent: string
  onSubmit: (content: string) => Promise<void>
  isLoading?: boolean
  noteId?: string
}

export function NoteEditModal({
  isOpen,
  onOpenChange,
  initialContent,
  onSubmit,
  isLoading = false,
  noteId,
}: NoteEditModalProps) {
  const [content, setContent] = useState(initialContent)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Validation hooks (consistent with creation modal)
  const validation = useNoteContentValidation({
    realTimeValidation: true,
    debounceMs: 300,
    enableStats: true,
  })
  const contentStats = useContentStats(content)

  // Slash command hook
  const slashCommand = useSlashCommand({
    textareaRef,
    onValueChange: setContent,
    disabled: isLoading,
  })

  // Refs to avoid stale closures and prevent re-render cycles
  const validationRef = useRef(validation)
  const adjustHeightRef = useRef<(() => void) | undefined>()

  // Auto-height adjustment function
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'
    const scrollHeight = textarea.scrollHeight
    const maxHeight = 300 // Reasonable max height before scrolling
    const minHeight = 120 // Minimum height to encourage editing

    // Set height based on content, with min/max constraints
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight))
    textarea.style.height = newHeight + 'px'

    // Always allow scrolling in the textarea
    textarea.style.overflowY = 'auto'
  }, [])

  // Update refs with latest values to avoid stale closures
  useEffect(() => {
    validationRef.current = validation
    adjustHeightRef.current = adjustHeight
  })

  // Sync initial content when note/modal changes
  useEffect(() => {
    if (isOpen) {
      setContent(initialContent)
      setHasUnsavedChanges(false)
      validation.reset()
    }
  }, [initialContent, isOpen, validation.reset])

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(content.trim() !== initialContent.trim())
  }, [content, initialContent])

  // Focus management for improved UX
  const focusTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.focus()
    // Position cursor at end of content
    const length = textarea.value.length
    textarea.setSelectionRange(length, length)

    // Height adjustment will happen naturally through onChange
  }, [])

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current && !isLoading) {
      const timer = setTimeout(() => {
        focusTextarea()
      }, 100)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isOpen, isLoading, focusTextarea])

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const trimmedContent = content.trim()
    if (!trimmedContent || isLoading) return

    // Validate content before submission
    const validationResult = validation.validateForSubmit(trimmedContent)

    if (!validationResult.success) {
      validation.setError(
        validationResult.error?.message || 'Invalid content',
        validationResult.error?.type
      )
      return
    }

    try {
      await onSubmit(validationResult.data?.content || trimmedContent)
      setHasUnsavedChanges(false)
      validation.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update note:', error)
      // Keep content in modal if submission fails
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Let slash command handle keys first
    const slashHandled = slashCommand.handleKeyDown(e)
    if (slashHandled) return

    // Submit on Ctrl/Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }

    // Close modal on Escape
    if (e.key === 'Escape') {
      handleCloseModal()
    }
  }

  // Handle modal close with unsaved changes consideration
  const handleCloseModal = useCallback(() => {
    if (hasUnsavedChanges && !isLoading) {
      // In a real app, you might want to show a confirmation dialog
      // For now, we'll preserve the content and close
      onOpenChange(false)
    } else {
      onOpenChange(false)
    }
  }, [hasUnsavedChanges, isLoading, onOpenChange])

  // Handle content change with auto-resize
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value

      // Handle slash command detection first
      slashCommand.handleTextareaChange(e)

      // Only update content if it's different from what slash command set
      // (to avoid overriding slash command's state management)
      if (next !== content) {
        setContent(next)
      }

      // Real-time validation using refs to avoid stale closures
      const currentValidation = validationRef.current
      if (currentValidation.state.hasBeenValidated || next.trim().length > 0) {
        currentValidation.validateAsync(next)
      }

      // Adjust height after content change using ref
      setTimeout(() => adjustHeightRef.current?.(), 0)
    },
    [content, slashCommand]
  )

  // Calculate validation state for UI
  const hasValidationError = validation.state.error !== null
  const isValidationLoading = validation.state.isValidating
  const showCharacterCount = contentStats.percentage > 50 || hasValidationError
  const canSubmit =
    content.trim() &&
    !isLoading &&
    !hasValidationError &&
    contentStats.isValid &&
    hasUnsavedChanges

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col p-0 gap-0 md:max-w-2xl md:max-h-[85vh] overflow-hidden'
        )}
        // Prevent automatic close on outside click when there are unsaved changes
        onPointerDownOutside={e => {
          if (hasUnsavedChanges) {
            e.preventDefault()
          }
        }}
        onInteractOutside={e => {
          if (hasUnsavedChanges) {
            e.preventDefault()
          }
        }}
      >
        {/* Screen reader only title */}
        <DialogTitle className='sr-only'>Edit Note</DialogTitle>

        {/* Header */}
        <div className='flex items-center justify-between border-b border-border p-4 md:p-6 flex-shrink-0'>
          <h2 className='text-lg font-semibold text-foreground'>Edit Note</h2>
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
        <div className='flex-1 overflow-y-auto p-4 md:p-6'>
          <form onSubmit={handleSubmit} className='space-y-4'>
            {/* Attachments preview for this note (read-only) */}
            {noteId && <NoteAttachments noteId={noteId} />}
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder='Update your note...'
              disabled={isLoading}
              className={cn(
                'min-h-[120px] resize-none border-0 p-0 text-base shadow-none focus-visible:ring-0',
                'placeholder:text-muted-foreground/60',
                'overflow-y-auto',
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
        <div className='flex items-center justify-between border-t border-border p-4 md:p-6 flex-shrink-0'>
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
                <PencilIcon className='h-4 w-4 mr-2' />
                Update
              </>
            )}
          </Button>
        </div>

        {/* Slash Command Dropdown */}
        <SlashCommandDropdown
          isOpen={slashCommand.isOpen}
          search={slashCommand.search}
          position={slashCommand.menuPosition}
          commands={slashCommand.filteredCommands}
          onSelect={slashCommand.insertMarkdown}
          onOpenChange={open => {
            if (!open) slashCommand.closeMenu?.()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
