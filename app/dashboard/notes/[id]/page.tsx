'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/auth/user-menu'
import { Button } from '@/components/ui/button'
import { NoteComposer } from '@/components/notes/note-composer'
import { useNote, useDeleteNote, useDuplicateNote } from '@/lib/hooks/use-notes'
import type { Note } from '@/types'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Copy,
  Trash2,
  Calendar,
  Edit,
} from 'lucide-react'
import { useState } from 'react'

export default function NoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const noteId = params.id as string

  const [showMenu, setShowMenu] = useState(false)

  const { data: note, isLoading, isError, error } = useNote(noteId)

  const deleteNoteMutation = useDeleteNote({
    onSuccess: () => {
      router.push('/dashboard/notes')
    },
  })

  const duplicateNoteMutation = useDuplicateNote({
    onSuccess: newNote => {
      router.push(`/dashboard/notes/${newNote.id}`)
    },
  })

  const handleSave = (updatedNote: Note) => {
    // Note updated successfully
    console.log('Note updated:', updatedNote.id)
  }

  const handleDelete = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete this note? This action cannot be undone.'
      )
    ) {
      try {
        await deleteNoteMutation.mutateAsync(noteId)
      } catch (error) {
        console.error('Failed to delete note:', error)
      }
    }
    setShowMenu(false)
  }

  const handleDuplicate = async () => {
    try {
      await duplicateNoteMutation.mutateAsync(noteId)
    } catch (error) {
      console.error('Failed to duplicate note:', error)
    }
    setShowMenu(false)
  }

  const handleCancel = () => {
    router.back()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className='min-h-screen bg-gradient-to-br from-background to-muted'>
          <div className='container mx-auto p-4'>
            <div className='flex items-center justify-center py-20'>
              <Loader2 className='h-8 w-8 animate-spin' />
              <span className='ml-3 text-lg'>Loading note...</span>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (isError || !note) {
    return (
      <ProtectedRoute>
        <div className='min-h-screen bg-gradient-to-br from-background to-muted'>
          <div className='container mx-auto p-4 max-w-4xl'>
            {/* Header */}
            <div className='flex items-center justify-between mb-6'>
              <Link href='/dashboard/notes'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='flex items-center space-x-1'
                >
                  <ArrowLeft className='h-4 w-4' />
                  <span>Back to Notes</span>
                </Button>
              </Link>
              <UserMenu />
            </div>

            {/* Error State */}
            <div className='text-center py-20'>
              <AlertCircle className='h-16 w-16 text-red-500 mx-auto mb-4' />
              <h2 className='text-2xl font-bold mb-2'>Note Not Found</h2>
              <p className='text-muted-foreground mb-6'>
                {error?.message ||
                  'The note you are looking for does not exist or has been deleted.'}
              </p>
              <div className='space-x-3'>
                <Link href='/dashboard/notes'>
                  <Button variant='outline'>Back to Notes</Button>
                </Link>
                <Link href='/dashboard/notes/new'>
                  <Button>Create New Note</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className='min-h-screen bg-gradient-to-br from-background to-muted'>
        <div className='container mx-auto p-4 max-w-4xl'>
          {/* Header */}
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center space-x-4'>
              <Link href='/dashboard/notes'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='flex items-center space-x-1'
                >
                  <ArrowLeft className='h-4 w-4' />
                  <span>Back to Notes</span>
                </Button>
              </Link>
              <div>
                <h1 className='text-xl font-bold truncate max-w-md'>
                  {note.title || 'Untitled Note'}
                </h1>
                <div className='flex items-center space-x-4 text-sm text-muted-foreground'>
                  <div className='flex items-center space-x-1'>
                    <Calendar className='h-3 w-3' />
                    <span>Created {formatDate(note.created_at)}</span>
                  </div>
                  {note.updated_at !== note.created_at && (
                    <div className='flex items-center space-x-1'>
                      <Edit className='h-3 w-3' />
                      <span>Updated {formatDate(note.updated_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className='flex items-center space-x-3'>
              {/* Actions Menu */}
              <div className='relative'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setShowMenu(!showMenu)}
                  className='flex items-center space-x-1'
                >
                  <MoreHorizontal className='h-4 w-4' />
                  <span>Actions</span>
                </Button>

                {showMenu && (
                  <div className='absolute right-0 top-10 z-10 bg-background border border-border rounded-md shadow-lg py-1 min-w-[150px]'>
                    <button
                      onClick={handleDuplicate}
                      disabled={duplicateNoteMutation.isPending}
                      className='flex items-center w-full px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50'
                    >
                      <Copy className='h-3 w-3 mr-2' />
                      Duplicate Note
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleteNoteMutation.isPending}
                      className='flex items-center w-full px-3 py-2 text-sm hover:bg-muted text-red-600 transition-colors disabled:opacity-50'
                    >
                      <Trash2 className='h-3 w-3 mr-2' />
                      Delete Note
                    </button>
                  </div>
                )}
              </div>

              <UserMenu />
            </div>
          </div>

          {/* Note Editor */}
          <div className='bg-background rounded-lg border border-border shadow-sm'>
            <NoteComposer
              note={note}
              onSave={handleSave}
              onCancel={handleCancel}
              autoFocus={false}
              placeholder='Start editing your note...'
              className='p-6'
            />
          </div>

          {/* Help Text */}
          <div className='mt-6 text-center text-sm text-muted-foreground'>
            <p>
              Changes are automatically saved as you type. Press{' '}
              <kbd className='px-1.5 py-0.5 text-xs bg-muted rounded'>⌘S</kbd>{' '}
              to save manually.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
