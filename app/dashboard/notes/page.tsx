'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/auth/user-menu'
import { Button } from '@/components/ui/button'
import { NoteList } from '@/components/notes/note-list'
import type { Note } from '@/types'
import { ArrowLeft, Plus } from 'lucide-react'

export default function NotesPage() {
  const router = useRouter()

  const handleNoteSelect = (note: Note) => {
    router.push(`/dashboard/notes/${note.id}`)
  }

  return (
    <ProtectedRoute>
      <div className='min-h-screen bg-gradient-to-br from-background to-muted'>
        <div className='container mx-auto p-4 max-w-7xl'>
          {/* Header */}
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center space-x-4'>
              <Link href='/dashboard'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='flex items-center space-x-1'
                >
                  <ArrowLeft className='h-4 w-4' />
                  <span>Dashboard</span>
                </Button>
              </Link>
              <div>
                <h1 className='text-2xl font-bold'>All Notes</h1>
                <p className='text-sm text-muted-foreground'>
                  Manage and organize your notes
                </p>
              </div>
            </div>

            <div className='flex items-center space-x-3'>
              <Link href='/dashboard/notes/new'>
                <Button className='flex items-center space-x-2'>
                  <Plus className='h-4 w-4' />
                  <span>New Note</span>
                </Button>
              </Link>
              <UserMenu />
            </div>
          </div>

          {/* Notes List */}
          <NoteList
            onNoteSelect={handleNoteSelect}
            showCreateButton={true}
            showSearch={true}
            showFilters={true}
            layout='grid'
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}
