'use client'

import Link from 'next/link'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserMenu } from '@/components/auth/user-menu'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { NoteCard } from '@/components/notes/note-card'
import { NoteSearch } from '@/components/notes/note-search'
import { useRecentNotes, useNotesCount } from '@/lib/hooks/use-notes'
import { useRealTimeNotes } from '@/lib/hooks/use-real-time-notes'
import type { Note } from '@/types'
import {
  Plus,
  FileText,
  TrendingUp,
  Search,
  ArrowRight,
  Loader2,
} from 'lucide-react'

export default function DashboardPage() {
  // Enable real-time updates
  useRealTimeNotes()

  const { data: recentNotes = [], isLoading: isLoadingRecent } =
    useRecentNotes(5)
  const { data: totalCount = 0, isLoading: isLoadingCount } = useNotesCount()

  const handleNoteSelect = (note: Note) => {
    // Navigation is handled by NoteCard's Link wrapper
  }

  return (
    <ProtectedRoute>
      <div className='min-h-screen bg-gradient-to-br from-background to-muted'>
        <div className='container mx-auto p-4 max-w-6xl'>
          {/* Header */}
          <div className='flex items-center justify-between mb-8'>
            <div>
              <h1 className='text-3xl font-bold mb-2'>
                Welcome to Gravity Note
              </h1>
              <p className='text-muted-foreground'>
                Your minimalist note-taking workspace
              </p>
            </div>
            <UserMenu />
          </div>

          {/* Quick Actions */}
          <div className='flex flex-col sm:flex-row gap-4 mb-8'>
            <Link href='/dashboard/notes/new' className='flex-1'>
              <Button className='w-full h-12 text-base flex items-center justify-center space-x-2'>
                <Plus className='h-5 w-5' />
                <span>New Note</span>
              </Button>
            </Link>

            <div className='flex-1 max-w-md'>
              <NoteSearch
                onNoteSelect={handleNoteSelect}
                placeholder='Search your notes...'
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className='grid gap-4 md:grid-cols-3 mb-8'>
            <Card>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-sm font-medium'>
                    Total Notes
                  </CardTitle>
                  <FileText className='h-4 w-4 text-muted-foreground' />
                </div>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {isLoadingCount ? (
                    <Loader2 className='h-6 w-6 animate-spin' />
                  ) : (
                    totalCount.toLocaleString()
                  )}
                </div>
                <p className='text-xs text-muted-foreground mt-1'>
                  {totalCount === 1 ? 'note' : 'notes'} in your collection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-sm font-medium'>
                    Recent Activity
                  </CardTitle>
                  <TrendingUp className='h-4 w-4 text-muted-foreground' />
                </div>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{recentNotes.length}</div>
                <p className='text-xs text-muted-foreground mt-1'>
                  notes updated recently
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-sm font-medium'>
                    Quick Search
                  </CardTitle>
                  <Search className='h-4 w-4 text-muted-foreground' />
                </div>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-muted-foreground'>
                  Press{' '}
                  <kbd className='px-1.5 py-0.5 text-xs bg-muted rounded'>
                    ⌘K
                  </kbd>{' '}
                  to search
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Notes */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Recent Notes</CardTitle>
                  <CardDescription>
                    Your latest notes and updates
                  </CardDescription>
                </div>
                <Link href='/dashboard/notes'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex items-center space-x-1'
                  >
                    <span>View All</span>
                    <ArrowRight className='h-3 w-3' />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingRecent ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-6 w-6 animate-spin' />
                  <span className='ml-2'>Loading recent notes...</span>
                </div>
              ) : recentNotes.length === 0 ? (
                <div className='text-center py-8'>
                  <FileText className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                  <h3 className='text-lg font-medium mb-2'>No notes yet</h3>
                  <p className='text-muted-foreground mb-4'>
                    Start your note-taking journey by creating your first note
                  </p>
                  <Link href='/dashboard/notes/new'>
                    <Button className='flex items-center space-x-1'>
                      <Plus className='h-4 w-4' />
                      <span>Create First Note</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
                  {recentNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      compact={true}
                      className='transition-all hover:scale-[1.02]'
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
