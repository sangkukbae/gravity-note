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
import {
  PlusIcon,
  LoaderIcon,
  X,
  AlertTriangleIcon,
  Paperclip,
} from 'lucide-react'
import {
  useNoteContentValidation,
  useContentStats,
} from '@/hooks/use-validation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import { measureImage } from '@/lib/uploads/image'
import { uploadDraft, removeObject, moveToFinal } from '@/lib/uploads/storage'

interface NoteCreationModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (content: string) => Promise<{ id: string } | void>
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
    const fileInputRef = useRef<HTMLInputElement>(null)
    const sessionIdRef = useRef<string>(
      `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    )
    const pendingNoteIdRef = useRef<string | null>(null)
    const supabase = createClient()
    const { user } = useAuthStore()

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
        const result = await onSubmit(
          validationResult.data?.content || trimmedContent
        )
        const createdId = (result as any)?.id
        const canFinalize =
          createdId &&
          typeof createdId === 'string' &&
          !createdId.startsWith('temp_')

        if (canFinalize && user?.id && attachments.length > 0) {
          pendingNoteIdRef.current = createdId

          const finalizeAttachment = async (
            attachment: any,
            retryCount = 0
          ) => {
            const maxRetries = 5
            if (retryCount === 0) await new Promise(r => setTimeout(r, 1000))
            try {
              const response = await fetch('/api/attachments/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.id,
                  noteId: createdId,
                  attachmentId: attachment.rowId,
                  draftPath: attachment.storagePath,
                }),
              })
              if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Finalization failed')
              }
              const { finalPath } = await response.json()
              const { error } = await supabase
                .from('note_attachments')
                .update({ note_id: createdId, storage_path: finalPath })
                .eq('id', attachment.rowId)
              if (error) throw error
            } catch (err) {
              if (retryCount < maxRetries) {
                const delay = 500 * Math.pow(2, retryCount)
                setTimeout(
                  () => finalizeAttachment(attachment, retryCount + 1),
                  delay
                )
              }
            }
          }

          const uploaded = attachments.filter(
            a => a.status === 'uploaded' && a.storagePath && a.rowId
          )
          uploaded.forEach(a => finalizeAttachment(a))

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('gn:attachments-finalized', {
                detail: { noteId: createdId },
              })
            )
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent('gn:attachments-finalized', {
                  detail: { noteId: createdId },
                })
              )
            }, 1000)
          }
        }

        setContent('')
        setHasUnsavedContent(false)
        // clear previews soon after submit
        setTimeout(() => {
          setAttachments(prev => {
            prev.forEach(a => URL.revokeObjectURL(a.previewUrl))
            return []
          })
        }, 100)
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

    // Attachments state and handlers (mirrors NoteInput)
    type AttachmentDraft = {
      id: string
      file: File
      previewUrl: string
      error?: string | null
      status?: 'pending' | 'uploaded' | 'error'
      storagePath?: string
      rowId?: string
    }
    const [attachments, setAttachments] = useState<AttachmentDraft[]>([])

    const addFiles = useCallback(
      async (files: File[] | FileList) => {
        const arr = Array.from(files)
        const newOnes: AttachmentDraft[] = arr.map(f => ({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          file: f,
          previewUrl: URL.createObjectURL(f),
          status: 'pending',
        }))
        setAttachments(prev => [...prev, ...newOnes])
        setTimeout(() => adjustHeight(), 0)

        if (user?.id) {
          const doUploads = async () => {
            for (const d of newOnes) {
              try {
                const { path } = await uploadDraft({
                  userId: user.id,
                  sessionId: sessionIdRef.current,
                  localId: d.id,
                  file: d.file,
                })
                const dims = await measureImage(d.file)
                const { data, error } = await supabase
                  .from('note_attachments')
                  .insert({
                    user_id: user.id,
                    note_id: null,
                    storage_path: path,
                    original_filename: d.file.name,
                    mime_type: d.file.type,
                    size_bytes: d.file.size,
                    width: dims.width || null,
                    height: dims.height || null,
                    kind: 'image',
                  })
                  .select('id')
                  .single()
                if (error) throw error
                setAttachments(prev =>
                  prev.map(a =>
                    a.id === d.id
                      ? {
                          ...a,
                          status: 'uploaded',
                          storagePath: path,
                          rowId: data!.id,
                        }
                      : a
                  )
                )
                const finalizeNoteId = pendingNoteIdRef.current
                if (
                  finalizeNoteId &&
                  typeof finalizeNoteId === 'string' &&
                  !finalizeNoteId.startsWith('temp_')
                ) {
                  const finalizeInFlight = async (retryCount = 0) => {
                    const maxRetries = 5
                    if (retryCount === 0)
                      await new Promise(r => setTimeout(r, 1000))
                    try {
                      const { newPath } = await moveToFinal({
                        userId: user.id,
                        noteId: finalizeNoteId,
                        attachmentId: data!.id,
                        draftPath: path,
                      })
                      const { error } = await supabase
                        .from('note_attachments')
                        .update({
                          note_id: finalizeNoteId,
                          storage_path: newPath,
                        })
                        .eq('id', data!.id)
                      if (error) throw error
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                          new CustomEvent('gn:attachments-finalized', {
                            detail: { noteId: finalizeNoteId },
                          })
                        )
                      }
                    } catch (err) {
                      if (retryCount < maxRetries) {
                        const delay = 500 * Math.pow(2, retryCount)
                        setTimeout(
                          () => finalizeInFlight(retryCount + 1),
                          delay
                        )
                      }
                    }
                  }
                  finalizeInFlight()
                }
              } catch (e: any) {
                setAttachments(prev =>
                  prev.map(a =>
                    a.id === d.id
                      ? {
                          ...a,
                          status: 'error',
                          error: e?.message || 'Upload failed',
                        }
                      : a
                  )
                )
              }
            }
          }
          doUploads()
        }
      },
      [adjustHeight, supabase, user?.id]
    )

    const handlePickFiles = useCallback(() => {
      fileInputRef.current?.click()
    }, [])

    const handleFilesSelected = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return
        addFiles(e.target.files)
        e.target.value = ''
      },
      [addFiles]
    )

    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items
        if (!items || items.length === 0) return
        const images: File[] = []
        for (let i = 0; i < items.length; i++) {
          const it = (items as any).item
            ? (items as any).item(i)
            : (items as any)[i]
          if (it && it.kind === 'file' && it.type.startsWith('image/')) {
            const f = it.getAsFile()
            if (f) images.push(f)
          }
        }
        if (images.length > 0) {
          e.preventDefault()
          addFiles(images)
        }
      },
      [addFiles]
    )

    const removeAttachment = useCallback(
      (id: string) => {
        setAttachments(prev => {
          const found = prev.find(a => a.id === id)
          if (found) {
            URL.revokeObjectURL(found.previewUrl)
            if (found.storagePath && found.rowId) {
              removeObject(found.storagePath).catch(() => {})
              supabase
                .from('note_attachments')
                .delete()
                .eq('id', found.rowId)
                .then(
                  () => {},
                  () => {}
                )
            }
          }
          return prev.filter(a => a.id !== id)
        })
        setTimeout(() => adjustHeight(), 0)
      },
      [adjustHeight, supabase]
    )

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
              {/* Hidden file input for attachments */}
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                multiple
                className='hidden'
                data-testid='modal-file-input'
                onChange={handleFilesSelected}
              />

              {/* Preview grid */}
              {attachments.length > 0 && (
                <div className='-mt-2 mb-2 flex gap-2 flex-wrap max-w-full'>
                  {attachments.map(a => (
                    <div
                      key={a.id}
                      className='relative w-24 h-24 rounded-md overflow-hidden border border-border/60 bg-muted/30'
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.previewUrl}
                        alt='attachment preview'
                        className='w-full h-full object-cover'
                      />
                      <button
                        type='button'
                        aria-label='Remove attachment'
                        className='absolute top-1 right-1 z-10 bg-background/90 border border-border rounded-full p-1 shadow'
                        onClick={() => removeAttachment(a.id)}
                        data-testid={`modal-remove-${a.id}`}
                      >
                        <X className='h-3 w-3' />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
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
              {/* Attach button (bottom-left) */}
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={handlePickFiles}
                aria-label='Attach image'
                title='Attach image'
                data-testid='modal-attach-button'
                className='h-8 w-8 text-muted-foreground hover:text-foreground'
              >
                <Paperclip className='h-4 w-4' />
              </Button>

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
