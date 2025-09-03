'use client'

/**
 * Example Usage of Error Communication System
 *
 * This file demonstrates how to integrate the error communication system
 * into existing Gravity Note components and hooks.
 */

import React from 'react'
import { useErrorHandler } from '@/contexts/error-context'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'

/**
 * Example: Enhanced Notes Mutations Hook
 * Shows how to integrate error communication with React Query mutations
 */
export function useNotesMutationsWithErrorHandling() {
  const errorHandler = useErrorHandler()

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: { title?: string; content: string }) => {
      // Simulate API call that might fail
      if (Math.random() > 0.7) {
        throw new Error('Failed to create note: Database connection lost')
      }
      return { id: Date.now(), ...noteData }
    },
    onError: error => {
      // Use the error handler to communicate the database error
      errorHandler.handleDatabaseError(error, () => {
        // Retry the mutation
        createNoteMutation.mutate(createNoteMutation.variables!)
      })
    },
    onSuccess: data => {
      console.log('Note created successfully:', data)
    },
  })

  return {
    createNote: createNoteMutation.mutate,
    isCreating: createNoteMutation.isPending,
    error: createNoteMutation.error,
  }
}

/**
 * Example: Network-aware Query Hook
 * Shows how to handle network errors in data fetching
 */
export function useNotesQueryWithErrorHandling() {
  const errorHandler = useErrorHandler()

  const notesQuery = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      // Simulate network request that might fail
      if (Math.random() > 0.8) {
        throw new Error('Network request failed: Unable to fetch notes')
      }
      return [{ id: 1, title: 'Sample Note', content: 'This is a sample note' }]
    },
    retry: (failureCount, error) => {
      // Handle network errors with user communication
      if (failureCount === 0) {
        errorHandler.handleNetworkError(error, () => {
          notesQuery.refetch()
        })
      }
      return failureCount < 2
    },
  })

  return {
    data: notesQuery.data,
    isLoading: notesQuery.isLoading,
    error: notesQuery.error,
    refetch: notesQuery.refetch,
  }
}

/**
 * Example: Form with Error Handling
 * Shows how to handle validation errors in forms
 */
export function ExampleFormWithErrorHandling() {
  const errorHandler = useErrorHandler()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Validate email
      if (!email.includes('@')) {
        throw new Error('Invalid email format')
      }

      // Validate password
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters')
      }

      // Simulate API call
      if (Math.random() > 0.5) {
        throw new Error('Authentication failed: Invalid credentials')
      }

      console.log('Form submitted successfully')
    } catch (error: any) {
      if (error.message.includes('email')) {
        errorHandler.handleValidationError(error, 'email')
      } else if (error.message.includes('password')) {
        errorHandler.handleValidationError(error, 'password')
      } else if (error.message.includes('Authentication')) {
        errorHandler.handleAuthError(error, () => {
          console.log('Redirecting to sign in...')
        })
      } else {
        errorHandler.handleError(error, 'form', 'submit')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4 p-4'>
      <div>
        <label htmlFor='email' className='block text-sm font-medium'>
          Email
        </label>
        <input
          id='email'
          type='email'
          value={email}
          onChange={e => setEmail(e.target.value)}
          className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2'
        />
      </div>

      <div>
        <label htmlFor='password' className='block text-sm font-medium'>
          Password
        </label>
        <input
          id='password'
          type='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
          className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2'
        />
      </div>

      <Button type='submit'>Submit</Button>
    </form>
  )
}

/**
 * Example: API Service with Error Handling
 * Shows how to wrap API calls with error communication
 */
export class ApiService {
  private errorHandler: ReturnType<typeof useErrorHandler>

  constructor(errorHandler: ReturnType<typeof useErrorHandler>) {
    this.errorHandler = errorHandler
  }

  async fetchNotes() {
    try {
      const response = await fetch('/api/notes')

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required')
        } else if (response.status === 403) {
          throw new Error('Access denied to notes')
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please slow down.')
        } else if (response.status >= 500) {
          throw new Error('Server error occurred')
        } else {
          throw new Error(`Request failed with status ${response.status}`)
        }
      }

      return response.json()
    } catch (error: any) {
      if (error.message.includes('Authentication')) {
        this.errorHandler.handleAuthError(error)
      } else if (error.message.includes('Access denied')) {
        this.errorHandler.handleError(error, 'api', 'fetch_notes')
      } else if (error.message.includes('Too many requests')) {
        this.errorHandler.handleError(error, 'api', 'rate_limit')
      } else if (error.message.includes('Server error')) {
        this.errorHandler.handleCriticalError(error)
      } else {
        this.errorHandler.handleNetworkError(error, () => this.fetchNotes())
      }
      throw error
    }
  }

  async createNote(noteData: { title?: string; content: string }) {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noteData),
      })

      if (!response.ok) {
        throw new Error(`Failed to create note: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      this.errorHandler.handleDatabaseError(error, () =>
        this.createNote(noteData)
      )
      throw error
    }
  }
}

/**
 * Example: Component Integration
 * Shows how to integrate error handling into a component
 */
export function ExampleNotesComponent() {
  const errorHandler = useErrorHandler()
  const notesMutation = useNotesMutationsWithErrorHandling()
  const notesQuery = useNotesQueryWithErrorHandling()

  const handleCreateNote = () => {
    notesMutation.createNote({
      title: 'New Note',
      content: 'This is a new note created with error handling',
    })
  }

  React.useEffect(() => {
    // Handle any critical errors that occur during component lifecycle
    const handleUnhandledError = (event: ErrorEvent) => {
      errorHandler.handleCriticalError(event.error)
    }

    window.addEventListener('error', handleUnhandledError)

    return () => {
      window.removeEventListener('error', handleUnhandledError)
    }
  }, [errorHandler])

  return (
    <div className='p-6'>
      <div className='mb-4'>
        <Button onClick={handleCreateNote} disabled={notesMutation.isCreating}>
          {notesMutation.isCreating ? 'Creating...' : 'Create Note'}
        </Button>

        <Button
          onClick={() => notesQuery.refetch()}
          disabled={notesQuery.isLoading}
          variant='outline'
          className='ml-2'
        >
          {notesQuery.isLoading ? 'Loading...' : 'Refresh Notes'}
        </Button>
      </div>

      <div>
        {notesQuery.data?.map((note: any) => (
          <div key={note.id} className='p-3 border rounded mb-2'>
            <h3 className='font-medium'>{note.title}</h3>
            <p className='text-sm text-gray-600'>{note.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Usage Guidelines:
 *
 * 1. Import the error handler hook in your components:
 *    const errorHandler = useErrorHandler()
 *
 * 2. Use appropriate error handlers based on error type:
 *    - handleNetworkError() for API/network failures
 *    - handleAuthError() for authentication issues
 *    - handleDatabaseError() for data persistence issues
 *    - handleValidationError() for form validation
 *    - handleCriticalError() for system-level errors
 *    - handleError() for general errors
 *
 * 3. Always provide retry functions for retryable errors:
 *    errorHandler.handleNetworkError(error, () => retryFunction())
 *
 * 4. Use the error context to track error statistics:
 *    const errorStats = useErrorStats()
 *
 * 5. The system automatically:
 *    - Shows appropriate toast notifications
 *    - Reports critical errors
 *    - Provides recovery actions
 *    - Tracks error statistics
 *    - Manages error state globally
 */
