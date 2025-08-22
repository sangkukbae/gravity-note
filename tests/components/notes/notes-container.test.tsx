import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotesContainer } from '@/components/notes/notes-container'
import { Note } from '@/components/notes/note-item'

// Mock sonner for toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock react-window for virtual scrolling
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemData, itemCount }: any) => {
    const items = []
    for (let i = 0; i < itemCount; i++) {
      items.push(
        children({
          index: i,
          style: { height: '120px' },
          data: itemData,
        })
      )
    }
    return <div data-testid='virtual-list'>{items}</div>
  },
}))

const mockNotes: Note[] = [
  {
    id: '1',
    content: 'First note content',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z',
    user_id: 'user1',
    is_rescued: false,
  },
  {
    id: '2',
    content: 'Second note content',
    created_at: '2025-01-20T09:00:00Z',
    updated_at: '2025-01-20T09:00:00Z',
    user_id: 'user1',
    is_rescued: false,
  },
]

describe('NotesContainer', () => {
  const mockOnCreateNote = vi.fn()
  const mockOnRescueNote = vi.fn()
  const mockOnSearchNotes = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the note input and notes list', () => {
    render(
      <NotesContainer
        initialNotes={mockNotes}
        onCreateNote={mockOnCreateNote}
        onRescueNote={mockOnRescueNote}
        onSearchNotes={mockOnSearchNotes}
      />
    )

    expect(
      screen.getByPlaceholderText('Capture your thought...')
    ).toBeInTheDocument()
    expect(screen.getByText('First note content')).toBeInTheDocument()
    expect(screen.getByText('Second note content')).toBeInTheDocument()
  })

  it('creates a new note when form is submitted', async () => {
    const user = userEvent.setup()
    const newNote: Note = {
      id: '3',
      content: 'New note content',
      created_at: '2025-01-20T11:00:00Z',
      updated_at: '2025-01-20T11:00:00Z',
      user_id: 'user1',
      is_rescued: false,
    }

    mockOnCreateNote.mockResolvedValue(newNote)

    render(
      <NotesContainer
        initialNotes={mockNotes}
        onCreateNote={mockOnCreateNote}
        onRescueNote={mockOnRescueNote}
        onSearchNotes={mockOnSearchNotes}
      />
    )

    const input = screen.getByPlaceholderText('Capture your thought...')
    const submitButton = screen.getByLabelText('Add note')

    await user.type(input, 'New note content')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnCreateNote).toHaveBeenCalledWith('New note content')
    })

    expect(screen.getByText('New note content')).toBeInTheDocument()
  })

  it('handles note creation with Enter key', async () => {
    const user = userEvent.setup()
    const newNote: Note = {
      id: '3',
      content: 'Keyboard note',
      created_at: '2025-01-20T11:00:00Z',
      updated_at: '2025-01-20T11:00:00Z',
      user_id: 'user1',
      is_rescued: false,
    }

    mockOnCreateNote.mockResolvedValue(newNote)

    render(
      <NotesContainer
        initialNotes={mockNotes}
        onCreateNote={mockOnCreateNote}
        onRescueNote={mockOnRescueNote}
        onSearchNotes={mockOnSearchNotes}
      />
    )

    const input = screen.getByPlaceholderText('Capture your thought...')

    await user.type(input, 'Keyboard note{enter}')

    await waitFor(() => {
      expect(mockOnCreateNote).toHaveBeenCalledWith('Keyboard note')
    })
  })

  it('opens search when search button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <NotesContainer
        initialNotes={mockNotes}
        onCreateNote={mockOnCreateNote}
        onRescueNote={mockOnRescueNote}
        onSearchNotes={mockOnSearchNotes}
      />
    )

    const searchButton = screen.getByLabelText('Open search')
    await user.click(searchButton)

    expect(
      screen.getByPlaceholderText('Search all your thoughts...')
    ).toBeInTheDocument()
  })

  it('performs search when search input is used', async () => {
    const user = userEvent.setup()
    const searchResults: Note[] = [
      {
        id: '1',
        content: 'First note content',
        created_at: '2025-01-20T10:00:00Z',
        updated_at: '2025-01-20T10:00:00Z',
        user_id: 'user1',
        is_rescued: false,
      },
    ]

    mockOnSearchNotes.mockResolvedValue(searchResults)

    render(
      <NotesContainer
        initialNotes={mockNotes}
        onCreateNote={mockOnCreateNote}
        onRescueNote={mockOnRescueNote}
        onSearchNotes={mockOnSearchNotes}
      />
    )

    // Open search
    const searchButton = screen.getByLabelText('Open search')
    await user.click(searchButton)

    // Type search query
    const searchInput = screen.getByPlaceholderText(
      'Search all your thoughts...'
    )
    await user.type(searchInput, 'first')

    // Wait for debounced search
    await waitFor(
      () => {
        expect(mockOnSearchNotes).toHaveBeenCalledWith('first')
      },
      { timeout: 500 }
    )
  })

  it('rescues a note when rescue button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <NotesContainer
        initialNotes={mockNotes}
        onCreateNote={mockOnCreateNote}
        onRescueNote={mockOnRescueNote}
        onSearchNotes={mockOnSearchNotes}
      />
    )

    // Find rescue button (should be on the second note, not the first)
    expect(screen.getAllByLabelText('Rescue note to top')).toHaveLength(1) // Only second note should have rescue button
    const rescueButton = screen.getByLabelText('Rescue note to top')

    await user.click(rescueButton)

    await waitFor(() => {
      expect(mockOnRescueNote).toHaveBeenCalledWith('2')
    })
  })

  it('shows empty state when no notes are present', () => {
    render(
      <NotesContainer
        initialNotes={[]}
        onCreateNote={mockOnCreateNote}
        onRescueNote={mockOnRescueNote}
        onSearchNotes={mockOnSearchNotes}
      />
    )

    expect(screen.getByText('Your thoughts start here')).toBeInTheDocument()
    expect(
      screen.getByText(/Capture any idea, thought, or reminder/)
    ).toBeInTheDocument()
  })

  it('handles create note errors gracefully', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')

    mockOnCreateNote.mockRejectedValue(new Error('Network error'))

    render(
      <NotesContainer
        initialNotes={mockNotes}
        onCreateNote={mockOnCreateNote}
        onRescueNote={mockOnRescueNote}
        onSearchNotes={mockOnSearchNotes}
      />
    )

    const input = screen.getByPlaceholderText('Capture your thought...')
    const submitButton = screen.getByLabelText('Add note')

    await user.type(input, 'Failed note')
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to save note. Please try again.'
      )
    })

    // Content should remain in input after error
    expect(input).toHaveValue('Failed note')
  })

  it('supports keyboard shortcut for opening search', () => {
    render(
      <NotesContainer
        initialNotes={mockNotes}
        onCreateNote={mockOnCreateNote}
        onRescueNote={mockOnRescueNote}
        onSearchNotes={mockOnSearchNotes}
      />
    )

    // Simulate Ctrl+F
    fireEvent.keyDown(document, {
      key: 'f',
      ctrlKey: true,
      preventDefault: vi.fn(),
    })

    expect(
      screen.getByPlaceholderText('Search all your thoughts...')
    ).toBeInTheDocument()
  })

  it('clears search when Escape is pressed', async () => {
    const user = userEvent.setup()

    render(
      <NotesContainer
        initialNotes={mockNotes}
        onCreateNote={mockOnCreateNote}
        onRescueNote={mockOnRescueNote}
        onSearchNotes={mockOnSearchNotes}
      />
    )

    // Open search and type something
    const searchButton = screen.getByLabelText('Open search')
    await user.click(searchButton)

    const searchInput = screen.getByPlaceholderText(
      'Search all your thoughts...'
    )
    await user.type(searchInput, 'test query')

    // Press Escape to clear - use user event for more realistic behavior
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(searchInput).toHaveValue('')
    })
  })

  it('shows gravity indication when there are many notes', () => {
    const manyNotes = Array.from({ length: 10 }, (_, i) => ({
      id: `note-${i}`,
      content: `Note ${i} content`,
      created_at: `2025-01-20T${10 - i}:00:00Z`,
      updated_at: `2025-01-20T${10 - i}:00:00Z`,
      user_id: 'user1',
      is_rescued: false,
    }))

    render(
      <NotesContainer
        initialNotes={manyNotes}
        onCreateNote={mockOnCreateNote}
        onRescueNote={mockOnRescueNote}
        onSearchNotes={mockOnSearchNotes}
      />
    )

    expect(
      screen.getByText(/Older thoughts naturally settle below/)
    ).toBeInTheDocument()
  })
})
