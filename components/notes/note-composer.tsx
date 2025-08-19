'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateNote, useUpdateNote } from '@/lib/hooks/use-notes'
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/types'
import { Save, FileText, Clock } from 'lucide-react'

interface NoteComposerProps {
  note?: Note
  onSave?: (note: Note) => void
  onCancel?: () => void
  autoFocus?: boolean
  placeholder?: string
  className?: string
}

export function NoteComposer({
  note,
  onSave,
  onCancel,
  autoFocus = true,
  placeholder = 'Start writing your note...',
  className = '',
}: NoteComposerProps) {
  const router = useRouter()
  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const contentRef = useRef<HTMLTextAreaElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const createNoteMutation = useCreateNote({
    onSuccess: newNote => {
      setIsDirty(false)
      setLastSaved(new Date())
      onSave?.(newNote)
      router.push(`/dashboard/notes/${newNote.id}`)
    },
    onError: error => {
      console.error('Failed to create note:', error)
    },
  })

  const updateNoteMutation = useUpdateNote({
    onSuccess: updatedNote => {
      setIsDirty(false)
      setLastSaved(new Date())
      onSave?.(updatedNote)
    },
    onError: error => {
      console.error('Failed to update note:', error)
    },
  })

  // Auto-save logic
  const autoSave = useCallback(async () => {
    if (!isDirty || isSaving) return
    if (!content.trim() && !title.trim()) return

    setIsSaving(true)

    try {
      if (note) {
        // Update existing note
        const updateData: UpdateNoteInput = {
          id: note.id,
        }

        if (title !== note.title) {
          updateData.title = title || null
        }

        if (content !== note.content) {
          updateData.content = content
        }

        if (Object.keys(updateData).length > 1) {
          // More than just ID
          await updateNoteMutation.mutateAsync(updateData)
        }
      } else {
        // Create new note
        const createData: CreateNoteInput = {
          title: title || null,
          content,
        }
        await createNoteMutation.mutateAsync(createData)
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }, [
    isDirty,
    isSaving,
    content,
    title,
    note,
    updateNoteMutation,
    createNoteMutation,
  ])

  // Schedule auto-save with debouncing
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave()
    }, 2000) // Auto-save after 2 seconds of inactivity
  }, [autoSave])

  // Handle content changes
  const handleContentChange = (value: string) => {
    setContent(value)
    setIsDirty(true)
    scheduleAutoSave()
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    setIsDirty(true)
    scheduleAutoSave()
  }

  // Manual save
  const handleSave = useCallback(async () => {
    // Clear auto-save timeout and save immediately
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
      autoSaveTimeoutRef.current = null
    }

    await autoSave()
  }, [autoSave])

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const textarea = contentRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    autoResize()
  }, [content, autoResize])

  // Focus management
  useEffect(() => {
    if (autoFocus) {
      if (!note && titleRef.current) {
        titleRef.current.focus()
      } else if (contentRef.current) {
        contentRef.current.focus()
        // Move cursor to end
        const length = content.length
        contentRef.current.setSelectionRange(length, length)
      }
    }
  }, [autoFocus, note, content])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }

      // Escape to cancel
      if (e.key === 'Escape' && onCancel) {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, onCancel])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        // Trigger immediate save
        autoSave()
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, autoSave])

  const isLoading = createNoteMutation.isPending || updateNoteMutation.isPending
  const hasError = createNoteMutation.isError || updateNoteMutation.isError

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
          <FileText className='h-4 w-4' />
          <span>{note ? 'Edit Note' : 'New Note'}</span>
          {lastSaved && (
            <>
              <Clock className='h-3 w-3' />
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            </>
          )}
          {isSaving && <span className='text-blue-600'>Saving...</span>}
          {hasError && <span className='text-red-600'>Save failed</span>}
        </div>

        <div className='flex items-center space-x-2'>
          {onCancel && (
            <Button variant='outline' size='sm' onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            size='sm'
            onClick={handleSave}
            disabled={isLoading || (!isDirty && !!note)}
            className='flex items-center space-x-1'
          >
            <Save className='h-3 w-3' />
            <span>{isLoading ? 'Saving...' : 'Save'}</span>
          </Button>
        </div>
      </div>

      {/* Title Input */}
      <Input
        ref={titleRef}
        value={title}
        onChange={e => handleTitleChange(e.target.value)}
        placeholder='Note title (optional)'
        className='text-lg font-medium border-0 focus-visible:ring-0 px-0'
      />

      {/* Content Textarea */}
      <textarea
        ref={contentRef}
        value={content}
        onChange={e => handleContentChange(e.target.value)}
        placeholder={placeholder}
        className='w-full min-h-[400px] resize-none border-0 focus:outline-none text-base leading-relaxed'
        style={{
          fontFamily: 'inherit',
          lineHeight: '1.6',
        }}
      />

      {/* Status indicators */}
      <div className='text-xs text-muted-foreground space-x-4'>
        <span>{content.length} characters</span>
        <span>
          {content.split(/\s+/).filter(word => word.length > 0).length} words
        </span>
        {isDirty && <span className='text-amber-600'>Unsaved changes</span>}
      </div>
    </div>
  )
}
