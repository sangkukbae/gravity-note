import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest'
import { NoteItem, type Note } from '@/components/notes/note-item'
import { createMockSupabaseClient, mockUser } from '../mocks/supabase'
import '../setup'

// Mock the Supabase client
const mockSupabase = createMockSupabaseClient()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

// Mock the auth hook
vi.mock('@/lib/stores/auth', () => ({
  useAuthStore: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}))

// Mock the offline outbox
const mockOutbox = {
  addToOutbox: vi.fn(),
  processOutbox: vi.fn(),
}
vi.mock('@/lib/utils/offline-outbox', () => ({
  getOutboxInstance: () => mockOutbox,
}))

// Mock the pending status hook
vi.mock('@/hooks/use-note-pending-status', () => ({
  useNotePendingStatus: () => ({
    isNotePending: () => false,
  }),
}))

// Mock the attachments component
vi.mock('@/components/notes/note-attachments', () => ({
  NoteAttachments: ({ noteId }: { noteId: string }) => (
    <div data-testid={`attachments-${noteId}`}>Mock Attachments</div>
  ),
}))

const mockNote: Note = {
  id: 'test-note-1',
  content: 'This is a test note content that will be deleted',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  user_id: 'test-user-id',
  title: null,
  is_rescued: false,
  original_note_id: null,
}

describe('Note Delete Integration', () => {
  let queryClient: QueryClient
  let wrapper: React.ComponentType<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    // Setup initial query data
    queryClient.setQueryData(['notes'], [mockNote])

    // Reset all mocks
    vi.clearAllMocks()

    // Configure successful delete response
    const mockFrom = vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      })),
    }))
    mockSupabase.from = mockFrom
  })

  it('completes full delete workflow from note item', async () => {
    render(
      <div className='wrapper'>
        <NoteItem
          note={mockNote}
          showRescueButton={false}
          showDivider={false}
        />
      </div>,
      { wrapper }
    )

    // 1. Find and click the more menu button
    const moreButton = screen.getByRole('button', { name: /more actions/i })
    expect(moreButton).toBeInTheDocument()
    fireEvent.click(moreButton)

    // 2. Wait for menu to open and find delete option
    await waitFor(() => {
      const deleteOption = screen.getByRole('menuitem', { name: /delete/i })
      expect(deleteOption).toBeInTheDocument()
      fireEvent.click(deleteOption)
    })

    // 3. Wait for delete modal to appear
    await waitFor(() => {
      const deleteModal = screen.getByRole('dialog')
      expect(deleteModal).toBeInTheDocument()
      expect(screen.getByText('Delete Note')).toBeInTheDocument()
    })

    // 4. Verify note preview is shown in modal
    expect(screen.getByText('Note content:')).toBeInTheDocument()
    expect(screen.getByText(`"${mockNote.content}"`)).toBeInTheDocument()

    // 5. Verify warning message
    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    expect(
      screen.getByText(
        /permanently delete the note and any associated attachments/
      )
    ).toBeInTheDocument()

    // 6. Click the delete button
    const confirmDeleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(confirmDeleteButton)

    // 7. Wait for deletion to complete
    await waitFor(() => {
      // Modal should close
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // 8. Verify API was called correctly
    expect(mockSupabase.from).toHaveBeenCalledWith('notes')

    // 9. Verify note was removed from query cache
    const notesAfterDelete = queryClient.getQueryData<Note[]>(['notes'])
    expect(notesAfterDelete).toEqual([]) // Should be empty after deletion
  })

  it('handles delete cancellation correctly', async () => {
    render(
      <div className='wrapper'>
        <NoteItem
          note={mockNote}
          showRescueButton={false}
          showDivider={false}
        />
      </div>,
      { wrapper }
    )

    // Open more menu
    const moreButton = screen.getByRole('button', { name: /more actions/i })
    fireEvent.click(moreButton)

    // Click delete option
    await waitFor(() => {
      const deleteOption = screen.getByRole('menuitem', { name: /delete/i })
      fireEvent.click(deleteOption)
    })

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Note should still exist in query cache
    const notesAfterCancel = queryClient.getQueryData<Note[]>(['notes'])
    expect(notesAfterCancel).toContainEqual(mockNote)

    // API should not have been called
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('shows loading state during deletion', async () => {
    // Mock a slow delete operation
    let resolveDelete: () => void
    const deletePromise = new Promise<{ error: null }>(resolve => {
      resolveDelete = () => resolve({ error: null })
    })

    const mockFrom = vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => deletePromise),
        })),
      })),
    }))
    mockSupabase.from = mockFrom

    render(
      <div className='wrapper'>
        <NoteItem
          note={mockNote}
          showRescueButton={false}
          showDivider={false}
        />
      </div>,
      { wrapper }
    )

    // Open delete modal
    const moreButton = screen.getByRole('button', { name: /more actions/i })
    fireEvent.click(moreButton)

    await waitFor(() => {
      const deleteOption = screen.getByRole('menuitem', { name: /delete/i })
      fireEvent.click(deleteOption)
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Start delete operation
    const confirmDeleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(confirmDeleteButton)

    // Verify loading state
    await waitFor(() => {
      const loadingButton = screen.getByRole('button', { name: /delete/i })
      expect(loadingButton).toBeDisabled()

      // Should show spinner (check for either LoaderIcon or progress indicator)
      const hasSpinner =
        screen.queryByTestId(/loader/i) ||
        screen.queryByRole('progressbar') ||
        loadingButton.querySelector('svg[class*="animate-spin"]')
      expect(hasSpinner).toBeInTheDocument()
    })

    // Cancel and delete buttons should be disabled
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    expect(cancelButton).toBeDisabled()

    // Complete the delete operation
    resolveDelete!()

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('handles delete errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock delete operation that fails
    const mockError = { message: 'Network error during deletion' }
    const mockFrom = vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.reject(new Error('Network error'))),
        })),
      })),
    }))
    mockSupabase.from = mockFrom

    render(
      <div className='wrapper'>
        <NoteItem
          note={mockNote}
          showRescueButton={false}
          showDivider={false}
        />
      </div>,
      { wrapper }
    )

    // Open delete modal and attempt deletion
    const moreButton = screen.getByRole('button', { name: /more actions/i })
    fireEvent.click(moreButton)

    await waitFor(() => {
      const deleteOption = screen.getByRole('menuitem', { name: /delete/i })
      fireEvent.click(deleteOption)
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const confirmDeleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(confirmDeleteButton)

    // Wait for error to be logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled()
    })

    // Modal should remain open after error
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Note should still exist in cache (rollback)
    const notesAfterError = queryClient.getQueryData<Note[]>(['notes'])
    expect(notesAfterError).toContainEqual(mockNote)

    consoleSpy.mockRestore()
  })

  it('handles temporary note deletion without API call', async () => {
    const tempNote: Note = {
      ...mockNote,
      id: 'temp_12345',
      content: 'This is a temporary note',
    }

    queryClient.setQueryData(['notes'], [tempNote])

    render(
      <div className='wrapper'>
        <NoteItem
          note={tempNote}
          showRescueButton={false}
          showDivider={false}
        />
      </div>,
      { wrapper }
    )

    // Complete delete workflow
    const moreButton = screen.getByRole('button', { name: /more actions/i })
    fireEvent.click(moreButton)

    await waitFor(() => {
      const deleteOption = screen.getByRole('menuitem', { name: /delete/i })
      fireEvent.click(deleteOption)
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const confirmDeleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(confirmDeleteButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // API should NOT have been called for temporary note
    expect(mockSupabase.from).not.toHaveBeenCalled()

    // Note should be removed from cache
    const notesAfterDelete = queryClient.getQueryData<Note[]>(['notes'])
    expect(notesAfterDelete).toEqual([])
  })

  it('prevents modal close during deletion', async () => {
    // Mock slow delete operation
    let resolveDelete: () => void
    const deletePromise = new Promise<{ error: null }>(resolve => {
      resolveDelete = () => resolve({ error: null })
    })

    const mockFrom = vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => deletePromise),
        })),
      })),
    }))
    mockSupabase.from = mockFrom

    const { container } = render(
      <div className='wrapper'>
        <NoteItem
          note={mockNote}
          showRescueButton={false}
          showDivider={false}
        />
      </div>,
      { wrapper }
    )

    // Open modal and start deletion
    const moreButton = screen.getByRole('button', { name: /more actions/i })
    fireEvent.click(moreButton)

    await waitFor(() => {
      const deleteOption = screen.getByRole('menuitem', { name: /delete/i })
      fireEvent.click(deleteOption)
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const confirmDeleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(confirmDeleteButton)

    // Try to click outside during loading (should be prevented)
    const backdrop = container.querySelector('[data-radix-dialog-overlay]')
    if (backdrop) {
      fireEvent.pointerDown(backdrop)
    }

    // Modal should still be open
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Complete deletion
    resolveDelete!()

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
