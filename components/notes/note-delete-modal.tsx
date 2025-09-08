'use client'

import { useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Trash2, X, AlertTriangle, LoaderIcon } from 'lucide-react'

interface NoteDeleteModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isLoading?: boolean
  notePreview?: string | undefined
}

export function NoteDeleteModal({
  isOpen,
  onOpenChange,
  onConfirm,
  isLoading = false,
  notePreview,
}: NoteDeleteModalProps) {
  const handleConfirm = useCallback(async () => {
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }, [onConfirm, onOpenChange])

  const handleCancel = useCallback(() => {
    if (!isLoading) {
      onOpenChange(false)
    }
  }, [isLoading, onOpenChange])

  // Truncate note preview for display
  const truncatedPreview = notePreview
    ? notePreview.length > 100
      ? `${notePreview.substring(0, 100)}...`
      : notePreview
    : 'this note'

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('flex flex-col p-0 gap-0 max-w-md overflow-hidden')}
        // Prevent automatic close when loading
        onPointerDownOutside={e => {
          if (isLoading) {
            e.preventDefault()
          }
        }}
        onInteractOutside={e => {
          if (isLoading) {
            e.preventDefault()
          }
        }}
      >
        {/* Screen reader only title */}
        <DialogTitle className='sr-only'>Delete Note</DialogTitle>

        {/* Header */}
        <div className='flex items-center justify-between border-b border-border p-4 flex-shrink-0'>
          <div className='flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5 text-destructive' />
            <h2 className='text-lg font-semibold text-foreground'>
              Delete Note
            </h2>
          </div>
          <Button
            variant='ghost'
            size='icon'
            onClick={handleCancel}
            disabled={isLoading}
            className='h-8 w-8'
            aria-label='Cancel deletion'
          >
            <X className='h-4 w-4' />
          </Button>
        </div>

        {/* Content */}
        <div className='flex-1 p-4 space-y-4'>
          <p className='text-sm text-muted-foreground'>
            Are you sure you want to delete {truncatedPreview}? This action
            cannot be undone.
          </p>

          {/* Note preview if provided */}
          {notePreview && (
            <div className='p-3 bg-muted/30 rounded-md border-l-2 border-l-destructive/50'>
              <p className='text-xs text-muted-foreground mb-1'>
                Note content:
              </p>
              <p className='text-sm text-foreground/80 italic'>
                &quot;{truncatedPreview}&quot;
              </p>
            </div>
          )}

          <div className='bg-destructive/10 border border-destructive/20 rounded-md p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <AlertTriangle className='h-4 w-4 text-destructive' />
              <p className='text-sm font-medium text-destructive'>Warning</p>
            </div>
            <p className='text-xs text-destructive/80'>
              This will permanently delete the note and any associated
              attachments.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 border-t border-border p-4 flex-shrink-0'>
          <Button
            variant='ghost'
            onClick={handleCancel}
            disabled={isLoading}
            className='min-w-[80px]'
          >
            Cancel
          </Button>
          <Button
            variant='destructive'
            onClick={handleConfirm}
            disabled={isLoading}
            className='min-w-[80px]'
          >
            {isLoading ? (
              <LoaderIcon className='h-4 w-4 animate-spin' />
            ) : (
              <>
                <Trash2 className='h-4 w-4 mr-2' />
                Delete
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
