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
import { useAuthStore } from '@/lib/stores/auth'
import { createClient } from '@/lib/supabase/client'
import { measureImage } from '@/lib/uploads/image'
import { uploadDraft, removeObject, moveToFinal } from '@/lib/uploads/storage'
import { loadDraft, saveDraft, clearDraft } from '@/lib/offline/drafts'
import {
  PlusIcon,
  LoaderIcon,
  AlertTriangleIcon,
  Paperclip,
  X,
} from 'lucide-react'
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog'
import {
  useNoteContentValidation,
  useContentStats,
} from '@/hooks/use-validation'

interface NoteInputProps {
  onSubmit: (content: string) => Promise<{ id: string } | void>
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
    const { user } = useAuthStore()
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()
    const sessionIdRef = useRef<string>(
      `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    )
    // After a note is created, this holds the server note id so
    // any in-flight uploads can be finalized as they complete.
    const pendingNoteIdRef = useRef<string | null>(null)

    // Validation hooks
    const validation = useNoteContentValidation({
      realTimeValidation: true,
      debounceMs: 500,
      enableStats: true,
    })
    const contentStats = useContentStats(content)

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

    // Attachments state (MVP: client-side previews only)
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

    // Local fullscreen preview for draft attachments
    const [thumbViewerOpen, setThumbViewerOpen] = useState(false)
    const [thumbActiveIndex, setThumbActiveIndex] = useState(0)

    // Keyboard navigation for preview (left/right)
    useEffect(() => {
      if (!thumbViewerOpen) return
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') {
          setThumbActiveIndex(i => (i + 1) % Math.max(attachments.length, 1))
        } else if (e.key === 'ArrowLeft') {
          setThumbActiveIndex(
            i =>
              (i - 1 + Math.max(attachments.length, 1)) %
              Math.max(attachments.length, 1)
          )
        }
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }, [thumbViewerOpen, attachments.length])

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
      // With previews rendered in normal flow, textarea min height stays constant
      const minHeight = 28 // Compact single-line height

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

    // Load draft on mount (per user) and adjust height
    useEffect(() => {
      // Load saved draft for this user
      if (user?.id) {
        const draft = loadDraft(user.id)
        if (draft?.content) {
          setContent(draft.content)
          // Delay to ensure textarea exists before measuring
          setTimeout(() => adjustHeight(), 0)
        } else {
          adjustHeight()
        }
      } else {
        adjustHeight()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adjustHeight, user?.id])

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
        // Only finalize attachments when we have a real server ID (skip optimistic temp IDs)
        const canFinalize =
          createdId &&
          typeof createdId === 'string' &&
          !createdId.startsWith('temp_')
        if (canFinalize && user?.id && attachments.length > 0) {
          // Store the created note id so that any uploads still finishing
          // can be finalized as they complete.
          pendingNoteIdRef.current = createdId

          // Enhanced finalization with retry logic and initial delay
          const finalizeAttachment = async (
            attachment: any,
            retryCount = 0
          ) => {
            const maxRetries = 5 // Increased from 3 to 5 for better reliability

            // Add initial delay to ensure draft upload is fully complete
            if (retryCount === 0) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }

            try {
              // Call server-side API to finalize attachment
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

              // Update the attachment record with the final path
              const { error } = await supabase
                .from('note_attachments')
                .update({ note_id: createdId, storage_path: finalPath })
                .eq('id', attachment.rowId)

              if (error) throw error

              console.log(
                `✅ Successfully finalized attachment ${attachment.rowId} at ${finalPath}`
              )
            } catch (error) {
              console.warn(
                `Failed to finalize attachment ${attachment.rowId} (attempt ${retryCount + 1}):`,
                error
              )

              if (retryCount < maxRetries) {
                // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
                const delay = 500 * Math.pow(2, retryCount)
                setTimeout(() => {
                  finalizeAttachment(attachment, retryCount + 1)
                }, delay)
              } else {
                console.error(
                  `Failed to finalize attachment ${attachment.rowId} after ${maxRetries + 1} attempts`
                )
              }
            }
          }

          // Process all uploaded attachments
          const uploadedAttachments = attachments.filter(
            a => a.status === 'uploaded' && a.storagePath && a.rowId
          )

          if (uploadedAttachments.length > 0) {
            // Start finalization for all uploaded attachments
            uploadedAttachments.forEach(attachment => {
              finalizeAttachment(attachment)
            })

            // Broadcast that attachments finalization is in progress
            if (typeof window !== 'undefined') {
              // Initial dispatch for immediate feedback
              window.dispatchEvent(
                new CustomEvent('gn:attachments-finalized', {
                  detail: { noteId: createdId },
                })
              )

              // Follow-up dispatch after a short delay to catch any quick finalizations
              setTimeout(() => {
                window.dispatchEvent(
                  new CustomEvent('gn:attachments-finalized', {
                    detail: { noteId: createdId },
                  })
                )
              }, 1000)
            }
          }
        }
        setContent('')
        // Reset UI previews quickly, but keep attachments state briefly
        // so any in-flight uploads can still finalize using pendingNoteIdRef.
        setTimeout(() => {
          setAttachments(prev => {
            prev.forEach(a => URL.revokeObjectURL(a.previewUrl))
            return []
          })
        }, 100)
        validation.reset() // Reset validation state
        // Clear draft after successful submission
        if (user?.id) clearDraft(user.id)
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
      const next = e.target.value
      setContent(next)

      // Real-time validation
      if (validation.state.hasBeenValidated || next.trim().length > 0) {
        validation.validateAsync(next)
      }

      // Save draft with light debounce
      if (user?.id) {
        // micro-debounce via rAF to coalesce rapid typing
        requestAnimationFrame(() => saveDraft(user.id!, next))
      }
      // Adjust height after content change
      setTimeout(() => adjustHeight(), 0)
    }

    // Attachment helpers
    const addFiles = useCallback(
      (files: FileList | File[]) => {
        const list = Array.from(files)
        const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
        const maxCount = 4
        const maxSize = 10 * 1024 * 1024 // 10MB

        const current = attachments.length
        const available = Math.max(0, maxCount - current)
        const take = list.slice(0, available)

        const drafts: AttachmentDraft[] = take
          .filter(f => allowed.includes(f.type) && f.size <= maxSize)
          .map(f => ({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            file: f,
            previewUrl: URL.createObjectURL(f),
            error: null,
            status: 'pending',
          }))

        if (drafts.length > 0) {
          setAttachments(prev => [...prev, ...drafts])
          // Reflow to make room for preview row
          setTimeout(() => adjustHeight(), 0)

          // Start uploads in background
          const doUploads = async () => {
            if (!user?.id) return
            for (const d of drafts) {
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
                    storage_path: path,
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
                // If we already have a created note id, finalize immediately with retry logic
                const finalizeNoteId = pendingNoteIdRef.current
                if (
                  finalizeNoteId &&
                  typeof finalizeNoteId === 'string' &&
                  !finalizeNoteId.startsWith('temp_')
                ) {
                  const finalizeInFlightAttachment = async (retryCount = 0) => {
                    const maxRetries = 5 // Increased from 3 to 5 for better reliability

                    // Add initial delay to ensure draft upload is fully complete
                    if (retryCount === 0) {
                      await new Promise(resolve => setTimeout(resolve, 1000))
                    }

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

                      console.log(
                        `Successfully finalized in-flight attachment ${data!.id}`
                      )

                      // Notify listeners that attachments for this note were finalized
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                          new CustomEvent('gn:attachments-finalized', {
                            detail: { noteId: finalizeNoteId },
                          })
                        )
                      }
                    } catch (error) {
                      console.warn(
                        `Failed to finalize in-flight attachment ${data!.id} (attempt ${retryCount + 1}):`,
                        error
                      )

                      if (retryCount < maxRetries) {
                        const delay = 500 * Math.pow(2, retryCount)
                        setTimeout(() => {
                          finalizeInFlightAttachment(retryCount + 1)
                        }, delay)
                      } else {
                        console.error(
                          `Failed to finalize in-flight attachment ${data!.id} after ${maxRetries + 1} attempts`
                        )
                      }
                    }
                  }

                  finalizeInFlightAttachment()
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
      [attachments.length, adjustHeight]
    )

    const handlePickFiles = useCallback(() => {
      fileInputRef.current?.click()
    }, [])

    const handleFilesSelected = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return
        addFiles(e.target.files)
        // reset so selecting the same file again still fires change
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
      contentStats.percentage > 70 || hasValidationError
    const canSubmit =
      content.trim() &&
      !isLoading &&
      !hasValidationError &&
      contentStats.isValid

    return (
      <div className={cn('w-full', className)}>
        {/* Input container with width constraints */}
        <div className='w-full max-w-[600px] mx-auto'>
          <form onSubmit={handleSubmit} className='relative'>
            {/* Integrated Input Container */}
            <div
              className={cn(
                'relative rounded-md border bg-background',
                // Remove blue outer focus ring; keep subtle focus via border color if desired
                // 'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                hasValidationError ? 'border-destructive' : 'border-input'
              )}
            >
              {/* Attachment hidden input */}
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                multiple
                className='hidden'
                data-testid='file-input'
                onChange={handleFilesSelected}
              />

              {/* Content area padding: leaves room for left/right buttons */}
              <div
                className={cn(
                  'pl-12 pr-16 py-2',
                  attachments.length === 0
                    ? 'flex items-center min-h-[48px]'
                    : 'space-y-2'
                )}
              >
                {/* Preview grid (inside container, above textarea) */}
                {attachments.length > 0 && (
                  <div className='mb-2 flex gap-2 flex-wrap max-w-full'>
                    {attachments.map((a, idx) => (
                      <div
                        key={a.id}
                        className='relative w-24 h-24 rounded-md overflow-hidden border border-border/60 bg-muted/30'
                        data-testid={`thumb-${a.id}`}
                      >
                        {/* Click surface to open fullscreen preview */}
                        <button
                          type='button'
                          aria-label='Open attachment preview'
                          className='absolute inset-0 z-0'
                          onClick={() => {
                            setThumbActiveIndex(idx)
                            setThumbViewerOpen(true)
                          }}
                        />
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
                          data-testid={`remove-${a.id}`}
                        >
                          <X className='h-3 w-3' />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={isLoading}
                  className={cn(
                    'w-full text-base resize-none transition-all duration-150 ease-out bg-transparent',
                    // Initial height matching original input, will auto-expand
                    'min-h-[28px] p-0 leading-7',
                    'placeholder:text-muted-foreground',
                    // Hide scrollbar initially
                    'overflow-y-hidden',
                    // Remove default borders/background and all focus outlines
                    'border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0',
                    // Disabled state
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    isLoading && 'opacity-50'
                  )}
                  aria-label='Note content input'
                  autoComplete='off'
                  spellCheck={true}
                  rows={1} // Start with single row
                />
              </div>

              {/* Attach button (left) */}
              <button
                type='button'
                onClick={handlePickFiles}
                className={cn(
                  'absolute left-3',
                  isMultiLine || attachments.length > 0
                    ? 'top-3'
                    : 'top-1/2 -translate-y-1/2',
                  'w-8 h-8 inline-flex items-center justify-center rounded-md',
                  'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  'transition-colors'
                )}
                aria-label='Attach image'
                title='Attach image'
                data-testid='attach-button'
              >
                <Paperclip className='h-4 w-4' />
              </button>

              {/* Integrated Submit Button */}
              <button
                type='submit'
                disabled={!canSubmit}
                className={cn(
                  'absolute flex items-center justify-center',
                  'w-8 h-8 rounded-md',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90 active:bg-primary/95',
                  'transition-all duration-150',
                  'focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0',
                  // Disabled state
                  'disabled:opacity-50 disabled:pointer-events-none',
                  // Vertical alignment: center for single-line, top for multiline
                  'right-3',
                  isMultiLine || attachments.length > 0
                    ? 'top-3'
                    : 'top-1/2 -translate-y-1/2'
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

          {/* Fullscreen preview for draft attachments */}
          <Dialog open={thumbViewerOpen} onOpenChange={setThumbViewerOpen}>
            <DialogContent className='w-screen h-screen max-w-none p-0 bg-black/90 border-none flex items-center justify-center'>
              <DialogClose asChild>
                <button
                  type='button'
                  aria-label='Close viewer'
                  className='absolute left-4 top-4 z-[60] rounded-md bg-black/60 text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 p-2'
                >
                  <X className='h-5 w-5' />
                </button>
              </DialogClose>
              {attachments[thumbActiveIndex] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachments[thumbActiveIndex].previewUrl}
                  alt='attachment preview'
                  className='max-w-[98vw] max-h-[98vh] object-contain'
                />
              ) : (
                <div className='text-muted-foreground'>Loading…</div>
              )}
            </DialogContent>
          </Dialog>

          {/* Validation Feedback */}
          {(hasValidationError || showCharacterCount) && (
            <div className='mt-2 flex items-center justify-between text-xs'>
              {/* Error Message */}
              {hasValidationError && (
                <div className='flex items-center gap-1 text-destructive'>
                  <AlertTriangleIcon className='h-3 w-3' />
                  <span>{validation.state.error}</span>
                </div>
              )}

              {/* Character Count */}
              {showCharacterCount && !hasValidationError && (
                <div
                  className={cn(
                    'flex items-center gap-1',
                    contentStats.showWarning
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-muted-foreground'
                  )}
                >
                  <span>
                    {contentStats.length}/{contentStats.maxLength}
                  </span>
                  {contentStats.showWarning && (
                    <AlertTriangleIcon className='h-3 w-3' />
                  )}
                </div>
              )}

              {/* Loading indicator */}
              {isValidationLoading && (
                <div className='flex items-center gap-1 text-muted-foreground'>
                  <LoaderIcon className='h-3 w-3 animate-spin' />
                  <span>Validating...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)

NoteInput.displayName = 'NoteInput'
