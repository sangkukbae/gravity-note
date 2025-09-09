'use client'

import { useCallback, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, LoaderIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Focus on cancel button when modal opens (safety first)
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        cancelButtonRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col p-0 gap-0 md:max-w-2xl md:max-h-[85vh] overflow-hidden'
        )}
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
        <DialogTitle className='sr-only'>Delete Note Confirmation</DialogTitle>

        {/* Header - consistent with edit modal */}
        <div className='flex items-center justify-between border-b border-border p-4 md:p-6 flex-shrink-0'>
          <h2 className='text-lg font-semibold text-foreground'>Delete Note</h2>
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

        {/* Content - simple confirmation */}
        <div className='flex-1 overflow-y-auto p-4 md:p-6'>
          <div className='space-y-4 text-center'>
            <p className='text-base text-foreground'>
              Are you sure you want to delete this note?
            </p>
            <p className='text-sm text-muted-foreground'>
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Footer - consistent with edit modal */}
        <div className='flex items-center justify-end border-t border-border p-4 md:p-6 flex-shrink-0'>
          <div className='flex gap-3'>
            <Button
              ref={cancelButtonRef}
              variant='outline'
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
