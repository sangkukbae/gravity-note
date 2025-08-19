'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/auth/user-menu'
import { Button } from '@/components/ui/button'
import { NoteComposer } from '@/components/notes/note-composer'
import type { Note } from '@/types'
import { ArrowLeft, FileText } from 'lucide-react'

export default function NewNotePage() {
  const router = useRouter()

  const handleSave = (note: Note) => {
    // Note creation successful, navigate to the note
    router.push(`/dashboard/notes/${note.id}`)
  }

  const handleCancel = () => {
    router.back()
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
              <div className='flex items-center space-x-2'>
                <FileText className='h-5 w-5 text-muted-foreground' />
                <h1 className='text-xl font-bold'>New Note</h1>
              </div>
            </div>

            <UserMenu />
          </div>

          {/* Note Composer */}
          <div className='bg-background rounded-lg border border-border shadow-sm'>
            <NoteComposer
              onSave={handleSave}
              onCancel={handleCancel}
              autoFocus={true}
              placeholder='Start writing your note here...'
              className='p-6'
            />
          </div>

          {/* Help Text */}
          <div className='mt-6 text-center text-sm text-muted-foreground'>
            <p>
              Your note will be automatically saved as you type. Press{' '}
              <kbd className='px-1.5 py-0.5 text-xs bg-muted rounded'>⌘S</kbd>{' '}
              to save manually.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
