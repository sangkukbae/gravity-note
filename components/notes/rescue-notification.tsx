'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  useNoteRescue,
  useNoteRecovery,
  useRescueNotifications,
} from '@/lib/hooks/use-note-rescue'
import type { RescuedNote } from '@/lib/services/note-rescue'
import {
  AlertTriangle,
  X,
  Clock,
  FileText,
  Download,
  Trash2,
  CheckCircle,
} from 'lucide-react'

export function RescueNotification() {
  const { shouldShowNotification, visibleNotifications, dismissNotification } =
    useRescueNotifications()
  const { deleteRescuedNote } = useNoteRescue()
  const { recoverNote, isRecovering } = useNoteRecovery()
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  if (!shouldShowNotification) {
    return null
  }

  const toggleExpanded = (noteId: string) => {
    const newExpanded = new Set(expandedNotes)
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId)
    } else {
      newExpanded.add(noteId)
    }
    setExpandedNotes(newExpanded)
  }

  const handleRecover = async (rescuedNote: RescuedNote) => {
    try {
      await recoverNote(rescuedNote)
      // Success feedback could be added here
    } catch (error) {
      console.error('Recovery failed:', error)
      // Error feedback could be added here
    }
  }

  const handleDelete = (noteId: string) => {
    deleteRescuedNote(noteId)
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)

    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
    if (diffInHours < 24) return `${diffInHours} hours ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPreviewText = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  return (
    <div className='fixed bottom-4 right-4 z-50 max-w-sm space-y-2'>
      {visibleNotifications.map(note => (
        <Card key={note.id} className='border-amber-200 bg-amber-50 shadow-lg'>
          <CardHeader className='pb-3'>
            <div className='flex items-start justify-between'>
              <div className='flex items-start space-x-2'>
                <AlertTriangle className='h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0' />
                <div className='min-w-0 flex-1'>
                  <CardTitle className='text-sm font-medium text-amber-900'>
                    Draft Recovered
                  </CardTitle>
                  <CardDescription className='text-xs text-amber-700'>
                    <div className='flex items-center space-x-1'>
                      <Clock className='h-3 w-3' />
                      <span>{formatTimestamp(note.timestamp)}</span>
                    </div>
                  </CardDescription>
                </div>
              </div>
              <Button
                variant='ghost'
                size='sm'
                className='h-6 w-6 p-0 text-amber-600 hover:text-amber-900'
                onClick={() => dismissNotification(note.id)}
              >
                <X className='h-3 w-3' />
              </Button>
            </div>
          </CardHeader>

          <CardContent className='pt-0 space-y-3'>
            {/* Note Preview */}
            <div>
              <div className='text-xs font-medium text-amber-900 mb-1'>
                {note.title || 'Untitled Note'}
              </div>
              <div className='text-xs text-amber-800 bg-amber-100 rounded p-2'>
                <div
                  className={`whitespace-pre-wrap ${
                    expandedNotes.has(note.id) ? '' : 'line-clamp-3'
                  }`}
                >
                  {expandedNotes.has(note.id)
                    ? note.content
                    : getPreviewText(note.content)}
                </div>
                {note.content.length > 100 && (
                  <button
                    onClick={() => toggleExpanded(note.id)}
                    className='mt-1 text-xs text-amber-700 underline hover:no-underline'
                  >
                    {expandedNotes.has(note.id) ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className='flex items-center justify-between space-x-2'>
              <div className='flex items-center space-x-1'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => handleRecover(note)}
                  disabled={isRecovering}
                  className='h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100'
                >
                  <Download className='h-3 w-3 mr-1' />
                  Recover
                </Button>

                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => handleDelete(note.id)}
                  className='h-7 w-7 p-0 text-amber-600 hover:text-red-600 hover:bg-red-50'
                >
                  <Trash2 className='h-3 w-3' />
                </Button>
              </div>

              <div className='flex items-center text-xs text-amber-700'>
                <FileText className='h-3 w-3 mr-1' />
                <span>{note.content.length} chars</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Summary notification if multiple notes */}
      {visibleNotifications.length > 1 && (
        <Card className='border-amber-200 bg-amber-50 shadow-lg'>
          <CardContent className='p-3'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2 text-xs text-amber-900'>
                <CheckCircle className='h-3 w-3' />
                <span>{visibleNotifications.length} drafts recovered</span>
              </div>
              <Button
                size='sm'
                variant='ghost'
                onClick={() => dismissNotification()}
                className='h-6 text-xs text-amber-600 hover:text-amber-900'
              >
                Dismiss all
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
